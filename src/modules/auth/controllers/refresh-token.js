const authService = require('../services/auth.service');
const tokenService = require('../services/token.service');

/**
 * POST /api/v1/auth/refresh-token
 * Issue new access token using refresh token
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    const userId = await tokenService.refreshAccessToken(refreshToken);
    const user = await authService.getUserById(userId);
    const tokens = await tokenService.generateTokenPair(user._id);

    res.status(200).json({
      status: 'success',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: authService.formatUserResponse(user),
      },
    });
  } catch (err) {
    if (err.message === 'REFRESH_TOKEN_REQUIRED') {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Refresh token is required.' 
      });
    }
    if (err.message === 'INVALID_REFRESH_TOKEN') {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Invalid or expired refresh token.' 
      });
    }
    if (err.message === 'USER_NOT_FOUND') {
      return res.status(401).json({ 
        status: 'error', 
        message: 'User not found.' 
      });
    }
    console.error('Refresh token error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

module.exports = refreshToken;
