import React, { forwardRef } from 'react';

const Select = forwardRef(({ 
  options = [],
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
  placeholder = 'Select an option',
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
  
  const selectClasses = `${baseClasses} ${stateClasses} ${disabledClasses} ${className}`;

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-neutral-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <select
        ref={ref}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        onFocus={onFocus}
        disabled={disabled}
        required={required}
        className={selectClasses}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {error && errorMessage && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-neutral-600">{helperText}</p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
