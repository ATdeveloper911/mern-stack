import React from 'react';
import { motion } from 'framer-motion';

const Toggle = ({ 
  checked = false, 
  onChange, 
  disabled = false, 
  size = 'md',
  label,
  className = '',
  ...props 
}) => {
  // Size classes
  const sizeClasses = {
    sm: {
      track: 'w-8 h-4',
      thumb: 'w-3 h-3',
      translate: 'translate-x-4'
    },
    md: {
      track: 'w-11 h-6',
      thumb: 'w-5 h-5',
      translate: 'translate-x-5'
    },
    lg: {
      track: 'w-14 h-7',
      thumb: 'w-6 h-6',
      translate: 'translate-x-7'
    }
  };

  const sizes = sizeClasses[size];

  const handleToggle = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`relative inline-flex ${sizes.track} flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blood-500 focus:ring-offset-2 ${
          checked 
            ? 'bg-blood-600' 
            : 'bg-neutral-200'
        } ${
          disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:bg-blood-700'
        }`}
        {...props}
      >
        <motion.span
          className={`pointer-events-none inline-block ${sizes.thumb} transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
          animate={{
            x: checked ? 0 : -1,
            translateX: checked ? sizes.translate : 'translate-x-0'
          }}
          transition={{ duration: 0.2 }}
        />
      </button>
      
      {label && (
        <label 
          className={`text-sm font-medium ${
            disabled ? 'text-neutral-400' : 'text-neutral-700'
          }`}
        >
          {label}
        </label>
      )}
    </div>
  );
};

export default Toggle;
