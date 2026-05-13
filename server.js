import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from './database.js';

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

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(400).json({ error: 'E-mail já cadastrado.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    db.prepare('INSERT INTO users (email, password) VALUES (?, ?)').run(email, hashedPassword);

    res.status(201).json({ message: 'Usuário registrado com sucesso.' });
  } catch (error) {
    console.error("Erro no register:", error);
    res.status(500).json({ error: 'Erro no servidor ao registrar.' });
  }
});

// ==================== LOGIN ====================
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(400).json({ error: 'E-mail não encontrado.' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Senha incorreta.' });

    // Token includes user id and email — used for data isolation
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, email: user.email });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ error: 'Erro no servidor.' });
  }
});

// ==================== HISTORY (user-isolated) ====================
app.get('/api/history', authenticateToken, async (req, res) => {
  try {
    // Only returns history for the authenticated user (req.user.id)
    const history = db.prepare(
      'SELECT id, image_base64, result_json, created_at FROM history WHERE user_id = ? ORDER BY id DESC'
    ).all(req.user.id);

    const formattedHistory = (history || []).map(item => ({
      ...item,
      result_json: JSON.parse(item.result_json)
    }));
    res.json(formattedHistory);
  } catch (error) {
    console.error("Erro no histórico:", error);
    res.status(500).json({ error: 'Erro ao buscar histórico.' });
  }
});

// ==================== GENERATION COUNT ====================
app.get('/api/generation-count', authenticateToken, (req, res) => {
  try {
    const row = db.prepare('SELECT COUNT(*) as count FROM history WHERE user_id = ?').get(req.user.id);
    res.json({ count: row.count });
  } catch (error) {
    console.error('Erro ao buscar contagem:', error);
    res.status(500).json({ error: 'Erro ao buscar contagem.' });
  }
});

