import axios from 'axios';
import Cookies from 'js-cookie';

// Create axios instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If token expired, try to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = Cookies.get('refresh_token');
        if (refreshToken) {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'}/accounts/token/refresh/`,
            { refresh: refreshToken }
          );

          const { access } = response.data;
          Cookies.set('access_token', access, { expires: 1 });

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
        Cookies.remove('user');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// AUTHENTICATION & USER PROFILE
// ============================================================================
export const authAPI = {
  register: (data) => api.post('/accounts/register/', data),
  login: (data) => api.post('/accounts/login/', data),
  logout: (refreshToken) => api.post('/accounts/logout/', { refresh_token: refreshToken }),
  
  // User Profile
  getProfile: () => api.get('/accounts/profile/'),
  updateProfile: (data) => api.put('/accounts/profile/', data),
  changePassword: (data) => api.post('/accounts/profile/password/', data),
  
  // Seller/Business Profile
  applyForSeller: (data) => api.post('/accounts/profile/business/apply/', data),
  getSellerProfile: () => api.get('/accounts/profile/business/'),
  updateSellerProfile: (data) => api.put('/accounts/profile/business/update/', data),
};

// ============================================================================
// SHOP - PRODUCTS & CATEGORIES
// ============================================================================
export const shopAPI = {
  // Categories
  getCategories: () => api.get('/shop/categories/'),
  getCategory: (slug) => api.get(`/shop/categories/${slug}/`),
  createCategory: (data) => api.post('/shop/categories/create/', data),
  updateCategory: (id, data) => api.put(`/shop/categories/${id}/update/`, data),
  deleteCategory: (id) => api.delete(`/shop/categories/${id}/delete/`),
  
  // Products
  getProducts: (params) => api.get('/shop/products/', { params }),
  getProduct: (slug) => api.get(`/shop/products/${slug}/`),
  createProduct: (data) => api.post('/shop/products/create/', data),
  updateProduct: (id, data) => api.put(`/shop/products/${id}/update/`, data),
  deleteProduct: (id) => api.delete(`/shop/products/${id}/delete/`),
  
  // Seller Inventory
  getMyProducts: (params) => api.get('/shop/inventory/', { params }),
  
  // Reviews
  getProductReviews: (productId) => api.get(`/shop/products/${productId}/reviews/`),
  createReview: (productId, data) => api.post(`/shop/products/${productId}/reviews/create/`, data),
  updateReview: (reviewId, data) => api.put(`/shop/reviews/${reviewId}/`, data),
  deleteReview: (reviewId) => api.delete(`/shop/reviews/${reviewId}/delete/`),
};

// ============================================================================
// CART
// ============================================================================
export const cartAPI = {
  getCart: () => api.get('/orders/cart/'),
  addToCart: (data) => api.post('/orders/cart/add/', data),
  updateCartItem: (itemId, data) => api.patch(`/orders/cart/items/${itemId}/`, data),
  removeFromCart: (itemId) => api.delete(`/orders/cart/items/${itemId}/remove/`),
  clearCart: () => api.delete('/orders/cart/clear/'),
};

// ============================================================================
// ORDERS (Unified for Buyers & Sellers)
// ============================================================================
export const orderAPI = {
  // Checkout
  checkout: () => api.post('/orders/checkout/'),
  
  // Orders (same endpoint for buyers and sellers - backend handles permissions)
  getMyOrders: (params) => api.get('/orders/', { params }),
  getOrderDetail: (orderId) => api.get(`/orders/${orderId}/`),
  saveQRCode: (orderId, data) => api.patch(`/orders/${orderId}/qr-code/`, data),
  
  // Order Actions (no "seller/" prefix - permissions checked in backend)
  verifyQRCode: (data) => api.post('/orders/verify-qr/', data),
  confirmOrder: (orderId) => api.post(`/orders/${orderId}/confirm/`),
  completeOrder: (orderId) => api.post(`/orders/${orderId}/complete/`),
};

// ============================================================================
// CREDITS
// ============================================================================
export const creditAPI = {
  // User Credit
  getMyCreditAccount: () => api.get('/credits/account/'),
  getMyCreditTransactions: () => api.get('/credits/transactions/'),
  getMyRepaymentHistory: () => api.get('/credits/repayments/'),
  
  // Management
  getAllCreditAccounts: (params) => api.get('/credits/accounts/', { params }),
  getCreditAccountDetail: (userId) => api.get(`/credits/accounts/${userId}/`),
  processRepayment: (userId, data) => api.post(`/credits/accounts/${userId}/repayment/`, data),
  increaseCreditLimit: (userId, data) => api.post(`/credits/accounts/${userId}/increase-limit/`, data),
  getAllRepaymentHistory: (params) => api.get('/credits/repayments/all/', { params }),
  getCreditLimitHistory: (params) => api.get('/credits/limit-history/', { params }),
};

// ============================================================================
// ADMIN/MANAGEMENT
// ============================================================================
export const adminAPI = {
  // User Management
  getAllUsers: (params) => api.get('/accounts/users/', { params }),
  getUserDetail: (userId) => api.get(`/accounts/users/${userId}/`),
  updateUser: (userId, data) => api.patch(`/accounts/users/${userId}/update/`, data),
  deleteUser: (userId) => api.delete(`/accounts/users/${userId}/delete/`),
  approveSeller: (userId) => api.post(`/accounts/users/${userId}/approve-seller/`),
  
  // Category Management
  createCategory: (data) => api.post('/shop/categories/create/', data),
  updateCategory: (id, data) => api.put(`/shop/categories/${id}/update/`, data),
  deleteCategory: (id) => api.delete(`/shop/categories/${id}/delete/`),
  
  // Orders Management
  getAllOrders: (params) => api.get('/orders/all/', { params }),
};

export default api;