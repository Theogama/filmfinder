import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh and errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { token, refreshToken: newRefreshToken } = response.data.data;
          localStorage.setItem('token', token);
          localStorage.setItem('refreshToken', newRefreshToken);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token failed, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Movie API methods
export const movieAPI = {
  // Get all movies with filters
  getMovies: (params = {}) => api.get('/movies', { params }),
  
  // Get featured movies
  getFeatured: (limit = 10) => api.get('/movies/featured', { params: { limit } }),
  
  // Get trending movies
  getTrending: (limit = 10) => api.get('/movies/trending', { params: { limit } }),
  
  // Get new releases
  getNewReleases: (limit = 10) => api.get('/movies/new-releases', { params: { limit } }),
  
  // Get movies by genre
  getByGenre: (genreName, limit = 20) => 
    api.get(`/movies/genre/${genreName}`, { params: { limit } }),
  
  // Search movies
  search: (query, limit = 20) => 
    api.get('/movies/search', { params: { q: query, limit } }),
  
  // Get movie details
  getMovie: (id) => api.get(`/movies/${id}`),
  
  // Get movie streaming URL
  getStreamingUrl: (id, quality = '1080p') => 
    api.get(`/movies/${id}/stream`, { params: { quality } }),
  
  // Get movie trailer
  getTrailer: (id) => api.get(`/movies/${id}/trailer`),
  
  // Get all genres
  getGenres: () => api.get('/movies/genres'),
  
  // Rate a movie
  rateMovie: (id, rating) => api.post(`/movies/${id}/rate`, { rating }),
};

// User API methods
export const userAPI = {
  // Get user profile
  getProfile: () => api.get('/users/profile'),
  
  // Update user profile
  updateProfile: (profileData) => api.put('/users/profile', profileData),
  
  // Update user preferences
  updatePreferences: (preferences) => api.put('/users/preferences', preferences),
  
  // Get user watchlist
  getWatchlist: (page = 1, limit = 20) => 
    api.get('/users/watchlist', { params: { page, limit } }),
  
  // Add movie to watchlist
  addToWatchlist: (movieId) => api.post(`/users/watchlist/${movieId}`),
  
  // Remove movie from watchlist
  removeFromWatchlist: (movieId) => api.delete(`/users/watchlist/${movieId}`),
  
  // Get user favorites
  getFavorites: (page = 1, limit = 20) => 
    api.get('/users/favorites', { params: { page, limit } }),
  
  // Add movie to favorites
  addToFavorites: (movieId) => api.post(`/users/favorites/${movieId}`),
  
  // Remove movie from favorites
  removeFromFavorites: (movieId) => api.delete(`/users/favorites/${movieId}`),
  
  // Get user watch history
  getWatchHistory: (page = 1, limit = 20) => 
    api.get('/users/watch-history', { params: { page, limit } }),
  
  // Update watch progress
  updateWatchProgress: (movieId, progress) => 
    api.put(`/users/watch-history/${movieId}`, { progress }),
  
  // Remove movie from watch history
  removeFromWatchHistory: (movieId) => 
    api.delete(`/users/watch-history/${movieId}`),
  
  // Get personalized recommendations
  getRecommendations: (limit = 20) => 
    api.get('/users/recommendations', { params: { limit } }),
  
  // Delete user account
  deleteAccount: () => api.delete('/users/account'),
};

// Subscription API methods
export const subscriptionAPI = {
  // Get subscription status
  getStatus: () => api.get('/subscriptions/status'),
  
  // Get subscription plans
  getPlans: () => api.get('/subscriptions/plans'),
  
  // Upgrade subscription
  upgrade: (planType) => api.post('/subscriptions/upgrade', { planType }),
  
  // Cancel subscription
  cancel: () => api.post('/subscriptions/cancel'),
  
  // Reactivate subscription
  reactivate: () => api.post('/subscriptions/reactivate'),
};

// Payment API methods
export const paymentAPI = {
  // Create Stripe subscription
  createSubscription: (planType, paymentMethodId) => 
    api.post('/payments/create-subscription', { planType, paymentMethodId }),
  
  // Get subscription status from Stripe
  getSubscriptionStatus: () => api.get('/payments/subscription-status'),
  
  // Create payment intent
  createPaymentIntent: (amount, currency = 'zar') => 
    api.post('/payments/create-payment-intent', { amount, currency }),
  
  // Get subscription plans
  getPlans: () => api.get('/payments/plans'),
};

// Admin API methods
export const adminAPI = {
  // Get admin dashboard
  getDashboard: () => api.get('/admin/dashboard'),
  
  // Get all users
  getUsers: (params = {}) => api.get('/admin/users', { params }),
  
  // Get user details
  getUser: (id) => api.get(`/admin/users/${id}`),
  
  // Update user
  updateUser: (id, userData) => api.put(`/admin/users/${id}`, userData),
  
  // Delete user
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  
  // Get all movies
  getMovies: (params = {}) => api.get('/admin/movies', { params }),
  
  // Create movie
  createMovie: (movieData) => api.post('/admin/movies', movieData),
  
  // Update movie
  updateMovie: (id, movieData) => api.put(`/admin/movies/${id}`, movieData),
  
  // Delete movie
  deleteMovie: (id) => api.delete(`/admin/movies/${id}`),
  
  // Get analytics
  getAnalytics: (period = 30) => api.get('/admin/analytics', { params: { period } }),
};

// TMDB API methods (for movie data)
export const tmdbAPI = {
  // Get trending movies/shows
  getTrending: (mediaType = 'all', timeWindow = 'day') => 
    api.get(`/tmdb/trending/${mediaType}/${timeWindow}`),
  
  // Get movie details
  getMovie: (id) => api.get(`/tmdb/movie/${id}`),
  
  // Get movie credits
  getMovieCredits: (id) => api.get(`/tmdb/movie/${id}/credits`),
  
  // Get movie videos
  getMovieVideos: (id) => api.get(`/tmdb/movie/${id}/videos`),
  
  // Get movie recommendations
  getMovieRecommendations: (id) => api.get(`/tmdb/movie/${id}/recommendations`),
  
  // Search movies
  searchMovies: (query, page = 1) => 
    api.get('/tmdb/search/movie', { params: { query, page } }),
  
  // Get genres
  getGenres: () => api.get('/tmdb/genre/movie/list'),
  
  // Get movies by genre
  getMoviesByGenre: (genreId, page = 1) => 
    api.get(`/tmdb/discover/movie`, { params: { with_genres: genreId, page } }),
};

export default api;