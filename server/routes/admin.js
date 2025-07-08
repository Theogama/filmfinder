import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import Movie from '../models/Movie.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Apply admin middleware to all routes
router.use(requireAdmin);

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Admin
router.get('/dashboard', asyncHandler(async (req, res) => {
  // Get total users
  const totalUsers = await User.countDocuments();
  const activeSubscriptions = await User.countDocuments({
    'subscription.status': { $in: ['active', 'trial'] }
  });

  // Get total movies
  const totalMovies = await Movie.countDocuments();
  const activeMovies = await Movie.countDocuments({ isActive: true });

  // Get recent registrations
  const recentUsers = await User.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .select('firstName lastName email subscription.status createdAt');

  // Get most watched movies
  const mostWatched = await Movie.find({ isActive: true })
    .sort({ views: -1 })
    .limit(10)
    .select('title views watchlistCount favoriteCount');

  // Get subscription statistics
  const subscriptionStats = await User.aggregate([
    {
      $group: {
        _id: '$subscription.status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get monthly registrations for the last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyRegistrations = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);

  res.json({
    success: true,
    data: {
      statistics: {
        totalUsers,
        activeSubscriptions,
        totalMovies,
        activeMovies
      },
      recentUsers,
      mostWatched,
      subscriptionStats,
      monthlyRegistrations
    }
  });
}));

// @route   GET /api/admin/users
// @desc    Get all users with pagination and filters
// @access  Admin
router.get('/users', asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    subscriptionStatus,
    sort = 'createdAt',
    order = 'desc'
  } = req.query;

  const skip = (page - 1) * limit;
  
  // Build filter object
  const filter = {};
  
  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (subscriptionStatus) {
    filter['subscription.status'] = subscriptionStatus;
  }

  // Build sort object
  const sortObj = {};
  sortObj[sort] = order === 'desc' ? -1 : 1;

  const users = await User.find(filter)
    .select('-password')
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await User.countDocuments(filter);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    }
  });
}));

// @route   GET /api/admin/users/:id
// @desc    Get user details
// @access  Admin
router.get('/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id).select('-password');
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Get user's watch history with movie details
  const watchHistory = await Movie.find({
    _id: { $in: user.watchHistory.map(item => item.movieId) }
  }).select('title posterPath releaseDate');

  res.json({
    success: true,
    data: {
      user,
      watchHistory
    }
  });
}));

// @route   PUT /api/admin/users/:id
// @desc    Update user (admin)
// @access  Admin
router.put('/users/:id', [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('isAdmin').optional().isBoolean().withMessage('isAdmin must be a boolean'),
  body('subscription.plan').optional().isIn(['free', 'basic', 'pro']).withMessage('Invalid subscription plan'),
  body('subscription.status').optional().isIn(['active', 'inactive', 'cancelled', 'trial']).withMessage('Invalid subscription status')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  const { id } = req.params;
  const { firstName, lastName, isAdmin, subscription } = req.body;

  const user = await User.findById(id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (isAdmin !== undefined) user.isAdmin = isAdmin;
  if (subscription) {
    if (subscription.plan) user.subscription.plan = subscription.plan;
    if (subscription.status) user.subscription.status = subscription.status;
  }

  await user.save();

  res.json({
    success: true,
    message: 'User updated successfully',
    data: {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        isAdmin: user.isAdmin,
        subscription: user.subscription
      }
    }
  });
}));

// @route   DELETE /api/admin/users/:id
// @desc    Delete user (admin)
// @access  Admin
router.delete('/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  await User.findByIdAndDelete(id);

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
}));

// @route   GET /api/admin/movies
// @desc    Get all movies with pagination and filters
// @access  Admin
router.get('/movies', asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    genre,
    status,
    sort = 'createdAt',
    order = 'desc'
  } = req.query;

  const skip = (page - 1) * limit;
  
  // Build filter object
  const filter = {};
  
  if (search) {
    filter.$text = { $search: search };
  }
  
  if (genre) {
    filter['genres.name'] = { $regex: genre, $options: 'i' };
  }
  
  if (status) {
    filter.isActive = status === 'active';
  }

  // Build sort object
  const sortObj = {};
  sortObj[sort] = order === 'desc' ? -1 : 1;

  const movies = await Movie.find(filter)
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Movie.countDocuments(filter);

  res.json({
    success: true,
    data: {
      movies,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalMovies: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    }
  });
}));

