import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth.api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('payguard_token');
      const storedUser = localStorage.getItem('payguard_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        try {
          setUser(JSON.parse(storedUser));
          // Verify session in background
          const res = await authApi.getMe();
          if (res.user) {
            setUser(res.user);
            localStorage.setItem('payguard_user', JSON.stringify(res.user));
          }
        } catch (err) {
          console.warn('Session restoration failed:', err);
          logout();
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(email, password);
      const { token: receivedToken, user: receivedUser } = res;

      localStorage.setItem('payguard_token', receivedToken);
      localStorage.setItem('payguard_user', JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);
      setIsLoading(false);
      return { success: true, user: receivedUser };
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await authApi.logout().catch(() => {});
      }
    } finally {
      localStorage.removeItem('payguard_token');
      localStorage.removeItem('payguard_user');
      setToken(null);
      setUser(null);
    }
  };

  const hasRole = (...roles) => {
    if (!user || !user.role) return false;
    return roles.includes(user.role);
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
    hasRole,
    isAdmin: user?.role === 'ADMIN',
    isSupport: user?.role === 'SUPPORT',
    isMerchant: user?.role === 'MERCHANT',
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
