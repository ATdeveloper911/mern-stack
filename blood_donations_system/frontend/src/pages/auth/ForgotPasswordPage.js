import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaEnvelope, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real app, you would call the forgot password API here
      // await authAPI.forgotPassword(email);
      
      setIsSubmitted(true);
    } catch (err) {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 text-center"
      >
        <div className="mb-6">
          <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Check Your Email</h2>
          <p className="text-gray-600">
            We've sent a password reset link to <strong>{email}</strong>
          </p>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Didn't receive the email? Check your spam folder or try again.
          </p>
          
          <div className="flex flex-col space-y-3">
            <Button
              onClick={() => setIsSubmitted(false)}
              variant="outline"
              className="w-full"
            >
              Try Different Email
            </Button>
            
            <Link to="/login" className="text-blood-600 hover:text-blood-800 text-sm font-medium">
              Back to Login
            </Link>
          </div>
        </div>
      </motion.div>
    );
  }

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
        
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Forgot Password?</h2>
        <p className="text-gray-600">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Input
            type="email"
            label="Email Address"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            error={!!error}
            errorMessage={error}
            icon={FaEnvelope}
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
          disabled={!email}
          className="w-full"
        >
          {isLoading ? 'Sending...' : 'Send Reset Link'}
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

export default ForgotPasswordPage;