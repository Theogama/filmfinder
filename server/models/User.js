import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'pro'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'trial'],
      default: 'trial'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String
  },
  preferences: {
    genres: [{
      type: String
    }],
    language: {
      type: String,
      default: 'en'
    },
    autoPlay: {
      type: Boolean,
      default: true
    },
    quality: {
      type: String,
      enum: ['720p', '1080p', '4K'],
      default: '1080p'
    }
  },
  watchlist: [{
    movieId: {
      type: String,
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  watchHistory: [{
    movieId: {
      type: String,
      required: true
    },
    watchedAt: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  }],
  favorites: [{
    movieId: {
      type: String,
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isAdmin: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ 'subscription.status': 1 });
userSchema.index({ isAdmin: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for subscription status
userSchema.virtual('hasActiveSubscription').get(function() {
  return this.subscription.status === 'active' || 
         (this.subscription.status === 'trial' && this.subscription.endDate > new Date());
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if account is locked
userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Method to add movie to watchlist
userSchema.methods.addToWatchlist = function(movieId) {
  if (!this.watchlist.find(item => item.movieId === movieId)) {
    this.watchlist.push({ movieId });
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove movie from watchlist
userSchema.methods.removeFromWatchlist = function(movieId) {
  this.watchlist = this.watchlist.filter(item => item.movieId !== movieId);
  return this.save();
};

// Method to add movie to favorites
userSchema.methods.addToFavorites = function(movieId) {
  if (!this.favorites.find(item => item.movieId === movieId)) {
    this.favorites.push({ movieId });
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove movie from favorites
userSchema.methods.removeFromFavorites = function(movieId) {
  this.favorites = this.favorites.filter(item => item.movieId !== movieId);
  return this.save();
};

// Method to update watch history
userSchema.methods.updateWatchHistory = function(movieId, progress = 0) {
  const existingIndex = this.watchHistory.findIndex(item => item.movieId === movieId);
  
  if (existingIndex >= 0) {
    this.watchHistory[existingIndex].watchedAt = new Date();
    this.watchHistory[existingIndex].progress = progress;
  } else {
    this.watchHistory.push({ movieId, progress });
  }
  
  return this.save();
};

const User = mongoose.model('User', userSchema);

export default User;