
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Stores
import useAuthStore from './stores/authStore';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Movies from './pages/Movies';
import MovieDetail from './pages/MovieDetail';
import Watch from './pages/Watch';
import Search from './pages/Search';
import Profile from './pages/Profile';
import Subscriptions from './pages/Subscriptions';
import Dashboard from './pages/Dashboard';
import Watchlist from './pages/Watchlist';
import WatchHistory from './pages/WatchHistory';
import Settings from './pages/Settings';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminMovies from './pages/admin/AdminMovies';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSubscriptions from './pages/admin/AdminSubscriptions';
import AdminAnalytics from './pages/admin/AdminAnalytics';

// Error Pages
import NotFound from './pages/NotFound';
import ErrorBoundary from './components/ErrorBoundary';

// Styles
import './App.css';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function App() {
  const { getCurrentUser, isAuthenticated, isLoading, token } = useAuthStore();

  // Initialize user on app load
  useEffect(() => {
    if (token && !isAuthenticated) {
      getCurrentUser();
    }
  }, [token, isAuthenticated, getCurrentUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <Elements stripe={stripePromise}>
            <Router>
              <div className="min-h-screen bg-gray-900 text-white">
                <AnimatePresence mode="wait">
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={
                      isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
                    } />
                    <Route path="/register" element={
                      isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />
                    } />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    
                    {/* Routes with Navbar */}
                    <Route path="/*" element={
                      <div className="flex flex-col min-h-screen">
                        <Navbar />
                        <main className="flex-1">
                          <Routes>
                            {/* Public Routes */}
                            <Route path="/" element={<Home />} />
                            <Route path="/movies" element={<Movies />} />
                            <Route path="/movies/:id" element={<MovieDetail />} />
                            <Route path="/search" element={<Search />} />
                            <Route path="/subscriptions" element={<Subscriptions />} />
                            
                            {/* Protected Routes */}
                            <Route path="/watch/:id" element={
                              <ProtectedRoute>
                                <Watch />
                              </ProtectedRoute>
                            } />
                            <Route path="/dashboard" element={
                              <ProtectedRoute>
                                <Dashboard />
                              </ProtectedRoute>
                            } />
                            <Route path="/profile" element={
                              <ProtectedRoute>
                                <Profile />
                              </ProtectedRoute>
                            } />
                            <Route path="/watchlist" element={
                              <ProtectedRoute>
                                <Watchlist />
                              </ProtectedRoute>
                            } />
                            <Route path="/history" element={
                              <ProtectedRoute>
                                <WatchHistory />
                              </ProtectedRoute>
                            } />
                            <Route path="/settings" element={
                              <ProtectedRoute>
                                <Settings />
                              </ProtectedRoute>
                            } />
                            
                            {/* Admin Routes */}
                            <Route path="/admin" element={
                              <AdminRoute>
                                <AdminDashboard />
                              </AdminRoute>
                            } />
                            <Route path="/admin/movies" element={
                              <AdminRoute>
                                <AdminMovies />
                              </AdminRoute>
                            } />
                            <Route path="/admin/users" element={
                              <AdminRoute>
                                <AdminUsers />
                              </AdminRoute>
                            } />
                            <Route path="/admin/subscriptions" element={
                              <AdminRoute>
                                <AdminSubscriptions />
                              </AdminRoute>
                            } />
                            <Route path="/admin/analytics" element={
                              <AdminRoute>
                                <AdminAnalytics />
                              </AdminRoute>
                            } />
                            
                            {/* 404 */}
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </main>
                        <Footer />
                      </div>
                    } />
                  </Routes>
                </AnimatePresence>
                
                {/* Toast Notifications */}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#1f2937',
                      color: '#fff',
                      border: '1px solid #374151',
                    },
                    success: {
                      iconTheme: {
                        primary: '#10b981',
                        secondary: '#fff',
                      },
                    },
                    error: {
                      iconTheme: {
                        primary: '#ef4444',
                        secondary: '#fff',
                      },
                    },
                  }}
                />
              </div>
            </Router>
          </Elements>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
