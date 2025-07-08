import express from 'express';
import crypto from 'crypto';
import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import { 
  generateToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  authenticateToken 
} from '../middleware/auth.js';
import { 
  validateUserRegistration, 
  validateUserLogin,
  validatePasswordChange 
} from '../middleware/validation.js';

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', validateUserRegistration, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User already exists with this email' 
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      emailVerificationToken: crypto.randomBytes(32).toString('hex')
    });

    await user.save();

    // Create default subscription
    const subscription = new Subscription({
      user: user._id,
      plan: 'free',
      status: 'inactive',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      stripeCustomerId: `temp_${user._id}` // Will be updated when Stripe customer is created
    });

    await subscription.save();

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Return user data without password
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        trialUsed: subscription.trialUsed
      },
      isEmailVerified: user.isEmailVerified
    };

    res.status(201).json({
      message: 'User registered successfully',
      user: userResponse,
      token,
      refreshToken
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Error creating user account' 
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validateUserLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({ 
        message: 'Account temporarily locked due to too many failed login attempts. Please try again later.' 
      });
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      // Increment login attempts
      user.loginAttempts += 1;
      
      // Lock account after 5 failed attempts
      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 2 * 60 * 60 * 1000; // Lock for 2 hours
      }
      
      await user.save();
      
      return res.status(401).json({ 
        message: 'Invalid email or password',
        attemptsRemaining: Math.max(0, 5 - user.loginAttempts)
      });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();
    }

    // Get user subscription
    const subscription = await Subscription.findOne({ user: user._id });

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Return user data without password
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      subscription: subscription ? {
        plan: subscription.plan,
        status: subscription.status,
        endDate: subscription.endDate,
        trialUsed: subscription.trialUsed,
        daysRemaining: subscription.daysRemaining
      } : null,
      isEmailVerified: user.isEmailVerified,
      preferences: user.preferences
    };

    res.json({
      message: 'Login successful',
      user: userResponse,
      token,
      refreshToken
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Error during login' 
    });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ 
        message: 'Refresh token required' 
      });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid refresh token' 
      });
    }

    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    res.json({
      token: newToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    res.status(401).json({ 
      message: 'Invalid refresh token' 
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not
      return res.json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour

    await user.save();

    // TODO: Send email with reset link
    // For now, we'll just return the token (in production, this should be sent via email)
    
    res.json({ 
      message: 'Password reset link sent to your email',
      resetToken // Remove this in production
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      message: 'Error processing password reset request' 
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ 
        message: 'Token and new password are required' 
      });
    }

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired reset token' 
      });
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    await user.save();

    res.json({ 
      message: 'Password reset successful' 
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      message: 'Error resetting password' 
    });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change password for authenticated user
// @access  Private
router.post('/change-password', authenticateToken, validatePasswordChange, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const isValidPassword = await req.user.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({ 
        message: 'Current password is incorrect' 
      });
    }

    // Update password
    req.user.password = newPassword;
    await req.user.save();

    res.json({ 
      message: 'Password changed successfully' 
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      message: 'Error changing password' 
    });
  }
});

// @route   POST /api/auth/verify-email
// @desc    Verify email address
// @access  Public
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    const user = await User.findOne({ emailVerificationToken: token });
    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid verification token' 
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.json({ 
      message: 'Email verified successfully' 
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ 
      message: 'Error verifying email' 
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id });

    const userResponse = {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      avatar: req.user.avatar,
      role: req.user.role,
      subscription: subscription ? {
        plan: subscription.plan,
        status: subscription.status,
        endDate: subscription.endDate,
        trialUsed: subscription.trialUsed,
        daysRemaining: subscription.daysRemaining,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
      } : null,
      isEmailVerified: req.user.isEmailVerified,
      preferences: req.user.preferences,
      watchHistory: req.user.watchHistory.slice(0, 10), // Last 10 items
      watchlist: req.user.watchlist
    };

    res.json({ user: userResponse });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      message: 'Error fetching user profile' 
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authenticateToken, (req, res) => {
  // In a stateless JWT implementation, logout is handled client-side
  // by removing the token from storage
  res.json({ 
    message: 'Logged out successfully' 
  });
});

export default router;