import React, { useRef, useEffect, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, FileText } from 'lucide-react';

const CANVAS_W = 1080;
const CANVAS_H = 1350;

// ── Design tokens ─────────────────────────────────────────────
const T = {
  bgMain:   '#0c0a08',
  bgCard:   '#151210',
  bgCard2:  '#0f0d0b',
  gold:     '#c9a96e',
  goldLt:   '#f3e5ab',
  goldDk:   '#7a5c28',
  white:    '#f5f1e8',
  muted:    '#8a7868',
  border:   'rgba(201,169,110,0.30)',
  borderBt: 'rgba(201,169,110,0.60)',
  serif:    "'Cormorant Garamond','Playfair Display',serif",
  cinzel:   "'Cinzel',serif",
  sans:     "'Inter',sans-serif",
  script:   "'Great Vibes','Dancing Script',cursive",
};

// ── Tiny helper components ────────────────────────────────────
const GoldLine = ({ style = {} }) => (
  <div style={{
    height: 1, background: `linear-gradient(90deg,transparent,${T.gold},transparent)`,
    opacity: 0.6, ...style
  }} />
);

const GoldLineSolid = ({ style = {} }) => (
  <div style={{
    height: 1, background: T.border, ...style
  }} />
);

const Star = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill={T.gold}>
    <path d="M12 2L13.8 9.2L21 10L14.5 16L16.5 23L12 19.5L7.5 23L9.5 16L3 10L10.2 9.2Z"/>
  </svg>
);

const DiamondOrnament = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill={T.gold}>
    <path d="M12 2L22 12L12 22L2 12Z"/>
  </svg>
);

const SectionLabel = ({ children, style = {} }) => (
  <p style={{
    fontFamily: T.cinzel, fontSize: 8.5, letterSpacing: '0.45em',
    color: T.gold, textTransform: 'uppercase', margin: 0, lineHeight: 1,
    ...style
  }}>{children}</p>
);

const CardBorder = ({ children, style = {}, innerStyle = {} }) => (
  <div style={{
    border: `1px solid ${T.border}`,
    borderRadius: 2,
    background: T.bgCard,
    ...style
  }}>
    <div style={{ padding: '10px 12px', ...innerStyle }}>
      {children}
    </div>
  </div>
);

const ColorSwatch = ({ hex, nome, showHex = true, size = 68 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
    <div style={{
      width: size, height: size, background: hex,
      border: `1px solid ${T.border}`, borderRadius: 1,
      boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.06), 0 3px 8px rgba(0,0,0,0.5)`,
    }} />
    {nome && (
      <p style={{
        fontFamily: T.cinzel, fontSize: 7, letterSpacing: '0.12em',
        color: T.white, textTransform: 'uppercase', margin: 0, lineHeight: 1.15,
        textAlign: 'center', maxWidth: size
      }}>{nome}</p>
    )}
    {showHex && (
      <p style={{
        fontFamily: T.sans, fontSize: 7, color: T.muted,
        margin: 0, letterSpacing: '0.06em', lineHeight: 1
      }}>{hex}</p>
    )}
  </div>
);

const SmallSwatch = ({ hex, size = 48 }) => (
  <div style={{
    width: size, height: size, background: hex,
    border: `1px solid ${T.border}`, borderRadius: 1,
    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
    flexShrink: 0,
  }} />
);

const MetalDisc = ({ hex, nome }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
    <div style={{
      width: 48, height: 48, borderRadius: '50%',
      background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.55) 0%, ${hex} 30%, ${hex} 65%, rgba(0,0,0,0.35) 100%)`,
      border: `1.5px solid ${T.borderBt}`,
      boxShadow: `0 4px 10px rgba(0,0,0,0.5), inset 0 1px 3px rgba(255,255,255,0.3)`,
    }} />
    <p style={{
      fontFamily: T.cinzel, fontSize: 6.5, letterSpacing: '0.12em',
      color: T.goldLt, textTransform: 'uppercase', margin: 0,
      lineHeight: 1.2, textAlign: 'center', maxWidth: 58
    }}>{nome}</p>
  </div>
);

