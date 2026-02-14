import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { FaEye, FaEyeSlash, FaHeart, FaSpinner } from 'react-icons/fa';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const { login, isLoggingIn } = useAuth();
  const { getGradientClasses } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const from = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await login(formData);
      // Navigation is handled in the auth context
    } catch (error) {
      // Error is handled in the auth context
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-16 h-16 bg-blood-100 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <FaHeart className="text-blood-600 text-2xl" />
        </motion.div>
        
        <h2 className="text-3xl font-bold text-neutral-900 mb-2">
          Welcome Back
        </h2>
        <p className="text-neutral-600">
          Sign in to continue saving lives
        </p>
      </div>

      {/* Login Form */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent transition-all duration-200 ${
              errors.email ? 'border-red-500' : 'border-neutral-300'
            }`}
            placeholder="Enter your email"
            disabled={isLoggingIn}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-2">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent transition-all duration-200 ${
                errors.password ? 'border-red-500' : 'border-neutral-300'
              }`}
              placeholder="Enter your password"
              disabled={isLoggingIn}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoggingIn}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="w-4 h-4 text-blood-600 border-neutral-300 rounded focus:ring-blood-500"
              disabled={isLoggingIn}
            />
            <span className="ml-2 text-sm text-neutral-600">Remember me</span>
          </label>
          
          <Link
            to="/auth/forgot-password"
            className="text-sm text-blood-600 hover:text-blood-700 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit Button */}
        <motion.button
          type="submit"
          disabled={isLoggingIn}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center ${
            isLoggingIn
              ? 'bg-neutral-400 cursor-not-allowed'
              : `${getGradientClasses().blood} text-white hover:shadow-lg transform hover:scale-105`
          }`}
          whileHover={!isLoggingIn ? { scale: 1.02 } : {}}
          whileTap={!isLoggingIn ? { scale: 0.98 } : {}}
        >
          {isLoggingIn ? (
            <>
              <FaSpinner className="animate-spin mr-2" />
              Signing In...
            </>
          ) : (
            'Sign In'
          )}
        </motion.button>
      </motion.form>

      {/* Sign Up Link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="text-center mt-8"
      >
        <p className="text-neutral-600">
          Don't have an account?{' '}
          <Link
            to="/auth/register"
            className="text-blood-600 hover:text-blood-700 font-medium transition-colors"
          >
            Sign up here
          </Link>
        </p>
      </motion.div>

      {/* Back to Home Link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="text-center mt-4"
      >
        <Link
          to="/"
          className="inline-flex items-center text-neutral-500 hover:text-neutral-700 text-sm transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>
      </motion.div>
    </motion.div>
  );
};

export default LoginPage;
