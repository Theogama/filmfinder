import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('movieflix-auth-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('movieflix-auth-refresh-token');
        if (refreshToken) {
          const response = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {
            refreshToken
          });

          const { token, refreshToken: newRefreshToken } = response.data;
          localStorage.setItem('movieflix-auth-token', token);
          localStorage.setItem('movieflix-auth-refresh-token', newRefreshToken);
          
          // Update default header
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          originalRequest.headers.Authorization = `Bearer ${token}`;

          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('movieflix-auth-token');
        localStorage.removeItem('movieflix-auth-refresh-token');
        localStorage.removeItem('movieflix-auth');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  getCurrentUser: () => api.get('/auth/me'),
  changePassword: (passwordData) => api.post('/auth/change-password', passwordData),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (tokenData) => api.post('/auth/reset-password', tokenData),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
};

// Movies API
export const moviesAPI = {
  getMovies: (params = {}) => api.get('/movies', { params }),
  getMovie: (id) => api.get(`/movies/${id}`),
  searchMovies: (params) => api.get('/movies/search', { params }),
  getFeaturedMovies: () => api.get('/movies/featured'),
  getTrendingMovies: () => api.get('/movies/trending'),
  getGenres: () => api.get('/movies/genres'),
  getMovieStream: (id) => api.get(`/movies/${id}/stream`),
  getRecommendations: (id) => api.get(`/movies/${id}/recommendations`),
  
  // User interactions
  toggleLike: (id) => api.post(`/movies/${id}/like`),
  toggleWatchlist: (id) => api.post(`/movies/${id}/watchlist`),
  rateMovie: (id, ratingData) => api.post(`/movies/${id}/rate`, ratingData),
  updateProgress: (id, progressData) => api.post(`/movies/${id}/progress`, progressData),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (userData) => api.put('/users/profile', userData),
  getWatchHistory: (params = {}) => api.get('/users/watch-history', { params }),
  getWatchlist: (params = {}) => api.get('/users/watchlist', { params }),
  clearWatchHistory: () => api.delete('/users/watch-history'),
  removeFromWatchlist: (movieId) => api.delete(`/users/watchlist/${movieId}`),
  updatePreferences: (preferences) => api.put('/users/preferences', preferences),
  deleteAccount: () => api.delete('/users/account'),
};

// Subscription API
export const subscriptionAPI = {
  getStatus: () => api.get('/subscriptions/status'),
  subscribe: (planData) => api.post('/subscriptions/subscribe', planData),
  cancel: (cancelData) => api.post('/subscriptions/cancel', cancelData),
  reactivate: () => api.post('/subscriptions/reactivate'),
  changePlan: (planData) => api.post('/subscriptions/change-plan', planData),
  getHistory: () => api.get('/subscriptions/history'),
};

// Payments API
export const paymentsAPI = {
  getPlans: () => api.get('/payments/plans'),
  createCustomer: () => api.post('/payments/create-customer'),
  createSetupIntent: () => api.post('/payments/create-setup-intent'),
  startTrial: () => api.post('/payments/start-trial'),
  subscribe: (subscriptionData) => api.post('/payments/subscribe', subscriptionData),
  cancelSubscription: (cancelData) => api.post('/payments/cancel-subscription', cancelData),
  reactivateSubscription: () => api.post('/payments/reactivate-subscription'),
  changePlan: (planData) => api.post('/payments/change-plan', planData),
  getSubscriptionStatus: () => api.get('/payments/subscription-status'),
  getPaymentHistory: () => api.get('/payments/payment-history'),
};

// Admin API
export const adminAPI = {
  // Dashboard
  getStats: () => api.get('/admin/stats'),
  getAnalytics: (params = {}) => api.get('/admin/analytics', { params }),
  
  // Movies Management
  getMovies: (params = {}) => api.get('/admin/movies', { params }),
  getMovie: (id) => api.get(`/admin/movies/${id}`),
  createMovie: (movieData) => api.post('/admin/movies', movieData),
  updateMovie: (id, movieData) => api.put(`/admin/movies/${id}`, movieData),
  deleteMovie: (id) => api.delete(`/admin/movies/${id}`),
  toggleFeatured: (id) => api.post(`/admin/movies/${id}/toggle-featured`),
  bulkUpdateMovies: (updateData) => api.post('/admin/movies/bulk-update', updateData),
  
  // Users Management
  getUsers: (params = {}) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, userData) => api.put(`/admin/users/${id}`, userData),
  suspendUser: (id, suspendData) => api.post(`/admin/users/${id}/suspend`, suspendData),
  
  // Subscriptions Management
  getSubscriptions: (params = {}) => api.get('/admin/subscriptions', { params }),
};

// Upload API (for file uploads)
export const uploadAPI = {
  uploadImage: (file, folder = 'images') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    
    return api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  uploadVideo: (file, onProgress) => {
    const formData = new FormData();
    formData.append('video', file);
    
    return api.post('/upload/video', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
  },
};

// TMDB API (for external movie data)
export const tmdbAPI = {
  searchMovies: (query) => api.get(`/tmdb/search/movie?query=${encodeURIComponent(query)}`),
  getMovieDetails: (tmdbId) => api.get(`/tmdb/movie/${tmdbId}`),
  getPopularMovies: () => api.get('/tmdb/movie/popular'),
  getTrendingMovies: () => api.get('/tmdb/trending/movie/week'),
  getGenres: () => api.get('/tmdb/genre/movie/list'),
};

// Export the main api instance as default
export default api;