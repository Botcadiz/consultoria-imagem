import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import ResultInfographic from './components/ResultInfographic';
import Auth from './components/Auth';
import History from './components/History';
import { analyzeImage } from './openaiService';
import { Upload, LogOut, Clock } from 'lucide-react';
import './index.css';

function Analyzer() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
        setResult(null);
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
    } catch (err) {
      if (err.message.includes('401') || err.message.includes('403')) {
        localStorage.removeItem('token');
        navigate('/auth');
      } else {
        setError('Ocorreu um erro na análise. Verifique o servidor e tente novamente.');
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

      <nav className="navbar" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => navigate('/history')} className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          <Clock size={16} /> Meu Histórico
        </button>
        <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderColor: '#c62828', color: '#c62828' }}>
          <LogOut size={16} /> Sair
        </button>
      </nav>
      
      <div className="container">
        <div className="header">
          <h1>Consultoria de Imagem Premium</h1>
          <p>Descubra sua colorimetria e visagismo ideais.</p>
        </div>

      {!result && (
        <div className="analyzer-setup">
          <div className="form-group">
            <label>Sua Foto</label>
            <div className="file-upload">
              <input type="file" accept="image/*" onChange={handleImageChange} />
              {image ? (
                <div>
                  <img src={image} alt="Preview" style={{ maxWidth: '100px', borderRadius: '8px', marginBottom: '10px' }} />
                  <p>Foto selecionada. Clique para trocar.</p>
                </div>
              ) : (
                <div>
                  <Upload size={32} color="var(--color-primary)" style={{ marginBottom: '10px' }} />
                  <p>Arraste uma foto ou clique para selecionar</p>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Rosto bem iluminado, sem distorções
                  </span>
                </div>
              )}
            </div>
          </div>

          {error && <div style={{ color: '#d32f2f', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

          <button 
            className="btn btn-primary" 
            onClick={handleAnalyze} 
            disabled={loading || !image}
          >
            {loading ? 'Analisando...' : 'Analisar Imagem'}
          </button>
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Realizando análise profissional...</p>
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
