const authService = require('../services/auth.service');

/**
 * PATCH /api/v1/auth/me
 * Update authenticated user's profile
 */
const updateMe = async (req, res) => {
  try {
    const { name, email } = req.body;

    const updated = await authService.updateUserProfile(req.user._id, { name, email });

    res.status(200).json({
      status: 'success',
      data: {
        user: authService.formatUserResponse(updated),
      },
    });
  } catch (err) {
    if (err.message === 'EMAIL_IN_USE') {
      return res.status(409).json({ 
        status: 'error', 
        message: 'Email already in use.' 
      });
    }
    console.error('UpdateMe error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

module.exports = updateMe;
