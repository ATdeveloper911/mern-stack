import React from 'react';
import { motion } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  isLoading = false,
  onClick,
  type = 'button',
  className = '',
  ...props 
}) => {
  // Variant classes
  const variantClasses = {
    primary: 'bg-blood-600 hover:bg-blood-700 text-white border-transparent',
    secondary: 'bg-neutral-600 hover:bg-neutral-700 text-white border-transparent',
    outline: 'bg-transparent hover:bg-neutral-50 text-neutral-700 border-neutral-300',
    ghost: 'bg-transparent hover:bg-neutral-100 text-neutral-700 border-transparent',
    danger: 'bg-red-600 hover:bg-red-700 text-white border-transparent',
    success: 'bg-green-600 hover:bg-green-700 text-white border-transparent',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white border-transparent'
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
  };

  // Base classes
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blood-500 disabled:opacity-50 disabled:cursor-not-allowed';

  // Combine classes
  const buttonClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  return (
    <motion.button
      type={type}
      className={buttonClasses}
      disabled={disabled || isLoading}
      onClick={onClick}
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      transition={{ duration: 0.1 }}
      {...props}
    >
      {isLoading ? (
        <>
          <LoadingSpinner size="sm" color="text-current" />
          <span className="ml-2">Loading...</span>
        </>
      ) : (
        children
      )}
    </motion.button>
  );
};

export default Button;
