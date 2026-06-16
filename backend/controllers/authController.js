const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const {
  generateAccessToken,
  generateRefreshToken
} = require('../middleware/auth');
const jwt = require('jsonwebtoken');

/**
 * Seed the default admin user if it doesn't exist
 */
const seedDefaultAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@srishtis.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'srishti@2026';
    const adminExists = await User.findOne({ email: adminEmail });

    if (!adminExists) {
      await User.create({
        email: adminEmail,
        password: adminPassword, // Will be hashed by pre-save hook
        role: 'super_admin'
      });
      console.log(`[Database Seed] Default admin account created: ${adminEmail}`);
    } else {
      console.log(`[Database Seed] Default admin account already exists.`);
    }
  } catch (error) {
    console.error(`[Database Seed] Error seeding default admin: ${error.message}`);
  }
};

/**
 * @desc    Admin login
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }

  try {
    // Check for user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token to user
    user.refreshToken = refreshToken;
    await user.save();

    // Log to Audit Log
    await AuditLog.create({
      userEmail: user.email,
      action: 'admin_login',
      details: { role: user.role },
      ipAddress: req.ip || req.connection.remoteAddress
    });

    res.status(200).json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh
 * @access  Public
 */
const refreshToken = async (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, message: 'Refresh token is required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== token) {
      return res.status(403).json({ success: false, message: 'Invalid refresh token' });
    }

    // Generate new access token
    const accessToken = generateAccessToken(user);

    res.status(200).json({
      success: true,
      accessToken
    });
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};

/**
 * @desc    Admin logout
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.refreshToken = null;
      await user.save();

      // Log to Audit Log
      await AuditLog.create({
        userEmail: user.email,
        action: 'admin_logout',
        details: {},
        ipAddress: req.ip || req.connection.remoteAddress
      });
    }

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  refreshToken,
  logout,
  seedDefaultAdmin
};
