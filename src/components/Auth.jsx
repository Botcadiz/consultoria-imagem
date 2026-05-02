import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const endpoint = isLogin ? '/api/login' : '/api/register';

    try {
      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro de autenticação');
      }

      if (isLogin) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('email', data.email);
        navigate('/');
      } else {
        setIsLogin(true);
        setError('Cadastro realizado! Faça login.');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '400px', marginTop: '4rem' }}>
      <div className="analyzer-setup">
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontFamily: 'var(--font-serif)', color: 'var(--color-primary)' }}>
          {isLogin ? 'Entrar na Consultoria' : 'Criar Conta'}
        </h2>

        {error && (
          <div style={{ padding: '0.5rem', background: '#ffebee', color: '#c62828', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>E-mail</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
            />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
            />
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            {isLogin ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
          {isLogin ? 'Não tem conta? ' : 'Já tem conta? '}
          <button 
            type="button" 
            onClick={() => setIsLogin(!isLogin)} 
            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isLogin ? 'Cadastre-se' : 'Faça login'}
          </button>
        </p>
      </div>
    </div>
  );
}
