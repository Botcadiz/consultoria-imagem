import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResultInfographic from './ResultInfographic';

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/auth');
          return;
        }

        const response = await fetch('/api/history', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            navigate('/auth');
          }
          throw new Error('Erro ao buscar histórico');
        }

        const data = await response.json();
        setHistory(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [navigate]);

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Carregando histórico...</div>;

  if (selectedResult) {
    return (
      <div className="container">
        <button className="btn btn-outline" style={{ marginBottom: '2rem' }} onClick={() => setSelectedResult(null)}>
          ← Voltar ao Histórico
        </button>
        <ResultInfographic data={selectedResult.result_json} image={selectedResult.image_base64} />
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Meu Histórico de Consultorias</h1>
        <p>Acesse análises anteriores do seu perfil.</p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          + Fazer Nova Análise
        </button>
      </div>

      {history.length === 0 ? (
        <div className="analyzer-setup" style={{ textAlign: 'center' }}>
          <p>Você ainda não possui nenhuma análise salva.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {history.map(item => (
            <div key={item.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setSelectedResult(item)}>
              <img src={item.image_base64} alt="Consulta" style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
              <div style={{ padding: '1rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                  {new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
                <h4 style={{ color: 'var(--color-primary)' }}>{item.result_json.colorimetria.estacaoCromatica}</h4>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
