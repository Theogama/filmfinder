import express from 'express';
import Stripe from 'stripe';
import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Subscription plans configuration
const PLANS = {
  basic: {
    name: 'Basic Plan',
    price: 0, // Free trial then R120/month
    priceId: process.env.STRIPE_BASIC_PRICE_ID,
    features: ['Limited movies', 'Ad-supported', '1 month free trial']
  },
  pro: {
    name: 'Pro Plan', 
    price: 12000, // R120.00 in cents
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: ['Unlimited movies', 'Ad-free', 'HD quality', 'Multiple devices']
  }
};

// @route   GET /api/payments/plans
// @desc    Get available subscription plans
// @access  Public
router.get('/plans', (req, res) => {
  res.json({ 
    plans: PLANS,
    currency: 'ZAR'
  });
});

// @route   POST /api/payments/create-customer
// @desc    Create Stripe customer
// @access  Private
router.post('/create-customer', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    let subscription = await Subscription.findOne({ user: user._id });

    // Check if customer already exists
    if (subscription && subscription.stripeCustomerId && !subscription.stripeCustomerId.startsWith('temp_')) {
      return res.json({ 
        customerId: subscription.stripeCustomerId,
        message: 'Customer already exists'
      });
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        userId: user._id.toString()
      }
    });

    // Update subscription with real Stripe customer ID
    if (subscription) {
      subscription.stripeCustomerId = customer.id;
      await subscription.save();
    } else {
      subscription = new Subscription({
        user: user._id,
        stripeCustomerId: customer.id,
        plan: 'free',
        status: 'inactive',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
      await subscription.save();
    }

    res.json({ 
      customerId: customer.id,
      message: 'Customer created successfully'
    });

  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ 
      message: 'Error creating customer account' 
    });
  }
});

// @route   POST /api/payments/create-setup-intent
// @desc    Create setup intent for saving payment method
// @access  Private
router.post('/create-setup-intent', authenticateToken, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id });
    
    if (!subscription || !subscription.stripeCustomerId) {
      return res.status(400).json({ 
        message: 'Please create customer account first' 
      });
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: subscription.stripeCustomerId,
      usage: 'off_session',
      payment_method_types: ['card']
    });

    res.json({ 
      clientSecret: setupIntent.client_secret 
    });

  } catch (error) {
    console.error('Create setup intent error:', error);
    res.status(500).json({ 
      message: 'Error creating setup intent' 
    });
  }
});

// @route   POST /api/payments/start-trial
// @desc    Start free trial
// @access  Private
router.post('/start-trial', authenticateToken, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id });
    
    if (!subscription) {
      return res.status(400).json({ 
        message: 'Subscription not found' 
      });
    }

    if (subscription.trialUsed) {
      return res.status(400).json({ 
        message: 'Trial already used' 
      });
    }

    // Start trial
    await subscription.startTrial(30); // 30 days trial

    // Update user subscription info
    req.user.subscription.status = 'trialing';
    req.user.subscription.startDate = subscription.startDate;
    req.user.subscription.endDate = subscription.endDate;
    req.user.subscription.trialUsed = true;
    await req.user.save();

    res.json({ 
      message: 'Free trial started successfully',
      trialEndDate: subscription.trialEndDate,
      daysRemaining: subscription.trialDaysRemaining
    });

  } catch (error) {
    console.error('Start trial error:', error);
    res.status(500).json({ 
      message: 'Error starting trial' 
    });
  }
});

// @route   POST /api/payments/subscribe
// @desc    Create subscription
// @access  Private
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { planId, paymentMethodId } = req.body;
    
    if (!PLANS[planId]) {
      return res.status(400).json({ 
        message: 'Invalid plan selected' 
      });
    }

    const subscription = await Subscription.findOne({ user: req.user._id });
    
    if (!subscription || !subscription.stripeCustomerId) {
      return res.status(400).json({ 
        message: 'Please create customer account first' 
      });
    }

    // Attach payment method to customer
    if (paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: subscription.stripeCustomerId,
      });

      // Set as default payment method
      await stripe.customers.update(subscription.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      subscription.stripePaymentMethodId = paymentMethodId;
    }

    const plan = PLANS[planId];

    // Create Stripe subscription
    const stripeSubscription = await stripe.subscriptions.create({
      customer: subscription.stripeCustomerId,
      items: [{ price: plan.priceId }],
      default_payment_method: paymentMethodId,
      trial_period_days: !subscription.trialUsed ? 30 : 0, // 30 days trial if not used
      expand: ['latest_invoice.payment_intent'],
    });

    // Update local subscription
    subscription.plan = planId;
    subscription.status = stripeSubscription.status === 'trialing' ? 'trialing' : 'active';
    subscription.stripeSubscriptionId = stripeSubscription.id;
    subscription.stripePriceId = plan.priceId;
    subscription.amount = plan.price;
    subscription.startDate = new Date(stripeSubscription.current_period_start * 1000);
    subscription.endDate = new Date(stripeSubscription.current_period_end * 1000);
    
    if (stripeSubscription.status === 'trialing') {
      subscription.trialEndDate = new Date(stripeSubscription.trial_end * 1000);
      subscription.trialUsed = true;
    }

    await subscription.save();

    // Update user subscription info
    req.user.subscription.plan = planId;
    req.user.subscription.status = subscription.status;
    req.user.subscription.startDate = subscription.startDate;
    req.user.subscription.endDate = subscription.endDate;
    req.user.subscription.stripeCustomerId = subscription.stripeCustomerId;
    req.user.subscription.stripeSubscriptionId = subscription.stripeSubscriptionId;
    await req.user.save();

    res.json({ 
      message: 'Subscription created successfully',
      subscription: {
        id: stripeSubscription.id,
        status: stripeSubscription.status,
        plan: planId,
        endDate: subscription.endDate,
        trialEnd: subscription.trialEndDate
      }
    });

  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ 
      message: 'Error creating subscription' 
    });
  }
});

