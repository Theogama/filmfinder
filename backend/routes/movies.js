import express from 'express';
import Movie from '../models/Movie.js';
import User from '../models/User.js';
import { 
  authenticateToken, 
  optionalAuth, 
  requirePremium 
} from '../middleware/auth.js';
import { 
  validateMovieId, 
  validatePagination, 
  validateSearch,
  validateRating 
} from '../middleware/validation.js';

const router = express.Router();

// @route   GET /api/movies
// @desc    Get movies with pagination and filters
// @access  Public
router.get('/', validatePagination, optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter query
    const filter = { 
      status: 'published', 
      isActive: true 
    };

    // Add filters
    if (req.query.genre) {
      filter.genres = { $in: [req.query.genre] };
    }
    
    if (req.query.year) {
      const year = parseInt(req.query.year);
      filter.releaseDate = {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      };
    }

    if (req.query.rating) {
      filter.rating = req.query.rating;
    }

    if (req.query.featured === 'true') {
      filter.isFeatured = true;
    }

    if (req.query.coming_soon === 'true') {
      filter.isComingSoon = true;
    }

    // For non-premium users, only show non-premium content or trailers
    if (!req.user || !req.user.canAccessPremium()) {
      filter.$or = [
        { isPremium: false },
        { isPremium: true } // They can see premium movies but can't watch full content
      ];
    }

    // Sort options
    let sort = {};
    switch (req.query.sort) {
      case 'newest':
        sort = { releaseDate: -1 };
        break;
      case 'oldest':
        sort = { releaseDate: 1 };
        break;
      case 'popular':
        sort = { views: -1 };
        break;
      case 'rating':
        sort = { imdbRating: -1 };
        break;
      case 'title':
        sort = { title: 1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    const movies = await Movie.find(filter)
      .select('-reviews -analytics -likedBy')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('uploadedBy', 'name')
      .lean();

    const total = await Movie.countDocuments(filter);

    // Add user-specific data if authenticated
    if (req.user) {
      for (let movie of movies) {
        movie.isLiked = req.user.watchlist.includes(movie._id);
        movie.isInWatchlist = req.user.watchlist.includes(movie._id);
        
        // Find watch history for this movie
        const watchEntry = req.user.watchHistory.find(
          entry => entry.movieId.toString() === movie._id.toString()
        );
        movie.watchProgress = watchEntry ? {
          watchTime: watchEntry.watchTime,
          completed: watchEntry.completed,
          watchedAt: watchEntry.watchedAt
        } : null;
      }
    }

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
    console.error('Get movies error:', error);
    res.status(500).json({ 
      message: 'Error fetching movies' 
    });
  }
});

