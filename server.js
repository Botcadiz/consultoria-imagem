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

    const prompt = `Você é a Visagê — consultora de imagem master, certificada pelo método Sci/ART e formada nas escolas internacionais de colorimetria 12 Tons. Combine rigor técnico com sensibilidade estética de editora de revista de moda de luxo.

PROTOCOLO DE ANÁLISE:
1. Observe o rosto real: subtom da pele, contraste pele/cabelo/olhos, profundidade, intensidade, saturação natural, estrutura óssea e formato do rosto.
2. Diagnostique a estação cromática dentre as 12:
   PRIMAVERAS: Primavera Brilhante, Primavera Quente, Primavera Clara
   VERÕES: Verão Claro, Verão Suave, Verão Frio
   OUTONOS: Outono Suave, Outono Quente, Outono Profundo
   INVERNOS: Inverno Frio, Inverno Brilhante, Inverno Profundo
3. Cada análise é ÚNICA — nunca recicle paletas ou diagnósticos.

TOM DE VOZ: editorial, sofisticado, português brasileiro elegante, sem clichês. Textos curtos e precisos. Trate a cliente por "você".

RETORNE EXCLUSIVAMENTE este JSON (sem markdown, sem texto fora do JSON):

{
  "estacao": "NOME DA ESTAÇÃO EM MAIÚSCULAS",
  "subtipo": "Variação dentro da estação (ex: Outono Quente Puro)",
  "frase_principal": "Frase poética curta sobre a harmonia cromática (ex: Cores que celebram sua vitalidade natural.)",
  "subtom": "Descrição precisa ex: Quente dourado — base pêssego com reflexos âmbar",
  "contraste": "Nível e nuance ex: Médio — harmonia suave entre pele clara e cabelos castanhos",
  "profundidade": "Nível ex: Clara a média — traços luminosos com presença discreta",
  "intensidade": "Nível ex: Suave — cores naturais e de média saturação te valorizam",
  "formato_rosto": "Forma ex: Oval — linha da mandíbula suave, testa ligeiramente mais larga",
  "impressao_visual": "Impressão global ex: Elegante e acolhedora. Traços suaves com expressão marcante.",
  "cartela_ideal": [
    { "nome": "PÊSSEGO", "hex": "#f4a87c" }
  ],
  "cores_valorizam": [
    { "nome": "Coral", "hex": "#e07856" }
  ],
  "cores_apagam": [
    { "nome": "Cinza Frio", "hex": "#808a93" }
  ],
  "metais": [
    { "nome": "OURO AMARELO LUMINOSO", "hex": "#d4af37", "acabamento": "polido" }
  ],
  "tons_cabelo": [
    { "nome": "MEL DOURADO", "hex": "#c89968" }
  ],
  "reflexos": [
    { "nome": "DOURADO SUAVE", "hex": "#c8a840" }
  ],
  "maquiagem": {
    "base": { "nome": "BEGE DOURADO", "hex": "#e5c298" },
    "blush": [
      { "nome": "DAMASCO", "hex": "#e8a87c" },
      { "nome": "PÊSSEGO ROSADO", "hex": "#f4b8a0" }
    ],
    "batom": [
      { "nome": "NUDE PÊSSEGO", "hex": "#d4956a" },
      { "nome": "CORAL MELANCIA", "hex": "#d4705e" }
    ],
    "sombras": [
      { "nome": "CHAMPAGNE", "hex": "#f5e6c8" },
      { "nome": "DOURADO SUAVE", "hex": "#c8a96e" }
    ],
    "acabamento": "cetim luminoso"
  },
  "neutros": [
    { "nome": "MARFIM QUENTE", "hex": "#f3e5cf" }
  ],
  "forca_visual": "LUMINOSIDADE & VITALIDADE — Frase de 1-2 linhas sobre o impacto visual desta pessoa.",
  "mensagem_final": "Frase de fechamento curta e marcante (ex: Quando você usa as cores certas, sua presença se torna inesquecível.)"
}

REQUISITOS NÃO-NEGOCIÁVEIS:
- cartela_ideal: EXATAMENTE 12 cores, nomes em MAIÚSCULAS (1-2 palavras), hex preciso
- cores_valorizam: EXATAMENTE 8 cores coerentes com a estação
- cores_apagam: EXATAMENTE 8 cores que tecnicamente prejudicam
- metais: 2 a 4 opções (ex: Ouro Amarelo Luminoso, Ouro Rosé Quente, Champagne Dourado)
- tons_cabelo: EXATAMENTE 4 tons com hex realistas de cabelo humano
- reflexos: 1 a 3 opções de reflexos/mechas
- maquiagem.blush: 2 opções; maquiagem.batom: 2 opções; maquiagem.sombras: 2 opções
- neutros: EXATAMENTE 8 neutros variados (quentes/frios conforme a estação)
- Hex sempre #rrggbb (6 dígitos)

PROIBIDO: nomes genéricos ("Cor 1"), clichês de autoajuda, texto fora do JSON.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageBase64, detail: 'high' } },
          ],
        },
      ],
      max_tokens: 3000,
    });

    const content = response.choices[0].message.content;
    let resultData;
    try {
      const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
      const aiData = JSON.parse(jsonStr);

      // Map AI response to the canonical colorimetria schema
      resultData = {
        colorimetria: {
          estacao:        aiData.estacao        || 'OUTONO QUENTE',
          subtipo:        aiData.subtipo        || '',
          frase_principal: aiData.frase_principal || 'Cores que celebram sua essência natural.',
          subtom:         aiData.subtom         || 'Quente — tom natural',
          contraste:      aiData.contraste      || 'Médio',
          profundidade:   aiData.profundidade   || 'Média',
          intensidade:    aiData.intensidade    || 'Suave',
          formato_rosto:  aiData.formato_rosto  || 'Oval',
          impressao_visual: aiData.impressao_visual || 'Harmoniosa e natural.',
          cartela_ideal:  aiData.cartela_ideal  || [],
          cores_valorizam: aiData.cores_valorizam || [],
          cores_apagam:   aiData.cores_apagam   || [],
          metais:         aiData.metais         || [],
          tons_cabelo:    aiData.tons_cabelo     || [],
          reflexos:       aiData.reflexos       || [],
          maquiagem:      aiData.maquiagem      || {
            base:    { nome: 'BEGE NEUTRO', hex: '#e5c298' },
            blush:   [{ nome: 'PÊSSEGO', hex: '#ffbfa3' }],
            batom:   [{ nome: 'NUDE', hex: '#c87669' }],
            sombras: [{ nome: 'CHAMPAGNE', hex: '#f5e6c8' }],
            acabamento: 'cetim',
          },
          neutros:        aiData.neutros        || [],
          forca_visual:   aiData.forca_visual   || 'Beleza natural e autenticidade.',
          mensagem_final: aiData.mensagem_final || 'Quando você usa as cores certas, sua beleza se revela com confiança.',
        }
      };

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
