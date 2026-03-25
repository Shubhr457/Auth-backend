const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');

/**
 * Protect routes — verify Bearer access token
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', message: 'Authentication required. Please log in.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.sub).select('+passwordChangedAt');
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'User no longer exists.' });
    }

    // Check if password was changed after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({ status: 'error', message: 'Password changed recently. Please log in again.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ status: 'error', message: 'Access token expired.' });
    }
    return res.status(401).json({ status: 'error', message: 'Invalid access token.' });
  }
};

/**
 * Restrict to specific roles
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: 'You do not have permission to perform this action.' });
    }
    next();
  };
};

module.exports = { protect, restrictTo };
