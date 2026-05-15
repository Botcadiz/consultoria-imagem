import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import ResultInfographic from './components/ResultInfographic';
import Auth from './components/Auth';
import History from './components/History';
import { analyzeImage } from './openaiService';
import { Upload, LogOut, Clock, Sparkles } from 'lucide-react';
import './index.css';

function Analyzer() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [generationCount, setGenerationCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchGenerationCount();
  }, []);

  const fetchGenerationCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/generation-count', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGenerationCount(data.count);
      }
    } catch (e) {
      console.error('Erro ao buscar contagem:', e);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setImage(compressedBase64);
          setResult(null);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) {
      setError('Por favor, faça o upload de uma foto.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await analyzeImage(image);
      setResult(data);
      setGenerationCount(prev => prev + 1);
    } catch (err) {
      if (err.message.includes('401') || err.message.includes('403')) {
        localStorage.removeItem('token');
        navigate('/auth');
      } else {
        setError(err.serverMessage || 'Ocorreu um erro na análise. Verifique o servidor e tente novamente.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    navigate('/auth');
  };

  return (
    <div className="app-container">
      {/* Animated Background Elements */}
      <div className="animated-background">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      <nav className="navbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        {/* Generation Counter */}
        <div className="generation-counter">
          <Sparkles size={16} />
          <span className="gen-count">{generationCount}</span>
          <span className="gen-label">análise{generationCount !== 1 ? 's' : ''} gerada{generationCount !== 1 ? 's' : ''}</span>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => navigate('/history')} className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            <Clock size={16} /> Meu Histórico
          </button>
          <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', padding: '0.5rem' }}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      </nav>
      
      <div className="container">
        <div className="header">
          <h1>Consultoria de Imagem Premium</h1>
          <p>Descubra sua colorimetria e visagismo ideais.</p>
        </div>

      {!result && (
        <div className="analyzer-setup">
          {loading ? (
            <div className="loading-state" style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
              <p style={{ color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '1.1rem' }}>Gerando sua consultoria personalizada...</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>Etapa 1: Analisando seu rosto com IA</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Etapa 2: Criando sua arte visual exclusiva</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '1rem', fontStyle: 'italic' }}>Isso pode levar até 1 minuto. Por favor, aguarde.</p>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>Sua Foto</label>
                <div className="file-upload">
                  <input type="file" accept="image/*" onChange={handleImageChange} />
                  {image ? (
                    <div style={{ textAlign: 'center' }}>
                      <img src={image} alt="Preview" style={{ maxHeight: '260px', width: 'auto', maxWidth: '100%', borderRadius: '12px', marginBottom: '14px', border: '2px solid rgba(212, 175, 55, 0.5)', boxShadow: '0 6px 20px rgba(0,0,0,0.4)' }} />
                      <p style={{ fontSize: '1rem', color: 'var(--color-secondary)' }}>Foto selecionada. Clique para trocar.</p>
                    </div>
                  ) : (
                    <div>
                      <Upload size={48} color="var(--color-primary)" style={{ marginBottom: '14px' }} />
                      <p style={{ fontSize: '1.05rem', fontWeight: 500 }}>Arraste uma foto ou clique para selecionar</p>
                      <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                        Rosto bem iluminado, sem distorções
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {error && <div style={{ color: '#ff6b6b', marginBottom: '1rem', fontSize: '1rem', textAlign: 'center', padding: '0.85rem 1rem', background: 'rgba(211, 47, 47, 0.1)', border: '1px solid rgba(255, 107, 107, 0.35)', borderRadius: '8px', lineHeight: 1.5 }}>{error}</div>}

              <button 
                className="btn btn-primary" 
                onClick={handleAnalyze} 
                disabled={!image}
              >
                Analisar Imagem
              </button>
            </>
          )}
        </div>
      )}

      {!loading && result && (
        <div>
          <button className="btn btn-outline" style={{ marginBottom: '2rem' }} onClick={() => setResult(null)}>
            ← Nova Análise
          </button>
          <ResultInfographic data={result} image={image} />
        </div>
      )}
      </div>
    </div>
  );
}

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/auth" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
        <Route path="/" element={<PrivateRoute><Analyzer /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
