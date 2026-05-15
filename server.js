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

    const prompt = `Você é a Visagê — uma consultora de imagem master, certificada pelo método Sci\\ART e formada nas escolas internacionais de colorimetria 12 Tons e Color Me Beautiful. Você combina o rigor técnico da análise cromática profissional com a sensibilidade estética de uma editora de moda de revista de luxo.

MISSÃO:
Examine a fotografia desta cliente com profundidade técnica de uma consultoria presencial de R$ 2.500 e devolva um diagnóstico de colorimetria e visagismo que ela vai querer salvar, imprimir e mostrar para as amigas — porque é específico, lisonjeiro, sofisticado e tecnicamente correto.

PROTOCOLO DE ANÁLISE (siga nesta ordem):

1) OBSERVAR a pessoa real na foto, identificando:
   - Tom verdadeiro da pele (descontando filtro/luz ambiente)
   - Subtom: quente (amarelo/dourado/pêssego), frio (rosado/azulado/oliva-azulado), neutro (balanceado), oliva (esverdeado/acinzentado)
   - Profundidade da pele: clara, média ou profunda
   - Cor natural e brilho dos olhos (íris e esclera)
   - Cor natural do cabelo e seu contraste com a pele
   - Contraste interno geral (alto/médio/baixo)
   - Saturação natural (suave/média/brilhante)
   - Estrutura óssea facial e formato do rosto

2) DIAGNOSTICAR a estação cromática dentro do sistema de 12 tons (não use apenas as 4 básicas):
   PRIMAVERAS: Primavera Brilhante, Primavera Quente, Primavera Clara
   VERÕES: Verão Claro, Verão Suave, Verão Frio
   OUTONOS: Outono Suave, Outono Quente, Outono Profundo
   INVERNOS: Inverno Frio, Inverno Brilhante, Inverno Profundo

3) PERSONALIZAR cada elemento da paleta a partir do diagnóstico real — JAMAIS reciclar a mesma paleta. Cada análise é única.

TOM DE VOZ:
- Editorial, sofisticado, próximo de uma stylist de revista de moda.
- Português brasileiro, elegante, sem clichês ("brilho único", "essência especial" — proibido).
- Textos curtos, precisos, em voz ativa. Cada frase precisa entregar valor.
- Trate a cliente por "você", nunca pelo nome.

RETORNE EXCLUSIVAMENTE este JSON (sem markdown, sem texto fora do JSON):

{
  "estacao": "Nome da estação em MAIÚSCULAS (ex: PRIMAVERA BRILHANTE)",
  "subEstacao": "Variação dentro da estação (ex: Primavera Brilhante Pura, transição para Inverno Brilhante)",
  "descricao": "Uma frase editorial, italica e poética sobre a harmonia cromática dela (ex: 'Sua beleza floresce em cores quentes, claras e luminosas.')",
  "subtom": { "titulo": "Quente / Frio / Neutro / Oliva", "desc": "2-6 palavras com a nuance exata (ex: 'dourado com base pêssego')" },
  "contraste": { "titulo": "Alto / Médio para alto / Médio / Médio para baixo / Baixo", "desc": "Uma linha sobre a relação pele-cabelo-olhos (ex: 'Harmonia entre pele, cabelos e olhos')" },
  "profundidade": { "titulo": "Clara / Clara a média / Média / Média a profunda / Profunda", "desc": "Uma linha curta (ex: 'Traços suaves e iluminados')" },
  "intensidade": { "titulo": "Suave / Média / Brilhante / Alta e brilhante", "desc": "Uma linha (ex: 'Cores vivas e luminosas te valorizam')" },
  "formatoRosto": { "titulo": "Oval / Redondo / Quadrado / Coração / Diamante / Retangular / Oval levemente coração", "desc": "Uma linha curta (ex: 'Equilíbrio entre suavidade e definição')" },
  "impressaoVisual": "Uma linha que descreve a impressão estética geral (ex: 'Jovem, radiante e delicada. Traços harmoniosos com expressão marcante.')",
  "cartelaIdeal": [
    { "nome": "PÊSSEGO", "hex": "#f4a87c" },
    { "nome": "CORAL", "hex": "#e07856" }
  ],
  "coresValorizam": {
    "desc": "Uma linha explicando por que essas cores funcionam (ex: 'Cores quentes, claras e vibrantes realçam sua luz natural e deixam você radiante.')",
    "cores": [
      { "nome": "Mostarda", "hex": "#d4a017" }
    ]
  },
  "coresApagam": {
    "desc": "Uma linha explicando por que essas cores não favorecem (ex: 'Cores frias, escuras e acinzentadas apagam seu brilho natural.')",
    "cores": [
      { "nome": "Cinza Frio", "hex": "#808a93" }
    ]
  },
  "metaisIdeais": [
    { "nome": "OURO AMARELO", "hex": "#d4af37" },
    { "nome": "OURO ROSÉ", "hex": "#b76e79" }
  ],
  "dicaMetais": "Frase curta com a regra de ouro dos metais para esta estação (ex: 'Metais quentes e polidos trazem luz ao seu rosto.')",
  "melhoresTonsCabelo": [
    { "nome": "MEL DOURADO", "hex": "#c89968" },
    { "nome": "CASTANHO CLARO", "hex": "#8b6240" }
  ],
  "dicaCabelo": "Frase curta com a recomendação técnica (ex: 'Tons quentes e iluminados harmonizam com seu subtom. Mechas sutis e reflexos dourados trazem ainda mais brilho e dimensão.')",
  "maquiagemIdeal": {
    "base": { "hex": "#e5c298", "desc": "Descrição curta do undertone da base (ex: 'bege claro quente ou dourado')" },
    "blush": { "hex": "#ffbfa3", "desc": "Tons recomendados (ex: 'pêssego, coral ou damasco')" },
    "batom": { "hex": "#c87669", "desc": "Tons recomendados (ex: 'coral, pêssego, rosa quente ou nude rosado')" },
    "sombras": { "hex": "#b87333", "desc": "Tons recomendados (ex: 'champanhe, dourado, cobre, pêssego e marrom claro')" }
  },
  "neutrosIdeais": [
    { "nome": "MARFIM QUENTE", "hex": "#f3e5cf" },
    { "nome": "BEGE AREIA", "hex": "#d9be9a" }
  ],
  "suaForca": {
    "titulo": "Duas a três palavras em maiúsculas que sintetizam sua qualidade dominante (ex: 'LUMINOSIDADE & VITALIDADE', 'PROFUNDIDADE & MAGNETISMO', 'SUAVIDADE & FRESCOR')",
    "textoPrincipal": "Uma frase curta de afirmação (ex: 'Seu brilho natural encanta!')",
    "textoSecundario": "Frase complementar sobre o efeito visual (ex: 'Você irradia leveza, frescor e elegância.')"
  },
  "mensagemFinal": "Frase de fechamento editorial, curta e marcante (ex: 'Quando você usa as cores certas, sua essência se destaca.')"
}

REQUISITOS NÃO-NEGOCIÁVEIS:
- cartelaIdeal: EXATAMENTE 12 cores, cada uma com nome em MAIÚSCULAS curto (1-2 palavras) e hex preciso
- coresValorizam.cores: EXATAMENTE 10 cores, nomes curtos, hex coerentes com a estação
- coresApagam.cores: EXATAMENTE 10 cores que tecnicamente atrapalham (frias para quentes, brilhantes para suaves, etc.)
- metaisIdeais: EXATAMENTE 4 metais (ex: Ouro Amarelo, Ouro Rosé, Ouro Champagne, Dourado Polido)
- melhoresTonsCabelo: EXATAMENTE 4 tons com hex realistas de cabelo humano
- neutrosIdeais: EXATAMENTE 8 neutros (não brancos puros — varie em quente/frio conforme a estação)
- Hex sempre em formato #rrggbb (6 dígitos)
- Cores tecnicamente coerentes com a estação diagnosticada

PROIBIDO:
- Repetir a mesma análise para pessoas diferentes
- Usar nomes de cor genéricos ("Cor 1", "Tom 2") — sempre nomes descritivos (ex: Salmão, Verde Musgo, Bordô Vinho)
- Frases vazias ou clichês de autoajuda
- Texto fora do JSON`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
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

      // Use AI data directly with sensible fallbacks
      resultData = {
        colorimetria: {
          estacaoCromatica: aiData.estacao || 'OUTONO QUENTE',
          estacaoCromaticaSub: aiData.subEstacao || '',
          descricaoEstacao: aiData.descricao || 'Sua beleza em harmonia com cores naturais',
          subtom: aiData.subtom || { titulo: 'Quente', desc: 'Tom natural' },
          contraste: aiData.contraste || { titulo: 'Médio', desc: 'Equilíbrio harmônico' },
          profundidade: aiData.profundidade || { titulo: 'Média', desc: 'Profundidade natural' },
          intensidade: aiData.intensidade || { titulo: 'Suave', desc: 'Naturalidade' },
          formatoRosto: aiData.formatoRosto || { titulo: 'Oval', desc: 'Equilíbrio facial' },
          impressaoVisual: aiData.impressaoVisual || 'Natural e harmoniosa',
          suaForca: aiData.suaForca || { titulo: 'BELEZA NATURAL', textoPrincipal: 'Harmonia e elegância', textoSecundario: 'Sua naturalidade brilha' },
          cartelaIdeal: aiData.cartelaIdeal || [],
          coresValorizam: aiData.coresValorizam || { desc: '', cores: [] },
          coresApagam: aiData.coresApagam || { desc: '', cores: [] },
          metaisIdeais: aiData.metaisIdeais || [],
          dicaMetais: aiData.dicaMetais || 'Metais que realçam seu brilho',
          melhoresTonsCabelo: aiData.melhoresTonsCabelo || [],
          dicaCabelo: aiData.dicaCabelo || 'Tons que harmonizam',
          maquiagemIdeal: aiData.maquiagemIdeal || {
            base: { hex: '#e5c298', desc: 'Tom natural' },
            blush: { hex: '#ffbfa3', desc: 'Rose suave' },
            batom: { hex: '#c87669', desc: 'Tom harmonizado' },
            sombras: { hex: '#b87333', desc: 'Profundidade' }
          },
          neutrosIdeais: aiData.neutrosIdeais || [],
          mensagemFinal: aiData.mensagemFinal || 'Quando você usa as cores certas, sua beleza aparece com mais leveza, confiança e naturalidade.'
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
