'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Cookies from 'js-cookie';
import { authAPI } from '@/lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // IMPORTANT: Starts as true
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check if user is logged in on mount
    const initAuth = async () => {
      const storedUser = Cookies.get('user');
      const accessToken = Cookies.get('access_token');
      
      if (storedUser && accessToken) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
        } catch (error) {
          // Clear invalid cookies
          Cookies.remove('user');
          Cookies.remove('access_token');
          Cookies.remove('refresh_token');
        }
      }
      
      // IMPORTANT: Set loading to false after checking
      setLoading(false);
    };

    initAuth();
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
      
      // Redirect based on role
      if (userData.role === 'SELLER') {
        router.push('/inventory');
      } else if (userData.role === 'ADMIN') {
        router.push('/manage');
      } else {
        router.push('/');
      }
      
      return { success: true };
    } catch (error) {
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
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data || 'Registration failed',
      };
    }
  };

  const logout = () => {
    // Clear all auth data
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    Cookies.remove('user');
    setUser(null);
    
    // Redirect to login
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
      // If refresh fails, user might need to re-login
      if (error.response?.status === 401) {
        logout();
      }
      return { success: false };
    }
  };

  const value = {
    user,
    loading, // IMPORTANT: Expose loading state
    isLoading: loading, // Alias for convenience
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