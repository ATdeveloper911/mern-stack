import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'blood', 
  text = '', 
  fullScreen = false,
  className = '' 
}) => {
  const { getBloodTypeThemeClasses } = useTheme();

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colorClasses = {
    blood: 'text-blood-600',
    white: 'text-white',
    neutral: 'text-neutral-600',
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-yellow-600'
  };

  const SpinnerIcon = () => (
    <motion.div
      className={`${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }}
    >
      <svg
        className="w-full h-full"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </motion.div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="text-center">
          <SpinnerIcon />
          {text && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-4 text-neutral-600 font-medium"
            >
              {text}
            </motion.p>
          )}
        </div>
      </div>
    );
  }

  if (text) {
    return (
      <div className="flex items-center space-x-3">
        <SpinnerIcon />
        <span className="text-neutral-600 font-medium">{text}</span>
      </div>
    );
  }

  return <SpinnerIcon />;
};

export default LoadingSpinner;
