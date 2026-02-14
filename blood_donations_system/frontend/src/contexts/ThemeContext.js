import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Get theme from localStorage or default to 'light'
    const savedTheme = localStorage.getItem('bloodlink-theme');
    return savedTheme || 'light';
  });

  const [bloodType, setBloodType] = useState(() => {
    // Get blood type from localStorage or default to null
    const savedBloodType = localStorage.getItem('bloodlink-blood-type');
    return savedBloodType || null;
  });

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    localStorage.setItem('bloodlink-theme', theme);
  }, [theme]);

  // Save blood type to localStorage
  useEffect(() => {
    if (bloodType) {
      localStorage.setItem('bloodlink-blood-type', bloodType);
    } else {
      localStorage.removeItem('bloodlink-blood-type');
    }
  }, [bloodType]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const setBloodTypeTheme = (type) => {
    setBloodType(type);
  };

  // Get blood type specific colors
  const getBloodTypeColors = (type) => {
    const colors = {
      'A+': {
        primary: 'blood-a-500',
        secondary: 'blood-a-100',
        accent: 'blood-a-600',
        text: 'blood-a-800',
        bg: 'blood-a-50',
      },
      'A-': {
        primary: 'blood-a-400',
        secondary: 'blood-a-50',
        accent: 'blood-a-500',
        text: 'blood-a-700',
        bg: 'blood-a-25',
      },
      'B+': {
        primary: 'blood-b-500',
        secondary: 'blood-b-100',
        accent: 'blood-b-600',
        text: 'blood-b-800',
        bg: 'blood-b-50',
      },
      'B-': {
        primary: 'blood-b-400',
        secondary: 'blood-b-50',
        accent: 'blood-b-500',
        text: 'blood-b-700',
        bg: 'blood-b-25',
      },
      'AB+': {
        primary: 'blood-ab-500',
        secondary: 'blood-ab-100',
        accent: 'blood-ab-600',
        text: 'blood-ab-800',
        bg: 'blood-ab-50',
      },
      'AB-': {
        primary: 'blood-ab-400',
        secondary: 'blood-ab-50',
        accent: 'blood-ab-500',
        text: 'blood-ab-700',
        bg: 'blood-ab-25',
      },
      'O+': {
        primary: 'blood-o-500',
        secondary: 'blood-o-100',
        accent: 'blood-o-600',
        text: 'blood-o-800',
        bg: 'blood-o-50',
      },
      'O-': {
        primary: 'blood-o-400',
        secondary: 'blood-o-50',
        accent: 'blood-o-500',
        text: 'blood-o-700',
        bg: 'blood-o-25',
      },
    };
    
    return colors[type] || {
      primary: 'blood-500',
      secondary: 'blood-100',
      accent: 'blood-600',
      text: 'blood-800',
      bg: 'blood-50',
    };
  };

  // Get theme-specific classes
  const getThemeClasses = () => {
    const baseClasses = {
      light: {
        bg: 'bg-neutral-50',
        text: 'text-neutral-900',
        card: 'bg-white',
        border: 'border-neutral-200',
        input: 'bg-white border-neutral-300',
        button: 'bg-blood-600 hover:bg-blood-700 text-white',
      },
      dark: {
        bg: 'bg-neutral-900',
        text: 'text-neutral-100',
        card: 'bg-neutral-800',
        border: 'border-neutral-700',
        input: 'bg-neutral-800 border-neutral-600 text-neutral-100',
        button: 'bg-blood-500 hover:bg-blood-600 text-white',
      },
    };
    
    return baseClasses[theme];
  };

  // Get blood type specific theme classes
  const getBloodTypeThemeClasses = () => {
    if (!bloodType) return {};
    
    const colors = getBloodTypeColors(bloodType);
    
    return {
      primary: `bg-${colors.primary} text-white`,
      secondary: `bg-${colors.secondary} text-${colors.text}`,
      accent: `bg-${colors.accent} text-white`,
      text: `text-${colors.text}`,
      bg: `bg-${colors.bg}`,
      border: `border-${colors.primary}`,
      ring: `ring-${colors.primary}`,
      shadow: `shadow-${colors.primary.replace('-500', '')}`,
    };
  };

  // Get emergency theme classes
  const getEmergencyThemeClasses = () => {
    return {
      primary: 'bg-emergency-500 text-white',
      secondary: 'bg-emergency-100 text-emergency-800',
      accent: 'bg-emergency-600 text-white',
      text: 'text-emergency-800',
      bg: 'bg-emergency-50',
      border: 'border-emergency-500',
      ring: 'ring-emergency-500',
      shadow: 'shadow-emergency',
      animate: 'animate-emergency-flash',
    };
  };

  // Get medical theme classes
  const getMedicalThemeClasses = () => {
    return {
      primary: 'bg-medical-500 text-white',
      secondary: 'bg-medical-100 text-medical-800',
      accent: 'bg-medical-600 text-white',
      text: 'text-medical-800',
      bg: 'bg-medical-50',
      border: 'border-medical-500',
      ring: 'ring-medical-500',
      shadow: 'shadow-medical',
    };
  };

  // Get success theme classes
  const getSuccessThemeClasses = () => {
    return {
      primary: 'bg-success-500 text-white',
      secondary: 'bg-success-100 text-success-800',
      accent: 'bg-success-600 text-white',
      text: 'text-success-800',
      bg: 'bg-success-50',
      border: 'border-success-500',
      ring: 'ring-success-500',
      shadow: 'shadow-success',
    };
  };

  // Get error theme classes
  const getErrorThemeClasses = () => {
    return {
      primary: 'bg-error-500 text-white',
      secondary: 'bg-error-100 text-error-800',
      accent: 'bg-error-600 text-white',
      text: 'text-error-800',
      bg: 'bg-error-50',
      border: 'border-error-500',
      ring: 'ring-error-500',
      shadow: 'shadow-error',
    };
  };

  // Get warning theme classes
  const getWarningThemeClasses = () => {
    return {
      primary: 'bg-warning-500 text-white',
      secondary: 'bg-warning-100 text-warning-800',
      accent: 'bg-warning-600 text-white',
      text: 'text-warning-800',
      bg: 'bg-warning-50',
      border: 'border-warning-500',
      ring: 'ring-warning-500',
      shadow: 'shadow-warning',
    };
  };

  // Get gradient classes
  const getGradientClasses = () => {
    return {
      blood: 'bg-gradient-to-r from-blood-600 to-blood-800',
      medical: 'bg-gradient-to-r from-medical-600 to-medical-800',
      emergency: 'bg-gradient-to-r from-emergency-500 to-emergency-700',
      success: 'bg-gradient-to-r from-success-500 to-success-700',
      bloodType: bloodType ? `bg-gradient-to-r from-${getBloodTypeColors(bloodType).primary} to-${getBloodTypeColors(bloodType).accent}` : 'bg-gradient-to-r from-blood-600 to-blood-800',
    };
  };

  // Get animation classes
  const getAnimationClasses = () => {
    return {
      fadeIn: 'animate-fade-in',
      fadeInUp: 'animate-fade-in-up',
      fadeInDown: 'animate-fade-in-down',
      slideInLeft: 'animate-slide-in-left',
      slideInRight: 'animate-slide-in-right',
      scaleIn: 'animate-scale-in',
      pulse: 'animate-pulse',
      heartbeat: 'animate-heartbeat',
      bloodDrip: 'animate-blood-drip',
      emergencyFlash: 'animate-emergency-flash',
    };
  };

  const value = {
    theme,
    bloodType,
    toggleTheme,
    setBloodTypeTheme,
    getBloodTypeColors,
    getThemeClasses,
    getBloodTypeThemeClasses,
    getEmergencyThemeClasses,
    getMedicalThemeClasses,
    getSuccessThemeClasses,
    getErrorThemeClasses,
    getWarningThemeClasses,
    getGradientClasses,
    getAnimationClasses,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
