import React, { forwardRef } from 'react';

const Input = forwardRef(({ 
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  disabled = false,
  required = false,
  error = false,
  errorMessage,
  label,
  helperText,
  icon,
  className = '',
  ...props 
}, ref) => {
  const baseClasses = 'w-full px-3 py-2 border rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blood-500 focus:border-transparent';
  
  const stateClasses = error 
    ? 'border-red-300 focus:ring-red-500' 
    : 'border-neutral-300 focus:border-blood-500';
  
  const disabledClasses = disabled 
    ? 'bg-neutral-50 text-neutral-500 cursor-not-allowed' 
    : 'bg-white text-neutral-900';
  
  const inputClasses = `${baseClasses} ${stateClasses} ${disabledClasses} ${className}`;

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-neutral-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {React.createElement(icon, { 
              className: `w-5 h-5 ${error ? 'text-red-400' : 'text-neutral-400'}` 
            })}
          </div>
        )}
        
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          disabled={disabled}
          required={required}
          className={`${inputClasses} ${icon ? 'pl-10' : ''}`}
          {...props}
        />
      </div>
      
      {error && errorMessage && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-neutral-600">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