// @route   POST /api/payments/cancel-subscription
// @desc    Cancel subscription
// @access  Private
router.post('/cancel-subscription', authenticateToken, async (req, res) => {
  try {
    const { cancelAtPeriodEnd = true, reason } = req.body;
    const subscription = await Subscription.findOne({ user: req.user._id });
    
    if (!subscription || !subscription.stripeSubscriptionId) {
      return res.status(400).json({ 
        message: 'No active subscription found' 
      });
    }

    if (cancelAtPeriodEnd) {
      // Cancel at period end
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true
      });
    } else {
      // Cancel immediately
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    }

    // Update local subscription
    await subscription.cancel(reason, cancelAtPeriodEnd);

    res.json({ 
      message: cancelAtPeriodEnd ? 
        'Subscription will be cancelled at the end of current period' : 
        'Subscription cancelled immediately',
      endDate: subscription.endDate
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ 
      message: 'Error cancelling subscription' 
    });
  }
});

// @route   POST /api/payments/reactivate-subscription
// @desc    Reactivate cancelled subscription
// @access  Private
router.post('/reactivate-subscription', authenticateToken, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id });
    
    if (!subscription || !subscription.stripeSubscriptionId) {
      return res.status(400).json({ 
        message: 'No subscription found' 
      });
    }

    if (!subscription.cancelAtPeriodEnd) {
      return res.status(400).json({ 
        message: 'Subscription is not set to cancel' 
      });
    }

    // Reactivate in Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false
    });

    // Update local subscription
    await subscription.reactivate();

    res.json({ 
      message: 'Subscription reactivated successfully' 
    });

  } catch (error) {
    console.error('Reactivate subscription error:', error);
    res.status(500).json({ 
      message: 'Error reactivating subscription' 
    });
  }
});

// @route   POST /api/payments/change-plan
// @desc    Change subscription plan
// @access  Private
router.post('/change-plan', authenticateToken, async (req, res) => {
  try {
    const { newPlanId } = req.body;
    
    if (!PLANS[newPlanId]) {
      return res.status(400).json({ 
        message: 'Invalid plan selected' 
      });
    }

    const subscription = await Subscription.findOne({ user: req.user._id });
    
    if (!subscription || !subscription.stripeSubscriptionId) {
      return res.status(400).json({ 
        message: 'No active subscription found' 
      });
    }

    const newPlan = PLANS[newPlanId];

    // Update Stripe subscription
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId
    );

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      items: [{
        id: stripeSubscription.items.data[0].id,
        price: newPlan.priceId,
      }],
      proration_behavior: 'create_prorations',
    });

    // Update local subscription
    await subscription.changePlan(newPlanId, newPlan.price, newPlan.priceId);

    res.json({ 
      message: 'Plan changed successfully',
      newPlan: newPlanId
    });

  } catch (error) {
    console.error('Change plan error:', error);
    res.status(500).json({ 
      message: 'Error changing plan' 
    });
  }
});

