'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { authAPI } from '@/lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load user from cookies on mount
  useEffect(() => {
    const loadUser = () => {
      const savedUser = Cookies.get('user');
      const accessToken = Cookies.get('access_token');

      if (savedUser && accessToken) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (error) {
          console.error('Failed to parse user data:', error);
          Cookies.remove('user');
        }
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      const { user: userData, tokens } = response.data;

      // Save tokens and user to cookies
      Cookies.set('access_token', tokens.access, { expires: 1 }); // 1 day
      Cookies.set('refresh_token', tokens.refresh, { expires: 7 }); // 7 days
      Cookies.set('user', JSON.stringify(userData), { expires: 7 });

      setUser(userData);

      // Redirect to home page to browse products
      router.push('/');

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed. Please try again.',
      };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const { user: newUser, tokens } = response.data;

      // Save tokens and user to cookies
      Cookies.set('access_token', tokens.access, { expires: 1 });
      Cookies.set('refresh_token', tokens.refresh, { expires: 7 });
      Cookies.set('user', JSON.stringify(newUser), { expires: 7 });

      setUser(newUser);
      
      // Redirect to home page to start shopping
      router.push('/');

      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.response?.data || 'Registration failed. Please try again.',
      };
    }
  };

  // Google Login function
  const googleLogin = async (googleToken) => {
    try {
      const response = await authAPI.googleLogin({ token: googleToken });
      const { user: userData, tokens } = response.data;

      // Save tokens and user to cookies
      Cookies.set('access_token', tokens.access, { expires: 1 });
      Cookies.set('refresh_token', tokens.refresh, { expires: 7 });
      Cookies.set('user', JSON.stringify(userData), { expires: 7 });

      setUser(userData);

      // Redirect to home page
      router.push('/');

      return { success: true };
    } catch (error) {
      console.error('Google login error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Google login failed',
      };
    }
  };

  // Logout function
  const logout = () => {
    // Clear cookies and state
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    Cookies.remove('user');
    setUser(null);
    router.push('/login');
  };

  // Update user profile
  const updateUser = async (updatedData) => {
    try {
      const response = await authAPI.updateProfile(updatedData);
      const updatedUser = response.data;

      // Update cookies and state
      Cookies.set('user', JSON.stringify(updatedUser), { expires: 7 });
      setUser(updatedUser);

      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        error: error.response?.data || 'Failed to update profile.',
      };
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      const response = await authAPI.getProfile();
      const freshUser = response.data;

      Cookies.set('user', JSON.stringify(freshUser), { expires: 7 });
      setUser(freshUser);

      return { success: true, user: freshUser };
    } catch (error) {
      console.error('Refresh user error:', error);
      return { success: false };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    googleLogin,
    logout,
    updateUser,
    refreshUser,
    isAuthenticated: !!user,
    isBuyer: user?.role === 'BUYER',
    isSeller: user?.role === 'SELLER',
    isAdmin: user?.role === 'ADMIN' || user?.is_superuser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}