// @route   GET /api/movies/search
// @desc    Search movies
// @access  Public
router.get('/search', validateSearch, validatePagination, optionalAuth, async (req, res) => {
  try {
    const { q, genre, year } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build search query
    const searchQuery = {
      status: 'published',
      isActive: true,
      $text: { $search: q }
    };

    // Add filters
    if (genre) {
      searchQuery.genres = { $in: [genre] };
    }

    if (year) {
      const yearInt = parseInt(year);
      searchQuery.releaseDate = {
        $gte: new Date(yearInt, 0, 1),
        $lt: new Date(yearInt + 1, 0, 1)
      };
    }

    // For non-premium users, only show accessible content
    if (!req.user || !req.user.canAccessPremium()) {
      searchQuery.$and = [
        searchQuery.$and || {},
        {
          $or: [
            { isPremium: false },
            { isPremium: true } // They can see but can't watch full content
          ]
        }
      ];
    }

    const movies = await Movie.find(searchQuery)
      .select('-reviews -analytics -likedBy')
      .sort({ score: { $meta: 'textScore' }, views: -1 })
      .skip(skip)
      .limit(limit)
      .populate('uploadedBy', 'name')
      .lean();

    const total = await Movie.countDocuments(searchQuery);

    // Add user-specific data if authenticated
    if (req.user) {
      for (let movie of movies) {
        movie.isLiked = req.user.watchlist.includes(movie._id);
        movie.isInWatchlist = req.user.watchlist.includes(movie._id);
      }
    }

    res.json({
      movies,
      searchQuery: q,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalMovies: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Search movies error:', error);
    res.status(500).json({ 
      message: 'Error searching movies' 
    });
  }
});

// @route   GET /api/movies/genres
// @desc    Get all available genres
// @access  Public
router.get('/genres', async (req, res) => {
  try {
    const genres = await Movie.distinct('genres', { 
      status: 'published', 
      isActive: true 
    });
    
    res.json({ genres: genres.sort() });
  } catch (error) {
    console.error('Get genres error:', error);
    res.status(500).json({ 
      message: 'Error fetching genres' 
    });
  }
});

// @route   GET /api/movies/featured
// @desc    Get featured movies
// @access  Public
router.get('/featured', optionalAuth, async (req, res) => {
  try {
    const movies = await Movie.find({ 
      isFeatured: true, 
      status: 'published', 
      isActive: true 
    })
    .select('-reviews -analytics -likedBy')
    .sort({ views: -1 })
    .limit(10)
    .populate('uploadedBy', 'name')
    .lean();

    // Add user-specific data if authenticated
    if (req.user) {
      for (let movie of movies) {
        movie.isLiked = req.user.watchlist.includes(movie._id);
        movie.isInWatchlist = req.user.watchlist.includes(movie._id);
      }
    }

    res.json({ movies });
  } catch (error) {
    console.error('Get featured movies error:', error);
    res.status(500).json({ 
      message: 'Error fetching featured movies' 
    });
  }
});

// @route   GET /api/movies/trending
// @desc    Get trending movies
// @access  Public
router.get('/trending', optionalAuth, async (req, res) => {
  try {
    // Get movies with highest views in the last 7 days
    const movies = await Movie.find({ 
      status: 'published', 
      isActive: true,
      'analytics.dailyViews.date': {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    })
    .select('-reviews -analytics -likedBy')
    .sort({ views: -1 })
    .limit(20)
    .populate('uploadedBy', 'name')
    .lean();

    // Add user-specific data if authenticated
    if (req.user) {
      for (let movie of movies) {
        movie.isLiked = req.user.watchlist.includes(movie._id);
        movie.isInWatchlist = req.user.watchlist.includes(movie._id);
      }
    }

    res.json({ movies });
  } catch (error) {
    console.error('Get trending movies error:', error);
    res.status(500).json({ 
      message: 'Error fetching trending movies' 
    });
  }
});

// @route   GET /api/movies/:id
// @desc    Get movie by ID
// @access  Public
router.get('/:id', validateMovieId, optionalAuth, async (req, res) => {
  try {
    const movie = await Movie.findOne({ 
      _id: req.params.id, 
      status: 'published', 
      isActive: true 
    })
    .populate('uploadedBy', 'name')
    .populate('reviews.user', 'name avatar')
    .lean();

    if (!movie) {
      return res.status(404).json({ 
        message: 'Movie not found' 
      });
    }

    // Add user-specific data if authenticated
    if (req.user) {
      movie.isLiked = req.user.watchlist.includes(movie._id);
      movie.isInWatchlist = req.user.watchlist.includes(movie._id);
      
      // Find user's rating for this movie
      const userReview = movie.reviews.find(
        review => review.user._id.toString() === req.user._id.toString()
      );
      movie.userRating = userReview ? {
        rating: userReview.rating,
        comment: userReview.comment
      } : null;

      // Find watch history for this movie
      const watchEntry = req.user.watchHistory.find(
        entry => entry.movieId.toString() === movie._id.toString()
      );
      movie.watchProgress = watchEntry ? {
        watchTime: watchEntry.watchTime,
        completed: watchEntry.completed,
        watchedAt: watchEntry.watchedAt
      } : null;
    }

    // Check if user can access premium content
    const canAccessPremium = req.user ? req.user.canAccessPremium() : false;
    
    // For premium movies, hide full video URL for non-premium users
    if (movie.isPremium && !canAccessPremium) {
      movie.videoUrl = null;
      movie.hlsUrl = null;
      movie.dashUrl = null;
      movie.requiresSubscription = true;
    }

    res.json({ movie });

  } catch (error) {
    console.error('Get movie error:', error);
    res.status(500).json({ 
      message: 'Error fetching movie' 
    });
  }
});

// @route   GET /api/movies/:id/stream
// @desc    Get movie streaming URL (requires authentication for premium content)
// @access  Private for premium, Public for free content
router.get('/:id/stream', validateMovieId, optionalAuth, async (req, res) => {
  try {
    const movie = await Movie.findOne({ 
      _id: req.params.id, 
      status: 'published', 
      isActive: true 
    });

    if (!movie) {
      return res.status(404).json({ 
        message: 'Movie not found' 
      });
    }

    // Check if this is premium content
    if (movie.isPremium) {
      if (!req.user) {
        return res.status(401).json({ 
          message: 'Authentication required for premium content',
          requiresAuth: true
        });
      }

      if (!req.user.canAccessPremium()) {
        return res.status(403).json({ 
          message: 'Premium subscription required',
          requiresSubscription: true
        });
      }
    }

    // Increment view count
    await movie.incrementViews();

    // Add to user's watch history if authenticated
    if (req.user) {
      await req.user.addToWatchHistory(movie._id);
    }

    // Return streaming URLs
    const streamingData = {
      videoUrl: movie.videoUrl,
      hlsUrl: movie.hlsUrl,
      dashUrl: movie.dashUrl,
      subtitles: movie.subtitles,
      title: movie.title,
      runtime: movie.runtime
    };

    res.json({ 
      streaming: streamingData,
      message: 'Streaming access granted'
    });

  } catch (error) {
    console.error('Get movie stream error:', error);
    res.status(500).json({ 
      message: 'Error accessing movie stream' 
    });
  }
});

// @route   POST /api/movies/:id/like
// @desc    Toggle like for a movie
// @access  Private
router.post('/:id/like', validateMovieId, authenticateToken, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    
    if (!movie) {
      return res.status(404).json({ 
        message: 'Movie not found' 
      });
    }

    await movie.toggleLike(req.user._id);
    
    res.json({ 
      message: 'Like status updated',
      likes: movie.likes,
      isLiked: movie.likedBy.includes(req.user._id)
    });

  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({ 
      message: 'Error updating like status' 
    });
  }
});

// @route   POST /api/movies/:id/watchlist
// @desc    Toggle movie in watchlist
// @access  Private
router.post('/:id/watchlist', validateMovieId, authenticateToken, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    
    if (!movie) {
      return res.status(404).json({ 
        message: 'Movie not found' 
      });
    }

    const isInWatchlist = req.user.watchlist.includes(movie._id);
    
    if (isInWatchlist) {
      req.user.watchlist = req.user.watchlist.filter(
        id => id.toString() !== movie._id.toString()
      );
    } else {
      req.user.watchlist.push(movie._id);
    }

    await req.user.save();
    
    res.json({ 
      message: isInWatchlist ? 'Removed from watchlist' : 'Added to watchlist',
      isInWatchlist: !isInWatchlist
    });

  } catch (error) {
    console.error('Toggle watchlist error:', error);
    res.status(500).json({ 
      message: 'Error updating watchlist' 
    });
  }
});

