const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user & return JWT token
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, token } = await authService.loginUser({ email, password });

  res.status(200).json({
    success: true,
    message: 'Authentication successful',
    token,
    user,
  });
});

/**
 * @route   POST /api/v1/auth/register-merchant
 * @desc    Public Self-Service Merchant Registration
 * @access  Public
 */
const registerMerchant = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    merchantName,
    merchantCode,
    supportedGateways,
    defaultCurrency,
  } = req.body;

  const { user, merchant, token } = await authService.registerMerchantAccount({
    name,
    email,
    password,
    merchantName,
    merchantCode,
    supportedGateways,
    defaultCurrency,
  });

  res.status(201).json({
    success: true,
    message: 'Merchant registered and authenticated successfully',
    token,
    user,
    merchant,
  });
});

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register / Create new user (Admin / Onboarding)
 * @access  Public (or Protected Admin)
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, merchant, status } = req.body;
  const { user, token } = await authService.createUser({
    name,
    email,
    password,
    role,
    merchant,
    status,
  });

  res.status(201).json({
    success: true,
    message: 'User account created successfully',
    token,
    user,
  });
});

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get currently authenticated user's profile
 * @access  Private (Protected)
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getUserProfile(req.user.id);

  res.status(200).json({
    success: true,
    user,
  });
});

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Client-side session termination confirmation
 * @access  Private (Protected)
 */
const logout = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully. Please clear the authorization token from client storage.',
  });
});

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change authenticated user's password and issue new token
 * @access  Private (Protected)
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const { user, token } = await authService.changePassword({
    userId: req.user.id,
    currentPassword,
    newPassword,
  });

  res.status(200).json({
    success: true,
    message: 'Password updated successfully',
    token,
    user,
  });
});

module.exports = {
  login,
  register,
  registerMerchant,
  getMe,
  logout,
  changePassword,
};
