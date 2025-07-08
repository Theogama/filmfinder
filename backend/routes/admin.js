import express from 'express';
import Movie from '../models/Movie.js';
import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { 
  validateMovieCreation, 
  validateMovieUpdate, 
  validateMovieId,
  validateUserId,
  validatePagination 
} from '../middleware/validation.js';

const router = express.Router();

// Apply admin middleware to all routes
router.use(authenticateToken, requireAdmin);

// @route   GET /api/admin/stats
// @desc    Get admin dashboard statistics
// @access  Admin
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalMovies = await Movie.countDocuments({ status: 'published' });
    const activeSubscriptions = await Subscription.countDocuments({ 
      status: { $in: ['active', 'trialing'] } 
    });
    
    // Revenue calculation (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentSubscriptions = await Subscription.find({
      'payments.paidAt': { $gte: thirtyDaysAgo },
      'payments.status': 'succeeded'
    });
    
    const monthlyRevenue = recentSubscriptions.reduce((total, sub) => {
      const recentPayments = sub.payments.filter(
        payment => payment.paidAt >= thirtyDaysAgo && payment.status === 'succeeded'
      );
      return total + recentPayments.reduce((sum, payment) => sum + payment.amount, 0);
    }, 0);

    // Most watched movies (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const topMovies = await Movie.find({
      'analytics.dailyViews.date': { $gte: sevenDaysAgo }
    })
    .sort({ views: -1 })
    .limit(5)
    .select('title views poster');

    // User growth (last 30 days)
    const newUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Watch time analytics
    const totalWatchTime = await Movie.aggregate([
      { $group: { _id: null, total: { $sum: '$watchTime' } } }
    ]);

    res.json({
      overview: {
        totalUsers,
        totalMovies,
        activeSubscriptions,
        monthlyRevenue: monthlyRevenue / 100, // Convert from cents
        newUsers,
        totalWatchTime: totalWatchTime[0]?.total || 0
      },
      topMovies,
      currency: 'ZAR'
    });

  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ 
      message: 'Error fetching admin statistics' 
    });
  }
});

// @route   GET /api/admin/movies
// @desc    Get all movies with admin details
// @access  Admin
router.get('/movies', validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.isPremium !== undefined) {
      filter.isPremium = req.query.isPremium === 'true';
    }
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    const movies = await Movie.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('uploadedBy', 'name email')
      .lean();

    const total = await Movie.countDocuments(filter);

    res.json({
      movies,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalMovies: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get admin movies error:', error);
    res.status(500).json({ 
      message: 'Error fetching movies' 
    });
  }
});

// @route   POST /api/admin/movies
// @desc    Create new movie
// @access  Admin
router.post('/movies', validateMovieCreation, async (req, res) => {
  try {
    const movieData = {
      ...req.body,
      uploadedBy: req.user._id,
      status: 'published'
    };

    const movie = new Movie(movieData);
    await movie.save();

    res.status(201).json({ 
      message: 'Movie created successfully',
      movie
    });

  } catch (error) {
    console.error('Create movie error:', error);
    res.status(500).json({ 
      message: 'Error creating movie' 
    });
  }
});

// @route   GET /api/admin/movies/:id
// @desc    Get movie by ID (admin view)
// @access  Admin
router.get('/movies/:id', validateMovieId, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id)
      .populate('uploadedBy', 'name email')
      .populate('reviews.user', 'name email');

    if (!movie) {
      return res.status(404).json({ 
        message: 'Movie not found' 
      });
    }

    res.json({ movie });

  } catch (error) {
    console.error('Get admin movie error:', error);
    res.status(500).json({ 
      message: 'Error fetching movie' 
    });
  }
});

// @route   PUT /api/admin/movies/:id
// @desc    Update movie
// @access  Admin
router.put('/movies/:id', validateMovieId, validateMovieUpdate, async (req, res) => {
  try {
    const movie = await Movie.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );

    if (!movie) {
      return res.status(404).json({ 
        message: 'Movie not found' 
      });
    }

    res.json({ 
      message: 'Movie updated successfully',
      movie
    });

  } catch (error) {
    console.error('Update movie error:', error);
    res.status(500).json({ 
      message: 'Error updating movie' 
    });
  }
});

// @route   DELETE /api/admin/movies/:id
// @desc    Delete movie
// @access  Admin
router.delete('/movies/:id', validateMovieId, async (req, res) => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);

    if (!movie) {
      return res.status(404).json({ 
        message: 'Movie not found' 
      });
    }

    res.json({ 
      message: 'Movie deleted successfully' 
    });

  } catch (error) {
    console.error('Delete movie error:', error);
    res.status(500).json({ 
      message: 'Error deleting movie' 
    });
  }
});

// @route   POST /api/admin/movies/:id/toggle-featured
// @desc    Toggle featured status of movie
// @access  Admin
router.post('/movies/:id/toggle-featured', validateMovieId, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({ 
        message: 'Movie not found' 
      });
    }

    movie.isFeatured = !movie.isFeatured;
    await movie.save();

    res.json({ 
      message: `Movie ${movie.isFeatured ? 'featured' : 'unfeatured'} successfully`,
      isFeatured: movie.isFeatured
    });

  } catch (error) {
    console.error('Toggle featured error:', error);
    res.status(500).json({ 
      message: 'Error updating featured status' 
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with admin details
// @access  Admin
router.get('/users', validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (req.query.role) {
      filter.role = req.query.role;
    }
    if (req.query.subscription) {
      filter['subscription.plan'] = req.query.subscription;
    }
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password -passwordResetToken -emailVerificationToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get subscription details for each user
    const userIds = users.map(user => user._id);
    const subscriptions = await Subscription.find({ 
      user: { $in: userIds } 
    }).lean();

    const subscriptionMap = {};
    subscriptions.forEach(sub => {
      subscriptionMap[sub.user.toString()] = sub;
    });

    // Attach subscription data to users
    users.forEach(user => {
      user.subscriptionDetails = subscriptionMap[user._id.toString()] || null;
    });

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ 
      message: 'Error fetching users' 
    });
  }
});

