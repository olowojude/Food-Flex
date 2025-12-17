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
            `${process.env.NEXT_PUBLIC_API_URL}/auth/token/refresh/`,
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
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  register: (data) => api.post('/auth/register/', data),
  login: (data) => api.post('/auth/login/', data),
  // googleLogin: (data) => api.post('/auth/google-login/', data), // TODO: Enable later
  logout: (refreshToken) => api.post('/auth/logout/', { refresh_token: refreshToken }),
  getProfile: () => api.get('/auth/profile/'),
  updateProfile: (data) => api.put('/auth/profile/', data),
  changePassword: (data) => api.post('/auth/change-password/', data),
  applyForSeller: (data) => api.post('/auth/apply-seller/', data),
};

export const shopAPI = {
  // Categories
  getCategories: () => api.get('/shop/categories/'),
  getCategory: (slug) => api.get(`/shop/categories/${slug}/`),
  
  // Products
  getProducts: (params) => api.get('/shop/products/', { params }),
  getProduct: (slug) => api.get(`/shop/products/${slug}/`),
  createProduct: (data) => api.post('/shop/products/create/', data),
  updateProduct: (id, data) => api.put(`/shop/products/${id}/update/`, data),
  deleteProduct: (id) => api.delete(`/shop/products/${id}/delete/`),
  getMyProducts: (params) => api.get('/shop/my-products/', { params }),
  
  // Reviews
  getProductReviews: (productId) => api.get(`/shop/products/${productId}/reviews/`),
  createReview: (productId, data) => api.post(`/shop/products/${productId}/reviews/create/`, data),
};

export const cartAPI = {
  getCart: () => api.get('/orders/cart/'),
  addToCart: (data) => api.post('/orders/cart/add/', data),
  updateCartItem: (itemId, data) => api.patch(`/orders/cart/item/${itemId}/update/`, data),
  removeFromCart: (itemId) => api.delete(`/orders/cart/item/${itemId}/remove/`),
  clearCart: () => api.delete('/orders/cart/clear/'),
};

export const orderAPI = {
  checkout: () => api.post('/orders/checkout/'),
  saveQRCode: (orderId, data) => api.patch(`/orders/orders/${orderId}/save-qr/`, data),
  getMyOrders: (params) => api.get('/orders/my-orders/', { params }),
  getOrderDetail: (orderId) => api.get(`/orders/orders/${orderId}/`),
  
  // Seller
  getSellerOrders: (params) => api.get('/orders/seller/orders/', { params }),
  verifyQRCode: (data) => api.post('/orders/seller/verify-qr/', data),
  confirmOrder: (orderId) => api.post(`/orders/seller/orders/${orderId}/confirm/`),
  completeOrder: (orderId) => api.post(`/orders/seller/orders/${orderId}/complete/`),
};

export const creditAPI = {
  getMyCreditAccount: () => api.get('/credits/my-credit/'),
  getMyCreditTransactions: () => api.get('/credits/my-transactions/'),
  getMyRepaymentHistory: () => api.get('/credits/my-repayments/'),
  
  // Admin
  getAllCreditAccounts: (params) => api.get('/credits/admin/accounts/', { params }),
  getCreditAccountDetail: (userId) => api.get(`/credits/admin/accounts/${userId}/`),
  processRepayment: (userId, data) => api.post(`/credits/admin/repayment/${userId}/`, data),
  increaseCreditLimit: (userId, data) => api.post(`/credits/admin/increase-limit/${userId}/`, data),
};

export const adminAPI = {
  // Users
  getAllUsers: (params) => api.get('/auth/admin/users/', { params }),
  getUserDetail: (userId) => api.get(`/auth/admin/users/${userId}/`),
  approveSeller: (userId) => api.post(`/auth/admin/approve-seller/${userId}/`),
  
  // Categories
  createCategory: (data) => api.post('/shop/categories/create/', data),
  updateCategory: (id, data) => api.put(`/shop/categories/${id}/update/`, data),
  deleteCategory: (id) => api.delete(`/shop/categories/${id}/delete/`),
  
  // Orders
  getAllOrders: (params) => api.get('/orders/admin/orders/', { params }),
};

export default api;