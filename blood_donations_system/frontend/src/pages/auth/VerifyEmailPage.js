import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaEnvelope, FaCheckCircle, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';

const VerifyEmailPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isResending, setIsResending] = useState(false);

  // Verify email on component mount
  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Simulate email verification
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // In a real app, you would verify the email with the API
        // const response = await authAPI.verifyEmail(token);
        
        setIsSuccess(true);
      } catch (err) {
        setError('Invalid or expired verification token. Please request a new verification email.');
      } finally {
        setIsVerifying(false);
      }
    };

    if (token) {
      verifyEmail();
    } else {
      setError('No verification token provided.');
      setIsVerifying(false);
    }
  }, [token]);

  const handleResendVerification = async () => {
    setIsResending(true);
    setError('');

    try {
      // Simulate resend verification
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real app, you would call the resend verification API here
      // await authAPI.resendVerification();
      
      // Show success message
      setError('Verification email sent! Please check your inbox.');
    } catch (err) {
      setError('Failed to resend verification email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  // Loading state
  if (isVerifying) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner fullScreen text="Verifying your email..." />
      </div>
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
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Email Verified Successfully!</h2>
          <p className="text-gray-600">
            Your email has been verified. You can now access all features of BloodLink.
          </p>
        </div>
        
        <div className="space-y-4">
          <Button
            onClick={() => navigate('/login')}
            className="w-full"
          >
            Continue to Login
          </Button>
          
          <Link to="/" className="text-blood-600 hover:text-blood-800 text-sm font-medium">
            Back to Home
          </Link>
        </div>
      </motion.div>
    );
  }

  // Error state
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 text-center"
    >
      <div className="mb-6">
        <FaExclamationTriangle className="text-6xl text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Verification Failed</h2>
        <p className="text-gray-600 mb-4">{error}</p>
      </div>
      
      <div className="space-y-4">
        <Button
          onClick={handleResendVerification}
          isLoading={isResending}
          className="w-full"
        >
          {isResending ? (
            <>
              <FaSpinner className="animate-spin mr-2" />
              Sending...
            </>
          ) : (
            <>
              <FaEnvelope className="mr-2" />
              Resend Verification Email
            </>
          )}
        </Button>
        
        <div className="flex flex-col space-y-2">
          <Link to="/login" className="text-blood-600 hover:text-blood-800 text-sm font-medium">
            Back to Login
          </Link>
          
          <Link to="/register" className="text-blood-600 hover:text-blood-800 text-sm font-medium">
            Create New Account
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default VerifyEmailPage;