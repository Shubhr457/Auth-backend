const tokenService = require('../services/token.service');

/**
 * POST /api/v1/auth/logout
 * Revoke the provided refresh token
 */
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    await tokenService.revokeRefreshToken(refreshToken);

    res.status(200).json({ 
      status: 'success', 
      message: 'Logged out successfully.' 
    });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

module.exports = logout;
