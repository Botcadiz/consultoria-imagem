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

    const prompt = `VOCÊ É UM CONSULTOR DE IMAGEM E VISAGISMO PREMIUM.

Sua tarefa: Analise a foto do rosto desta pessoa e crie uma consultoria personalizada de colorimetria e visagismo.

ANÁLISE DETALHADA BASEADA NA FOTO:
1. Observe CUIDADOSAMENTE a pele, tom natural, luminosidade, contraste com cabelo e olhos
2. Identifique a estação cromática (Primavera, Verão, Outono, Inverno e suas variações)
3. Analise subtom, contraste, profundidade e intensidade das cores naturais
4. Determine as cores que mais a favorecem e as que apagam
5. Personalize completamente cada recomendação conforme SUAS características únicas

RETORNE APENAS JSON VÁLIDO, sem markdown, sem texto extra:

{
  "visagismo": {
    "harmoniaFacial": { "descricao": "descrição real observada", "resultado": "resultado específico" },
    "expressaoPredominante": { "descricao": "O que o rosto transmite", "resultado": "resultado específico" },
    "estiloPessoal": { "descricao": "Essência visual", "resultado": "resultado específico" },
    "personalidadeVisagismo": "Características detalhadas de temperamento baseadas nos traços faciais..."
  },
  "colorimetria": {
    "estacaoCromatica": "ESTAÇÃO CROMÁTICA IDENTIFICADA",
    "estacaoCromaticaSub": "(Variação específica)",
    "descricaoEstacao": "Frase única e personalizada que descreve a harmonia cromática desta pessoa",
    "subtom": { "titulo": "Resultado específico", "desc": "Análise detalhada baseada na pele observada" },
    "contraste": { "titulo": "Nível específico", "desc": "Análise baseada em pele, cabelo e olhos observados" },
    "profundidade": { "titulo": "Nível específico", "desc": "Análise baseada em claro/escuro dos traços observados" },
    "intensidade": { "titulo": "Tipo específico", "desc": "Se pede cores vivas ou suaves, análise personalizada" },
    "suaForca": { "titulo": "3-4 características principais", "evite": "O que evitar", "aposte": "Em que apostar" },
    "cartelaIdeal": [
      {"nome": "Cor 1", "hex": "#hex"}, {"nome": "Cor 2", "hex": "#hex"},
      {"nome": "Cor 3", "hex": "#hex"}, {"nome": "Cor 4", "hex": "#hex"},
      {"nome": "Cor 5", "hex": "#hex"}, {"nome": "Cor 6", "hex": "#hex"},
      {"nome": "Cor 7", "hex": "#hex"}, {"nome": "Cor 8", "hex": "#hex"},
      {"nome": "Cor 9", "hex": "#hex"}, {"nome": "Cor 10", "hex": "#hex"},
      {"nome": "Cor 11", "hex": "#hex"}, {"nome": "Cor 12", "hex": "#hex"}
    ],
    "coresValorizam": {"desc": "Descrição personalizada", "cores": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5", "#hex6", "#hex7", "#hex8", "#hex9", "#hex10"]},
    "coresApagam": {"desc": "Descrição personalizada", "cores": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5", "#hex6", "#hex7", "#hex8", "#hex9", "#hex10"]},
    "metaisIdeais": [
      {"nome": "Metal 1", "hex": "#hex"}, {"nome": "Metal 2", "hex": "#hex"}, {"nome": "Metal 3", "hex": "#hex"}
    ],
    "dicaMetais": "Dica específica sobre como usar os metais ideais",
    "melhoresTonsCabelo": [
      {"nome": "Tom 1", "hex": "#hex"}, {"nome": "Tom 2", "hex": "#hex"}, {"nome": "Tom 3", "hex": "#hex"}, {"nome": "Tom 4", "hex": "#hex"}
    ],
    "dicaCabelo": "Dica específica e personalizada sobre tons de cabelo que favorecem",
    "maquiagemIdeal": {
      "base": {"desc": "Descrição específica", "hex": "#hex"},
      "blush": {"desc": "Descrição específica", "hex": "#hex"},
      "batom": {"desc": "Descrição específica", "hex": "#hex"},
      "sombras": {"desc": "Descrição específica", "hex": "#hex"}
    },
    "neutrosIdeais": [
      {"nome": "Neutro 1", "hex": "#hex"}, {"nome": "Neutro 2", "hex": "#hex"},
      {"nome": "Neutro 3", "hex": "#hex"}, {"nome": "Neutro 4", "hex": "#hex"},
      {"nome": "Neutro 5", "hex": "#hex"}, {"nome": "Neutro 6", "hex": "#hex"},
      {"nome": "Neutro 7", "hex": "#hex"}, {"nome": "Neutro 8", "hex": "#hex"}
    ]
  },
  "formatoRosto": {
    "formato": "FORMATO IDENTIFICADO",
    "descricao": "Descrição detalhada do formato observado",
    "caracteristicas": ["Característica 1", "Característica 2", "Característica 3"],
    "pontosFortes": ["Ponto forte 1", "Ponto forte 2"],
    "oQueValoriza": ["Recomendação 1", "Recomendação 2", "Recomendação 3", "Recomendação 4"]
  },
  "cabelo": {
    "observacaoVisual": {
      "tipoFio": "Tipo observado",
      "espessura": "Espessura observada",
      "densidade": "Densidade observada",
      "porosidade": "Porosidade observada",
      "elasticidade": "Elasticidade observada",
      "curvatura": "Padrão de curvatura observado"
    },
    "diagnostico": "Diagnóstico detalhado baseado na observação",
    "necessidades": ["Necessidade 1", "Necessidade 2", "Necessidade 3"],
    "oQueEvitar": ["Evitar 1", "Evitar 2", "Evitar 3"],
    "rotinaIdeal": ["Passo 1", "Passo 2", "Passo 3", "Passo 4", "Passo 5"],
    "finalizadores": "Descrição específica de finalizadores recomendados"
  },
  "resumoBeleza": "Resumo personalizado e inspirador da beleza única desta pessoa..."
}

REGRAS CRÍTICAS:
1. PERSONALIZE TUDO baseado na FOTO REAL - cada pessoa tem uma análise única
2. cartelaIdeal: EXATAMENTE 12 cores com nomes e hexadecimais específicos
3. neutrosIdeais: EXATAMENTE 8 cores
4. CORES SOFISTICADAS E ELEGANTES apenas (nada neon ou genérico)
5. Estações e subtons devem ser realistas (Primavera, Verão, Outono, Inverno + variações)
6. Se a pessoa é Outono Quente, recomende cores quentes, terrosas, naturais
7. Se a pessoa é Verão Frio, recomende cores frias, acinzentadas, suaves
8. RETORNE APENAS JSON, nada mais`;

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
      max_tokens: 4096,
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
