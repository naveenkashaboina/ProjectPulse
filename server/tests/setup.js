const mongoose = require('mongoose');
const config = require('../src/config/env');
const { User, Organization, OrgMembership } = require('../src/models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.setTimeout(30000);
 
beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(config.MONGODB_URI);
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
});

const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

const createTestUser = async ({
  name = 'Test User',
  email = 'test@example.com',
  password = 'Password123!',
} = {}) => {
  const passwordHash = await bcrypt.hash(password, 6);
  const user = await User.create({ name, email, passwordHash });
  const token = jwt.sign({ id: user._id, email: user.email }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
  return { user, token, password };
};

const createTestOrg = async (user, name = 'Test Org') => {
  const org = await Organization.create({ name, owner: user._id });
  const membership = await OrgMembership.create({
    user: user._id,
    organization: org._id,
    role: 'OrgAdmin',
    status: 'active',
  });
  return { org, membership };
};

module.exports = {
  clearDatabase,
  createTestUser,
  createTestOrg,
};
