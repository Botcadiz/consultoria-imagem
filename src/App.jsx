import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import ResultInfographic from './components/ResultInfographic';
import Auth from './components/Auth';
import { analyzeImage } from './openaiService';
import { Upload, LogOut } from 'lucide-react';
import './index.css';

function Analyzer() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true); // verificando resultado existente
  const [result, setResult] = useState(null);
  const [savedImage, setSavedImage] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Ao entrar, verifica se usuário já tem resultado salvo
  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/my-result', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('token');
          navigate('/auth');
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setResult(data.result_json);
            setSavedImage(data.image_base64);
          }
        }
      } catch (e) {
        console.error('Erro ao buscar resultado:', e);
      } finally {
        setChecking(false);
      }
    };
    fetchExisting();
  }, [navigate]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scale = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        setImage(canvas.toDataURL('image/jpeg', 0.7));
        setResult(null);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!image) { setError('Por favor, selecione uma foto.'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await analyzeImage(image);
      setResult(data);
      setSavedImage(image);
    } catch (err) {
      if (err.message.includes('401') || err.message.includes('403')) {
        localStorage.removeItem('token');
        navigate('/auth');
      } else if (err.message.includes('409') || err.serverMessage?.includes('já possui')) {
        // Usuário tentou gerar de novo — recarrega o resultado salvo
        const token = localStorage.getItem('token');
        const res = await fetch('/api/my-result', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          const existing = await res.json();
          if (existing) { setResult(existing.result_json); setSavedImage(existing.image_base64); }
        }
      } else {
        setError(err.serverMessage || 'Ocorreu um erro. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    navigate('/auth');
  };

  // ── Loading enquanto verifica resultado existente ──
  if (checking) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Carregando sua consultoria...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <nav className="navbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-primary)', margin: 0, letterSpacing: '0.08em' }}>
          V I S A G Ê
        </p>
        <button
          onClick={handleLogout}
          style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', padding: '0.5rem' }}
        >
          <LogOut size={16} /> Sair
        </button>
      </nav>

      <div className="container">
        {/* ── RESULTADO JÁ GERADO ── */}
        {result ? (
          <div>
            <div className="header">
              <h1>Sua Consultoria de Imagem</h1>
              <p>Baixe sua análise personalizada abaixo.</p>
            </div>
            <ResultInfographic data={result} image={savedImage} />
          </div>
        ) : (
          /* ── UPLOAD + GERAR ── */
          <div>
            <div className="header">
              <h1>Consultoria de Imagem Premium</h1>
              <p>Envie sua foto e receba sua análise exclusiva de colorimetria e visagismo.</p>
            </div>

            <div className="analyzer-setup">
              {loading ? (
                <div className="loading-state" style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                  <p style={{ color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '1.1rem' }}>
                    Gerando sua consultoria personalizada...
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>
                    Analisando seu rosto com inteligência artificial
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                    Isso pode levar até 1 minuto. Por favor, aguarde.
                  </p>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label>Sua Foto</label>
                    <div className="file-upload">
                      <input type="file" accept="image/*" onChange={handleImageChange} />
                      {image ? (
                        <div style={{ textAlign: 'center' }}>
                          <img
                            src={image}
                            alt="Preview"
                            style={{ maxHeight: '260px', width: 'auto', maxWidth: '100%', borderRadius: '12px', marginBottom: '14px', border: '2px solid rgba(212,175,55,0.5)', boxShadow: '0 6px 20px rgba(0,0,0,0.4)' }}
                          />
                          <p style={{ fontSize: '0.95rem', color: 'var(--color-secondary)' }}>Foto selecionada. Clique para trocar.</p>
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

                  {error && (
                    <div style={{ color: '#ff6b6b', marginBottom: '1rem', fontSize: '1rem', textAlign: 'center', padding: '0.85rem 1rem', background: 'rgba(211,47,47,0.1)', border: '1px solid rgba(255,107,107,0.35)', borderRadius: '8px', lineHeight: 1.5 }}>
                      {error}
                    </div>
                  )}

                  <button className="btn btn-primary" onClick={handleAnalyze} disabled={!image}>
                    Gerar Minha Consultoria
                  </button>
                </>
              )}
            </div>
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
        <Route path="/" element={<PrivateRoute><Analyzer /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
