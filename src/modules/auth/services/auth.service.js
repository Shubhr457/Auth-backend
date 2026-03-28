const User = require("../../../models/User");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("../../../helpers/email");

/**
 * Register a new user
 */
const registerUser = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("EMAIL_EXISTS");
  }

  const user = await User.create({ name, email, password });
  return user;
};

/**
 * Send verification email to user
 */
const sendVerificationEmailToUser = async (user, token) => {
  try {
    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      token,
    });
  } catch (error) {
    // Don't throw — email failure shouldn't block registration
  }
};

/**
 * Verify user's email
 */
const verifyUserEmail = async (userId) => {
  await User.findByIdAndUpdate(userId, { isEmailVerified: true });
};

/**
 * Authenticate user with email and password
 */
const authenticateUser = async (email, password) => {
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (!user.isEmailVerified) {
    throw new Error("EMAIL_NOT_VERIFIED");
  }

  return user;
};

/**
 * Get user by ID
 */
const getUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }
  return user;
};

/**
 * Update user profile.
 * If the email address is being changed the account is marked as unverified
 * so the new address must be confirmed before the user can log in again.
 * Returns { updated, emailChanged } so callers can trigger re-verification.
 */
const updateUserProfile = async (userId, updates) => {
  const { name, email } = updates;

  const currentUser = await User.findById(userId);

  const emailChanged = Boolean(email && email !== currentUser.email);

  if (emailChanged) {
    const taken = await User.findOne({ email });
    if (taken) {
      throw new Error("EMAIL_IN_USE");
    }
  }

  const updateFields = { name, email };
  if (emailChanged) {
    updateFields.isEmailVerified = false;
  }

  const updated = await User.findByIdAndUpdate(userId, updateFields, {
    new: true,
    runValidators: true,
  });

  return { updated, emailChanged };
};

/**
 * Change user password
 */
const changeUserPassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select("+password");

  if (!(await user.comparePassword(currentPassword))) {
    throw new Error("INCORRECT_PASSWORD");
  }

  user.password = newPassword;
  await user.save();

  return user;
};

/**
 * Reset user password
 */
const resetUserPassword = async (userId, newPassword) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  user.password = newPassword;
  await user.save();

  return user;
};

/**
 * Send password reset email
 */
const sendPasswordResetEmailToUser = async (user, token) => {
  try {
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      token,
    });
  } catch (error) {
    // Don't throw — email failure shouldn't block the flow
  }
};

/**
 * Format user data for API response (never exposes sensitive fields)
 */
const formatUserResponse = (user) => {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
  };
};

module.exports = {
  registerUser,
  sendVerificationEmailToUser,
  verifyUserEmail,
  authenticateUser,
  getUserById,
  updateUserProfile,
  changeUserPassword,
  resetUserPassword,
  sendPasswordResetEmailToUser,
  formatUserResponse,
};
