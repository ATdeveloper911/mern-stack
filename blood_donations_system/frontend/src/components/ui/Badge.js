import React from 'react';

const Badge = ({ 
  children, 
  variant = 'default', 
  size = 'md', 
  className = '',
  ...props 
}) => {
  // Variant classes
  const variantClasses = {
    default: 'bg-neutral-100 text-neutral-800',
    primary: 'bg-blood-100 text-blood-800',
    secondary: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800'
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  // Base classes
  const baseClasses = 'inline-flex items-center font-medium rounded-full';

  // Combine classes
  const badgeClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  return (
    <span className={badgeClasses} {...props}>
      {children}
    </span>
  );
};

export default Badge;
