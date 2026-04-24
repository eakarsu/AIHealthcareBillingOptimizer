import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setEmail('admin@healthbilling.com');
    setPassword('admin123');
    setTimeout(() => {
      document.getElementById('login-form').requestSubmit();
    }, 100);
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            <span role="img" aria-label="health">&#x2695;</span>
          </div>
          <h1>AI Healthcare Billing</h1>
          <p>Intelligent Billing Optimization Platform</p>
        </div>

        {error && (
          <div className="login-error">
            <span>&#x26A0;</span> {error}
          </div>
        )}

        <form id="login-form" className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="login-btn login-btn-primary" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner spinner-sm" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }}></span>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>

          <div className="login-divider">or</div>

          <button type="button" className="login-btn login-btn-demo" onClick={handleDemoLogin}>
            <span role="img" aria-label="demo">&#x1F50D;</span> Demo Login
          </button>
        </form>
      </div>
    </div>
  );
}
