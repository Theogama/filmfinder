import { body, param, query, validationResult } from 'express-validator';

// Handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User registration validation
export const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  handleValidationErrors
];

// User login validation
export const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Movie creation validation
export const validateMovieCreation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title is required and cannot exceed 200 characters'),
  
  body('overview')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Overview must be between 10 and 2000 characters'),
  
  body('genres')
    .isArray({ min: 1 })
    .withMessage('At least one genre is required'),
  
  body('releaseDate')
    .isISO8601()
    .withMessage('Please provide a valid release date'),
  
  body('runtime')
    .isInt({ min: 1 })
    .withMessage('Runtime must be a positive integer'),
  
  body('poster')
    .isURL()
    .withMessage('Poster must be a valid URL'),
  
  body('backdrop')
    .isURL()
    .withMessage('Backdrop must be a valid URL'),
  
  body('trailerUrl')
    .isURL()
    .withMessage('Trailer URL must be a valid URL'),
  
  body('videoUrl')
    .isURL()
    .withMessage('Video URL must be a valid URL'),
  
  body('rating')
    .optional()
    .isIn(['G', 'PG', 'PG-13', 'R', 'NC-17', 'NR'])
    .withMessage('Invalid rating'),
  
  body('imdbRating')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('IMDB rating must be between 0 and 10'),
  
  handleValidationErrors
];

// Movie update validation
export const validateMovieUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  
  body('overview')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Overview must be between 10 and 2000 characters'),
  
  body('genres')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one genre is required'),
  
  body('releaseDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid release date'),
  
  body('runtime')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Runtime must be a positive integer'),
  
  body('poster')
    .optional()
    .isURL()
    .withMessage('Poster must be a valid URL'),
  
  body('backdrop')
    .optional()
    .isURL()
    .withMessage('Backdrop must be a valid URL'),
  
  body('trailerUrl')
    .optional()
    .isURL()
    .withMessage('Trailer URL must be a valid URL'),
  
  body('videoUrl')
    .optional()
    .isURL()
    .withMessage('Video URL must be a valid URL'),
  
  body('rating')
    .optional()
    .isIn(['G', 'PG', 'PG-13', 'R', 'NC-17', 'NR'])
    .withMessage('Invalid rating'),
  
  body('imdbRating')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('IMDB rating must be between 0 and 10'),
  
  handleValidationErrors
];

// Movie ID validation
export const validateMovieId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid movie ID'),
  
  handleValidationErrors
];

// User ID validation
export const validateUserId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID'),
  
  handleValidationErrors
];

// Pagination validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

// Search validation
export const validateSearch = [
  query('q')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  
  query('genre')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Genre cannot be empty'),
  
  query('year')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 5 })
    .withMessage('Invalid year'),
  
  handleValidationErrors
];

// Rating validation
export const validateRating = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Comment cannot exceed 500 characters'),
  
  handleValidationErrors
];

// Profile update validation
export const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL'),
  
  body('preferences.favoriteGenres')
    .optional()
    .isArray()
    .withMessage('Favorite genres must be an array'),
  
  body('preferences.language')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Language code must be between 2 and 5 characters'),
  
  handleValidationErrors
];

// Password change validation
export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  handleValidationErrors
];