// @route   POST /api/admin/movies
// @desc    Create new movie
// @access  Admin
router.post('/movies', [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('overview').trim().notEmpty().withMessage('Overview is required'),
  body('releaseDate').isISO8601().withMessage('Valid release date is required'),
  body('tmdbId').notEmpty().withMessage('TMDB ID is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  const {
    title,
    originalTitle,
    overview,
    tagline,
    releaseDate,
    runtime,
    status,
    genres,
    spokenLanguages,
    productionCompanies,
    productionCountries,
    budget,
    revenue,
    popularity,
    voteAverage,
    voteCount,
    posterPath,
    backdropPath,
    streamingContent,
    contentRating,
    contentWarnings,
    keywords,
    cast,
    crew,
    isFeatured,
    isNewRelease,
    isTrending,
    tmdbId
  } = req.body;

  // Check if movie with TMDB ID already exists
  const existingMovie = await Movie.findOne({ tmdbId });
  if (existingMovie) {
    return res.status(400).json({
      success: false,
      message: 'Movie with this TMDB ID already exists'
    });
  }

  const movie = new Movie({
    tmdbId,
    title,
    originalTitle,
    overview,
    tagline,
    releaseDate,
    runtime,
    status,
    genres,
    spokenLanguages,
    productionCompanies,
    productionCountries,
    budget,
    revenue,
    popularity,
    voteAverage,
    voteCount,
    posterPath,
    backdropPath,
    streamingContent,
    contentRating,
    contentWarnings,
    keywords,
    cast,
    crew,
    isFeatured,
    isNewRelease,
    isTrending
  });

  await movie.save();

  res.status(201).json({
    success: true,
    message: 'Movie created successfully',
    data: { movie }
  });
}));

// @route   PUT /api/admin/movies/:id
// @desc    Update movie
// @access  Admin
router.put('/movies/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const movie = await Movie.findById(id);
  
  if (!movie) {
    return res.status(404).json({
      success: false,
      message: 'Movie not found'
    });
  }

  // Update movie fields
  Object.keys(req.body).forEach(key => {
    if (key !== '_id' && key !== '__v') {
      movie[key] = req.body[key];
    }
  });

  await movie.save();

  res.json({
    success: true,
    message: 'Movie updated successfully',
    data: { movie }
  });
}));

// @route   DELETE /api/admin/movies/:id
// @desc    Delete movie
// @access  Admin
router.delete('/movies/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const movie = await Movie.findById(id);
  
  if (!movie) {
    return res.status(404).json({
      success: false,
      message: 'Movie not found'
    });
  }

  await Movie.findByIdAndDelete(id);

  res.json({
    success: true,
    message: 'Movie deleted successfully'
  });
}));

// @route   GET /api/admin/analytics
// @desc    Get detailed analytics
// @access  Admin
router.get('/analytics', asyncHandler(async (req, res) => {
  const { period = '30' } = req.query; // days
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(period));

  // User registration analytics
  const userRegistrations = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }
  ]);

  // Movie view analytics
  const movieViews = await Movie.aggregate([
    {
      $match: {
        isActive: true
      }
    },
    {
      $project: {
        title: 1,
        views: 1,
        watchlistCount: 1,
        favoriteCount: 1
      }
    },
    {
      $sort: { views: -1 }
    },
    {
      $limit: 20
    }
  ]);

  // Genre popularity
  const genrePopularity = await Movie.aggregate([
    {
      $match: {
        isActive: true
      }
    },
    {
      $unwind: '$genres'
    },
    {
      $group: {
        _id: '$genres.name',
        totalViews: { $sum: '$views' },
        movieCount: { $sum: 1 },
        avgRating: { $avg: '$voteAverage' }
      }
    },
    {
      $sort: { totalViews: -1 }
    }
  ]);

  // Subscription analytics
  const subscriptionAnalytics = await User.aggregate([
    {
      $group: {
        _id: '$subscription.plan',
        count: { $sum: 1 },
        activeCount: {
          $sum: {
            $cond: [
              { $in: ['$subscription.status', ['active', 'trial']] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      userRegistrations,
      movieViews,
      genrePopularity,
      subscriptionAnalytics,
      period: parseInt(period)
    }
  });
}));

export default router;