// @route   POST /api/movies/:id/rate
// @desc    Rate a movie
// @access  Private
router.post('/:id/rate', validateMovieId, validateRating, authenticateToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const movie = await Movie.findById(req.params.id);
    
    if (!movie) {
      return res.status(404).json({ 
        message: 'Movie not found' 
      });
    }

    await movie.addRating(req.user._id, rating, comment);
    
    res.json({ 
      message: 'Rating added successfully',
      averageRating: movie.averageRating
    });

  } catch (error) {
    console.error('Rate movie error:', error);
    res.status(500).json({ 
      message: 'Error rating movie' 
    });
  }
});

// @route   POST /api/movies/:id/progress
// @desc    Update watch progress
// @access  Private
router.post('/:id/progress', validateMovieId, authenticateToken, async (req, res) => {
  try {
    const { watchTime, completed } = req.body;
    const movie = await Movie.findById(req.params.id);
    
    if (!movie) {
      return res.status(404).json({ 
        message: 'Movie not found' 
      });
    }

    await req.user.addToWatchHistory(
      movie._id, 
      watchTime || 0, 
      completed || false
    );
    
    res.json({ 
      message: 'Watch progress updated'
    });

  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ 
      message: 'Error updating watch progress' 
    });
  }
});

// @route   GET /api/movies/:id/recommendations
// @desc    Get movie recommendations based on current movie
// @access  Public
router.get('/:id/recommendations', validateMovieId, optionalAuth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    
    if (!movie) {
      return res.status(404).json({ 
        message: 'Movie not found' 
      });
    }

    // Find similar movies based on genres
    const recommendations = await Movie.find({
      _id: { $ne: movie._id },
      genres: { $in: movie.genres },
      status: 'published',
      isActive: true
    })
    .select('-reviews -analytics -likedBy')
    .sort({ views: -1, imdbRating: -1 })
    .limit(10)
    .lean();

    // Add user-specific data if authenticated
    if (req.user) {
      for (let recMovie of recommendations) {
        recMovie.isLiked = req.user.watchlist.includes(recMovie._id);
        recMovie.isInWatchlist = req.user.watchlist.includes(recMovie._id);
      }
    }

    res.json({ 
      recommendations,
      basedOn: movie.title
    });

  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ 
      message: 'Error fetching recommendations' 
    });
  }
});

export default router;