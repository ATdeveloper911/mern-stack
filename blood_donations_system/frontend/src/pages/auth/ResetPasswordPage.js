import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaLock, FaCheckCircle, FaExclamationTriangle, FaEye, FaEyeSlash } from 'react-icons/fa';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isValidToken, setIsValidToken] = useState(null);

  // Validate token on component mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        // Simulate token validation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // In a real app, you would validate the token with the API
        // const response = await authAPI.validateResetToken(token);
        
        setIsValidToken(true);
      } catch (err) {
        setIsValidToken(false);
        setError('Invalid or expired reset token. Please request a new password reset.');
      }
    };

    if (token) {
      validateToken();
    } else {
      setIsValidToken(false);
      setError('No reset token provided.');
    }
  }, [token]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const validateForm = () => {
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setError('');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real app, you would call the reset password API here
      // await authAPI.resetPassword(token, formData.password);
      
      setIsSuccess(true);
    } catch (err) {
      setError('Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isValidToken === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner fullScreen text="Validating reset token..." />
      </div>
    );
  }

  // Invalid token
  if (isValidToken === false) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 text-center"
      >
        <div className="mb-6">
          <FaExclamationTriangle className="text-6xl text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Invalid Reset Link</h2>
          <p className="text-gray-600 mb-4">{error}</p>
        </div>
        
        <div className="space-y-4">
          <Link to="/forgot-password">
            <Button className="w-full">
              Request New Reset Link
            </Button>
          </Link>
          
          <Link to="/login" className="text-blood-600 hover:text-blood-800 text-sm font-medium">
            Back to Login
          </Link>
        </div>
      </motion.div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 text-center"
      >
        <div className="mb-6">
          <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Password Reset Successful</h2>
          <p className="text-gray-600">
            Your password has been successfully reset. You can now log in with your new password.
          </p>
        </div>
        
        <div className="space-y-4">
          <Button
            onClick={() => navigate('/login')}
            className="w-full"
          >
            Go to Login
          </Button>
        </div>
      </motion.div>
    );
  }

  // Reset password form
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6"
    >
      <div className="mb-6">
        <Link 
          to="/login" 
          className="inline-flex items-center text-blood-600 hover:text-blood-800 mb-4"
        >
          <FaArrowLeft className="mr-2" />
          Back to Login
        </Link>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Reset Your Password</h2>
        <p className="text-gray-600">
          Enter your new password below.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Input
            type={showPassword ? 'text' : 'password'}
            name="password"
            label="New Password"
            placeholder="Enter your new password"
            value={formData.password}
            onChange={handleChange}
            required
            error={!!error}
            icon={FaLock}
            rightIcon={showPassword ? FaEyeSlash : FaEye}
            onRightIconClick={() => setShowPassword(!showPassword)}
          />
        </div>

        <div>
          <Input
            type={showConfirmPassword ? 'text' : 'password'}
            name="confirmPassword"
            label="Confirm New Password"
            placeholder="Confirm your new password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            error={!!error}
            icon={FaLock}
            rightIcon={showConfirmPassword ? FaEyeSlash : FaEye}
            onRightIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
          />
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg"
          >
            <FaExclamationTriangle />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}

        <Button
          type="submit"
          isLoading={isLoading}
          disabled={!formData.password || !formData.confirmPassword}
          className="w-full"
        >
          {isLoading ? 'Resetting Password...' : 'Reset Password'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600 text-sm">
          Remember your password?{' '}
          <Link to="/login" className="text-blood-600 hover:text-blood-800 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </motion.div>
  );
};

export default ResetPasswordPage;