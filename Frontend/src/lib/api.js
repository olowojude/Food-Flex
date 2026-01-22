import axios from 'axios';
import Cookies from 'js-cookie';

// Create axios instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,  // CRITICAL: Send cookies with requests
});

// Add auth token to requests
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

// Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

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

          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
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

// ========================================
// AUTHENTICATION
// ========================================
export const authAPI = {
  register: (data) => api.post('/accounts/register/', data),
  login: (data) => api.post('/accounts/login/', data),
  logout: (refreshToken) => api.post('/accounts/logout/', { refresh_token: refreshToken }),
  
  getProfile: () => api.get('/accounts/profile/'),
  updateProfile: (data) => api.put('/accounts/profile/', data),
  changePassword: (data) => api.post('/accounts/profile/password/', data),
  
  getSellerProfile: () => api.get('/accounts/profile/business/'),
  updateSellerProfile: (data) => api.put('/accounts/profile/business/update/', data),
};

// ========================================
// SHOP - PRODUCTS & CATEGORIES
// ========================================
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
  updateProduct: (id, data) => api.patch(`/shop/products/${id}/update/`, data),
  deleteProduct: (id) => api.delete(`/shop/products/${id}/delete/`),
  
  // Seller Inventory
  getMyProducts: (params) => api.get('/shop/inventory/', { params }),

  // Store Locations
  getStoreLocations: () => api.get('/shop/store-locations/'),
  createStoreLocation: (data) => api.post('/shop/store-locations/', data),
  getStoreLocation: (id) => api.get(`/shop/store-locations/${id}/`),
  updateStoreLocation: (id, data) => api.patch(`/shop/store-locations/${id}/update/`, data),
  deleteStoreLocation: (id) => api.delete(`/shop/store-locations/${id}/delete/`),
  setStorePrimary: (id) => api.post(`/shop/store-locations/${id}/set-primary/`),
  
  // Reviews
  getProductReviews: (productId) => api.get(`/shop/products/${productId}/reviews/`),
  createReview: (productId, data) => api.post(`/shop/products/${productId}/reviews/create/`, data),
  updateReview: (reviewId, data) => api.put(`/shop/reviews/${reviewId}/`, data),
  deleteReview: (reviewId) => api.delete(`/shop/reviews/${reviewId}/delete/`),
};

// ========================================
// CART
// ========================================
export const cartAPI = {
  getCart: () => api.get('/orders/cart/'),
  addToCart: (data) => api.post('/orders/cart/add/', data),
  updateCartItem: (itemId, data) => api.patch(`/orders/cart/items/${itemId}/`, data),
  removeFromCart: (itemId) => api.delete(`/orders/cart/items/${itemId}/remove/`),
  clearCart: () => api.delete('/orders/cart/clear/'),
};

// ========================================
// ORDERS
// ========================================
export const orderAPI = {
  // BNPL Checkout Flow
  initiateCheckout: () => api.post('/orders/checkout/'),
  confirmCheckout: (data) => api.post('/orders/confirm-checkout/', data),
  
  // Orders
  getMyOrders: (params) => api.get('/orders/', { params }),
  getOrderDetail: (orderId) => api.get(`/orders/${orderId}/`),
  
  // Order Cancellation
  cancelOrder: (orderId, data) => api.post(`/orders/${orderId}/cancel/`, data),
  
  // QR Code & OTP
  saveQRCode: (orderId, data) => api.patch(`/orders/${orderId}/qr-code/`, data),
  verifyQRCode: (data) => api.post('/orders/verify-qr/', data),
  getBuyerOTP: (orderId) => api.get(`/orders/${orderId}/otp/`),
  
  // Seller Actions
  confirmOrder: (orderId, data) => api.post(`/orders/${orderId}/confirm/`, data),
  completeOrder: (orderId) => api.post(`/orders/${orderId}/complete/`),
  
  // Loan Management
  makePartialPayment: (orderId, data) => api.post(`/orders/${orderId}/partial-payment/`, data),
  getLoanDetails: (orderId) => api.get(`/orders/${orderId}/loan-details/`),
};

// ========================================
// CREDITS & LOANS
// ========================================
export const creditAPI = {
  // BUYER - Credit Account
  getMyCreditAccount: () => api.get('/credits/account/'),
  getMyCreditTransactions: () => api.get('/credits/transactions/'),
  getMyRepaymentHistory: () => api.get('/credits/repayments/'),
  initiateBuyerRepayment: (amount) => api.post('/credits/initiate-repayment/', { amount }),
  
  // BUYER - Loan Management (NEW - BNPL)
  getMyActiveLoans: () => api.get('/credits/active-loans/'),
  initiateLoanRepayment: (data) => api.post('/credits/loans/repay/initiate/', data),
  confirmLoanRepayment: (data) => api.post('/credits/loans/repay/confirm/', data),
  
  // ADMIN - Credit Management
  getAllCreditAccounts: (params) => api.get('/credits/accounts/', { params }),
  getCreditAccountDetail: (userId) => api.get(`/credits/accounts/${userId}/`),
  increaseCreditLimit: (userId, data) => api.post(`/credits/accounts/${userId}/increase-limit/`, data),
  getAllRepaymentHistory: (params) => api.get('/credits/repayments/all/', { params }),
  getAllCreditLimitHistory: (params) => api.get('/credits/limit-history/', { params }),
};

// ========================================
// ADMIN/MANAGEMENT
// ========================================
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