const HairSwatch = ({ hex, nome }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
    <div style={{
      width: '100%', height: 72, borderRadius: '50% 50% 4px 4px / 8px 8px 4px 4px',
      background: `linear-gradient(180deg, rgba(255,255,255,0.1) 0%, ${hex} 15%, ${hex} 70%, rgba(0,0,0,0.4) 100%)`,
      border: `1px solid ${T.border}`,
      boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
      overflow: 'hidden',
    }}>
      <div style={{
        width: '30%', height: '100%', marginLeft: '15%',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
      }} />
    </div>
    <p style={{
      fontFamily: T.cinzel, fontSize: 6.5, letterSpacing: '0.1em',
      color: T.white, textTransform: 'uppercase', margin: 0,
      lineHeight: 1.2, textAlign: 'center'
    }}>{nome}</p>
  </div>
);

const MakeupDot = ({ hex, size = 14 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%', background: hex,
    border: `1px solid ${T.border}`, flexShrink: 0,
    boxShadow: `inset 0 -1px 3px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.3)`,
  }} />
);

// ── Main Component ─────────────────────────────────────────────
const ResultInfographic = ({ data, image }) => {
  const wrapperRef = useRef();
  const canvasRef = useRef();
  const [scale, setScale] = useState(0.5);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const update = () => {
      if (!wrapperRef.current) return;
      const avail = wrapperRef.current.clientWidth;
      setScale(Math.min(1, avail / CANVAS_W));
    };
    update();
    const ro = new ResizeObserver(update);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  const captureCanvas = async () => {
    const el = canvasRef.current;
    return html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      width: CANVAS_W,
      height: CANVAS_H,
      backgroundColor: T.bgMain,
      scrollX: 0,
      scrollY: -window.scrollY,
      imageTimeout: 15000,
    });
  };

  const exportJpeg = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      const canvas = await captureCanvas();
      const url = canvas.toDataURL('image/jpeg', 0.95);
      const a = document.createElement('a');
      a.download = 'visage-colorimetria.jpg';
      a.href = url;
      a.click();
    } catch (err) {
      alert('Erro ao exportar imagem: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const exportPdf = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      const canvas = await captureCanvas();
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({ orientation: 'p', unit: 'px', format: [CANVAS_W, CANVAS_H] });
      pdf.addImage(imgData, 'JPEG', 0, 0, CANVAS_W, CANVAS_H);
      pdf.save('visage-colorimetria.pdf');
    } catch (err) {
      alert('Erro ao gerar PDF: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  // Support both old and new data shapes
  const raw = data?.colorimetria || data || {};
  const c = {
    estacao:       raw.estacao           || raw.estacaoCromatica        || '',
    subtipo:       raw.subtipo           || raw.estacaoCromaticaSub     || '',
    frase:         raw.frase_principal   || raw.descricaoEstacao        || '',
    subtom:        typeof raw.subtom === 'string' ? raw.subtom : raw.subtom?.titulo || '',
    contraste:     typeof raw.contraste === 'string' ? raw.contraste : raw.contraste?.titulo || '',
    profundidade:  typeof raw.profundidade === 'string' ? raw.profundidade : raw.profundidade?.titulo || '',
    intensidade:   typeof raw.intensidade === 'string' ? raw.intensidade : raw.intensidade?.titulo || '',
    temperatura:   raw.temperatura_beleza || '',
    formatoRosto:  typeof raw.formato_rosto === 'string' ? raw.formato_rosto : (raw.formatoRosto?.titulo || raw.formato_rosto || ''),
    impressao:     raw.impressao_visual  || raw.impressaoVisual || '',
    forca_visual:  raw.forca_visual      || raw.suaForca?.titulo || '',
    cartela:       raw.cartela_ideal     || raw.cartelaIdeal     || [],
    valorizam:     raw.cores_valorizam   || raw.coresValorizam?.cores || [],
    apagam:        raw.cores_apagam      || raw.coresApagam?.cores    || [],
    metais:        raw.metais            || raw.metaisIdeais           || [],
    cabelo:        raw.tons_cabelo       || raw.melhoresTonsCabelo     || [],
    reflexos:      raw.reflexos          || [],
    maquiagem:     raw.maquiagem         || raw.maquiagemIdeal         || {},
    neutros:       raw.neutros           || raw.neutrosIdeais          || [],
    mensagem:      raw.mensagem_final    || '',
  };

  if (!c.estacao) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: T.muted }}>
        <p>Aguardando análise...</p>
      </div>
    );
  }

  // Normalize old makeup format
  const maqBase   = c.maquiagem?.base?.hex   || c.maquiagem?.base   || '#e5c298';
  const maqBlush  = Array.isArray(c.maquiagem?.blush)
    ? c.maquiagem.blush : [{ hex: c.maquiagem?.blush?.hex || '#f4b8a0', nome: c.maquiagem?.blush?.desc || 'Blush' }];
  const maqBatom  = Array.isArray(c.maquiagem?.batom)
    ? c.maquiagem.batom : [{ hex: c.maquiagem?.batom?.hex || '#c87669', nome: c.maquiagem?.batom?.desc || 'Batom' }];
  const maqSombra = Array.isArray(c.maquiagem?.sombras)
    ? c.maquiagem.sombras : [{ hex: c.maquiagem?.sombras?.hex || '#b87333', nome: c.maquiagem?.sombras?.desc || 'Sombra' }];
  const maqBaseHex = typeof maqBase === 'object' ? maqBase.hex : maqBase;

  // Limit arrays
  const cartela12 = c.cartela.slice(0, 12);
  const val8 = c.valorizam.slice(0, 8);
  const apa8 = c.apagam.slice(0, 8);
  const metais4 = c.metais.slice(0, 4);
  const cabelo4 = c.cabelo.slice(0, 4);
  const neutros8 = c.neutros.slice(0, 8);

  // ── Canvas content ──────────────────────────────────────────
  const PAD = 26;
  const INNER_W = CANVAS_W - PAD * 2; // 1028

  return (
    <div className="ed-wrapper">
      <div className="export-actions" style={{ marginBottom: '1.5rem' }}>
        <button onClick={exportJpeg} className="btn btn-primary" style={{ width: 'auto' }} disabled={exporting}>
          <Download size={16} /> {exporting ? 'Gerando...' : 'Salvar JPEG'}
        </button>
        <button onClick={exportPdf} className="btn btn-outline" disabled={exporting}>
          <FileText size={16} /> {exporting ? 'Gerando...' : 'Baixar PDF'}
        </button>
      </div>

      {/* Scaler wrapper */}
      <div ref={wrapperRef} style={{ width: '100%' }}>
        <div style={{
          width: CANVAS_W * scale,
          height: CANVAS_H * scale,
          overflow: 'hidden',
          margin: '0 auto',
        }}>
          {/* ── THE ACTUAL 1080×1350 CANVAS ── */}
          <div
            ref={canvasRef}
            style={{
              width: CANVAS_W, height: CANVAS_H,
              transformOrigin: 'top left',
              transform: `scale(${scale})`,
              background: T.bgMain,
              fontFamily: T.sans,
              color: T.white,
              overflow: 'hidden',
              position: 'relative',
              boxSizing: 'border-box',
            }}
          >
            {/* Outer frame */}
            <div style={{
              position: 'absolute', inset: 10,
              border: `1px solid ${T.border}`,
              pointerEvents: 'none',
              zIndex: 1,
            }} />

            {/* Main content area */}
            <div style={{
              position: 'relative', zIndex: 2,
              padding: `${PAD}px ${PAD}px`,
              display: 'flex', flexDirection: 'column',
              height: '100%', boxSizing: 'border-box',
              gap: 0,
            }}>

              {/* ═══ HEADER ═══════════════════════════════════ */}
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                {/* Top ornament */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,transparent,${T.borderBt})` }} />
                  <Star /><DiamondOrnament /><Star />
                  <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,${T.borderBt},transparent)` }} />
                </div>

                <p style={{
                  fontFamily: T.cinzel, fontSize: 11, letterSpacing: '0.55em',
                  color: T.gold, textTransform: 'uppercase', margin: '0 0 4px',
                  paddingLeft: '0.55em', lineHeight: 1,
                }}>SUA COLORIMETRIA PESSOAL</p>

                <GoldLine style={{ maxWidth: 400, margin: '6px auto' }} />

                {/* Season */}
                <p style={{
                  fontFamily: T.serif, fontSize: 52, fontWeight: 600,
                  color: T.goldLt, letterSpacing: '0.04em', lineHeight: 1.05,
                  margin: '2px 0',
                  textShadow: `0 0 40px rgba(201,169,110,0.3)`,
                  textTransform: 'uppercase',
                }}>{c.estacao}</p>

                {c.subtipo && (
                  <p style={{
                    fontFamily: T.serif, fontStyle: 'italic', fontSize: 13,
                    color: T.gold, letterSpacing: '0.08em', margin: '2px 0 4px',
                  }}>{c.subtipo}</p>
                )}

                {/* Frase */}
                <p style={{
                  fontFamily: T.serif, fontStyle: 'italic', fontSize: 13,
                  color: T.muted, letterSpacing: '0.04em',
                  margin: '4px 0 8px',
                  maxWidth: 640, marginLeft: 'auto', marginRight: 'auto',
                }}>"{c.frase}"</p>

                <GoldLine style={{ margin: '0 auto', maxWidth: 600 }} />
              </div>

              {/* ═══ MAIN ROW: PHOTO + CARTELA + ANÁLISE ══════ */}
              <div style={{
                display: 'flex', gap: 12, marginTop: 14, flexShrink: 0,
              }}>
                {/* PHOTO */}
                <div style={{ width: 296, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{
                    width: '100%', height: 268,
                    border: `1.5px solid ${T.borderBt}`,
                    borderRadius: 2, overflow: 'hidden',
                    boxShadow: `0 0 24px rgba(201,169,110,0.12), inset 0 0 0 4px rgba(201,169,110,0.06)`,
                    position: 'relative',
                  }}>
                    {image && <img src={image} alt="Rosto" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                    {/* Inner frame */}
                    <div style={{ position: 'absolute', inset: 8, border: `1px solid ${T.border}`, pointerEvents: 'none' }} />
                  </div>

                  {/* Impressão visual under photo */}
                  <div style={{
                    border: `1px solid ${T.border}`, borderRadius: 2,
                    background: T.bgCard, padding: '8px 10px',
                  }}>
                    <SectionLabel style={{ marginBottom: 4 }}>IMPRESSÃO VISUAL</SectionLabel>
                    <p style={{
                      fontFamily: T.serif, fontStyle: 'italic', fontSize: 10.5,
                      color: T.white, lineHeight: 1.45, margin: 0,
                    }}>{c.impressao}</p>
                  </div>
                </div>

                {/* RIGHT COLUMN: CARTELA + ANÁLISE */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>

                  {/* CARTELA IDEAL */}
                  <div style={{ border: `1px solid ${T.border}`, borderRadius: 2, background: T.bgCard, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <GoldLineSolid style={{ flex: 1 }} />
                      <SectionLabel>SUA CARTELA IDEAL</SectionLabel>
                      <GoldLineSolid style={{ flex: 1 }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 6 }}>
                      {cartela12.map((cor, i) => (
                        <ColorSwatch key={i} hex={cor.hex} nome={cor.nome} showHex={true} size={106} />
                      ))}
                    </div>
                  </div>

                  {/* SUA ANÁLISE */}
                  <div style={{ border: `1px solid ${T.border}`, borderRadius: 2, background: T.bgCard, padding: '10px 12px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <GoldLineSolid style={{ flex: 1 }} />
                      <SectionLabel>SUA ANÁLISE</SectionLabel>
                      <GoldLineSolid style={{ flex: 1 }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
                      {[
                        { label: 'SUBTOM DA PELE',     value: c.subtom },
                        { label: 'CONTRASTE',           value: c.contraste },
                        { label: 'PROFUNDIDADE',        value: c.profundidade },
                        { label: 'INTENSIDADE',         value: c.intensidade },
                        { label: 'TEMPERATURA',         value: c.temperatura },
                        { label: 'FORMATO DO ROSTO',    value: c.formatoRosto },
                      ].filter(x => x.value).map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <div style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: T.gold, flexShrink: 0, marginTop: 4,
                          }} />
                          <div>
                            <p style={{
                              fontFamily: T.cinzel, fontSize: 7, letterSpacing: '0.3em',
                              color: T.gold, margin: '0 0 1px', textTransform: 'uppercase',
                            }}>{item.label}</p>
                            <p style={{
                              fontFamily: T.serif, fontSize: 11, color: T.white,
                              margin: 0, lineHeight: 1.3,
                            }}>{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ═══ COLORS ROW ════════════════════════════════ */}
              <div style={{ display: 'flex', gap: 10, marginTop: 10, flexShrink: 0 }}>
                {[
                  { label: 'CORES QUE TE VALORIZAM', sub: 'Harmoniosas com sua beleza natural', colors: val8, accent: T.gold },
                  { label: 'CORES QUE TE APAGAM', sub: 'Evite para não apagar sua luminosidade', colors: apa8, accent: '#a04040' },
                ].map((col, ci) => (
                  <div key={ci} style={{
                    flex: 1, border: `1px solid ${ci === 0 ? T.border : 'rgba(160,64,64,0.35)'}`,
                    borderRadius: 2, background: T.bgCard, padding: '8px 10px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 8, height: 8, background: col.accent, borderRadius: 1 }} />
                      <p style={{
                        fontFamily: T.cinzel, fontSize: 8.5, letterSpacing: '0.3em',
                        color: col.accent, textTransform: 'uppercase', margin: 0,
                      }}>{col.label}</p>
                    </div>
                    <p style={{
                      fontFamily: T.serif, fontStyle: 'italic', fontSize: 10,
                      color: T.muted, margin: '0 0 6px', lineHeight: 1.3,
                    }}>{col.sub}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 }}>
                      {col.colors.map((cor, i) => (
                        <ColorSwatch key={i} hex={cor.hex} nome={cor.nome} showHex={false} size={52} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* ═══ STYLE GUIDE: METAIS + CABELO + MAQUIAGEM ═ */}
              <div style={{ display: 'flex', gap: 10, marginTop: 10, flexShrink: 0 }}>

                {/* ─── METAIS IDEAIS ─── */}
                <div style={{
                  flex: 1, border: `1px solid ${T.border}`, borderRadius: 2,
                  background: T.bgCard, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                }}>
                  {/* Library image */}
                  <div style={{ position: 'relative', height: 130, overflow: 'hidden', flexShrink: 0 }}>
                    <img
                      src="/assets/biblioteca-metais.png"
                      crossOrigin="anonymous"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }}
                    />
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0, height: 48,
                      background: `linear-gradient(transparent, ${T.bgCard})`,
                    }} />
                    <div style={{
                      position: 'absolute', top: 6, left: 0, right: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 8px',
                    }}>
                      <div style={{ flex: 1, height: 1, background: T.border }} />
                      <p style={{
                        fontFamily: T.cinzel, fontSize: 7.5, letterSpacing: '0.38em',
                        color: T.gold, textTransform: 'uppercase', margin: 0,
                        background: 'rgba(12,10,8,0.82)', padding: '2px 7px', borderRadius: 1,
                      }}>METAIS IDEAIS</p>
                      <div style={{ flex: 1, height: 1, background: T.border }} />
                    </div>
                  </div>
                  {/* Selected metals */}
                  <div style={{ padding: '6px 8px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5 }}>
                    {metais4.map((m, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                          background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.5) 0%, ${m.hex} 40%, rgba(0,0,0,0.3) 100%)`,
                          border: `1px solid ${T.border}`,
                        }} />
                        <p style={{ fontFamily: T.cinzel, fontSize: 7.5, letterSpacing: '0.12em', color: T.goldLt, margin: 0 }}>
                          {m.nome}
                        </p>
                        {m.acabamento && (
                          <p style={{ fontFamily: T.sans, fontSize: 7, color: T.muted, margin: 0, fontStyle: 'italic' }}>
                            {m.acabamento}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ─── TONS DE CABELO ─── */}
                <div style={{
                  flex: 1.2, border: `1px solid ${T.border}`, borderRadius: 2,
                  background: T.bgCard, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                }}>
                  {/* Library image */}
                  <div style={{ position: 'relative', height: 130, overflow: 'hidden', flexShrink: 0 }}>
                    <img
                      src="/assets/biblioteca-cabelo.png"
                      crossOrigin="anonymous"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }}
                    />
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0, height: 48,
                      background: `linear-gradient(transparent, ${T.bgCard})`,
                    }} />
                    <div style={{
                      position: 'absolute', top: 6, left: 0, right: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 8px',
                    }}>
                      <div style={{ flex: 1, height: 1, background: T.border }} />
                      <p style={{
                        fontFamily: T.cinzel, fontSize: 7.5, letterSpacing: '0.35em',
                        color: T.gold, textTransform: 'uppercase', margin: 0,
                        background: 'rgba(12,10,8,0.82)', padding: '2px 7px', borderRadius: 1,
                      }}>TONS DE CABELO</p>
                      <div style={{ flex: 1, height: 1, background: T.border }} />
                    </div>
                  </div>
                  {/* Selected hair tones + reflexos */}
                  <div style={{ padding: '6px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {cabelo4.map((h, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
                          <div style={{
                            width: 12, height: 24, borderRadius: '50% 50% 3px 3px / 4px 4px 3px 3px',
                            background: `linear-gradient(180deg, rgba(255,255,255,0.12) 0%, ${h.hex} 20%, ${h.hex} 70%, rgba(0,0,0,0.35) 100%)`,
                            border: `1px solid ${T.border}`, flexShrink: 0,
                          }} />
                          <p style={{
                            fontFamily: T.cinzel, fontSize: 6.5, letterSpacing: '0.08em',
                            color: T.white, margin: 0, lineHeight: 1.2,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{h.nome}</p>
                        </div>
                      ))}
                    </div>
                    {c.reflexos.length > 0 && (
                      <div>
                        <p style={{ fontFamily: T.cinzel, fontSize: 6.5, letterSpacing: '0.3em', color: T.muted, margin: '2px 0', textTransform: 'uppercase' }}>Reflexos</p>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {c.reflexos.slice(0, 3).map((r, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <div style={{ width: 22, height: 5, background: r.hex, borderRadius: 10, border: `1px solid ${T.border}` }} />
                              <p style={{ fontFamily: T.sans, fontSize: 7, color: T.muted, margin: 0 }}>{r.nome}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ─── MAQUIAGEM IDEAL ─── */}
                <div style={{
                  flex: 1.1, border: `1px solid ${T.border}`, borderRadius: 2,
                  background: T.bgCard, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                }}>
                  {/* Library image */}
                  <div style={{ position: 'relative', height: 130, overflow: 'hidden', flexShrink: 0 }}>
                    <img
                      src="/assets/biblioteca-maquiagem.png"
                      crossOrigin="anonymous"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }}
                    />
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0, height: 48,
                      background: `linear-gradient(transparent, ${T.bgCard})`,
                    }} />
                    <div style={{
                      position: 'absolute', top: 6, left: 0, right: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 8px',
                    }}>
                      <div style={{ flex: 1, height: 1, background: T.border }} />
                      <p style={{
                        fontFamily: T.cinzel, fontSize: 7.5, letterSpacing: '0.38em',
                        color: T.gold, textTransform: 'uppercase', margin: 0,
                        background: 'rgba(12,10,8,0.82)', padding: '2px 7px', borderRadius: 1,
                      }}>MAQUIAGEM IDEAL</p>
                      <div style={{ flex: 1, height: 1, background: T.border }} />
                    </div>
                  </div>
                  {/* Selected makeup items */}
                  <div style={{ padding: '6px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {[
                      { label: 'BASE',    items: [typeof c.maquiagem?.base === 'object' ? c.maquiagem.base : { nome: 'Base', hex: maqBaseHex }] },
                      { label: 'BLUSH',   items: maqBlush.slice(0, 2) },
                      { label: 'BATOM',   items: maqBatom.slice(0, 2) },
                      { label: 'SOMBRAS', items: maqSombra.slice(0, 2) },
                    ].map((row, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <p style={{ fontFamily: T.cinzel, fontSize: 6.5, letterSpacing: '0.28em', color: T.gold, margin: 0, width: 40, flexShrink: 0, textTransform: 'uppercase' }}>{row.label}</p>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {row.items.map((item, j) => (
                            <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <MakeupDot hex={item.hex} size={11} />
                              <p style={{ fontFamily: T.sans, fontSize: 7.5, color: T.muted, margin: 0 }}>{item.nome || ''}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {c.maquiagem?.acabamento && (
                      <p style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 8.5, color: T.muted, margin: '2px 0 0' }}>
                        Acabamento: {c.maquiagem.acabamento}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ═══ NEUTROS ═══════════════════════════════════ */}
              <div style={{
                border: `1px solid ${T.border}`, borderRadius: 2,
                background: T.bgCard, padding: '8px 12px', marginTop: 10, flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <GoldLineSolid style={{ flex: 1 }} />
                  <SectionLabel>NEUTROS IDEAIS</SectionLabel>
                  <GoldLineSolid style={{ flex: 1 }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 6 }}>
                  {neutros8.map((n, i) => (
                    <ColorSwatch key={i} hex={n.hex} nome={n.nome} showHex={false} size={90} />
                  ))}
                </div>
              </div>

              {/* ═══ FORÇA + MENSAGEM ══════════════════════════ */}
              <div style={{ marginTop: 10, flexShrink: 0 }}>
                <div style={{
                  border: `1px solid ${T.borderBt}`, borderRadius: 2,
                  background: `linear-gradient(135deg,rgba(201,169,110,0.08),rgba(201,169,110,0.03))`,
                  padding: '10px 14px', marginBottom: 8,
                }}>
                  <SectionLabel style={{ marginBottom: 4 }}>SUA FORÇA VISUAL</SectionLabel>
                  <p style={{
                    fontFamily: T.serif, fontSize: 12, color: T.white,
                    margin: 0, lineHeight: 1.5,
                  }}>{c.forca_visual}</p>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <GoldLine style={{ marginBottom: 8 }} />
                  <p style={{
                    fontFamily: T.script, fontSize: 22,
                    color: T.goldLt, margin: '0 auto',
                    letterSpacing: '0.02em', lineHeight: 1.3,
                    maxWidth: 700,
                    textShadow: `0 0 20px rgba(243,229,171,0.2)`,
                  }}>{c.mensagem}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 8 }}>
                    <div style={{ flex: 1, maxWidth: 300, height: 1, background: `linear-gradient(90deg,transparent,${T.border})` }} />
                    <DiamondOrnament />
                    <p style={{
                      fontFamily: T.cinzel, fontSize: 8, letterSpacing: '0.45em',
                      color: T.gold, textTransform: 'uppercase', margin: 0, paddingLeft: '0.45em',
                    }}>V I S A G Ê</p>
                    <DiamondOrnament />
                    <div style={{ flex: 1, maxWidth: 300, height: 1, background: `linear-gradient(90deg,${T.border},transparent)` }} />
                  </div>
                </div>
              </div>

            </div>{/* end content */}
          </div>{/* end canvas */}
        </div>{/* end overflow wrapper */}
      </div>{/* end scaler wrapper */}
    </div>
  );
};

export default ResultInfographic;