// ==================== ANALYZE (with OpenAI) ====================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/api/analyze', authenticateToken, async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
    }

    const prompt = `Você é um consultor de imagem e visagismo premium. Analise a foto da pessoa e retorne uma resposta no formato JSON estrito, sem markdown ou texto extra.

Use a seguinte estrutura de JSON:
{
  "visagismo": {
    "harmoniaFacial": { "descricao": "Descreva a harmonia e proporção...", "resultado": "ex: harmonia boa" },
    "expressaoPredominante": { "descricao": "O que o rosto transmite...", "resultado": "ex: amigável e acolhedora" },
    "estiloPessoal": { "descricao": "A essência transmitida...", "resultado": "ex: natural clássica" },
    "personalidadeVisagismo": "Descreva as características de temperamento e personalidade que os traços faciais sugerem detalhadamente..."
  },
  "colorimetria": {
    "estacaoCromatica": "ex: OUTONO QUENTE",
    "estacaoCromaticaSub": "ex: (Outono Puro)",
    "descricaoEstacao": "Breve frase com fonte cursiva, ex: Sua beleza em harmonia com cores quentes e naturais",
    "subtom": { "titulo": "Quente", "desc": "Explique detalhadamente o subtom da pessoa com base nas características da pele dela..." },
    "contraste": { "titulo": "Médio", "desc": "Explique detalhadamente o nível de contraste pessoal observando a cor da pele, olhos e cabelo dela..." },
    "profundidade": { "titulo": "Média", "desc": "Explique detalhadamente a profundidade observando o nível de claro/escuro dos traços dela..." },
    "intensidade": { "titulo": "Levemente suave", "desc": "Explique detalhadamente se a beleza dela pede cores vivas ou suaves e por quê..." },
    "suaForca": { "titulo": "Calor + Naturalidade + Harmonia Suave", "evite": "extremos frios e contrastes muito duros.", "aposte": "tons terrosos, dourados e naturais." },
    "cartelaIdeal": [
      {"nome": "Mostarda", "hex": "#e3a830"}, {"nome": "Terracota", "hex": "#c65d41"}, 
      {"nome": "Verde Oliva", "hex": "#6b7045"}, {"nome": "Caramelo", "hex": "#c88550"},
      {"nome": "Coral Quente", "hex": "#ff7f50"}, {"nome": "Vermelho Queimado", "hex": "#8b0000"},
      {"nome": "Dourado", "hex": "#ffd700"}, {"nome": "Cobre", "hex": "#b87333"},
      {"nome": "Marrom", "hex": "#8b4513"}, {"nome": "Pêssego", "hex": "#ffe5b4"},
      {"nome": "Ameixa", "hex": "#dda0dd"}, {"nome": "Verde Musgo", "hex": "#add8e6"}
    ],
    "coresValorizam": {"desc": "Cores quentes, terrosas e naturais iluminam sua pele.", "cores": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5", "#hex6", "#hex7", "#hex8", "#hex9", "#hex10"]},
    "coresApagam": {"desc": "Cores frias, acinzentadas e de alto contraste quebram sua harmonia.", "cores": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5", "#hex6", "#hex7", "#hex8", "#hex9", "#hex10"]},
    "metaisIdeais": [
      {"nome": "Ouro", "hex": "#ffd700"}, {"nome": "Ouro Rosé", "hex": "#b76e79"}, {"nome": "Cobre", "hex": "#b87333"}
    ],
    "dicaMetais": "ex: Use esses tons também em óculos, relógios e fivelas de bolsas para manter a harmonia perto do rosto.",
    "melhoresTonsCabelo": [
      {"nome": "Castanho Dourado", "hex": "#8b5a2b"}, {"nome": "Caramelo", "hex": "#c68e59"}, {"nome": "Mel", "hex": "#e3a830"}, {"nome": "Chocolate", "hex": "#8b4513"}
    ],
    "dicaCabelo": "ex: prefira luzes e reflexos quentes (mel, caramelo). Evite platinados frios.",
    "maquiagemIdeal": {
      "base": {"desc": "fundo amarelado ou dourado", "hex": "#e5c298"},
      "blush": {"desc": "pêssego, coral ou terracota", "hex": "#ffbfa3"},
      "batom": {"desc": "nude quente, terracota, coral", "hex": "#c87669"},
      "sombras": {"desc": "dourado, cobre, bronze", "hex": "#b87333"}
    },
    "neutrosIdeais": [
      {"nome": "Bege Quente", "hex": "#f5f5dc"}, {"nome": "Creme", "hex": "#fffdd0"},
      {"nome": "Areia", "hex": "#c2b280"}, {"nome": "Camelo", "hex": "#c19a6b"},
      {"nome": "Marrom", "hex": "#8b4513"}, {"nome": "Verde Oliva", "hex": "#556b2f"},
      {"nome": "Caqui", "hex": "#c3b091"}, {"nome": "Off White", "hex": "#f8f8ff"}
    ]
  },
  "formatoRosto": {
    "formato": "ex: OVAL",
    "descricao": "Seu rosto apresenta linhas suaves e equilibradas...",
    "caracteristicas": ["Testa levemente mais larga", "Maçãs do rosto destacadas", "Mandíbula suave"],
    "pontosFortes": ["Versatilidade de cortes", "Harmonia natural"],
    "oQueValoriza": ["Cortes médios a longos", "Ondas suaves", "Brincos médios a grandes", "Óculos arredondados"]
  },
  "cabelo": {
    "observacaoVisual": {
      "tipoFio": "ex: 2B a 2C (ondulado)",
      "espessura": "ex: média",
      "densidade": "ex: média/alta",
      "porosidade": "ex: média",
      "elasticidade": "ex: média",
      "curvatura": "ex: ondas suaves a definidas"
    },
    "diagnostico": "Fios com ondas bem definidas, movimento natural...",
    "necessidades": ["Hidratação", "Nutrição", "Definição", "Selagem"],
    "oQueEvitar": ["Excesso de calor", "Produtos com sulfatos fortes", "Lavagens muito frequentes"],
    "rotinaIdeal": ["Shampoo suave", "Condicionador hidratante", "Máscara nutritiva", "Finalizador leve", "Secagem natural"],
    "finalizadores": "Cremes leves, mousses, gelatinas e ativadores de cachos leves a médios."
  },
  "resumoBeleza": "Você tem uma beleza natural, leve e radiante..."
}

IMPORTANTE: 
1. Preencha TODOS os campos com base na análise REAL da foto do usuário.
2. 'cartelaIdeal' deve ter EXATAMENTE 12 CORES com 'nome' e 'hex'.
3. 'neutrosIdeais' deve ter EXATAMENTE 8 CORES com 'nome' e 'hex'.
4. PROIBIDO USAR CORES NEON OU GENÉRICAS (ex: #FF0000, #00FF00, #FFFF00). Gere apenas tons sofisticados, estéticos e profissionais, usando códigos HEX precisos e elegantes (ex: #CD5C5C, #E3A830, #6B7045).
5. Retorne APENAS o JSON válido, sem NENHUM texto antes ou depois, sem formatação markdown.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: "json_object" },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64,
                detail: 'low'
              },
            },
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
      
      // Save to database — associated with the authenticated user
      db.prepare(
        'INSERT INTO history (user_id, image_base64, result_json) VALUES (?, ?, ?)'
      ).run(req.user.id, imageBase64, JSON.stringify(resultData));
      
    } catch (parseError) {
      console.error("Erro ao fazer parse do JSON. Retorno da IA:", content);
      return res.status(500).json({ error: 'Erro ao processar dados da IA.' });
    }

    res.json(resultData);
  } catch (error) {
    console.error("Erro na análise:", error.message || error);
    const detail = error?.error?.message || error.message || 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao processar imagem: ${detail}` });
  }
});

const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Backend rodando na porta ${PORT}`);
  });
}

export default app;
