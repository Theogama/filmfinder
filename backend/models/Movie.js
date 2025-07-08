import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Movie title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  overview: {
    type: String,
    required: [true, 'Movie overview is required'],
    maxlength: [2000, 'Overview cannot exceed 2000 characters']
  },
  genres: [{
    type: String,
    required: true
  }],
  releaseDate: {
    type: Date,
    required: true
  },
  runtime: {
    type: Number, // in minutes
    required: true,
    min: [1, 'Runtime must be at least 1 minute']
  },
  rating: {
    type: String,
    enum: ['G', 'PG', 'PG-13', 'R', 'NC-17', 'NR'],
    default: 'NR'
  },
  imdbRating: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  tmdbId: Number,
  imdbId: String,
  
  // Media Assets
  poster: {
    type: String,
    required: [true, 'Poster image is required']
  },
  backdrop: {
    type: String,
    required: [true, 'Backdrop image is required']
  },
  logo: String,
  
  // Video Content
  trailerUrl: {
    type: String,
    required: [true, 'Trailer URL is required']
  },
  videoUrl: {
    type: String,
    required: [true, 'Main video URL is required']
  },
  hlsUrl: String, // HLS streaming URL
  dashUrl: String, // DASH streaming URL
  subtitles: [{
    language: String,
    url: String,
    label: String
  }],
  
  // Content Control
  isPremium: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isComingSoon: {
    type: Boolean,
    default: false
  },
  
  // Production Details
  director: [{
    type: String,
    trim: true
  }],
  cast: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    character: String,
    profilePath: String,
    order: Number
  }],
  productionCompanies: [{
    name: String,
    logoPath: String
  }],
  countries: [String],
  languages: [String],
  
  // Engagement Metrics
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  watchTime: {
    type: Number, // total watch time in seconds
    default: 0
  },
  completionRate: {
    type: Number, // percentage of users who completed the movie
    default: 0
  },
  
  // User Interactions
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: [500, 'Review cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // SEO and Search
  keywords: [String],
  tags: [String],
  
  // Admin Fields
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  
  // Analytics
  analytics: {
    dailyViews: [{
      date: Date,
      views: Number
    }],
    topCountries: [{
      country: String,
      views: Number
    }],
    averageWatchTime: Number,
    dropOffPoints: [Number] // timestamps where users commonly stop watching
  }
}, {
  timestamps: true
});

// Indexes for better performance
movieSchema.index({ title: 'text', overview: 'text', keywords: 'text' });
movieSchema.index({ genres: 1 });
movieSchema.index({ releaseDate: -1 });
movieSchema.index({ isPremium: 1, isActive: 1 });
movieSchema.index({ isFeatured: 1, isActive: 1 });
movieSchema.index({ views: -1 });
movieSchema.index({ imdbRating: -1 });
movieSchema.index({ slug: 1 });

// Virtual for average rating
movieSchema.virtual('averageRating').get(function() {
  if (this.reviews.length === 0) return 0;
  const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
  return Math.round((sum / this.reviews.length) * 10) / 10;
});

// Virtual for duration in hours and minutes
movieSchema.virtual('formattedRuntime').get(function() {
  const hours = Math.floor(this.runtime / 60);
  const minutes = this.runtime % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
});

// Method to increment view count
movieSchema.methods.incrementViews = function() {
  this.views += 1;
  
  // Update daily analytics
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayAnalytics = this.analytics.dailyViews.find(
    day => day.date.getTime() === today.getTime()
  );
  
  if (todayAnalytics) {
    todayAnalytics.views += 1;
  } else {
    this.analytics.dailyViews.push({
      date: today,
      views: 1
    });
  }
  
  // Keep only last 30 days
  if (this.analytics.dailyViews.length > 30) {
    this.analytics.dailyViews = this.analytics.dailyViews
      .sort((a, b) => b.date - a.date)
      .slice(0, 30);
  }
  
  return this.save();
};

// Method to add/update user rating
movieSchema.methods.addRating = function(userId, rating, comment = '') {
  const existingReviewIndex = this.reviews.findIndex(
    review => review.user.toString() === userId.toString()
  );
  
  if (existingReviewIndex !== -1) {
    this.reviews[existingReviewIndex].rating = rating;
    this.reviews[existingReviewIndex].comment = comment;
    this.reviews[existingReviewIndex].createdAt = new Date();
  } else {
    this.reviews.push({
      user: userId,
      rating,
      comment,
      createdAt: new Date()
    });
  }
  
  return this.save();
};

// Method to toggle like
movieSchema.methods.toggleLike = function(userId) {
  const isLiked = this.likedBy.includes(userId);
  
  if (isLiked) {
    this.likedBy = this.likedBy.filter(id => id.toString() !== userId.toString());
    this.likes = Math.max(0, this.likes - 1);
  } else {
    this.likedBy.push(userId);
    this.likes += 1;
  }
  
  return this.save();
};

// Pre-save middleware to generate slug
movieSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

export default mongoose.model('Movie', movieSchema);