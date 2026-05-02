import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, FileText, Scissors, Check, Sparkles, Heart } from 'lucide-react';

const HairAnalysis = ({ data, image }) => {
  const printRef = useRef();

  const handleDownloadImage = async () => {
    const element = printRef.current;
    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const link = document.createElement('a');
    link.download = 'analise-cabelos.jpg';
    link.href = dataUrl;
    link.click();
  };

  const handleDownloadPDF = async () => {
    const element = printRef.current;
    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/jpeg', 0.9);
    const pdf = new jsPDF('l', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('analise-cabelos.pdf');
  };

  if (!data || !data.recomendacoes) return null;

  return (
    <div className="infographic-wrapper">
      <div className="export-actions">
        <button onClick={handleDownloadImage} className="btn btn-outline">
          <Download size={18} /> Salvar Imagem
        </button>
        <button onClick={handleDownloadPDF} className="btn btn-outline">
          <FileText size={18} /> Baixar PDF
        </button>
      </div>

      <div className="infographic hair-infographic" ref={printRef}>
        
        <div className="info-header">
          <h1>HAIRSTYLE ANALYSIS</h1>
          <h2>VISAGISMO • FORMATO DE ROSTO • CORTES IDEAIS</h2>
          <p className="subtitle-phrase">Cortes selecionados sob medida para o seu formato de rosto.</p>
        </div>

        <div className="hair-analysis-layout">
          {/* Left Column (Photo) */}
          <div className="hair-photo-col">
            <img src={image} alt="Perfil" className="profile-photo hair-profile" />
            <div className="hair-summary">
              <h4>FORMATO DE ROSTO <Sparkles size={14} className="inline-icon" /></h4>
              <p className="face-shape-text">{data.formatoRosto}</p>
            </div>
          </div>

          {/* Right Column (Hairstyles) */}
          <div className="hair-recommendations-col">
            <h3 className="hair-section-title"><Scissors size={20} className="inline-icon" /> CORTES RECOMENDADOS</h3>
            
            <div className="hair-cards-grid">
              {data.recomendacoes.map((rec, index) => (
                <div key={index} className="hair-style-card">
                  <div className="hair-illustration-placeholder">
                    <img src={`/hairstyles/${rec.imagem}`} alt={rec.nomeCorte} style={{ width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'multiply' }} />
                  </div>
                  <div className="hair-labels">
                    <h4 style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-sans)', fontSize: '1.1rem', marginBottom: '0.25rem' }}>{rec.nomeCorte}</h4>
                    {rec.labels.map((label, i) => (
                      <span key={i} className="hair-label"><Check size={12} /> {label}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
        
        <div className="hair-footer">
          <p><Heart size={14} className="inline-icon"/> <strong>Importante:</strong> Leve esta análise para o seu visagista de confiança como inspiração visual!</p>
        </div>
      </div>
    </div>
  );
};

export default HairAnalysis;