// @route   GET /api/payments/subscription-status
// @desc    Get current subscription status
// @access  Private
router.get('/subscription-status', authenticateToken, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id });
    
    if (!subscription) {
      return res.json({ 
        subscription: null,
        hasActiveSubscription: false
      });
    }

    // Get latest Stripe subscription data if exists
    let stripeSubscription = null;
    if (subscription.stripeSubscriptionId) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(
          subscription.stripeSubscriptionId
        );
        
        // Update local status if different
        if (stripeSubscription.status !== subscription.status) {
          subscription.status = stripeSubscription.status;
          await subscription.save();
        }
      } catch (error) {
        console.error('Error fetching Stripe subscription:', error);
      }
    }

    res.json({ 
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        trialEndDate: subscription.trialEndDate,
        daysRemaining: subscription.daysRemaining,
        trialDaysRemaining: subscription.trialDaysRemaining,
        isActive: subscription.isActive,
        isTrial: subscription.isTrial,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        cancelledAt: subscription.cancelledAt,
        amount: subscription.amount,
        currency: subscription.currency,
        nextBillingDate: subscription.nextBillingDate
      },
      hasActiveSubscription: subscription.isActive || subscription.isTrial
    });

  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ 
      message: 'Error fetching subscription status' 
    });
  }
});

// @route   GET /api/payments/payment-history
// @desc    Get payment history
// @access  Private
router.get('/payment-history', authenticateToken, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id });
    
    if (!subscription) {
      return res.json({ payments: [] });
    }

    // Get payment history from Stripe if customer exists
    let stripePayments = [];
    if (subscription.stripeCustomerId && !subscription.stripeCustomerId.startsWith('temp_')) {
      try {
        const charges = await stripe.charges.list({
          customer: subscription.stripeCustomerId,
          limit: 20
        });
        
        stripePayments = charges.data.map(charge => ({
          id: charge.id,
          amount: charge.amount,
          currency: charge.currency.toUpperCase(),
          status: charge.status,
          description: charge.description,
          created: new Date(charge.created * 1000),
          paymentMethod: charge.payment_method_details?.type || 'card'
        }));
      } catch (error) {
        console.error('Error fetching Stripe payments:', error);
      }
    }

    res.json({ 
      payments: stripePayments,
      localPayments: subscription.payments
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ 
      message: 'Error fetching payment history' 
    });
  }
});

// @route   POST /api/payments/webhook
// @desc    Handle Stripe webhooks
// @access  Public (but verified)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Webhook handler functions
async function handlePaymentSucceeded(invoice) {
  try {
    const subscription = await Subscription.findOne({ 
      stripeCustomerId: invoice.customer 
    });
    
    if (subscription) {
      // Add payment to history
      await subscription.addPayment({
        amount: invoice.amount_paid,
        currency: invoice.currency.toUpperCase(),
        status: 'succeeded',
        paymentIntentId: invoice.payment_intent,
        paymentMethod: 'card',
        paidAt: new Date(invoice.status_transitions.paid_at * 1000)
      });

      // Update subscription status
      subscription.status = 'active';
      await subscription.save();
    }
  } catch (error) {
    console.error('Handle payment succeeded error:', error);
  }
}

async function handlePaymentFailed(invoice) {
  try {
    const subscription = await Subscription.findOne({ 
      stripeCustomerId: invoice.customer 
    });
    
    if (subscription) {
      // Add failed payment to history
      await subscription.addPayment({
        amount: invoice.amount_due,
        currency: invoice.currency.toUpperCase(),
        status: 'failed',
        paymentIntentId: invoice.payment_intent,
        paymentMethod: 'card',
        failureReason: 'Payment failed'
      });

      // Update subscription status
      subscription.status = 'past_due';
      await subscription.save();
    }
  } catch (error) {
    console.error('Handle payment failed error:', error);
  }
}

async function handleSubscriptionUpdated(stripeSubscription) {
  try {
    const subscription = await Subscription.findOne({ 
      stripeSubscriptionId: stripeSubscription.id 
    });
    
    if (subscription) {
      subscription.status = stripeSubscription.status;
      subscription.endDate = new Date(stripeSubscription.current_period_end * 1000);
      
      if (stripeSubscription.cancel_at_period_end) {
        subscription.cancelAtPeriodEnd = true;
      }
      
      await subscription.save();
    }
  } catch (error) {
    console.error('Handle subscription updated error:', error);
  }
}

async function handleSubscriptionDeleted(stripeSubscription) {
  try {
    const subscription = await Subscription.findOne({ 
      stripeSubscriptionId: stripeSubscription.id 
    });
    
    if (subscription) {
      subscription.status = 'cancelled';
      subscription.endDate = new Date();
      await subscription.save();
    }
  } catch (error) {
    console.error('Handle subscription deleted error:', error);
  }
}

async function handleTrialWillEnd(stripeSubscription) {
  try {
    const subscription = await Subscription.findOne({ 
      stripeSubscriptionId: stripeSubscription.id 
    });
    
    if (subscription) {
      // TODO: Send email notification about trial ending
      console.log(`Trial ending soon for subscription: ${subscription._id}`);
    }
  } catch (error) {
    console.error('Handle trial will end error:', error);
  }
}

export default router;