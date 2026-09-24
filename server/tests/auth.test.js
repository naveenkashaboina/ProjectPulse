const request = require('supertest');
const app = require('../src/app');
const { clearDatabase, createTestUser } = require('./setup');

describe('Auth API Endpoints', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /api/auth/signup', () => {
    it('should register a new user with default organization and OrgAdmin role', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Alice Developer',
          email: 'alice@example.com',
          password: 'Password123!',
          organizationName: 'Alice Enterprises',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('alice@example.com');
      expect(res.body.data.user.name).toBe('Alice Developer');
      expect(res.body.data.organization.name).toBe('Alice Enterprises');
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should reject duplicate email with 409 conflict', async () => {
      await createTestUser({ email: 'duplicate@example.com' });

      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Another User',
          email: 'duplicate@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_EMAIL');
    });

    it('should validate email format and short password', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'A',
          email: 'invalid-email',
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate user with valid credentials', async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Bob Tester',
          email: 'bob@example.com',
          password: 'Password123!',
        });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'bob@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe('bob@example.com');
    });

    it('should reject invalid password with 401', async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Bob Tester',
          email: 'bob@example.com',
          password: 'Password123!',
        });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'bob@example.com',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current authenticated user data', async () => {
      const { token, user } = await createTestUser({ email: 'me@example.com' });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('me@example.com');
    });

    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });
});
