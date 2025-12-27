'use client';

/**
 * Fixed Authentication Context
 * Save as: frontend/src/context/AuthContext.jsx (REPLACE)
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { authAPI } from '@/lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in on mount
    const storedUser = Cookies.get('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing user from cookies:', error);
        Cookies.remove('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      const { user: userData, tokens, access, refresh } = response.data;

      // Store tokens - handle both response formats
      const accessToken = tokens?.access || access;
      const refreshToken = tokens?.refresh || refresh;

      if (!accessToken || !refreshToken) {
        throw new Error('Invalid response format from server');
      }

      Cookies.set('access_token', accessToken, { expires: 1 });
      Cookies.set('refresh_token', refreshToken, { expires: 7 });
      Cookies.set('user', JSON.stringify(userData), { expires: 7 });

      setUser(userData);
      router.push('/');
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const { user: newUser, access, refresh } = response.data;

      // Store tokens and user
      Cookies.set('access_token', access, { expires: 1 });
      Cookies.set('refresh_token', refresh, { expires: 7 });
      Cookies.set('user', JSON.stringify(newUser), { expires: 7 });

      setUser(newUser);
      router.push('/');
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data || 'Registration failed',
      };
    }
  };

  const logout = () => {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    Cookies.remove('user');
    setUser(null);
    router.push('/login');
  };

  const updateUser = async (data) => {
    try {
      const response = await authAPI.updateProfile(data);
      const updatedUser = response.data;
      
      Cookies.set('user', JSON.stringify(updatedUser), { expires: 7 });
      setUser(updatedUser);
      
      return { success: true };
    } catch (error) {
      console.error('Update error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Update failed',
      };
    }
  };

  const refreshUser = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data;
      
      Cookies.set('user', JSON.stringify(userData), { expires: 7 });
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      console.error('Refresh user error:', error);
      return { success: false };
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isBuyer: user?.role === 'BUYER',
    isSeller: user?.role === 'SELLER',
    isAdmin: user?.role === 'ADMIN' || user?.is_superuser,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}