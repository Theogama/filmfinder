import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Verify JWT token
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId)
      .select('-password')
      .populate('subscription');
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid token - user not found' 
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({ 
        message: 'Account temporarily locked. Please try again later.' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired' 
      });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      message: 'Authentication error' 
    });
  }
};

// Check if user is admin
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Admin access required' 
    });
  }
  next();
};

// Check if user has active subscription
export const requireSubscription = (req, res, next) => {
  if (!req.user.hasActiveSubscription()) {
    return res.status(403).json({ 
      message: 'Active subscription required to access this content',
      subscriptionRequired: true 
    });
  }
  next();
};

// Check if user can access premium content
export const requirePremium = (req, res, next) => {
  if (!req.user.canAccessPremium()) {
    return res.status(403).json({ 
      message: 'Premium subscription required to access this content',
      upgradeRequired: true 
    });
  }
  next();
};

// Optional authentication (for routes that work with or without auth)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId)
        .select('-password')
        .populate('subscription');
      
      if (user && !user.isLocked) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

// Generate JWT token
export const generateToken = (userId) => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET, 
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Generate refresh token
export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' }, 
    process.env.JWT_REFRESH_SECRET, 
    { expiresIn: '30d' }
  );
};

// Verify refresh token
export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};