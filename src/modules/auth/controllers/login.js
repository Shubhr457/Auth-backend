const authService = require('../services/auth.service');
const tokenService = require('../services/token.service');

/**
 * POST /api/v1/auth/login
 * Authenticate user and return tokens
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await authService.authenticateUser(email, password);
    const { accessToken, refreshToken } = await tokenService.generateTokenPair(user._id);

    res.status(200).json({
      status: 'success',
      data: {
        accessToken,
        refreshToken,
        user: authService.formatUserResponse(user),
      },
    });
  } catch (err) {
    if (err.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Invalid email or password.' 
      });
    }
    if (err.message === 'EMAIL_NOT_VERIFIED') {
      return res.status(403).json({ 
        status: 'error', 
        message: 'Please verify your email before logging in.' 
      });
    }
    console.error('Login error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

module.exports = login;
