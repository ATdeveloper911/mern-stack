import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';

const AuthContext = createContext();

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        loading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        error: null,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
};

const initialState = {
  isAuthenticated: false,
  user: null,
  token: localStorage.getItem('token'),
  loading: true,
  error: null,
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Get current user query
  const { data: currentUser, isLoading: userLoading } = useQuery(
    'currentUser',
    () => api.get('/auth/me').then(res => res.data.data.user),
    {
      enabled: !!state.token,
      retry: false,
      onError: () => {
        dispatch({ type: 'LOGOUT' });
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      },
    }
  );

  // Update user in state when currentUser changes
  useEffect(() => {
    if (currentUser && state.token) {
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: currentUser, token: state.token },
      });
    }
  }, [currentUser, state.token]);

  // Login mutation
  const loginMutation = useMutation(
    (credentials) => api.post('/auth/login', credentials),
    {
      onSuccess: (response) => {
        const { user, token, refreshToken } = response.data.data;
        
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user, token },
        });
        
        queryClient.setQueryData('currentUser', user);
        
        toast.success(`Welcome back, ${user.firstName}!`);
        
        // Redirect based on user role
        if (user.role === 'system_admin' || user.role === 'medical_admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Login failed';
        dispatch({ type: 'LOGIN_FAILURE', payload: message });
        toast.error(message);
      },
    }
  );

  // Register mutation
  const registerMutation = useMutation(
    (userData) => api.post('/auth/register', userData),
    {
      onSuccess: (response) => {
        const { user, token, refreshToken } = response.data.data;
        
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user, token },
        });
        
        queryClient.setQueryData('currentUser', user);
        
        toast.success('Account created successfully! Welcome to your dashboard.');
        navigate('/dashboard');
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Registration failed';
        toast.error(message);
      },
    }
  );

  // Logout mutation
  const logoutMutation = useMutation(
    () => api.post('/auth/logout'),
    {
      onSuccess: () => {
        dispatch({ type: 'LOGOUT' });
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        queryClient.clear();
        toast.success('Logged out successfully');
        navigate('/');
      },
      onError: () => {
        // Even if logout fails on server, clear local state
        dispatch({ type: 'LOGOUT' });
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        queryClient.clear();
        navigate('/');
      },
    }
  );

  // Forgot password mutation
  const forgotPasswordMutation = useMutation(
    (email) => api.post('/auth/forgot-password', { email }),
    {
      onSuccess: () => {
        toast.success('Password reset link sent to your email');
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Failed to send reset email';
        toast.error(message);
      },
    }
  );

  // Reset password mutation
  const resetPasswordMutation = useMutation(
    ({ token, password }) => api.post('/auth/reset-password', { token, password }),
    {
      onSuccess: () => {
        toast.success('Password reset successfully');
        navigate('/auth/login');
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Password reset failed';
        toast.error(message);
      },
    }
  );

  // Verify email mutation
  const verifyEmailMutation = useMutation(
    (token) => api.post('/auth/verify-email', { token }),
    {
      onSuccess: () => {
        toast.success('Email verified successfully');
        queryClient.invalidateQueries('currentUser');
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Email verification failed';
        toast.error(message);
      },
    }
  );

  // Resend verification mutation
  const resendVerificationMutation = useMutation(
    () => api.post('/auth/resend-verification'),
    {
      onSuccess: () => {
        toast.success('Verification email sent');
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Failed to send verification email';
        toast.error(message);
      },
    }
  );

  // Change password mutation
  const changePasswordMutation = useMutation(
    (passwords) => api.post('/auth/change-password', passwords),
    {
      onSuccess: () => {
        toast.success('Password changed successfully');
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Password change failed';
        toast.error(message);
      },
    }
  );

  // Update profile mutation
  const updateProfileMutation = useMutation(
    (profileData) => api.put(`/users/${state.user?.id}`, profileData),
    {
      onSuccess: (response) => {
        const updatedUser = response.data.data.user;
        dispatch({ type: 'UPDATE_USER', payload: updatedUser });
        queryClient.setQueryData('currentUser', updatedUser);
        toast.success('Profile updated successfully');
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Profile update failed';
        toast.error(message);
      },
    }
  );

  // Login function
  const login = (credentials) => {
    dispatch({ type: 'LOGIN_START' });
    loginMutation.mutate(credentials);
  };

  // Register function
  const register = (userData) => {
    registerMutation.mutate(userData);
  };

  // Logout function
  const logout = () => {
    logoutMutation.mutate();
  };

  // Forgot password function
  const forgotPassword = (email) => {
    forgotPasswordMutation.mutate(email);
  };

  // Reset password function
  const resetPassword = (token, password) => {
    resetPasswordMutation.mutate({ token, password });
  };

  // Verify email function
  const verifyEmail = (token) => {
    verifyEmailMutation.mutate(token);
  };

  // Resend verification function
  const resendVerification = () => {
    resendVerificationMutation.mutate();
  };

  // Change password function
  const changePassword = (passwords) => {
    changePasswordMutation.mutate(passwords);
  };

  // Update profile function
  const updateProfile = (profileData) => {
    updateProfileMutation.mutate(profileData);
  };

  // Check if user has required role
  const hasRole = (requiredRoles) => {
    if (!state.user || !requiredRoles || !Array.isArray(requiredRoles)) {
      return false;
    }
    // Check if user's role is in the required roles array
    return requiredRoles.includes(state.user.role);
  };

  // Check if user is verified
  const isVerified = () => {
    if (!state.user) return false;
    return state.user.isEmailVerified && state.user.isPhoneVerified && state.user.isMedicalVerified;
  };

  const value = {
    ...state,
    loading: state.loading || userLoading,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification,
    changePassword,
    updateProfile,
    hasRole,
    isVerified,
    // Mutation states
    isLoggingIn: loginMutation.isLoading,
    isRegistering: registerMutation.isLoading,
    isLoggingOut: logoutMutation.isLoading,
    isForgotPasswordLoading: forgotPasswordMutation.isLoading,
    isResetPasswordLoading: resetPasswordMutation.isLoading,
    isVerifyEmailLoading: verifyEmailMutation.isLoading,
    isResendVerificationLoading: resendVerificationMutation.isLoading,
    isChangePasswordLoading: changePasswordMutation.isLoading,
    isUpdateProfileLoading: updateProfileMutation.isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
