const authService = require('../services/auth.service');

/**
 * GET /api/v1/auth/me
 * Get authenticated user's profile
 */
const getMe = async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: authService.formatUserResponse(req.user),
    },
  });
};

module.exports = getMe;
