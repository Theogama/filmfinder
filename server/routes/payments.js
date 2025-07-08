import express from 'express';
import Stripe from 'stripe';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Subscription plans configuration
const SUBSCRIPTION_PLANS = {
  basic: {
    name: 'Basic Plan',
    price: 120, // R120 in ZAR
    currency: 'zar',
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
    price: 120, // R120 in ZAR
    currency: 'zar',
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

// @route   POST /api/payments/create-subscription
// @desc    Create a new subscription
// @access  Private
router.post('/create-subscription', authenticateToken, asyncHandler(async (req, res) => {
  const { planType, paymentMethodId } = req.body;

  if (!SUBSCRIPTION_PLANS[planType]) {
    return res.status(400).json({
      success: false,
      message: 'Invalid subscription plan'
    });
  }

  const plan = SUBSCRIPTION_PLANS[planType];
  const user = req.user;

  try {
    // Create or get Stripe customer
    let customer;
    if (user.subscription.stripeCustomerId) {
      customer = await stripe.customers.retrieve(user.subscription.stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email: user.email,
        name: user.fullName,
        metadata: {
          userId: user._id.toString()
        }
      });
    }

    // Create Stripe product and price if they don't exist
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.features.join(', ')
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.price * 100, // Convert to cents
      currency: plan.currency,
      recurring: {
        interval: plan.interval
      }
    });

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id
    });

    // Set as default payment method
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price.id }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: user._id.toString(),
        planType
      }
    });

    // Update user subscription info
    user.subscription = {
      plan: planType,
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      stripeCustomerId: customer.id,
      stripeSubscriptionId: subscription.id
    };

    await user.save();

    res.json({
      success: true,
      message: 'Subscription created successfully',
      data: {
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
        subscription: user.subscription
      }
    });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}));

// @route   POST /api/payments/cancel-subscription
// @desc    Cancel user subscription
// @access  Private
router.post('/cancel-subscription', authenticateToken, asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user.subscription.stripeSubscriptionId) {
    return res.status(400).json({
      success: false,
      message: 'No active subscription found'
    });
  }

  try {
    // Cancel subscription at period end
    const subscription = await stripe.subscriptions.update(
      user.subscription.stripeSubscriptionId,
      { cancel_at_period_end: true }
    );

    // Update user subscription status
    user.subscription.status = 'cancelled';
    await user.save();

    res.json({
      success: true,
      message: 'Subscription will be cancelled at the end of the current period',
      data: {
        subscription: user.subscription
      }
    });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}));

// @route   POST /api/payments/reactivate-subscription
// @desc    Reactivate cancelled subscription
// @access  Private
router.post('/reactivate-subscription', authenticateToken, asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user.subscription.stripeSubscriptionId) {
    return res.status(400).json({
      success: false,
      message: 'No subscription found'
    });
  }

  try {
    // Reactivate subscription
    const subscription = await stripe.subscriptions.update(
      user.subscription.stripeSubscriptionId,
      { cancel_at_period_end: false }
    );

    // Update user subscription status
    user.subscription.status = 'active';
    await user.save();

    res.json({
      success: true,
      message: 'Subscription reactivated successfully',
      data: {
        subscription: user.subscription
      }
    });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}));

// @route   GET /api/payments/subscription-status
// @desc    Get current subscription status
// @access  Private
router.get('/subscription-status', authenticateToken, asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user.subscription.stripeSubscriptionId) {
    return res.json({
      success: true,
      data: {
        subscription: user.subscription,
        hasActiveSubscription: user.hasActiveSubscription
      }
    });
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(
      user.subscription.stripeSubscriptionId
    );

    // Update user subscription based on Stripe status
    if (subscription.status === 'active') {
      user.subscription.status = 'active';
    } else if (subscription.status === 'canceled') {
      user.subscription.status = 'cancelled';
    } else if (subscription.status === 'past_due') {
      user.subscription.status = 'inactive';
    }

    await user.save();

    res.json({
      success: true,
      data: {
        subscription: user.subscription,
        hasActiveSubscription: user.hasActiveSubscription,
        stripeSubscription: subscription
      }
    });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}));

// @route   GET /api/payments/plans
// @desc    Get available subscription plans
// @access  Public
router.get('/plans', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      plans: SUBSCRIPTION_PLANS
    }
  });
}));

// @route   POST /api/payments/create-payment-intent
// @desc    Create payment intent for one-time payments
// @access  Private
router.post('/create-payment-intent', authenticateToken, asyncHandler(async (req, res) => {
  const { amount, currency = 'zar' } = req.body;

  if (!amount || amount < 100) {
    return res.status(400).json({
      success: false,
      message: 'Amount must be at least R1.00'
    });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency,
      customer: req.user.subscription.stripeCustomerId,
      metadata: {
        userId: req.user._id.toString()
      }
    });

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret
      }
    });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}));

// @route   POST /api/payments/webhook
// @desc    Handle Stripe webhooks
// @access  Public
router.post('/webhook', express.raw({ type: 'application/json' }), asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
}));

// Webhook handlers
async function handleSubscriptionCreated(subscription) {
  const userId = subscription.metadata.userId;
  const user = await User.findById(userId);
  
  if (user) {
    user.subscription.status = 'active';
    user.subscription.stripeSubscriptionId = subscription.id;
    await user.save();
  }
}

async function handleSubscriptionUpdated(subscription) {
  const userId = subscription.metadata.userId;
  const user = await User.findById(userId);
  
  if (user) {
    if (subscription.status === 'active') {
      user.subscription.status = 'active';
    } else if (subscription.status === 'canceled') {
      user.subscription.status = 'cancelled';
    } else if (subscription.status === 'past_due') {
      user.subscription.status = 'inactive';
    }
    await user.save();
  }
}

async function handleSubscriptionDeleted(subscription) {
  const userId = subscription.metadata.userId;
  const user = await User.findById(userId);
  
  if (user) {
    user.subscription.status = 'cancelled';
    await user.save();
  }
}

async function handlePaymentSucceeded(invoice) {
  const userId = invoice.metadata.userId;
  const user = await User.findById(userId);
  
  if (user) {
    user.subscription.status = 'active';
    await user.save();
  }
}

async function handlePaymentFailed(invoice) {
  const userId = invoice.metadata.userId;
  const user = await User.findById(userId);
  
  if (user) {
    user.subscription.status = 'inactive';
    await user.save();
  }
}

export default router;