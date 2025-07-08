import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import Movie from '../models/Movie.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  
  res.json({
    success: true,
    data: { user }
  });
}));

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('avatar').optional().isURL().withMessage('Avatar must be a valid URL')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  const { firstName, lastName, avatar } = req.body;
  const user = await User.findById(req.user.id);

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (avatar) user.avatar = avatar;

  await user.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        avatar: user.avatar
      }
    }
  });
}));

// @route   PUT /api/users/preferences
// @desc    Update user preferences
// @access  Private
router.put('/preferences', [
  body('genres').optional().isArray().withMessage('Genres must be an array'),
  body('language').optional().isIn(['en', 'es', 'fr', 'de', 'pt']).withMessage('Invalid language'),
  body('autoPlay').optional().isBoolean().withMessage('Auto play must be a boolean'),
  body('quality').optional().isIn(['720p', '1080p', '4K']).withMessage('Invalid quality setting')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  const { genres, language, autoPlay, quality } = req.body;
  const user = await User.findById(req.user.id);

  if (genres) user.preferences.genres = genres;
  if (language) user.preferences.language = language;
  if (autoPlay !== undefined) user.preferences.autoPlay = autoPlay;
  if (quality) user.preferences.quality = quality;

  await user.save();

  res.json({
    success: true,
    message: 'Preferences updated successfully',
    data: {
      preferences: user.preferences
    }
  });
}));

// @route   GET /api/users/watchlist
// @desc    Get user watchlist
// @access  Private
router.get('/watchlist', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const user = await User.findById(req.user.id).populate({
    path: 'watchlist.movieId',
    select: 'title posterPath backdropPath releaseDate voteAverage genres overview'
  });

  const watchlist = user.watchlist
    .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
    .slice(skip, skip + parseInt(limit));

  res.json({
    success: true,
    data: {
      watchlist,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(user.watchlist.length / limit),
        totalItems: user.watchlist.length,
        hasNext: page * limit < user.watchlist.length,
        hasPrev: page > 1
      }
    }
  });
}));

// @route   POST /api/users/watchlist/:movieId
// @desc    Add movie to watchlist
// @access  Private
router.post('/watchlist/:movieId', asyncHandler(async (req, res) => {
  const { movieId } = req.params;

  // Check if movie exists
  const movie = await Movie.findOne({
    $or: [
      { _id: movieId },
      { tmdbId: movieId }
    ],
    isActive: true
  });

  if (!movie) {
    return res.status(404).json({
      success: false,
      message: 'Movie not found'
    });
  }

  const user = await User.findById(req.user.id);
  await user.addToWatchlist(movie._id.toString());
  await movie.updateWatchlistCount(1);

  res.json({
    success: true,
    message: 'Movie added to watchlist',
    data: {
      movieId: movie._id,
      watchlistCount: movie.watchlistCount
    }
  });
}));

// @route   DELETE /api/users/watchlist/:movieId
// @desc    Remove movie from watchlist
// @access  Private
router.delete('/watchlist/:movieId', asyncHandler(async (req, res) => {
  const { movieId } = req.params;

  const user = await User.findById(req.user.id);
  await user.removeFromWatchlist(movieId);

  // Update movie watchlist count
  const movie = await Movie.findOne({
    $or: [
      { _id: movieId },
      { tmdbId: movieId }
    ]
  });

  if (movie) {
    await movie.updateWatchlistCount(-1);
  }

  res.json({
    success: true,
    message: 'Movie removed from watchlist'
  });
}));

// @route   GET /api/users/favorites
// @desc    Get user favorites
// @access  Private
router.get('/favorites', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const user = await User.findById(req.user.id).populate({
    path: 'favorites.movieId',
    select: 'title posterPath backdropPath releaseDate voteAverage genres overview'
  });

  const favorites = user.favorites
    .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
    .slice(skip, skip + parseInt(limit));

  res.json({
    success: true,
    data: {
      favorites,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(user.favorites.length / limit),
        totalItems: user.favorites.length,
        hasNext: page * limit < user.favorites.length,
        hasPrev: page > 1
      }
    }
  });
}));

