import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/login', { email, password });
          const { user, token, refreshToken } = response.data;
          
          set({
            user,
            token,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
          
          // Set default authorization header
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          return response.data;
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Login failed';
          set({ 
            isLoading: false, 
            error: errorMessage,
            isAuthenticated: false,
            user: null,
            token: null,
            refreshToken: null
          });
          throw new Error(errorMessage);
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/register', { name, email, password });
          const { user, token, refreshToken } = response.data;
          
          set({
            user,
            token,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
          
          // Set default authorization header
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          return response.data;
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Registration failed';
          set({ 
            isLoading: false, 
            error: errorMessage,
            isAuthenticated: false,
            user: null,
            token: null,
            refreshToken: null
          });
          throw new Error(errorMessage);
        }
      },

      logout: async () => {
        try {
          // Call logout endpoint to handle any server-side cleanup
          await api.post('/auth/logout');
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Clear local state regardless of API call success
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            error: null
          });
          
          // Remove authorization header
          delete api.defaults.headers.common['Authorization'];
        }
      },

      refreshTokens: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        try {
          const response = await api.post('/auth/refresh', { refreshToken });
          const { token: newToken, refreshToken: newRefreshToken } = response.data;
          
          set({
            token: newToken,
            refreshToken: newRefreshToken
          });
          
          // Update authorization header
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          
          return newToken;
        } catch (error) {
          // If refresh fails, logout user
          get().logout();
          throw new Error('Session expired. Please login again.');
        }
      },

      updateUser: (userData) => {
        set(state => ({
          user: { ...state.user, ...userData }
        }));
      },

      updateSubscription: (subscriptionData) => {
        set(state => ({
          user: {
            ...state.user,
            subscription: { ...state.user.subscription, ...subscriptionData }
          }
        }));
      },

      getCurrentUser: async () => {
        const { token } = get();
        if (!token) return null;

        try {
          set({ isLoading: true });
          const response = await api.get('/auth/me');
          const { user } = response.data;
          
          set({
            user,
            isLoading: false,
            error: null
          });
          
          return user;
        } catch (error) {
          console.error('Get current user error:', error);
          // If token is invalid, logout
          if (error.response?.status === 401) {
            get().logout();
          }
          set({ isLoading: false });
          return null;
        }
      },

      changePassword: async (currentPassword, newPassword) => {
        try {
          const response = await api.post('/auth/change-password', {
            currentPassword,
            newPassword
          });
          return response.data;
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Password change failed';
          throw new Error(errorMessage);
        }
      },

      forgotPassword: async (email) => {
        try {
          const response = await api.post('/auth/forgot-password', { email });
          return response.data;
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to send reset email';
          throw new Error(errorMessage);
        }
      },

      resetPassword: async (token, newPassword) => {
        try {
          const response = await api.post('/auth/reset-password', {
            token,
            newPassword
          });
          return response.data;
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Password reset failed';
          throw new Error(errorMessage);
        }
      },

      clearError: () => {
        set({ error: null });
      },

      // Helper methods
      hasActiveSubscription: () => {
        const { user } = get();
        return user?.subscription?.status === 'active' || user?.subscription?.status === 'trialing';
      },

      canAccessPremium: () => {
        const { user } = get();
        if (!user) return false;
        return user.subscription?.plan === 'pro' && get().hasActiveSubscription();
      },

      isAdmin: () => {
        const { user } = get();
        return user?.role === 'admin';
      },

      getSubscriptionDaysRemaining: () => {
        const { user } = get();
        if (!user?.subscription?.endDate) return 0;
        
        const endDate = new Date(user.subscription.endDate);
        const now = new Date();
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return Math.max(0, diffDays);
      }
    }),
    {
      name: 'movieflix-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated
      }),
      onRehydrateStorage: () => (state) => {
        // Set authorization header when store is rehydrated
        if (state?.token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
        }
      }
    }
  )
);

export default useAuthStore;