import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  plan: {
    type: String,
    enum: ['free', 'basic', 'pro'],
    required: true,
    default: 'free'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'cancelled', 'expired', 'past_due', 'trialing'],
    required: true,
    default: 'inactive'
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  trialEndDate: Date,
  
  // Stripe Integration
  stripeCustomerId: {
    type: String,
    required: true
  },
  stripeSubscriptionId: String,
  stripePriceId: String,
  stripePaymentMethodId: String,
  
  // Payment Details
  amount: {
    type: Number, // in cents (e.g., 12000 for R120.00)
    required: true,
    default: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'ZAR'
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    required: true,
    default: 'monthly'
  },
  
  // Trial Information
  trialUsed: {
    type: Boolean,
    default: false
  },
  trialDays: {
    type: Number,
    default: 30
  },
  
  // Cancellation
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  },
  cancelledAt: Date,
  cancelReason: String,
  
  // Payment History
  payments: [{
    amount: Number,
    currency: String,
    status: {
      type: String,
      enum: ['succeeded', 'failed', 'pending', 'cancelled', 'refunded']
    },
    stripePaymentIntentId: String,
    paymentMethod: String,
    paidAt: Date,
    failureReason: String
  }],
  
  // Usage Analytics
  analytics: {
    moviesWatched: {
      type: Number,
      default: 0
    },
    totalWatchTime: {
      type: Number, // in minutes
      default: 0
    },
    lastActivity: Date,
    deviceCount: {
      type: Number,
      default: 0
    },
    downloadCount: {
      type: Number,
      default: 0
    }
  },
  
  // Renewal Information
  nextBillingDate: Date,
  autoRenew: {
    type: Boolean,
    default: true
  },
  
  // Discount/Coupon
  discount: {
    couponCode: String,
    discountPercent: Number,
    discountAmount: Number,
    validUntil: Date
  }
}, {
  timestamps: true
});

// Indexes
subscriptionSchema.index({ user: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ endDate: 1 });
subscriptionSchema.index({ stripeCustomerId: 1 });
subscriptionSchema.index({ stripeSubscriptionId: 1 });

// Virtual for days remaining
subscriptionSchema.virtual('daysRemaining').get(function() {
  if (!this.endDate || this.status !== 'active') return 0;
  const now = new Date();
  const diffTime = this.endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// Virtual for trial days remaining
subscriptionSchema.virtual('trialDaysRemaining').get(function() {
  if (!this.trialEndDate || this.status !== 'trialing') return 0;
  const now = new Date();
  const diffTime = this.trialEndDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// Virtual for is active
subscriptionSchema.virtual('isActive').get(function() {
  return this.status === 'active' && this.endDate > new Date();
});

// Virtual for is trial
subscriptionSchema.virtual('isTrial').get(function() {
  return this.status === 'trialing' && this.trialEndDate > new Date();
});

// Method to check if subscription is expired
subscriptionSchema.methods.isExpired = function() {
  return this.endDate < new Date() && this.status !== 'cancelled';
};

// Method to check if trial is expired
subscriptionSchema.methods.isTrialExpired = function() {
  return this.trialEndDate && this.trialEndDate < new Date();
};

// Method to extend subscription
subscriptionSchema.methods.extend = function(days) {
  const currentEndDate = this.endDate > new Date() ? this.endDate : new Date();
  this.endDate = new Date(currentEndDate.getTime() + (days * 24 * 60 * 60 * 1000));
  this.status = 'active';
  return this.save();
};

// Method to cancel subscription
subscriptionSchema.methods.cancel = function(reason = '', cancelAtPeriodEnd = true) {
  this.cancelAtPeriodEnd = cancelAtPeriodEnd;
  this.cancelledAt = new Date();
  this.cancelReason = reason;
  
  if (!cancelAtPeriodEnd) {
    this.status = 'cancelled';
    this.endDate = new Date();
  }
  
  return this.save();
};

// Method to reactivate subscription
subscriptionSchema.methods.reactivate = function() {
  this.status = 'active';
  this.cancelAtPeriodEnd = false;
  this.cancelledAt = null;
  this.cancelReason = null;
  return this.save();
};

// Method to add payment record
subscriptionSchema.methods.addPayment = function(paymentData) {
  this.payments.unshift({
    amount: paymentData.amount,
    currency: paymentData.currency,
    status: paymentData.status,
    stripePaymentIntentId: paymentData.paymentIntentId,
    paymentMethod: paymentData.paymentMethod,
    paidAt: paymentData.paidAt || new Date(),
    failureReason: paymentData.failureReason
  });
  
  // Keep only last 12 payments
  if (this.payments.length > 12) {
    this.payments = this.payments.slice(0, 12);
  }
  
  return this.save();
};

// Method to start trial
subscriptionSchema.methods.startTrial = function(trialDays = 30) {
  if (this.trialUsed) {
    throw new Error('Trial already used for this user');
  }
  
  this.status = 'trialing';
  this.trialUsed = true;
  this.trialDays = trialDays;
  this.trialEndDate = new Date(Date.now() + (trialDays * 24 * 60 * 60 * 1000));
  this.startDate = new Date();
  this.endDate = this.trialEndDate;
  
  return this.save();
};

// Method to upgrade/downgrade plan
subscriptionSchema.methods.changePlan = function(newPlan, newAmount, newStripePriceId) {
  this.plan = newPlan;
  this.amount = newAmount;
  this.stripePriceId = newStripePriceId;
  
  // Calculate prorated amount if needed
  // This would typically be handled by Stripe
  
  return this.save();
};

// Pre-save middleware to update next billing date
subscriptionSchema.pre('save', function(next) {
  if (this.isModified('endDate') && this.status === 'active') {
    // Set next billing date based on billing cycle
    const cycleLength = this.billingCycle === 'yearly' ? 365 : 30;
    this.nextBillingDate = new Date(this.endDate.getTime() + (cycleLength * 24 * 60 * 60 * 1000));
  }
  next();
});

export default mongoose.model('Subscription', subscriptionSchema);