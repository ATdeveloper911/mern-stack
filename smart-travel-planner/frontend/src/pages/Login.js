import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import api from '../utils/api';
import './Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', formData);
      login(response.data.user, response.data.token);
      navigate(response.data.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background"></div>
      <div className="login-content">
        <div className="login-left">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="login-form-container"
          >
            <div className="back-home-link">
              <Link to="/">← Back to Home</Link>
            </div>
            <h1 className="login-title">Smart Travel Buddy</h1>
            <h2 className="login-subtitle">Login to Your Account</h2>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <div className="auth-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="form-options">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
              </div>
              <button type="submit" className="login-button" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
              <div className="forgot-password">
                <Link to="/forgot-password">Forgot Password?</Link>
              </div>
              <div className="register-link">
                <p>
                  Don't have an account? <Link to="/register">Register here</Link>
                </p>
              </div>
            </form>
          </motion.div>
        </div>
        <div className="login-right">
          <div className="quote-container">
            <p className="quote-text">THE GOAL OF LIFE IS LIVING IN AGREEMENT WITH NATURE.</p>
            <div className="social-icons">
              <div className="social-icon"></div>
              <div className="social-icon"></div>
              <div className="social-icon"></div>
              <div className="social-icon"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
