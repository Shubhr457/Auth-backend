/**
 * Auth Module Controllers
 * Export all controller functions
 */

module.exports = {
  register: require('./register'),
  verifyEmail: require('./verify-email'),
  login: require('./login'),
  refreshToken: require('./refresh-token'),
  logout: require('./logout'),
  forgotPassword: require('./forgot-password'),
  resetPassword: require('./reset-password'),
  getMe: require('./get-me'),
  updateMe: require('./update-me'),
  changePassword: require('./change-password'),
};
