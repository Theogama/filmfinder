import express from 'express';
import Movie from '../models/Movie.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/movies
// @desc    Get all movies with pagination and filters
// @access  Public
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    genre,
    search,
    sort = 'popularity',
    order = 'desc',
    year,
    rating,
    subscription
  } = req.query;

  const skip = (page - 1) * limit;
  
  // Build filter object
  const filter = {
    isActive: true,
    'streamingContent.isAvailable': true
  };

  // Add genre filter
  if (genre) {
    filter['genres.name'] = { $regex: genre, $options: 'i' };
  }

  // Add search filter
  if (search) {
    filter.$text = { $search: search };
  }

  // Add year filter
  if (year) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    filter.releaseDate = { $gte: startDate, $lte: endDate };
  }

  // Add rating filter
  if (rating) {
    filter.voteAverage = { $gte: parseFloat(rating) };
  }

  // Add subscription filter
  if (subscription === 'free') {
    filter['streamingContent.requiresSubscription'] = false;
  } else if (subscription === 'premium') {
    filter['streamingContent.requiresSubscription'] = true;
  }

  // Build sort object
  const sortObj = {};
  sortObj[sort] = order === 'desc' ? -1 : 1;

  const movies = await Movie.find(filter)
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit))
    .select('-streamingContent.fullMovieUrl -streamingContent.hlsUrl -streamingContent.dashUrl');

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

// @route   GET /api/movies/featured
// @desc    Get featured movies
// @access  Public
router.get('/featured', optionalAuth, asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const movies = await Movie.getFeatured(parseInt(limit));

  res.json({
    success: true,
    data: { movies }
  });
}));

// @route   GET /api/movies/trending
// @desc    Get trending movies
// @access  Public
router.get('/trending', optionalAuth, asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const movies = await Movie.getTrending(parseInt(limit));

  res.json({
    success: true,
    data: { movies }
  });
}));

// @route   GET /api/movies/new-releases
// @desc    Get new releases
// @access  Public
router.get('/new-releases', optionalAuth, asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const movies = await Movie.getNewReleases(parseInt(limit));

  res.json({
    success: true,
    data: { movies }
  });
}));

// @route   GET /api/movies/genre/:genreName
// @desc    Get movies by genre
// @access  Public
router.get('/genre/:genreName', optionalAuth, asyncHandler(async (req, res) => {
  const { genreName } = req.params;
  const { limit = 20 } = req.query;

  const movies = await Movie.getByGenre(genreName, parseInt(limit));

  res.json({
    success: true,
    data: { movies }
  });
}));

// @route   GET /api/movies/search
// @desc    Search movies
// @access  Public
router.get('/search', optionalAuth, asyncHandler(async (req, res) => {
  const { q, limit = 20 } = req.query;

  if (!q) {
    return res.status(400).json({
      success: false,
      message: 'Search query is required'
    });
  }

  const movies = await Movie.search(q, parseInt(limit));

  res.json({
    success: true,
    data: { movies }
  });
}));

// @route   GET /api/movies/:id
// @desc    Get movie by ID
// @access  Public
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const movie = await Movie.findOne({
    $or: [
      { _id: id },
      { tmdbId: id }
    ],
    isActive: true
  });

  if (!movie) {
    return res.status(404).json({
      success: false,
      message: 'Movie not found'
    });
  }

  // Increment views
  await movie.incrementViews();

  // Check if user is authenticated and has subscription for full movie access
  let canWatchFullMovie = false;
  let canWatchTrailer = true;

  if (req.user) {
    canWatchFullMovie = req.user.hasActiveSubscription || !movie.streamingContent.requiresSubscription;
  } else {
    canWatchFullMovie = !movie.streamingContent.requiresSubscription;
  }

  // Remove sensitive streaming URLs if user can't access them
  const movieData = movie.toObject();
  if (!canWatchFullMovie) {
    delete movieData.streamingContent.fullMovieUrl;
    delete movieData.streamingContent.hlsUrl;
    delete movieData.streamingContent.dashUrl;
  }

  res.json({
    success: true,
    data: {
      movie: movieData,
      access: {
        canWatchFullMovie,
        canWatchTrailer,
        requiresSubscription: movie.streamingContent.requiresSubscription
      }
    }
  });
}));

// @route   GET /api/movies/:id/stream
// @desc    Get movie streaming URL (requires authentication and subscription)
// @access  Private
router.get('/:id/stream', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { quality = '1080p' } = req.query;

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const movie = await Movie.findOne({
    $or: [
      { _id: id },
      { tmdbId: id }
    ],
    isActive: true,
    'streamingContent.isAvailable': true
  });

  if (!movie) {
    return res.status(404).json({
      success: false,
      message: 'Movie not found or not available for streaming'
    });
  }

  // Check subscription requirement
  if (movie.streamingContent.requiresSubscription && !req.user.hasActiveSubscription) {
    return res.status(403).json({
      success: false,
      message: 'Subscription required to watch this movie',
      subscriptionRequired: true
    });
  }

  // Update user's watch history
  await req.user.updateWatchHistory(movie._id.toString());

  // Return streaming URLs based on quality preference
  const streamingUrls = {
    hls: movie.streamingContent.hlsUrl,
    dash: movie.streamingContent.dashUrl,
    direct: movie.streamingContent.fullMovieUrl,
    quality: movie.streamingContent.quality,
    duration: movie.streamingContent.duration
  };

  res.json({
    success: true,
    data: {
      streamingUrls,
      movie: {
        id: movie._id,
        title: movie.title,
        duration: movie.streamingContent.duration
      }
    }
  });
}));

// @route   GET /api/movies/:id/trailer
// @desc    Get movie trailer URL
// @access  Public
router.get('/:id/trailer', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const movie = await Movie.findOne({
    $or: [
      { _id: id },
      { tmdbId: id }
    ],
    isActive: true
  });

  if (!movie) {
    return res.status(404).json({
      success: false,
      message: 'Movie not found'
    });
  }

  if (!movie.streamingContent.trailerUrl) {
    return res.status(404).json({
      success: false,
      message: 'Trailer not available'
    });
  }

  res.json({
    success: true,
    data: {
      trailerUrl: movie.streamingContent.trailerUrl,
      movie: {
        id: movie._id,
        title: movie.title
      }
    }
  });
}));

// @route   GET /api/movies/genres
// @desc    Get all available genres
// @access  Public
router.get('/genres', asyncHandler(async (req, res) => {
  const genres = await Movie.aggregate([
    { $unwind: '$genres' },
    {
      $group: {
        _id: '$genres.id',
        name: { $first: '$genres.name' },
        count: { $sum: 1 }
      }
    },
    { $sort: { name: 1 } }
  ]);

  res.json({
    success: true,
    data: { genres }
  });
}));

// @route   POST /api/movies/:id/rate
// @desc    Rate a movie
// @access  Private
router.post('/:id/rate', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      message: 'Rating must be between 1 and 5'
    });
  }

  const movie = await Movie.findOne({
    $or: [
      { _id: id },
      { tmdbId: id }
    ],
    isActive: true
  });

  if (!movie) {
    return res.status(404).json({
      success: false,
      message: 'Movie not found'
    });
  }

  // Update movie rating
  await movie.updateRating(rating);

  res.json({
    success: true,
    message: 'Rating submitted successfully',
    data: {
      averageRating: movie.averageRating,
      ratingCount: movie.ratingCount
    }
  });
}));

export default router;