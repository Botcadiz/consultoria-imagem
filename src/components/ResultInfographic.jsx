import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, FileText, CheckCircle2, XCircle, Sun, Brush, Heart, User, Sparkles } from 'lucide-react';

const ResultInfographic = ({ data, image }) => {
  const printRef = useRef();

  const handleDownloadImage = async () => {
    const element = printRef.current;
    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const link = document.createElement('a');
    link.download = 'consultoria-imagem.jpg';
    link.href = dataUrl;
    link.click();
  };

  const handleDownloadPDF = async () => {
    const element = printRef.current;
    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/jpeg', 0.9);
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('consultoria-imagem.pdf');
  };

  if (!data || !data.colorimetria) return null;

  const { colorimetria } = data;

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
              <h3 className="sidebar-title"><Sparkles size={14} /> SUA ANÁLISE</h3>
              
              <div className="sidebar-item with-icon">
                <div className="si-icon"><User size={24} color="#8b6b5c" strokeWidth={1.5} /></div>
                <div className="si-content">
                  <h4>SUBTOM DA PELE</h4>
                  <strong>{colorimetria.subtom?.titulo || (typeof colorimetria.subtom === 'string' ? colorimetria.subtom : 'N/A')}</strong>
                  <p>{colorimetria.subtom?.desc}</p>
                </div>
              </div>

              <div className="sidebar-item with-icon">
                <div className="si-icon"><div className="icon-half-circle"></div></div>
                <div className="si-content">
                  <h4>CONTRASTE</h4>
                  <strong>{colorimetria.contraste?.titulo || (typeof colorimetria.contraste === 'string' ? colorimetria.contraste : 'N/A')}</strong>
                  <p>{colorimetria.contraste?.desc}</p>
                </div>
              </div>

              <div className="sidebar-item with-icon">
                <div className="si-icon"><div className="icon-gradient-circle"></div></div>
                <div className="si-content">
                  <h4>PROFUNDIDADE</h4>
                  <strong>{colorimetria.profundidade?.titulo || (typeof colorimetria.profundidade === 'string' ? colorimetria.profundidade : 'N/A')}</strong>
                  <p>{colorimetria.profundidade?.desc}</p>
                </div>
              </div>

              <div className="sidebar-item with-icon">
                <div className="si-icon"><Sun size={24} color="#8b6b5c" strokeWidth={1.5} /></div>
                <div className="si-content">
                  <h4>INTENSIDADE</h4>
                  <strong>{colorimetria.intensidade?.titulo || (typeof colorimetria.intensidade === 'string' ? colorimetria.intensidade : 'N/A')}</strong>
                  <p>{colorimetria.intensidade?.desc}</p>
                </div>
              </div>

              <div className="sidebar-highlight-box">
                <p className="sh-title">ESTAÇÃO CROMÁTICA</p>
                <h2 className="sh-cursive">{colorimetria.estacaoCromatica}</h2>
                <p className="sh-sub">{colorimetria.estacaoCromaticaSub || ''}</p>
                <p className="sh-desc">{colorimetria.intensidade?.desc || colorimetria.descricaoEstacao}</p>
              </div>

              {colorimetria.suaForca && (
                <div className="sidebar-force-box">
                  <p className="sf-title"><Heart size={14} /> SUA FORÇA</p>
                  <strong>{colorimetria.suaForca?.titulo}</strong>
                  <div className="sf-divider"></div>
                  <p><strong>Evite:</strong> {colorimetria.suaForca?.evite}</p>
                  <p style={{marginTop: '0.5rem'}}><strong>Aposte:</strong> {colorimetria.suaForca?.aposte}</p>
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
              <p className="poster-cursive">{colorimetria.descricaoEstacao}</p>
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
                <h4 className="box-header"><CheckCircle2 size={16} color="#4a7c59" /> CORES QUE TE VALORIZAM</h4>
                <p className="box-desc">{colorimetria.coresValorizam?.desc}</p>
                <div className="mini-swatch-grid">
                  {colorimetria.coresValorizam?.cores?.slice(0, 10).map((c, i) => (
                    <div key={i} className="mini-swatch" style={{backgroundColor: c}}></div>
                  ))}
                </div>
              </div>
              <div className="poster-box danger-box">
                <h4 className="box-header"><XCircle size={16} color="#c64f4f" /> CORES QUE TE APAGAM</h4>
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
                <p className="box-desc" style={{fontSize: '0.7rem'}}>Metais quentes realçam seu brilho natural.</p>
                <div className="metal-flex">
                  {colorimetria.metaisIdeais?.slice(0, 4).map((m, i) => (
                    <div key={i} className="metal-swatch-box">
                      <div className="metal-circle" style={{'--m-color': m.hex}}></div>
                      <span>{m.nome}</span>
                    </div>
                  ))}
                </div>
                {colorimetria.dicaMetais && (
                  <div className="hair-tip-box">
                    <p><strong>DICA:</strong> {colorimetria.dicaMetais}</p>
                  </div>
                )}
              </div>

              {/* Cabelo */}
              <div className="poster-box">
                <h4 className="box-header"><User size={14} style={{marginRight: '4px'}}/> MELHORES TONS DE CABELO</h4>
                <p className="box-desc" style={{fontSize: '0.7rem'}}>Tons quentes e dourados harmonizam e trazem luminosidade.</p>
                <div className="hair-flex">
                  {colorimetria.melhoresTonsCabelo?.slice(0, 4).map((c, i) => (
                    <div key={i} className="hair-swatch-box">
                      <div className="hair-color-block" style={{backgroundColor: c.hex}}></div>
                      <span>{c.nome}</span>
                    </div>
                  ))}
                </div>
                {colorimetria.dicaCabelo && (
                  <div className="hair-tip-box">
                    <p><strong>DICA:</strong> {colorimetria.dicaCabelo}</p>
                  </div>
                )}
              </div>

              {/* Maquiagem */}
              <div className="poster-box">
                <h4 className="box-header"><Brush size={14} style={{marginRight: '4px'}}/> MAQUIAGEM IDEAL</h4>
                <p className="box-desc" style={{fontSize: '0.7rem'}}>Tons quentes e naturais realçam sua beleza de forma leve.</p>
                <div className="makeup-list">
                  <div className="makeup-item">
                    <div className="makeup-icon bg-base"></div>
                    <div className="makeup-text">
                      <strong>BASE:</strong> {colorimetria.maquiagemIdeal?.base?.desc}
                    </div>
                  </div>
                  <div className="makeup-item">
                    <div className="makeup-icon bg-blush"></div>
                    <div className="makeup-text">
                      <strong>BLUSH:</strong> {colorimetria.maquiagemIdeal?.blush?.desc}
                    </div>
                  </div>
                  <div className="makeup-item">
                    <div className="makeup-icon bg-batom"></div>
                    <div className="makeup-text">
                      <strong>BATOM:</strong> {colorimetria.maquiagemIdeal?.batom?.desc}
                    </div>
                  </div>
                  <div className="makeup-item">
                    <div className="makeup-icon bg-sombras"></div>
                    <div className="makeup-text">
                      <strong>SOMBRAS:</strong> {colorimetria.maquiagemIdeal?.sombras?.desc}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Neutros */}
            <div className="poster-section" style={{marginTop: '1.5rem'}}>
              <div className="section-divider"><span>NEUTROS IDEAIS</span></div>
              <p className="box-desc" style={{textAlign: 'center', marginBottom: '1rem'}}>Neutros quentes e suaves criam harmonia e elegância.</p>
              <div className="cartela-grid-8">
                {colorimetria.neutrosIdeais?.slice(0, 8).map((c, i) => (
                  <div key={i} className="color-swatch-box">
                    <div className="color-swatch" style={{backgroundColor: c.hex, borderRadius: '4px', height: '50px'}}></div>
                    <span style={{marginTop: '0.25rem'}}>{c.nome}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Message */}
            <div className="poster-footer">
              <div className="pf-left">
                <p className="pf-cursive">Você já tem tudo<br/>que precisa para brilhar! <Heart size={14} color="#8b4513" fill="#8b4513" /></p>
              </div>
              <div className="pf-center">
                <p>Quando você usa as cores certas, sua beleza aparece com mais leveza, confiança e naturalidade.</p>
                <strong>Seja sua melhor versão todos os dias!</strong>
              </div>
              <div className="pf-right">
                <p><strong><Heart size={12} style={{display: 'inline', marginRight: '4px'}}/> LEMBRE-SE</strong></p>
                <p>Não se trata de regras e sim de escolhas que te fazem bem e te representam.</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultInfographic;
