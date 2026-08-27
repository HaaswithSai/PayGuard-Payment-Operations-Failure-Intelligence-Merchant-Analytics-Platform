const { User, Merchant } = require('../models');
const { hashPassword, comparePassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');
const { USER_STATUS, USER_ROLES } = require('../constants/enums');

/**
 * Service: Authenticate user login
 */
const loginUser = async ({ email, password }) => {
  // 1. Fetch user including hidden passwordHash
  const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false }).select('+passwordHash');

  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // 2. Check if account is active
  if (user.status === USER_STATUS.INACTIVE) {
    throw new AppError('Your account is currently inactive. Please contact support.', 403, 'ACCOUNT_INACTIVE');
  }

  if (user.status === USER_STATUS.SUSPENDED) {
    throw new AppError('Your account has been suspended. Please contact your administrator.', 403, 'ACCOUNT_SUSPENDED');
  }

  // 3. Verify password
  const isPasswordValid = await comparePassword(password, user.passwordHash);

  if (!isPasswordValid) {
    // Increment failed login count for security tracking
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    await user.save({ validateBeforeSave: false });

    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // 4. Reset failed attempts & record login timestamp
  user.failedLoginAttempts = 0;
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  // 5. Generate signed JWT token
  const token = signToken({
    id: user._id,
    role: user.role,
    email: user.email,
    merchant: user.merchant,
  });

  // Convert to clean JSON object without passwordHash
  const userJson = user.toJSON();

  return {
    user: userJson,
    token,
  };
};

/**
 * Service: Register / Create new user (Admin / Initial Setup)
 */
const createUser = async ({ name, email, password, role, merchant, status }) => {
  // 1. Check existing email
  const existingUser = await User.findOne({ email: email.toLowerCase(), isDeleted: false });
  if (existingUser) {
    throw new AppError(`User with email '${email}' already exists`, 409, 'DUPLICATE_EMAIL');
  }

  // 2. If role is MERCHANT, verify merchant existence
  const userRole = role || USER_ROLES.MERCHANT;
  if (userRole === USER_ROLES.MERCHANT && merchant) {
    const merchantExists = await Merchant.findOne({ _id: merchant, isDeleted: false });
    if (!merchantExists) {
      throw new AppError(`Merchant with ID '${merchant}' was not found`, 404, 'MERCHANT_NOT_FOUND');
    }
  }

  // 3. Hash password
  const passwordHash = await hashPassword(password);

  // 4. Create User document
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: userRole,
    status: status || USER_STATUS.ACTIVE,
    merchant: userRole === USER_ROLES.MERCHANT ? merchant : null,
    lastPasswordChange: new Date(),
  });

  // 5. Generate JWT token
  const token = signToken({
    id: user._id,
    role: user.role,
    email: user.email,
    merchant: user.merchant,
  });

  return {
    user: user.toJSON(),
    token,
  };
};

/**
 * Service: Retrieve user profile by ID
 */
const getUserProfile = async (userId) => {
  const user = await User.findOne({ _id: userId, isDeleted: false }).populate('merchant', 'name merchantCode status');

  if (!user) {
    throw new AppError('User profile not found', 404, 'USER_NOT_FOUND');
  }

  if (user.status !== USER_STATUS.ACTIVE) {
    throw new AppError('Account is inactive or suspended', 403, 'ACCOUNT_DISABLED');
  }

  return user.toJSON();
};

/**
 * Service: Change user password
 */
const changePassword = async ({ userId, currentPassword, newPassword }) => {
  // 1. Fetch user with passwordHash
  const user = await User.findOne({ _id: userId, isDeleted: false }).select('+passwordHash');

  if (!user) {
    throw new AppError('User found', 404, 'USER_NOT_FOUND');
  }

  // 2. Verify current password
  const isMatch = await comparePassword(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
  }

  // 3. Hash and store new password
  user.passwordHash = await hashPassword(newPassword);
  user.lastPasswordChange = new Date();
  user.failedLoginAttempts = 0;
  await user.save();

  // 4. Issue fresh token
  const token = signToken({
    id: user._id,
    role: user.role,
    email: user.email,
    merchant: user.merchant,
  });

  return {
    user: user.toJSON(),
    token,
  };
};

/**
 * Service: Public Self-Service Merchant Registration
 */
const registerMerchantAccount = async ({
  name,
  email,
  password,
  merchantName,
  merchantCode,
  supportedGateways,
  defaultCurrency,
}) => {
  // 1. Check if email already exists
  const existingUser = await User.findOne({ email: email.toLowerCase(), isDeleted: false });
  if (existingUser) {
    throw new AppError(`User with email '${email}' already exists`, 409, 'DUPLICATE_EMAIL');
  }

  // 2. Format / validate merchantCode
  const safeName = (merchantName || name || 'MCH').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
  let code = (merchantCode ? merchantCode.trim().toUpperCase() : `MCH_${safeName}_${Math.floor(100 + Math.random() * 900)}`);
  
  const existingMerchant = await Merchant.findOne({ merchantCode: code, isDeleted: false });
  if (existingMerchant) {
    code = `${code}_${Math.floor(100 + Math.random() * 900)}`;
  }

  // 3. Create Merchant Tenant Record
  const newMerchant = await Merchant.create({
    merchantCode: code,
    name: merchantName || name,
    contactEmail: email.toLowerCase(),
    status: 'ACTIVE',
    configuration: {
      supportedGateways: (supportedGateways && supportedGateways.length > 0)
        ? supportedGateways
        : ['STRIPE', 'RAZORPAY', 'ADYEN', 'PAYPAL'],
      defaultCurrency: (defaultCurrency || 'USD').toUpperCase(),
      webhookSecret: `whsec_simulated_test_secret_123`,
      retryPolicy: {
        maxRetries: 3,
        backoffFactorMs: 1000,
        timeoutMs: 5000,
      },
    },
  });

  // 4. Hash password & create user
  const passwordHash = await hashPassword(password);
  const user = await User.create({
    name: name || merchantName,
    email: email.toLowerCase(),
    passwordHash,
    role: USER_ROLES.MERCHANT,
    status: USER_STATUS.ACTIVE,
    merchant: newMerchant._id,
    lastPasswordChange: new Date(),
  });

  // 5. Generate JWT token
  const token = signToken({
    id: user._id,
    role: user.role,
    email: user.email,
    merchant: user.merchant,
  });

  return {
    user: user.toJSON(),
    merchant: newMerchant.toJSON(),
    token,
  };
};

module.exports = {
  loginUser,
  createUser,
  registerMerchantAccount,
  getUserProfile,
  changePassword,
};
