import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, FileText } from 'lucide-react';

const ResultInfographic = ({ data, image }) => {
  const printRef = useRef();

  const handleDownloadImage = async () => {
    const element = printRef.current;
    const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#f5ebdb' });
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const link = document.createElement('a');
    link.download = 'visage-consultoria.jpg';
    link.href = dataUrl;
    link.click();
  };

  const handleDownloadPDF = async () => {
    const element = printRef.current;
    const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#f5ebdb' });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'l' : 'p',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });
    pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
    pdf.save('visage-consultoria.pdf');
  };

  if (!data || !data.colorimetria) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#8b6244' }}>
        <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Aguardando análise...</p>
      </div>
    );
  }

  const { colorimetria: c } = data;

  // Decorative divider with center ornament
  const Divider = () => (
    <div className="ed-divider">
      <span className="ed-divider-line"></span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10L12 2Z" fill="#9a6a4a" />
      </svg>
      <span className="ed-divider-line"></span>
    </div>
  );

  // Botanical SVG for footer
  const Botanical = () => (
    <svg width="60" height="50" viewBox="0 0 60 50" fill="none">
      <path d="M30 45 Q20 30 12 18" stroke="#9a6a4a" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M30 45 Q40 30 48 18" stroke="#9a6a4a" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <ellipse cx="15" cy="25" rx="3" ry="6" transform="rotate(-25 15 25)" fill="#b88460" opacity="0.7" />
      <ellipse cx="22" cy="33" rx="2.5" ry="5" transform="rotate(-15 22 33)" fill="#c89978" opacity="0.6" />
      <ellipse cx="45" cy="25" rx="3" ry="6" transform="rotate(25 45 25)" fill="#b88460" opacity="0.7" />
      <ellipse cx="38" cy="33" rx="2.5" ry="5" transform="rotate(15 38 33)" fill="#c89978" opacity="0.6" />
      <circle cx="30" cy="12" r="2.5" fill="#9a6a4a" />
    </svg>
  );

  return (
    <div className="ed-wrapper">
      <div className="export-actions">
        <button onClick={handleDownloadImage} className="btn btn-primary">
          <Download size={18} /> Salvar Imagem
        </button>
        <button onClick={handleDownloadPDF} className="btn btn-outline">
          <FileText size={18} /> Baixar PDF
        </button>
      </div>

      <div className="ed-poster" ref={printRef}>
        {/* ======= HERO HEADER ======= */}
        <header className="ed-header">
          <p className="ed-brand">V I S A G Ê</p>
          <p className="ed-tagline">CONSULTORIA DE IMAGEM PERSONALIZADA</p>
          <Divider />
          <p className="ed-eyebrow">SUA COLORIMETRIA PESSOAL</p>
          <h1 className="ed-season">{c.estacaoCromatica}</h1>
          {c.estacaoCromaticaSub && (
            <p className="ed-subseason">{c.estacaoCromaticaSub}</p>
          )}
          <p className="ed-description">"{c.descricaoEstacao}"</p>
        </header>

        {/* ======= PHOTO + DIAGNOSIS GRID ======= */}
        <section className="ed-hero-section">
          <div className="ed-photo-frame">
            <div className="ed-photo-inner">
              <img src={image} alt="Cliente" />
            </div>
            <div className="ed-photo-label">
              <p className="ed-photo-label-eyebrow">ANÁLISE EXCLUSIVA</p>
              <p className="ed-photo-label-text">{c.impressaoVisual}</p>
            </div>
          </div>

          <div className="ed-diagnosis-grid">
            <div className="ed-diag-card">
              <p className="ed-diag-label">SUBTOM DA PELE</p>
              <p className="ed-diag-value">{c.subtom?.titulo}</p>
              <p className="ed-diag-desc">{c.subtom?.desc}</p>
            </div>
            <div className="ed-diag-card">
              <p className="ed-diag-label">CONTRASTE</p>
              <p className="ed-diag-value">{c.contraste?.titulo}</p>
              <p className="ed-diag-desc">{c.contraste?.desc}</p>
            </div>
            <div className="ed-diag-card">
              <p className="ed-diag-label">PROFUNDIDADE</p>
              <p className="ed-diag-value">{c.profundidade?.titulo}</p>
              <p className="ed-diag-desc">{c.profundidade?.desc}</p>
            </div>
            <div className="ed-diag-card">
              <p className="ed-diag-label">INTENSIDADE</p>
              <p className="ed-diag-value">{c.intensidade?.titulo}</p>
              <p className="ed-diag-desc">{c.intensidade?.desc}</p>
            </div>
            <div className="ed-diag-card">
              <p className="ed-diag-label">FORMATO DO ROSTO</p>
              <p className="ed-diag-value">{c.formatoRosto?.titulo}</p>
              <p className="ed-diag-desc">{c.formatoRosto?.desc}</p>
            </div>
            <div className="ed-diag-card ed-diag-strength">
              <p className="ed-diag-label">SUA FORÇA</p>
              <p className="ed-diag-value ed-diag-strength-value">{c.suaForca?.titulo}</p>
              <p className="ed-diag-desc">{c.suaForca?.textoPrincipal}</p>
            </div>
          </div>
        </section>

        {/* ======= CARTELA IDEAL ======= */}
        <section className="ed-section">
          <div className="ed-section-header">
            <p className="ed-section-num">01</p>
            <h2 className="ed-section-title">SUA CARTELA IDEAL</h2>
            <p className="ed-section-subtitle">As 12 cores que potencializam sua beleza natural</p>
          </div>
          <div className="ed-cartela-grid">
            {c.cartelaIdeal?.slice(0, 12).map((color, i) => (
              <div key={i} className="ed-swatch">
                <div className="ed-swatch-color" style={{ background: color.hex }}></div>
                <p className="ed-swatch-name">{color.nome}</p>
                <p className="ed-swatch-hex">{color.hex}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ======= VALORIZAM vs APAGAM ======= */}
        <section className="ed-section">
          <div className="ed-section-header">
            <p className="ed-section-num">02</p>
            <h2 className="ed-section-title">O QUE USAR E O QUE EVITAR</h2>
          </div>
          <div className="ed-compare-grid">
            <div className="ed-compare-card ed-compare-yes">
              <div className="ed-compare-header">
                <span className="ed-compare-tag ed-tag-yes">USE</span>
                <h3 className="ed-compare-title">CORES QUE TE VALORIZAM</h3>
              </div>
              <p className="ed-compare-desc">{c.coresValorizam?.desc}</p>
              <div className="ed-mini-grid">
                {c.coresValorizam?.cores?.slice(0, 10).map((color, i) => (
                  <div key={i} className="ed-mini-swatch" style={{ background: color.hex }} title={color.nome}></div>
                ))}
              </div>
            </div>
            <div className="ed-compare-card ed-compare-no">
              <div className="ed-compare-header">
                <span className="ed-compare-tag ed-tag-no">EVITE</span>
                <h3 className="ed-compare-title">CORES QUE TE APAGAM</h3>
              </div>
              <p className="ed-compare-desc">{c.coresApagam?.desc}</p>
              <div className="ed-mini-grid">
                {c.coresApagam?.cores?.slice(0, 10).map((color, i) => (
                  <div key={i} className="ed-mini-swatch" style={{ background: color.hex }} title={color.nome}></div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ======= METAIS + CABELO + MAQUIAGEM ======= */}
        <section className="ed-section">
          <div className="ed-section-header">
            <p className="ed-section-num">03</p>
            <h2 className="ed-section-title">SEU GUIA DE ESTILO</h2>
          </div>
          <div className="ed-style-grid">
            {/* METAIS */}
            <div className="ed-style-card">
              <p className="ed-style-eyebrow">ACABAMENTOS</p>
              <h4 className="ed-style-title">METAIS IDEAIS</h4>
              <p className="ed-style-desc">{c.dicaMetais}</p>
              <div className="ed-metal-row">
                {c.metaisIdeais?.slice(0, 4).map((m, i) => (
                  <div key={i} className="ed-metal">
                    <div className="ed-metal-disc" style={{
                      background: `radial-gradient(circle at 35% 30%, #fff7e6 0%, ${m.hex} 40%, ${m.hex} 70%, rgba(0,0,0,0.25) 100%)`
                    }}></div>
                    <p className="ed-metal-name">{m.nome}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CABELO */}
            <div className="ed-style-card">
              <p className="ed-style-eyebrow">CAPILAR</p>
              <h4 className="ed-style-title">TONS DE CABELO</h4>
              <p className="ed-style-desc">{c.dicaCabelo}</p>
              <div className="ed-hair-row">
                {c.melhoresTonsCabelo?.slice(0, 4).map((h, i) => (
                  <div key={i} className="ed-hair">
                    <div className="ed-hair-strand" style={{
                      background: `linear-gradient(180deg, ${h.hex} 0%, ${h.hex} 40%, rgba(0,0,0,0.25) 100%)`
                    }}></div>
                    <p className="ed-hair-name">{h.nome}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* MAQUIAGEM */}
            <div className="ed-style-card">
              <p className="ed-style-eyebrow">BEAUTY</p>
              <h4 className="ed-style-title">MAQUIAGEM IDEAL</h4>
              <ul className="ed-makeup-list">
                <li className="ed-makeup-item">
                  <span className="ed-makeup-dot" style={{ background: c.maquiagemIdeal?.base?.hex }}></span>
                  <div>
                    <strong>BASE</strong>
                    <span>{c.maquiagemIdeal?.base?.desc}</span>
                  </div>
                </li>
                <li className="ed-makeup-item">
                  <span className="ed-makeup-dot" style={{ background: c.maquiagemIdeal?.blush?.hex }}></span>
                  <div>
                    <strong>BLUSH</strong>
                    <span>{c.maquiagemIdeal?.blush?.desc}</span>
                  </div>
                </li>
                <li className="ed-makeup-item">
                  <span className="ed-makeup-dot" style={{ background: c.maquiagemIdeal?.batom?.hex }}></span>
                  <div>
                    <strong>BATOM</strong>
                    <span>{c.maquiagemIdeal?.batom?.desc}</span>
                  </div>
                </li>
                <li className="ed-makeup-item">
                  <span className="ed-makeup-dot" style={{ background: c.maquiagemIdeal?.sombras?.hex }}></span>
                  <div>
                    <strong>SOMBRAS</strong>
                    <span>{c.maquiagemIdeal?.sombras?.desc}</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ======= NEUTROS ======= */}
        <section className="ed-section">
          <div className="ed-section-header">
            <p className="ed-section-num">04</p>
            <h2 className="ed-section-title">NEUTROS IDEAIS</h2>
            <p className="ed-section-subtitle">Sua base curinga para o dia a dia</p>
          </div>
          <div className="ed-neutros-grid">
            {c.neutrosIdeais?.slice(0, 8).map((n, i) => (
              <div key={i} className="ed-neutro">
                <div className="ed-neutro-color" style={{ background: n.hex }}></div>
                <p className="ed-neutro-name">{n.nome}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ======= FOOTER ======= */}
        <footer className="ed-footer">
          <Botanical />
          <p className="ed-footer-message">{c.mensagemFinal}</p>
          <p className="ed-footer-tagline">
            <em>Mais confiança, mais leveza, </em>
            <strong>mais você.</strong>
          </p>
          <Divider />
          <p className="ed-footer-signature">V I S A G Ê &nbsp;·&nbsp; CONSULTORIA DE IMAGEM</p>
        </footer>
      </div>
    </div>
  );
};

export default ResultInfographic;
