const jwt = require('jsonwebtoken');
const config = require('../config/env');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendResponse } = require('../utils/helpers');
const { User, Organization, OrgMembership } = require('../models');

const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, config.JWT_REFRESH_SECRET, { expiresIn: config.JWT_REFRESH_EXPIRES_IN });
};

const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
};

/**
 * POST /api/auth/signup
 */
exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password, organizationName } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('A user with this email already exists', 409, 'DUPLICATE_EMAIL'));
  }

  const user = await User.create({
    name,
    email,
    passwordHash: password,
  });

  // Create default organization
  const orgName = organizationName || `${name}'s Organization`;
  const org = await Organization.create({
    name: orgName,
    owner: user._id,
  });

  // Create OrgMembership as OrgAdmin
  await OrgMembership.create({
    user: user._id,
    organization: org._id,
    role: 'OrgAdmin',
    status: 'active',
  });

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  await User.findByIdAndUpdate(user._id, { refreshToken });

  setRefreshCookie(res, refreshToken);

  sendResponse(res, 201, {
    user: user.toJSON(),
    organization: org,
    accessToken,
  });
});

/**
 * POST /api/auth/login
 */
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  await User.findByIdAndUpdate(user._id, { refreshToken });
  setRefreshCookie(res, refreshToken);

  // Get user's organizations
  const memberships = await OrgMembership.find({ user: user._id, status: 'active' })
    .populate('organization');

  sendResponse(res, 200, {
    user: user.toJSON(),
    organizations: memberships.map((m) => ({
      ...m.organization.toObject(),
      role: m.role,
    })),
    accessToken,
  });
});

/**
 * POST /api/auth/refresh
 */
exports.refreshToken = catchAsync(async (req, res, next) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    return next(new AppError('No refresh token provided', 401, 'NO_REFRESH_TOKEN'));
  }

  const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET);
  const user = await User.findById(decoded.id).select('+refreshToken');

  if (!user || user.refreshToken !== token) {
    return next(new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN'));
  }

  const accessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);

  await User.findByIdAndUpdate(user._id, { refreshToken: newRefreshToken });
  setRefreshCookie(res, newRefreshToken);

  sendResponse(res, 200, { accessToken });
});

/**
 * POST /api/auth/logout
 */
exports.logout = catchAsync(async (req, res, next) => {
  res.clearCookie('refreshToken');

  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  }

  sendResponse(res, 200, { message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 */
exports.getMe = catchAsync(async (req, res, next) => {
  const memberships = await OrgMembership.find({ user: req.user._id, status: 'active' })
    .populate('organization');

  sendResponse(res, 200, {
    user: req.user,
    organizations: memberships.map((m) => ({
      ...m.organization.toObject(),
      role: m.role,
    })),
  });
});
