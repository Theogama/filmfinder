import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  avatar: {
    type: String,
    default: 'https://res.cloudinary.com/movieflix/image/upload/v1/defaults/default-avatar.jpg'
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'pro'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'expired'],
      default: 'inactive'
    },
    startDate: Date,
    endDate: Date,
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    trialUsed: {
      type: Boolean,
      default: false
    }
  },
  watchHistory: [{
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie'
    },
    watchedAt: {
      type: Date,
      default: Date.now
    },
    watchTime: Number, // in seconds
    completed: {
      type: Boolean,
      default: false
    }
  }],
  watchlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie'
  }],
  preferences: {
    favoriteGenres: [String],
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      newMovies: {
        type: Boolean,
        default: true
      },
      subscription: {
        type: Boolean,
        default: true
      }
    }
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date
}, {
  timestamps: true
});

// Password hashing middleware
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

// Password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if user has active subscription
userSchema.methods.hasActiveSubscription = function() {
  if (this.subscription.status === 'active' && this.subscription.endDate > new Date()) {
    return true;
  }
  return false;
};

// Check if user can access premium content
userSchema.methods.canAccessPremium = function() {
  return this.hasActiveSubscription() || this.subscription.plan === 'pro';
};

// Add movie to watch history
userSchema.methods.addToWatchHistory = function(movieId, watchTime = 0, completed = false) {
  const existingIndex = this.watchHistory.findIndex(
    item => item.movieId.toString() === movieId.toString()
  );
  
  if (existingIndex !== -1) {
    this.watchHistory[existingIndex].watchTime = watchTime;
    this.watchHistory[existingIndex].watchedAt = new Date();
    this.watchHistory[existingIndex].completed = completed;
  } else {
    this.watchHistory.unshift({
      movieId,
      watchTime,
      watchedAt: new Date(),
      completed
    });
  }
  
  // Keep only last 50 items
  if (this.watchHistory.length > 50) {
    this.watchHistory = this.watchHistory.slice(0, 50);
  }
  
  return this.save();
};

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

export default mongoose.model('User', userSchema);