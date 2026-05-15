import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from './database.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'secrect-key-123';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido.' });
    req.user = user;
    next();
  });
};

// ==================== REGISTER ====================
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });

    const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
    if (existing) return res.status(400).json({ error: 'E-mail já cadastrado.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const { error } = await supabase.from('users').insert({ email, password: hashedPassword });
    if (error) throw error;

    res.status(201).json({ message: 'Usuário registrado com sucesso.' });
  } catch (error) {
    console.error('Erro no register:', error);
    res.status(500).json({ error: 'Erro no servidor ao registrar.' });
  }
});

// ==================== LOGIN ====================
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: user } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    if (!user) return res.status(400).json({ error: 'E-mail não encontrado.' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Senha incorreta.' });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, email: user.email });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro no servidor.' });
  }
});

// ==================== HISTORY ====================
app.get('/api/history', authenticateToken, async (req, res) => {
  try {
    const { data: history, error } = await supabase
      .from('history')
      .select('id, image_base64, result_json, created_at')
      .eq('user_id', req.user.id)
      .order('id', { ascending: false });

    if (error) throw error;

    const formattedHistory = (history || []).map(item => ({
      ...item,
      result_json: typeof item.result_json === 'string' ? JSON.parse(item.result_json) : item.result_json,
    }));
    res.json(formattedHistory);
  } catch (error) {
    console.error('Erro no histórico:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico.' });
  }
});

// ==================== GENERATION COUNT ====================
app.get('/api/generation-count', authenticateToken, async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ count: count || 0 });
  } catch (error) {
    console.error('Erro ao buscar contagem:', error);
    res.status(500).json({ error: 'Erro ao buscar contagem.' });
  }
});

// ==================== ANALYZE ====================
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/api/analyze', authenticateToken, async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'Nenhuma imagem enviada.' });

    const prompt = `Você é um consultor de imagem premium. Analise a foto e retorne dados estruturados.

{
  "estacao": "ESTAÇÃO (ex: OUTONO QUENTE)",
  "descricao": "Frase sobre harmonia cromática",
  "subtom": "quente/frio/neutro",
  "contraste": "alto/médio/baixo",
  "profundidade": "clara/média/profunda",
  "intensidade": "vivida/suave",
  "coresQuentes": ["cor1", "cor2", "cor3"],
  "coresFrias": ["cor1", "cor2", "cor3"],
  "metais": ["metal1", "metal2"],
  "tonsCabelo": ["tom1", "tom2"],
  "forcaPrincipal": "ponto forte"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageBase64, detail: 'low' } },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;
    let resultData;
    try {
      const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
      resultData = JSON.parse(jsonStr);

      const { error: insertError } = await supabase.from('history').insert({
        user_id: req.user.id,
        image_base64: imageBase64,
        result_json: JSON.stringify(resultData),
      });
      if (insertError) console.error('Erro ao salvar histórico:', insertError);
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON. Retorno da IA:', content);
      return res.status(500).json({ error: 'Erro ao processar dados da IA.' });
    }

    res.json(resultData);
  } catch (error) {
    console.error('Erro na análise:', error.message || error);
    const detail = error?.error?.message || error.message || 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao processar imagem: ${detail}` });
  }
});

const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));
}

export default app;
