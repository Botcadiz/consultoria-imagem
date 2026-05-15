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
  const cartela = (a.cartelaIdeal || []).slice(0, 12).map(c => c.nome).join(', ');
  const valorizam = (a.coresValorizam?.cores || []).slice(0, 10).map(c => c.nome).join(', ');
  const apagam = (a.coresApagam?.cores || []).slice(0, 10).map(c => c.nome).join(', ');
  const metais = (a.metaisIdeais || []).map(m => m.nome).join(', ');
  const cabelo = (a.melhoresTonsCabelo || []).map(c => c.nome).join(', ');
  const neutros = (a.neutrosIdeais || []).slice(0, 8).map(c => c.nome).join(', ');

  return `Crie uma arte visual profissional de colorimetria pessoal em formato vertical 3:4, com estilo de painel premium de consultoria de imagem.

ESTILO VISUAL:
- Fundo PRETO com detalhes em DOURADO CLARO estiloso
- Estética elegante, feminina, editorial, sofisticada e luxuosa
- Tipografia serifada elegante para títulos, fonte limpa para textos
- Cards arredondados com bordas finas douradas
- Paletas de cores com quadrados arredondados e nomes embaixo
- Ícones minimalistas dourados
- Aparência de consultoria premium, fácil de salvar no celular

LAYOUT (de cima para baixo):

1. TOPO: Foto da pessoa no canto superior esquerdo dentro de moldura arredondada com borda dourada. Ao lado direito, título grande SERIFADO "SUA COLORIMETRIA PESSOAL" em letras pequenas douradas, e abaixo título principal MUITO GRANDE: "${a.estacaoCromatica || 'OUTONO QUENTE'}". Abaixo frase italic dourada: "${a.descricaoEstacao || 'Sua beleza em harmonia com cores quentes e naturais'}"

2. SEÇÃO "SUA CARTELA IDEAL" - Grade com 12 quadrados arredondados de cores, cada um com nome dourado abaixo. Cores: ${cartela}

3. COLUNA LATERAL ESQUERDA "SUA ANÁLISE" - Cards com ícones dourados:
   • SUBTOM DA PELE: ${a.subtom?.titulo || 'Quente'} - ${a.subtom?.desc || 'dourado/amarelado'}
   • CONTRASTE: ${a.contraste?.titulo || 'Médio'} - ${a.contraste?.desc || 'equilíbrio entre pele, cabelo e olhos'}
   • PROFUNDIDADE: ${a.profundidade?.titulo || 'Média'} - ${a.profundidade?.desc || 'nem muito clara, nem muito profunda'}
   • INTENSIDADE: ${a.intensidade?.titulo || 'Suave'} - ${a.intensidade?.desc || 'cores quentes e naturais'}
   • FORMATO DO ROSTO: ${a.formatoRosto?.titulo || 'Oval'} - ${a.formatoRosto?.desc || 'equilíbrio facial'}
   • IMPRESSÃO VISUAL: ${a.impressaoVisual || 'Natural e harmoniosa'}

4. CARD "CORES QUE TE VALORIZAM" com check verde dourado. Texto: "${a.coresValorizam?.desc || 'Cores quentes e terrosas iluminam sua pele'}". Paleta com 10 quadrados: ${valorizam}

5. CARD "CORES QUE TE APAGAM" com X vermelho. Texto: "${a.coresApagam?.desc || 'Cores frias quebram sua harmonia natural'}". Paleta com 10 quadrados: ${apagam}

6. CARD "METAIS IDEAIS" - Texto: "${a.dicaMetais || 'Metais quentes realçam seu brilho natural'}". Círculos dourados realistas com: ${metais}

7. CARD "MELHORES TONS DE CABELO" - Texto: "${a.dicaCabelo || 'Tons quentes harmonizam'}". Amostras visuais de mechas de cabelo nos tons: ${cabelo}

8. CARD "MAQUIAGEM IDEAL" - Mostrar:
   • BASE: ${a.maquiagemIdeal?.base?.desc || 'fundo dourado'}
   • BLUSH: ${a.maquiagemIdeal?.blush?.desc || 'pêssego, coral'}
   • BATOM: ${a.maquiagemIdeal?.batom?.desc || 'nude quente, terracota'}
   • SOMBRAS: ${a.maquiagemIdeal?.sombras?.desc || 'dourado, cobre, bronze'}

9. SEÇÃO HORIZONTAL "NEUTROS IDEAIS" - 8 quadrados arredondados com: ${neutros}

10. CARD INFERIOR "SUA FORÇA" - Título grande dourado: "${a.suaForca?.titulo || 'CALOR + NATURALIDADE'}". Texto: "${a.suaForca?.textoSecundario || 'Aposte: tons terrosos, dourados e naturais'}"

11. FAIXA FINAL - Frase manuscrita elegante dourada: "Você já tem tudo que precisa para brilhar!" e "${a.mensagemFinal || 'Quando você usa as cores certas, sua beleza aparece com mais leveza e confiança'}"

IMPORTANTE: Visual limpo, sofisticado, organizado em blocos claros, textos curtos, fontes legíveis e grandes. Use a pessoa na foto como referência para harmonizar todo o visual. Mantenha naturalidade e elegância.`;
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
        const dallePrompt = buildDallePrompt(resultData.colorimetria);
        const dalleResponse = await openai.images.generate({
          model: 'dall-e-3',
          prompt: dallePrompt,
          n: 1,
          size: '1024x1792',
          quality: 'standard',
          style: 'vivid'
        });
        imageUrl = dalleResponse.data[0].url;
        resultData.imageUrl = imageUrl;
      } catch (dalleError) {
        console.error('Erro ao gerar imagem DALL-E:', dalleError.message);
        // Continue without image, don't fail the request
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