// @route   GET /api/admin/users/:id
// @desc    Get user by ID (admin view)
// @access  Admin
router.get('/users/:id', validateUserId, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -passwordResetToken -emailVerificationToken')
      .populate('watchHistory.movieId', 'title poster')
      .populate('watchlist', 'title poster');

    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    // Get subscription details
    const subscription = await Subscription.findOne({ user: user._id });

    res.json({ 
      user: {
        ...user.toObject(),
        subscriptionDetails: subscription
      }
    });

  } catch (error) {
    console.error('Get admin user error:', error);
    res.status(500).json({ 
      message: 'Error fetching user' 
    });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user (admin)
// @access  Admin
router.put('/users/:id', validateUserId, async (req, res) => {
  try {
    const { role, isEmailVerified } = req.body;
    
    const updateData = {};
    if (role) updateData.role = role;
    if (isEmailVerified !== undefined) updateData.isEmailVerified = isEmailVerified;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    res.json({ 
      message: 'User updated successfully',
      user
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ 
      message: 'Error updating user' 
    });
  }
});

// @route   POST /api/admin/users/:id/suspend
// @desc    Suspend/unsuspend user account
// @access  Admin
router.post('/users/:id/suspend', validateUserId, async (req, res) => {
  try {
    const { suspend = true, reason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ 
        message: 'Cannot suspend admin users' 
      });
    }

    if (suspend) {
      user.lockUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
      user.loginAttempts = 5; // Max attempts reached
    } else {
      user.lockUntil = undefined;
      user.loginAttempts = 0;
    }

    await user.save();

    res.json({ 
      message: `User ${suspend ? 'suspended' : 'unsuspended'} successfully`,
      isLocked: user.isLocked
    });

  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ 
      message: 'Error updating user status' 
    });
  }
});

// @route   GET /api/admin/subscriptions
// @desc    Get all subscriptions with details
// @access  Admin
router.get('/subscriptions', validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (req.query.plan) {
      filter.plan = req.query.plan;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const subscriptions = await Subscription.find(filter)
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Subscription.countDocuments(filter);

    res.json({
      subscriptions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalSubscriptions: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get admin subscriptions error:', error);
    res.status(500).json({ 
      message: 'Error fetching subscriptions' 
    });
  }
});

// @route   GET /api/admin/analytics
// @desc    Get detailed analytics
// @access  Admin
router.get('/analytics', async (req, res) => {
  try {
    const { period = 'week' } = req.query; // week, month, year
    
    let dateFilter;
    switch (period) {
      case 'week':
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        dateFilter = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    // User registration analytics
    const userGrowth = await User.aggregate([
      {
        $match: { createdAt: { $gte: dateFilter } }
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
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Revenue analytics
    const revenueData = await Subscription.aggregate([
      {
        $match: {
          'payments.paidAt': { $gte: dateFilter },
          'payments.status': 'succeeded'
        }
      },
      { $unwind: '$payments' },
      {
        $match: {
          'payments.paidAt': { $gte: dateFilter },
          'payments.status': 'succeeded'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$payments.paidAt' },
            month: { $month: '$payments.paidAt' },
            day: { $dayOfMonth: '$payments.paidAt' }
          },
          revenue: { $sum: '$payments.amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Most watched content
    const topContent = await Movie.find({
      'analytics.dailyViews.date': { $gte: dateFilter }
    })
    .sort({ views: -1 })
    .limit(10)
    .select('title views genres poster');

    // Subscription plan distribution
    const planDistribution = await Subscription.aggregate([
      {
        $group: {
          _id: '$plan',
          count: { $sum: 1 }
        }
      }
    ]);

    // User activity by day
    const dailyActivity = await Movie.aggregate([
      { $unwind: '$analytics.dailyViews' },
      {
        $match: {
          'analytics.dailyViews.date': { $gte: dateFilter }
        }
      },
      {
        $group: {
          _id: '$analytics.dailyViews.date',
          totalViews: { $sum: '$analytics.dailyViews.views' },
          uniqueMovies: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.json({
      period,
      userGrowth,
      revenueData,
      topContent,
      planDistribution,
      dailyActivity
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ 
      message: 'Error fetching analytics' 
    });
  }
});

// @route   POST /api/admin/movies/bulk-update
// @desc    Bulk update movies (featured, status, etc.)
// @access  Admin
router.post('/movies/bulk-update', async (req, res) => {
  try {
    const { movieIds, updateData } = req.body;

    if (!movieIds || !Array.isArray(movieIds) || movieIds.length === 0) {
      return res.status(400).json({ 
        message: 'Movie IDs array is required' 
      });
    }

    const result = await Movie.updateMany(
      { _id: { $in: movieIds } },
      updateData
    );

    res.json({ 
      message: `${result.modifiedCount} movies updated successfully`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Bulk update movies error:', error);
    res.status(500).json({ 
      message: 'Error bulk updating movies' 
    });
  }
});

export default router;