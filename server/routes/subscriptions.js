import express from 'express';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// @route   GET /api/subscriptions/status
// @desc    Get user subscription status
// @access  Private
router.get('/status', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  res.json({
    success: true,
    data: {
      subscription: user.subscription,
      hasActiveSubscription: user.hasActiveSubscription
    }
  });
}));

// @route   GET /api/subscriptions/plans
// @desc    Get available subscription plans
// @access  Private
router.get('/plans', asyncHandler(async (req, res) => {
  const plans = {
    basic: {
      name: 'Basic Plan',
      price: 120,
      currency: 'ZAR',
      interval: 'month',
      features: [
        'Access to limited movies',
        'Ad-supported content',
        '720p quality',
        '1 device streaming'
      ]
    },
    pro: {
      name: 'Pro Plan',
      price: 120,
      currency: 'ZAR',
      interval: 'month',
      features: [
        'Unlimited ad-free access',
        'All content available',
        '4K quality',
        'Multiple device streaming',
        'Offline downloads'
      ]
    }
  };

  res.json({
    success: true,
    data: { plans }
  });
}));

// @route   POST /api/subscriptions/upgrade
// @desc    Upgrade subscription plan
// @access  Private
router.post('/upgrade', asyncHandler(async (req, res) => {
  const { planType } = req.body;
  
  if (!['basic', 'pro'].includes(planType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid plan type'
    });
  }

  const user = await User.findById(req.user.id);
  
  // Update subscription plan
  user.subscription.plan = planType;
  user.subscription.status = 'active';
  user.subscription.startDate = new Date();
  user.subscription.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await user.save();

  res.json({
    success: true,
    message: 'Subscription upgraded successfully',
    data: {
      subscription: user.subscription,
      hasActiveSubscription: user.hasActiveSubscription
    }
  });
}));

// @route   POST /api/subscriptions/cancel
// @desc    Cancel subscription
// @access  Private
router.post('/cancel', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  user.subscription.status = 'cancelled';
  await user.save();

  res.json({
    success: true,
    message: 'Subscription cancelled successfully',
    data: {
      subscription: user.subscription,
      hasActiveSubscription: user.hasActiveSubscription
    }
  });
}));

// @route   POST /api/subscriptions/reactivate
// @desc    Reactivate subscription
// @access  Private
router.post('/reactivate', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  user.subscription.status = 'active';
  user.subscription.startDate = new Date();
  user.subscription.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await user.save();

  res.json({
    success: true,
    message: 'Subscription reactivated successfully',
    data: {
      subscription: user.subscription,
      hasActiveSubscription: user.hasActiveSubscription
    }
  });
}));

export default router;