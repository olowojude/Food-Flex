'use client';

/**
 * Fixed CartContext - Clear cart now updates navbar badge
 * Save as: frontend/src/context/CartContext.jsx (REPLACE)
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { cartAPI } from '@/lib/api';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user, isAuthenticated, isBuyer } = useAuth();

  // Fetch cart when user logs in
  useEffect(() => {
    if (isAuthenticated && isBuyer) {
      fetchCart();
    } else {
      setCart(null);
    }
  }, [isAuthenticated, isBuyer, user]);

  // Fetch cart from API
  const fetchCart = async () => {
    try {
      setLoading(true);
      const response = await cartAPI.getCart();
      setCart(response.data);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add item to cart
  const addToCart = async (productId, quantity = 1) => {
    try {
      const response = await cartAPI.addToCart({ product_id: productId, quantity });
      setCart(response.data.cart);
      return { success: true, message: 'Product added to cart' };
    } catch (error) {
      console.error('Error adding to cart:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to add product to cart',
      };
    }
  };

  // Update cart item quantity
  const updateCartItem = async (itemId, quantity) => {
    try {
      const response = await cartAPI.updateCartItem(itemId, { quantity });
      setCart(response.data.cart);
      return { success: true, message: 'Cart updated' };
    } catch (error) {
      console.error('Error updating cart:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update cart',
      };
    }
  };

  // Remove item from cart
  const removeFromCart = async (itemId) => {
    try {
      const response = await cartAPI.removeFromCart(itemId);
      setCart(response.data.cart);
      return { success: true, message: 'Item removed from cart' };
    } catch (error) {
      console.error('Error removing from cart:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to remove item',
      };
    }
  };

  // Clear entire cart - FIXED VERSION
  const clearCart = async () => {
    try {
      await cartAPI.clearCart();
      
      // Option 1: Refetch cart from backend (recommended - ensures sync)
      await fetchCart();
      
      // Option 2: Update local state immediately (faster UI response)
      // Uncomment this and comment out fetchCart() if you prefer instant update
      // setCart(prev => ({ ...prev, items: [], total_items: 0, subtotal: '0.00' }));
      
      return { success: true, message: 'Cart cleared' };
    } catch (error) {
      console.error('Error clearing cart:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to clear cart',
      };
    }
  };

  const value = {
    cart,
    loading,
    fetchCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    itemCount: cart?.total_items || 0,
    subtotal: cart?.subtotal || 0,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// Custom hook to use cart context
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}