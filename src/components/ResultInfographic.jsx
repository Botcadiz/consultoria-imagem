import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, FileText, CheckCircle2, XCircle, Sparkles, Heart } from 'lucide-react';

const ResultInfographic = ({ data, image }) => {
  const printRef = useRef();

  const handleDownloadImage = async () => {
    if (data?.imageUrl) {
      const link = document.createElement('a');
      link.href = data.imageUrl;
      link.download = 'consultoria-imagem.jpg';
      link.click();
    } else {
      const element = printRef.current;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const link = document.createElement('a');
      link.download = 'consultoria-imagem.jpg';
      link.href = dataUrl;
      link.click();
    }
  };

  const handleDownloadPDF = async () => {
    const element = printRef.current;
    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/jpeg', 0.9);
    
    // Configura o PDF para ter o tamanho exato da imagem gerada, assim não corta nada.
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'l' : 'p',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });
    
    pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
    pdf.save('consultoria-imagem.pdf');
  };

  // Display AI-generated image if available
  if (data?.imageUrl) {
    return (
      <div className="infographic-wrapper">
        <div className="export-actions">
          <button onClick={handleDownloadImage} className="btn btn-primary">
            <Download size={18} /> Salvar Imagem
          </button>
        </div>
        <div style={{ maxWidth: '600px', margin: '0 auto', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
          <img src={data.imageUrl} alt="Sua Consultoria de Imagem" style={{ width: '100%', height: 'auto', display: 'block' }} crossOrigin="anonymous" />
        </div>
      </div>
    );
  }

  // If no image was generated, show error message instead of broken HTML fallback
  if (!data || !data.colorimetria) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#d4af37' }}>
        <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Aguardando geração da imagem...</p>
        <p style={{ fontSize: '0.9rem', color: '#c8c0b4' }}>Se a imagem não aparecer, tente novamente.</p>
      </div>
    );
  }

  const { colorimetria } = data;

  // SVG for decorative leaf/botanical element
  const LeafDecor = ({ className }) => (
    <svg className={className} viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '80px', opacity: 0.4 }}>
      <path d="M10 50C20 30 40 20 60 15C50 25 45 40 42 55" stroke="#b8c5b0" strokeWidth="1.5" fill="none"/>
      <path d="M15 48C25 32 42 24 58 20C48 28 44 42 42 53" stroke="#c5d1be" strokeWidth="1" fill="none"/>
      <path d="M60 15C70 10 85 12 95 20C80 18 70 25 65 35" stroke="#b8c5b0" strokeWidth="1.5" fill="none"/>
      <path d="M42 55C45 45 50 35 60 30" stroke="#c5d1be" strokeWidth="1" fill="none"/>
      <ellipse cx="60" cy="15" rx="3" ry="8" transform="rotate(-20 60 15)" fill="#d5ddd0" opacity="0.5"/>
      <ellipse cx="30" cy="35" rx="5" ry="12" transform="rotate(15 30 35)" fill="#d5ddd0" opacity="0.3"/>
      <ellipse cx="80" cy="22" rx="4" ry="10" transform="rotate(-30 80 22)" fill="#d5ddd0" opacity="0.3"/>
    </svg>
  );

  // Sparkle/star SVG decoration
  const StarDecor = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.35 }}>
      <path d="M12 2L13.5 9.5L21 8L14.5 12L18 19L12 14.5L6 19L9.5 12L3 8L10.5 9.5L12 2Z" fill="#c5b89a" />
    </svg>
  );

  return (
    <div className="infographic-wrapper">
      <div className="export-actions">
        <button onClick={handleDownloadImage} className="btn btn-primary">
          <Download size={18} /> Salvar Imagem
        </button>
        <button onClick={handleDownloadPDF} className="btn btn-outline" style={{ background: '#fff' }}>
          <FileText size={18} /> Baixar PDF
        </button>
      </div>

      <div className="infographic poster-infographic" ref={printRef}>
        <div className="poster-layout">
          
          {/* LEFT COLUMN: Photo + Sidebar Analysis */}
          <div className="poster-left-col">
            <div className="poster-photo-container">
              <img src={image} alt="Sua Foto" className="poster-photo" />
            </div>

            <div className="sidebar-box">
              <h3 className="sidebar-title"><Sparkles size={14} /> Sua Análise</h3>
              
              {/* Subtom */}
              <div className="sidebar-item with-icon">
                <div className="si-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#d4af37" strokeWidth="1.5"/>
                    <path d="M12 6C12 6 8 10 8 14C8 16 10 18 12 18C14 18 16 16 16 14C16 10 12 6 12 6Z" fill="#d4af37" opacity="0.55"/>
                  </svg>
                </div>
                <div className="si-content">
                  <h4>SUBTOM DA PELE</h4>
                  <strong>{colorimetria.subtom?.titulo || (typeof colorimetria.subtom === 'string' ? colorimetria.subtom : 'N/A')}</strong>
                  <p>{colorimetria.subtom?.desc}</p>
                </div>
              </div>

              {/* Contraste */}
              <div className="sidebar-item with-icon">
                <div className="si-icon"><div className="icon-half-circle"></div></div>
                <div className="si-content">
                  <h4>CONTRASTE</h4>
                  <strong>{colorimetria.contraste?.titulo || (typeof colorimetria.contraste === 'string' ? colorimetria.contraste : 'N/A')}</strong>
                  <p>{colorimetria.contraste?.desc}</p>
                </div>
              </div>

              {/* Profundidade */}
              <div className="sidebar-item with-icon">
                <div className="si-icon"><div className="icon-gradient-circle"></div></div>
                <div className="si-content">
                  <h4>PROFUNDIDADE</h4>
                  <strong>{colorimetria.profundidade?.titulo || (typeof colorimetria.profundidade === 'string' ? colorimetria.profundidade : 'N/A')}</strong>
                  <p>{colorimetria.profundidade?.desc}</p>
                </div>
              </div>

              {/* Intensidade */}
              <div className="sidebar-item with-icon">
                <div className="si-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="5" fill="#d4af37" fillOpacity="0.55" stroke="#d4af37" strokeWidth="1.5"/>
                    <line x1="12" y1="2" x2="12" y2="6" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="12" y1="18" x2="12" y2="22" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="2" y1="12" x2="6" y2="12" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="18" y1="12" x2="22" y2="12" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="si-content">
                  <h4>INTENSIDADE</h4>
                  <strong>{colorimetria.intensidade?.titulo || (typeof colorimetria.intensidade === 'string' ? colorimetria.intensidade : 'N/A')}</strong>
                  <p>{colorimetria.intensidade?.desc}</p>
                </div>
              </div>

              {/* Formato do Rosto */}
              {colorimetria.formatoRosto && (
                <div className="sidebar-item with-icon">
                  <div className="si-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <ellipse cx="12" cy="12" rx="7" ry="9" stroke="#d4af37" strokeWidth="1.5" fill="none"/>
                      <circle cx="12" cy="11" r="1" fill="#d4af37"/>
                    </svg>
                  </div>
                  <div className="si-content">
                    <h4>FORMATO DO ROSTO</h4>
                    <strong>{colorimetria.formatoRosto?.titulo}</strong>
                    <p>{colorimetria.formatoRosto?.desc}</p>
                  </div>
                </div>
              )}

              {/* Impressão Visual */}
              {colorimetria.impressaoVisual && (
                <div className="sidebar-item with-icon">
                  <div className="si-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke="#d4af37" strokeWidth="1.5"/>
                      <circle cx="12" cy="12" r="3" stroke="#d4af37" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <div className="si-content">
                    <h4>IMPRESSÃO VISUAL</h4>
                    <p style={{ marginTop: '0.25rem' }}>{colorimetria.impressaoVisual}</p>
                  </div>
                </div>
              )}

              {/* Estação Cromática highlight box */}
              <div className="sidebar-highlight-box">
                <p className="sh-title">ESTAÇÃO CROMÁTICA</p>
                <h2 className="sh-cursive">{colorimetria.estacaoCromatica}</h2>
                <p className="sh-sub">{colorimetria.estacaoCromaticaSub || ''}</p>
                <p className="sh-desc">{colorimetria.descricaoEstacao}</p>
              </div>

              {/* Seus Pontos Fortes */}
              {colorimetria.suaForca && (
                <div className="sidebar-force-box">
                  <p className="sf-title"><Heart size={14} /> SUA FORÇA</p>
                  <strong>{colorimetria.suaForca?.titulo}</strong>
                  {colorimetria.suaForca?.textoSecundario && (
                    <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#c8c0b4' }}>
                      {colorimetria.suaForca.textoSecundario}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Titles, Palettes, Content */}
          <div className="poster-right-col">
            
            {/* Top Header */}
            <div className="poster-header">
              <p className="poster-super-title">SUA COLORIMETRIA PESSOAL</p>
              <h1 className="poster-title">{colorimetria.estacaoCromatica}</h1>
              <div style={{textAlign:'center'}}>
                <p className="poster-cursive">{colorimetria.descricaoEstacao}</p>
              </div>
            </div>

            {/* Cartela Ideal */}
            <div className="poster-section">
              <div className="section-divider"><span>SUA CARTELA IDEAL</span></div>
              <div className="cartela-grid-12">
                {colorimetria.cartelaIdeal?.slice(0, 12).map((c, i) => (
                  <div key={i} className="color-swatch-box">
                    <div className="color-swatch" style={{backgroundColor: c.hex}}></div>
                    <span>{c.nome}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Valorizam e Apagam */}
            <div className="poster-split-section">
              <div className="poster-box success-box">
                <h4 className="box-header"><CheckCircle2 size={16} color="#7ac479" /> CORES QUE TE VALORIZAM</h4>
                <p className="box-desc">{colorimetria.coresValorizam?.desc}</p>
                <div className="mini-swatch-grid">
                  {colorimetria.coresValorizam?.cores?.slice(0, 10).map((c, i) => (
                    <div key={i} className="mini-swatch" style={{backgroundColor: c}}></div>
                  ))}
                </div>
              </div>
              <div className="poster-box danger-box">
                <h4 className="box-header"><XCircle size={16} color="#ff6b6b" /> CORES QUE TE APAGAM</h4>
                <p className="box-desc">{colorimetria.coresApagam?.desc}</p>
                <div className="mini-swatch-grid opacity-swatch">
                  {colorimetria.coresApagam?.cores?.slice(0, 10).map((c, i) => (
                    <div key={i} className="mini-swatch" style={{backgroundColor: c}}></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom 3 Columns: Metais, Cabelo, Maquiagem */}
            <div className="poster-triple-section">
              {/* Metais */}
              <div className="poster-box">
                <h4 className="box-header"><Sparkles size={14} style={{marginRight: '4px'}}/> METAIS IDEAIS</h4>
                <p className="box-desc" style={{fontSize: '0.7rem'}}>{colorimetria.dicaMetais || 'Metais que realçam seu brilho natural.'}</p>
                <div className="metal-flex">
                  {colorimetria.metaisIdeais?.slice(0, 4).map((m, i) => (
                    <div key={i} className="metal-swatch-box">
                      <div className="metal-circle" style={{'--m-color': m.hex}}></div>
                      <span>{m.nome}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cabelo */}
              <div className="poster-box">
                <h4 className="box-header">✂ MELHORES TONS DE CABELO</h4>
                <p className="box-desc" style={{fontSize: '0.7rem'}}>{colorimetria.dicaCabelo || 'Tons que harmonizam com sua beleza natural.'}</p>
                <div className="hair-flex">
                  {colorimetria.melhoresTonsCabelo?.slice(0, 4).map((c, i) => (
                    <div key={i} className="hair-swatch-box">
                      <div className="hair-color-block" style={{backgroundColor: c.hex}}></div>
                      <span>{c.nome}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Maquiagem */}
              <div className="poster-box">
                <h4 className="box-header">✦ MAQUIAGEM IDEAL</h4>
                <div className="makeup-list">
                  <div className="makeup-item">
                    <div className="makeup-icon" style={{ background: colorimetria.maquiagemIdeal?.base?.hex || '#e5c298' }}></div>
                    <div className="makeup-text">
                      <strong>BASE</strong><br/>{colorimetria.maquiagemIdeal?.base?.desc}
                    </div>
                  </div>
                  <div className="makeup-item">
                    <div className="makeup-icon" style={{ background: colorimetria.maquiagemIdeal?.blush?.hex || '#ffbfa3' }}></div>
                    <div className="makeup-text">
                      <strong>BLUSH</strong><br/>{colorimetria.maquiagemIdeal?.blush?.desc}
                    </div>
                  </div>
                  <div className="makeup-item">
                    <div className="makeup-icon" style={{ background: colorimetria.maquiagemIdeal?.batom?.hex || '#c87669' }}></div>
                    <div className="makeup-text">
                      <strong>BATOM</strong><br/>{colorimetria.maquiagemIdeal?.batom?.desc}
                    </div>
                  </div>
                  <div className="makeup-item">
                    <div className="makeup-icon" style={{ background: colorimetria.maquiagemIdeal?.sombras?.hex || '#b87333' }}></div>
                    <div className="makeup-text">
                      <strong>SOMBRAS</strong><br/>{colorimetria.maquiagemIdeal?.sombras?.desc}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Neutros */}
            <div className="poster-section" style={{marginTop: '1.5rem'}}>
              <div className="section-divider"><span>NEUTROS IDEAIS</span></div>
              <div className="cartela-grid-8">
                {colorimetria.neutrosIdeais?.slice(0, 8).map((c, i) => (
                  <div key={i} className="color-swatch-box">
                    <div className="color-swatch" style={{backgroundColor: c.hex, borderRadius: '4px', height: '50px'}}></div>
                    <span style={{marginTop: '0.25rem'}}>{c.nome}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Message — three-column layout */}
            <div className="poster-footer">
              <div className="pf-decor-left">
                Você já tem tudo<br/>que precisa para brilhar!
              </div>
              <div className="pf-main">
                <p className="pf-cursive-msg">
                  {colorimetria.mensagemFinal || 'Quando você usa as cores certas, sua beleza aparece com mais leveza, confiança e naturalidade.'}
                  <strong>Seja sua melhor versão todos os dias!</strong>
                </p>
              </div>
              <div className="pf-decor-right">
                <div className="pf-remember-title"><Heart size={14} fill="#d4af37" /> LEMBRE-SE</div>
                <div className="pf-remember-text">
                  Não se trata de regras e sim de escolhas que te fazem bem e te representam.
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultInfographic;
