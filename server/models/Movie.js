import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema({
  tmdbId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  originalTitle: {
    type: String,
    trim: true
  },
  overview: {
    type: String,
    required: true
  },
  tagline: {
    type: String
  },
  releaseDate: {
    type: Date,
    required: true
  },
  runtime: {
    type: Number,
    min: 0
  },
  status: {
    type: String,
    enum: ['Rumored', 'Planned', 'In Production', 'Post Production', 'Released', 'Canceled'],
    default: 'Released'
  },
  genres: [{
    id: Number,
    name: String
  }],
  spokenLanguages: [{
    iso_639_1: String,
    name: String
  }],
  productionCompanies: [{
    id: Number,
    name: String,
    logoPath: String,
    originCountry: String
  }],
  productionCountries: [{
    iso_3166_1: String,
    name: String
  }],
  budget: {
    type: Number
  },
  revenue: {
    type: Number
  },
  popularity: {
    type: Number,
    default: 0
  },
  voteAverage: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  voteCount: {
    type: Number,
    default: 0
  },
  posterPath: {
    type: String
  },
  backdropPath: {
    type: String
  },
  // Streaming content
  streamingContent: {
    trailerUrl: String,
    fullMovieUrl: String,
    hlsUrl: String,
    dashUrl: String,
    thumbnailUrl: String,
    duration: Number, // in seconds
    quality: {
      type: String,
      enum: ['720p', '1080p', '4K'],
      default: '1080p'
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    requiresSubscription: {
      type: Boolean,
      default: true
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  },
  // Content metadata
  contentRating: {
    type: String,
    enum: ['G', 'PG', 'PG-13', 'R', 'NC-17', 'TV-Y', 'TV-Y7', 'TV-G', 'TV-PG', 'TV-14', 'TV-MA'],
    default: 'PG-13'
  },
  contentWarnings: [{
    type: String
  }],
  // SEO and discovery
  keywords: [{
    type: String
  }],
  cast: [{
    id: Number,
    name: String,
    character: String,
    profilePath: String,
    order: Number
  }],
  crew: [{
    id: Number,
    name: String,
    job: String,
    department: String,
    profilePath: String
  }],
  // User engagement
  views: {
    type: Number,
    default: 0
  },
  watchlistCount: {
    type: Number,
    default: 0
  },
  favoriteCount: {
    type: Number,
    default: 0
  },
  ratingCount: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  // Admin controls
  isFeatured: {
    type: Boolean,
    default: false
  },
  isNewRelease: {
    type: Boolean,
    default: false
  },
  isTrending: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Timestamps
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
movieSchema.index({ tmdbId: 1 });
movieSchema.index({ title: 'text', overview: 'text' });
movieSchema.index({ 'genres.name': 1 });
movieSchema.index({ releaseDate: -1 });
movieSchema.index({ popularity: -1 });
movieSchema.index({ voteAverage: -1 });
movieSchema.index({ isFeatured: 1 });
movieSchema.index({ isNewRelease: 1 });
movieSchema.index({ isTrending: 1 });
movieSchema.index({ 'streamingContent.isAvailable': 1 });
movieSchema.index({ 'streamingContent.requiresSubscription': 1 });

// Virtual for full poster URL
movieSchema.virtual('posterUrl').get(function() {
  if (this.posterPath) {
    return `https://image.tmdb.org/t/p/w500${this.posterPath}`;
  }
  return null;
});

// Virtual for full backdrop URL
movieSchema.virtual('backdropUrl').get(function() {
  if (this.backdropPath) {
    return `https://image.tmdb.org/t/p/original${this.backdropPath}`;
  }
  return null;
});

// Virtual for year
movieSchema.virtual('year').get(function() {
  return this.releaseDate ? this.releaseDate.getFullYear() : null;
});

// Virtual for formatted runtime
movieSchema.virtual('formattedRuntime').get(function() {
  if (!this.runtime) return null;
  const hours = Math.floor(this.runtime / 60);
  const minutes = this.runtime % 60;
  return `${hours}h ${minutes}m`;
});

// Method to increment views
movieSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Method to update watchlist count
movieSchema.methods.updateWatchlistCount = function(increment = 1) {
  this.watchlistCount = Math.max(0, this.watchlistCount + increment);
  return this.save();
};

// Method to update favorite count
movieSchema.methods.updateFavoriteCount = function(increment = 1) {
  this.favoriteCount = Math.max(0, this.favoriteCount + increment);
  return this.save();
};

// Method to update rating
movieSchema.methods.updateRating = function(newRating) {
  const totalRating = this.averageRating * this.ratingCount + newRating;
  this.ratingCount += 1;
  this.averageRating = totalRating / this.ratingCount;
  return this.save();
};

// Static method to get featured movies
movieSchema.statics.getFeatured = function(limit = 10) {
  return this.find({ 
    isFeatured: true, 
    isActive: true,
    'streamingContent.isAvailable': true 
  })
  .sort({ popularity: -1 })
  .limit(limit);
};

// Static method to get new releases
movieSchema.statics.getNewReleases = function(limit = 10) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return this.find({
    releaseDate: { $gte: thirtyDaysAgo },
    isActive: true,
    'streamingContent.isAvailable': true
  })
  .sort({ releaseDate: -1 })
  .limit(limit);
};

// Static method to get trending movies
movieSchema.statics.getTrending = function(limit = 10) {
  return this.find({
    isTrending: true,
    isActive: true,
    'streamingContent.isAvailable': true
  })
  .sort({ popularity: -1 })
  .limit(limit);
};

// Static method to search movies
movieSchema.statics.search = function(query, limit = 20) {
  return this.find({
    $text: { $search: query },
    isActive: true,
    'streamingContent.isAvailable': true
  })
  .sort({ score: { $meta: 'textScore' } })
  .limit(limit);
};

// Static method to get movies by genre
movieSchema.statics.getByGenre = function(genreName, limit = 20) {
  return this.find({
    'genres.name': { $regex: genreName, $options: 'i' },
    isActive: true,
    'streamingContent.isAvailable': true
  })
  .sort({ popularity: -1 })
  .limit(limit);
};

const Movie = mongoose.model('Movie', movieSchema);

export default Movie;