// @route   POST /api/users/favorites/:movieId
// @desc    Add movie to favorites
// @access  Private
router.post('/favorites/:movieId', asyncHandler(async (req, res) => {
  const { movieId } = req.params;

  // Check if movie exists
  const movie = await Movie.findOne({
    $or: [
      { _id: movieId },
      { tmdbId: movieId }
    ],
    isActive: true
  });

  if (!movie) {
    return res.status(404).json({
      success: false,
      message: 'Movie not found'
    });
  }

  const user = await User.findById(req.user.id);
  await user.addToFavorites(movie._id.toString());
  await movie.updateFavoriteCount(1);

  res.json({
    success: true,
    message: 'Movie added to favorites',
    data: {
      movieId: movie._id,
      favoriteCount: movie.favoriteCount
    }
  });
}));

// @route   DELETE /api/users/favorites/:movieId
// @desc    Remove movie from favorites
// @access  Private
router.delete('/favorites/:movieId', asyncHandler(async (req, res) => {
  const { movieId } = req.params;

  const user = await User.findById(req.user.id);
  await user.removeFromFavorites(movieId);

  // Update movie favorite count
  const movie = await Movie.findOne({
    $or: [
      { _id: movieId },
      { tmdbId: movieId }
    ]
  });

  if (movie) {
    await movie.updateFavoriteCount(-1);
  }

  res.json({
    success: true,
    message: 'Movie removed from favorites'
  });
}));

// @route   GET /api/users/watch-history
// @desc    Get user watch history
// @access  Private
router.get('/watch-history', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const user = await User.findById(req.user.id).populate({
    path: 'watchHistory.movieId',
    select: 'title posterPath backdropPath releaseDate voteAverage genres overview streamingContent.duration'
  });

  const watchHistory = user.watchHistory
    .sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt))
    .slice(skip, skip + parseInt(limit));

  res.json({
    success: true,
    data: {
      watchHistory,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(user.watchHistory.length / limit),
        totalItems: user.watchHistory.length,
        hasNext: page * limit < user.watchHistory.length,
        hasPrev: page > 1
      }
    }
  });
}));

// @route   PUT /api/users/watch-history/:movieId
// @desc    Update watch progress
// @access  Private
router.put('/watch-history/:movieId', [
  body('progress').isFloat({ min: 0, max: 100 }).withMessage('Progress must be between 0 and 100')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  const { movieId } = req.params;
  const { progress } = req.body;

  const user = await User.findById(req.user.id);
  await user.updateWatchHistory(movieId, progress);

  res.json({
    success: true,
    message: 'Watch progress updated'
  });
}));

// @route   DELETE /api/users/watch-history/:movieId
// @desc    Remove movie from watch history
// @access  Private
router.delete('/watch-history/:movieId', asyncHandler(async (req, res) => {
  const { movieId } = req.params;

  const user = await User.findById(req.user.id);
  user.watchHistory = user.watchHistory.filter(item => item.movieId !== movieId);
  await user.save();

  res.json({
    success: true,
    message: 'Movie removed from watch history'
  });
}));

// @route   GET /api/users/recommendations
// @desc    Get personalized movie recommendations
// @access  Private
router.get('/recommendations', asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query;
  const user = await User.findById(req.user.id);

  // Get user's preferred genres from watch history and preferences
  const userGenres = new Set();
  
  // Add genres from preferences
  user.preferences.genres.forEach(genre => userGenres.add(genre));
  
  // Add genres from recently watched movies
  const recentMovies = await Movie.find({
    _id: { $in: user.watchHistory.slice(0, 10).map(item => item.movieId) }
  });
  
  recentMovies.forEach(movie => {
    movie.genres.forEach(genre => userGenres.add(genre.name));
  });

  // Get recommendations based on user preferences
  const recommendations = await Movie.find({
    isActive: true,
    'streamingContent.isAvailable': true,
    'genres.name': { $in: Array.from(userGenres) },
    _id: { $nin: user.watchHistory.map(item => item.movieId) }
  })
  .sort({ popularity: -1, voteAverage: -1 })
  .limit(parseInt(limit))
  .select('-streamingContent.fullMovieUrl -streamingContent.hlsUrl -streamingContent.dashUrl');

  res.json({
    success: true,
    data: {
      recommendations,
      userGenres: Array.from(userGenres)
    }
  });
}));

// @route   DELETE /api/users/account
// @desc    Delete user account
// @access  Private
router.delete('/account', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  // In a real application, you might want to:
  // 1. Cancel any active subscriptions
  // 2. Delete user data from third-party services
  // 3. Send confirmation email
  
  await User.findByIdAndDelete(req.user.id);

  res.json({
    success: true,
    message: 'Account deleted successfully'
  });
}));

export default router;