import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import api from '../utils/api';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contactNumber: '',
    password: '',
    confirmPassword: '',
    role: 'user'
  });
  const [isAdminExists, setIsAdminExists] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const fetchAdminExists = async () => {
      try {
        const res = await api.get('/auth/admin-exists');
        if (!mounted) return;
        const exists = Boolean(res.data?.exists);
        setIsAdminExists(exists);
        if (exists) {
          setFormData((prev) => ({ ...prev, role: 'user' }));
        }
      } catch (e) {
        if (!mounted) return;
        setIsAdminExists(true);
        setFormData((prev) => ({ ...prev, role: 'user' }));
      }
    };

    fetchAdminExists();

    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      const response = await api.post('/auth/register', registerData);
      login(response.data.user, response.data.token);
      navigate(response.data.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container auth-glass-container">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="auth-box auth-glass-box auth-box-wide"
      >
        <div className="back-home-link">
          <Link to="/">← Back to Home</Link>
        </div>
        <h1>Smart Travel Buddy</h1>
        <h2>Register</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="auth-form-grid">
            <div className="form-group">
              <label>
                Name <span className="auth-required">*</span>
              </label>
              <input
                type="text"
                name="name"
                placeholder="Enter your name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>
                Email <span className="auth-required">*</span>
              </label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Contact Number</label>
              <input
                type="tel"
                name="contactNumber"
                placeholder="Enter contact number"
                value={formData.contactNumber}
                onChange={handleChange}
                required
              />
            </div>
            {!isAdminExists ? (
              <div className="form-group">
                <label>Role</label>
                <select name="role" value={formData.role} onChange={handleChange}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            ) : (
              <div className="form-group auth-grid-spacer" />
            )}
            <div className="form-group">
              <label>
                Password <span className="auth-required">*</span>
              </label>
              <div className="auth-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
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
            <div className="form-group">
              <label>
                Confirm Password <span className="auth-required">*</span>
              </label>
              <div className="auth-input-wrap">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  onClick={() => setShowConfirmPassword((v) => !v)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
          <div className="auth-submit-row">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </div>
        </form>
        <p className="auth-bottom-text">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
