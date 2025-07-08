import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const SubscriptionContext = createContext();

const initialState = {
  subscription: null,
  plans: null,
  isLoading: false,
  error: null
};

const subscriptionReducer = (state, action) => {
  switch (action.type) {
    case 'SUBSCRIPTION_START':
      return {
        ...state,
        isLoading: true,
        error: null
      };
    case 'SUBSCRIPTION_SUCCESS':
      return {
        ...state,
        subscription: action.payload,
        isLoading: false,
        error: null
      };
    case 'SUBSCRIPTION_FAILURE':
      return {
        ...state,
        isLoading: false,
        error: action.payload
      };
    case 'SET_PLANS':
      return {
        ...state,
        plans: action.payload
      };
    case 'UPDATE_SUBSCRIPTION':
      return {
        ...state,
        subscription: { ...state.subscription, ...action.payload }
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    default:
      return state;
  }
};

export const SubscriptionProvider = ({ children }) => {
  const [state, dispatch] = useReducer(subscriptionReducer, initialState);
  const { user, isAuthenticated } = useAuth();

  // Load subscription data when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      loadSubscriptionStatus();
      loadPlans();
    } else {
      dispatch({ type: 'SUBSCRIPTION_SUCCESS', payload: null });
    }
  }, [isAuthenticated, user]);

  const loadSubscriptionStatus = async () => {
    try {
      const response = await api.get('/subscriptions/status');
      dispatch({
        type: 'SUBSCRIPTION_SUCCESS',
        payload: response.data.data.subscription
      });
    } catch (error) {
      console.error('Failed to load subscription status:', error);
    }
  };

  const loadPlans = async () => {
    try {
      const response = await api.get('/subscriptions/plans');
      dispatch({
        type: 'SET_PLANS',
        payload: response.data.data.plans
      });
    } catch (error) {
      console.error('Failed to load subscription plans:', error);
    }
  };

  const upgradeSubscription = async (planType) => {
    dispatch({ type: 'SUBSCRIPTION_START' });
    
    try {
      const response = await api.post('/subscriptions/upgrade', { planType });
      dispatch({
        type: 'SUBSCRIPTION_SUCCESS',
        payload: response.data.data.subscription
      });
      toast.success('Subscription upgraded successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Subscription upgrade failed';
      dispatch({ type: 'SUBSCRIPTION_FAILURE', payload: message });
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const cancelSubscription = async () => {
    dispatch({ type: 'SUBSCRIPTION_START' });
    
    try {
      const response = await api.post('/subscriptions/cancel');
      dispatch({
        type: 'SUBSCRIPTION_SUCCESS',
        payload: response.data.data.subscription
      });
      toast.success('Subscription cancelled successfully');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Subscription cancellation failed';
      dispatch({ type: 'SUBSCRIPTION_FAILURE', payload: message });
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const reactivateSubscription = async () => {
    dispatch({ type: 'SUBSCRIPTION_START' });
    
    try {
      const response = await api.post('/subscriptions/reactivate');
      dispatch({
        type: 'SUBSCRIPTION_SUCCESS',
        payload: response.data.data.subscription
      });
      toast.success('Subscription reactivated successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Subscription reactivation failed';
      dispatch({ type: 'SUBSCRIPTION_FAILURE', payload: message });
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const createStripeSubscription = async (planType, paymentMethodId) => {
    dispatch({ type: 'SUBSCRIPTION_START' });
    
    try {
      const response = await api.post('/payments/create-subscription', {
        planType,
        paymentMethodId
      });
      
      dispatch({
        type: 'SUBSCRIPTION_SUCCESS',
        payload: response.data.data.subscription
      });
      
      return {
        success: true,
        clientSecret: response.data.data.clientSecret,
        subscriptionId: response.data.data.subscriptionId
      };
    } catch (error) {
      const message = error.response?.data?.message || 'Subscription creation failed';
      dispatch({ type: 'SUBSCRIPTION_FAILURE', payload: message });
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const getSubscriptionStatus = async () => {
    try {
      const response = await api.get('/payments/subscription-status');
      dispatch({
        type: 'SUBSCRIPTION_SUCCESS',
        payload: response.data.data.subscription
      });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to get subscription status';
      dispatch({ type: 'SUBSCRIPTION_FAILURE', payload: message });
      return { success: false, error: message };
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Helper functions
  const hasActiveSubscription = () => {
    if (!state.subscription) return false;
    return state.subscription.status === 'active' || 
           (state.subscription.status === 'trial' && 
            new Date(state.subscription.endDate) > new Date());
  };

  const isTrialExpired = () => {
    if (!state.subscription) return false;
    return state.subscription.status === 'trial' && 
           new Date(state.subscription.endDate) <= new Date();
  };

  const getDaysUntilExpiry = () => {
    if (!state.subscription || !state.subscription.endDate) return null;
    const endDate = new Date(state.subscription.endDate);
    const now = new Date();
    const diffTime = endDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const value = {
    ...state,
    upgradeSubscription,
    cancelSubscription,
    reactivateSubscription,
    createStripeSubscription,
    getSubscriptionStatus,
    clearError,
    hasActiveSubscription: hasActiveSubscription(),
    isTrialExpired: isTrialExpired(),
    daysUntilExpiry: getDaysUntilExpiry()
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};