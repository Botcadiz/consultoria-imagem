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

const buildDallePrompt = (a) => {
  const cartela = (a.cartelaIdeal || []).slice(0, 12);
  const cartelaNomes = cartela.map(c => `${c.nome} (${c.hex})`).join(', ');
  const valorizam = (a.coresValorizam?.cores || []).slice(0, 10);
  const valorizamNomes = valorizam.map(c => `${c.nome} (${c.hex})`).join(', ');
  const apagam = (a.coresApagam?.cores || []).slice(0, 10);
  const apagamNomes = apagam.map(c => `${c.nome} (${c.hex})`).join(', ');
  const metais = (a.metaisIdeais || []).slice(0, 4).map(m => `${m.nome} (${m.hex})`).join(', ');
  const cabelo = (a.melhoresTonsCabelo || []).slice(0, 4).map(c => `${c.nome} (${c.hex})`).join(', ');
  const neutros = (a.neutrosIdeais || []).slice(0, 8).map(c => `${c.nome} (${c.hex})`).join(', ');
  const estacao = a.estacaoCromatica || 'OUTONO QUENTE';
  const descricao = a.descricaoEstacao || 'Sua beleza em harmonia com cores quentes e naturais';

  return `Design a professional personal colorimetry infographic poster in portrait format (ratio 3:4). This is a premium image consulting panel — styled like a high-end beauty editorial.

OVERALL STYLE:
- Pure black background (#0a0a0a)
- All decorative lines, borders, titles and icons in warm gold (#c9a84c and #e8d5a3)
- Elegant serif font for section titles and the main palette name, clean sans-serif for body text
- Rounded-corner cards with thin gold borders
- Premium, feminine, luxurious aesthetic — like an Instagram-saveable beauty guide
- Centered layout, well-spaced, high readability

EXACT LAYOUT — top to bottom:

━━━ ZONE 1: TOP HEADER ━━━
Left quarter: a square photo of a woman with a gold rounded-corner border (placeholder/generic woman face if no image provided).
Right three-quarters:
  - Small gold serif text: "SUA COLORIMETRIA PESSOAL"
  - Very large bold serif title: "${estacao}"
  - Thin gold divider line with a diamond ornament
  - Italic gold script text: "${descricao}"

━━━ ZONE 2: COLOR PALETTE — "SUA CARTELA IDEAL" ━━━
Centered label "• SUA CARTELA IDEAL •" in small gold caps.
Two rows of 6 rounded color swatches, each with an exact fill color and its name in small gold text below.
Row 1 colors: ${cartelaNomes.split(', ').slice(0, 6).join(', ')}
Row 2 colors: ${cartelaNomes.split(', ').slice(6, 12).join(', ')}

━━━ ZONE 3: TWO-COLUMN SECTION ━━━

LEFT COLUMN — Card titled "• SUA ANÁLISE •" with 6 items, each with a small gold icon:
  ◉ [face icon] SUBTOM DA PELE (gold bold) — ${a.subtom?.titulo || 'Quente'} / ${a.subtom?.desc || 'dourado/amarelado'}
  ◉ [circle half icon] CONTRASTE (gold bold) — ${a.contraste?.titulo || 'Médio'} / ${a.contraste?.desc || 'harmonia pele e cabelo'}
  ◉ [gradient circle] PROFUNDIDADE (gold bold) — ${a.profundidade?.titulo || 'Média'} / ${a.profundidade?.desc || 'traços naturais'}
  ◉ [sun icon] INTENSIDADE (gold bold) — ${a.intensidade?.titulo || 'Suave'} / ${a.intensidade?.desc || 'cores vivas te valorizam'}
  ◉ [oval face outline] FORMATO DO ROSTO (gold bold) — ${a.formatoRosto?.titulo || 'Oval'} / ${a.formatoRosto?.desc || 'equilíbrio facial'}
  ◉ [eye icon] IMPRESSÃO VISUAL (gold bold) — ${a.impressaoVisual || 'Natural e harmoniosa'}

RIGHT AREA — Two side-by-side cards:
  LEFT CARD "✓ CORES QUE TE VALORIZAM" (gold checkmark icon):
    Subtext: "${a.coresValorizam?.desc || 'Cores quentes e vibrantes realçam sua luz natural'}"
    Two rows of 5 small rounded swatches: ${valorizamNomes}

  RIGHT CARD "✕ CORES QUE TE APAGAM" (red X icon):
    Subtext: "${a.coresApagam?.desc || 'Cores frias e acinzentadas apagam seu brilho'}"
    Two rows of 5 small grey/muted swatches: ${apagamNomes}

━━━ ZONE 4: THREE-COLUMN CARDS ━━━

CARD 1 — "✦ METAIS IDEAIS":
  Text: "${a.dicaMetais || 'Metais quentes e polidos trazem luz ao rosto'}"
  Show 3 rendered metallic ring/hoop earring icons + 1 larger polished disc, colored: ${metais}

CARD 2 — "♀ MELHORES TONS DE CABELO":
  Text: "${a.dicaCabelo || 'Tons quentes e iluminados harmonizam com seu subtom'}"
  Show 4 hair swatch strands (curved lock shapes) colored: ${cabelo}
  Below: italic tip text — "DICA: mechas sutis e reflexos dourados trazem mais brilho e dimensão."

CARD 3 — "🖌 MAQUIAGEM IDEAL":
  Four labeled rows with a small color dot beside each:
  BASE: ${a.maquiagemIdeal?.base?.desc || 'bege claro quente ou dourado'}
  BLUSH: ${a.maquiagemIdeal?.blush?.desc || 'pêssego, coral ou damasco'}
  BATOM: ${a.maquiagemIdeal?.batom?.desc || 'coral, pêssego ou nude rosado'}
  SOMBRAS: ${a.maquiagemIdeal?.sombras?.desc || 'champanhe, dourado, cobre e marrom claro'}

━━━ ZONE 5: BOTTOM STRIP — "• NEUTROS IDEAIS •" ━━━
One horizontal row of 8 rounded swatches with name labels: ${neutros}

━━━ ZONE 6: BOTTOM SECTION — TWO COLUMNS ━━━

LEFT CARD "◇ SUA FORÇA":
  Large gold serif title: "${a.suaForca?.titulo || 'LUMINOSIDADE & VITALIDADE'}"
  Body text: "${a.suaForca?.textoPrincipal || 'Seu brilho natural encanta!'}"
  Secondary text: "${a.suaForca?.textoSecundario || 'Você irradia leveza, frescor e elegância.'}"

RIGHT CARD — footer message:
  Small decorative flower/leaf gold icon on left.
  Italic gold script: "${a.mensagemFinal || 'Quando você usa as cores certas, sua essência se destaca.'}"
  Below in larger italic gold script: "Mais confiança, mais leveza, mais você!"
  Gold sparkle ✦ ornament on right.

CRITICAL RULES:
- All color swatches MUST be filled with their exact specified hex colors — do not approximate
- Every section must be labeled in gold caps exactly as written above
- No extra decorations or sections beyond what is specified
- Text must be legible — minimum font contrast against black background
- The overall aesthetic is dark luxury: black + gold + vivid color swatches only`;
};

app.post('/api/analyze', authenticateToken, async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'Nenhuma imagem enviada.' });

    const prompt = `Você é uma consultora de imagem profissional especializada em colorimetria e visagismo. Analise CUIDADOSAMENTE a foto da pessoa e gere uma análise COMPLETA, ÚNICA e PERSONALIZADA em formato JSON.

REGRAS OBRIGATÓRIAS:
- Cada análise deve ser UNICA baseada na foto real
- NÃO use sempre a mesma estação cromática
- Analise: subtom da pele, contraste pele/cabelo/olhos, profundidade, intensidade, formato do rosto, cor dos olhos, cor natural do cabelo
- Personalize TODAS as cores, metais, cabelo e maquiagem para esta pessoa específica
- Use cores hex reais que combinem com a estação detectada
- Textos curtos, elegantes e profissionais

Retorne um JSON com EXATAMENTE esta estrutura:

{
  "estacao": "EX: OUTONO QUENTE / PRIMAVERA BRILHANTE / INVERNO PROFUNDO / VERÃO SUAVE",
  "subEstacao": "Ex: Outono Puro, Primavera Brilhante",
  "descricao": "Frase curta e elegante sobre a harmonia cromática da pessoa",
  "subtom": { "titulo": "Quente/Frio/Neutro/Oliva", "desc": "Descrição curta (ex: dourado/amarelado)" },
  "contraste": { "titulo": "Alto/Médio/Baixo", "desc": "Descrição curta (ex: equilíbrio entre pele e cabelo)" },
  "profundidade": { "titulo": "Clara/Média/Profunda", "desc": "Descrição curta" },
  "intensidade": { "titulo": "Suave/Média/Brilhante", "desc": "Descrição curta" },
  "formatoRosto": { "titulo": "Oval/Redondo/Quadrado/Coração/Diamante/Retangular", "desc": "Descrição curta do equilíbrio facial" },
  "impressaoVisual": "Descrição curta da impressão visual geral (ex: Jovem, radiante e delicada)",
  "cartelaIdeal": [
    { "nome": "MOSTARDA", "hex": "#d4a017" },
    { "nome": "TERRACOTA", "hex": "#c87669" }
  ],
  "coresValorizam": {
    "desc": "Frase curta sobre cores que realçam",
    "cores": [
      { "nome": "Mostarda", "hex": "#d4a017" }
    ]
  },
  "coresApagam": {
    "desc": "Frase curta sobre cores que não favorecem",
    "cores": [
      { "nome": "Cinza Frio", "hex": "#808080" }
    ]
  },
  "metaisIdeais": [
    { "nome": "OURO AMARELO", "hex": "#d4af37" },
    { "nome": "OURO ROSÉ", "hex": "#b76e79" }
  ],
  "dicaMetais": "Frase curta sobre metais",
  "melhoresTonsCabelo": [
    { "nome": "MEL DOURADO", "hex": "#b8804a" },
    { "nome": "CASTANHO CLARO", "hex": "#8b5a3c" }
  ],
  "dicaCabelo": "Frase curta sobre cabelo e dicas de mechas",
  "maquiagemIdeal": {
    "base": { "hex": "#e5c298", "desc": "Tom da base (ex: bege claro quente)" },
    "blush": { "hex": "#ffbfa3", "desc": "Tons (ex: pêssego, coral)" },
    "batom": { "hex": "#c87669", "desc": "Tons (ex: nude quente, terracota)" },
    "sombras": { "hex": "#b87333", "desc": "Tons (ex: dourado, cobre, bronze)" }
  },
  "neutrosIdeais": [
    { "nome": "BEGE QUENTE", "hex": "#d4c5a9" },
    { "nome": "MARFIM", "hex": "#f5f1e8" }
  ],
  "suaForca": {
    "titulo": "EX: CALOR + NATURALIDADE / LUMINOSIDADE & VITALIDADE",
    "textoPrincipal": "Frase curta destacando a força visual",
    "textoSecundario": "Frase complementar sobre o que valoriza"
  },
  "mensagemFinal": "Frase elegante final personalizada (ex: Quando você usa as cores certas, sua beleza aparece com leveza e confiança)"
}

REQUISITOS MÍNIMOS:
- cartelaIdeal: 12 cores com nomes e hex válidos
- coresValorizam.cores: 10 cores com nomes e hex
- coresApagam.cores: 10 cores com nomes e hex
- metaisIdeais: 3-4 metais com hex
- melhoresTonsCabelo: 4 tons com hex realistas de cabelo
- neutrosIdeais: 8 neutros com nomes e hex

Lembre-se: PERSONALIZE TUDO baseado na foto real desta pessoa específica. Cada análise deve ser única e diferente.`;

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

      // Generate DALL-E image (vertical 4:5 ratio = 1024x1792 unavailable, use 1024x1024)
      let imageUrl = null;
      try {
        console.log('Iniciando geração de imagem...');
        const imagePrompt = buildDallePrompt(resultData.colorimetria);

        // Try gpt-image-1 first (2025+ model), fallback to dall-e-3
        let imgResponse;
        try {
          imgResponse = await openai.images.generate({
            model: 'gpt-image-1',
            prompt: imagePrompt,
            n: 1,
            size: '1024x1536',
            quality: 'medium'
          });
        } catch (e) {
          console.log('gpt-image-1 falhou, tentando dall-e-3...');
          imgResponse = await openai.images.generate({
            model: 'dall-e-3',
            prompt: imagePrompt,
            n: 1,
            size: '1024x1792',
            quality: 'standard'
          });
        }

        const imgData = imgResponse.data[0];
        if (imgData.b64_json) {
          imageUrl = `data:image/png;base64,${imgData.b64_json}`;
        } else if (imgData.url) {
          imageUrl = imgData.url;
        }
        resultData.imageUrl = imageUrl;
        console.log('Imagem gerada com sucesso');
      } catch (imgError) {
        console.error('Erro ao gerar imagem:', imgError.message, imgError);
        return res.status(500).json({
          error: `Falha ao gerar imagem: ${imgError.message || 'Erro desconhecido'}. Tente novamente.`
        });
      }

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
