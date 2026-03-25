const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../src/models/User');
const Token = require('../src/models/Token');
const { hashToken } = require('../src/utils/crypto');

// Mock email sending so tests don't actually send emails
jest.mock('../src/utils/email', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
}));

const { sendVerificationEmail, sendPasswordResetEmail } = require('../src/utils/email');

// ─── Lifecycle ────────────────────────────────────────────────────────────────

beforeAll(async () => {
  // MONGO_URI is set to in-memory server URI by globalSetup.js
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  await mongoose.disconnect();
});

afterEach(async () => {
  // Clean all collections between tests
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  jest.clearAllMocks();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Create a verified user and return the user object */
const createVerifiedUser = async ({
  name = 'Test User',
  email = 'test@example.com',
  password = 'Password1',
} = {}) => {
  const user = await User.create({ name, email, password, isEmailVerified: true });
  return user;
};

/** Register + login, return { accessToken, refreshToken } */
const loginUser = async (email = 'test@example.com', password = 'Password1') => {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  return res.body.data;
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/register', () => {
  it('should register a new user and send verification email', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'Password1',
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(sendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'alice@example.com' })
    );
  });

  it('should return 409 for duplicate email', async () => {
    await createVerifiedUser({ email: 'dup@example.com' });
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Dup',
      email: 'dup@example.com',
      password: 'Password1',
    });
    expect(res.status).toBe(409);
  });

  it('should return 422 for invalid input', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ name: '', email: 'bad', password: 'short' });
    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
  });
});

describe('POST /api/v1/auth/verify-email', () => {
  it('should verify email with valid token', async () => {
    // Register first (creates unverified user + verification token)
    await request(app).post('/api/v1/auth/register').send({
      name: 'Bob',
      email: 'bob@example.com',
      password: 'Password1',
    });

    // Grab the raw token from the mock call
    const rawToken = sendVerificationEmail.mock.calls.at(-1)[0].token;

    const res = await request(app).post('/api/v1/auth/verify-email').send({ token: rawToken });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });

  it('should return 400 for invalid/expired token', async () => {
    const res = await request(app).post('/api/v1/auth/verify-email').send({ token: 'invalidtoken123' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await createVerifiedUser();
  });

  it('should login with correct credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'test@example.com',
      password: 'Password1',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBe('test@example.com');
  });

  it('should return 401 for wrong password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'test@example.com',
      password: 'WrongPass1',
    });
    expect(res.status).toBe(401);
  });

  it('should return 403 for unverified email', async () => {
    await User.create({ name: 'Unverified', email: 'unverified@example.com', password: 'Password1' });
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'unverified@example.com',
      password: 'Password1',
    });
    expect(res.status).toBe(403);
  });

  it('should return 422 for missing fields', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'test@example.com' });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/v1/auth/refresh-token', () => {
  it('should issue new tokens with valid refresh token', async () => {
    await createVerifiedUser();
    const { refreshToken } = await loginUser();

    const res = await request(app).post('/api/v1/auth/refresh-token').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    // New refresh token should be different (rotation)
    expect(res.body.data.refreshToken).not.toBe(refreshToken);
  });

  it('should return 401 for invalid refresh token', async () => {
    const res = await request(app).post('/api/v1/auth/refresh-token').send({ refreshToken: 'badtoken' });
    expect(res.status).toBe(401);
  });

  it('should return 401 on refresh token reuse (rotation)', async () => {
    await createVerifiedUser();
    const { refreshToken } = await loginUser();

    // First use: OK
    await request(app).post('/api/v1/auth/refresh-token').send({ refreshToken });

    // Second use of same token: should fail
    const res = await request(app).post('/api/v1/auth/refresh-token').send({ refreshToken });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('should logout and invalidate refresh token', async () => {
    await createVerifiedUser();
    const { accessToken, refreshToken } = await loginUser();

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken });
    expect(res.status).toBe(200);

    // Verify token is gone from DB
    const hashed = hashToken(refreshToken);
    const tokenDoc = await Token.findOne({ token: hashed });
    expect(tokenDoc).toBeNull();
  });
});

describe('POST /api/v1/auth/forgot-password', () => {
  it('should send reset email for existing user', async () => {
    await createVerifiedUser();
    const res = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'test@example.com' });
    expect(res.status).toBe(200);
    expect(sendPasswordResetEmail).toHaveBeenCalled();
  });

  it('should return 200 even for non-existent email (prevent enumeration)', async () => {
    const res = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'nobody@example.com' });
    expect(res.status).toBe(200);
  });
});

describe('POST /api/v1/auth/reset-password', () => {
  it('should reset password with valid token', async () => {
    await createVerifiedUser();
    await request(app).post('/api/v1/auth/forgot-password').send({ email: 'test@example.com' });
    const rawToken = sendPasswordResetEmail.mock.calls.at(-1)[0].token;

    const res = await request(app).post('/api/v1/auth/reset-password').send({
      token: rawToken,
      newPassword: 'NewPassword2',
    });
    expect(res.status).toBe(200);

    // Should be able to log in with new password
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'NewPassword2' });
    expect(loginRes.status).toBe(200);
  });

  it('should return 400 for invalid/used token', async () => {
    const res = await request(app).post('/api/v1/auth/reset-password').send({
      token: 'badtoken',
      newPassword: 'NewPassword2',
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('should return current user profile', async () => {
    await createVerifiedUser();
    const { accessToken } = await loginUser();

    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('test@example.com');
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/v1/auth/me', () => {
  it('should update user name', async () => {
    await createVerifiedUser();
    const { accessToken } = await loginUser();

    const res = await request(app)
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Updated Name');
  });

  it('should return 409 if new email is already taken', async () => {
    await createVerifiedUser({ email: 'other@example.com' });
    await createVerifiedUser({ email: 'main@example.com' });
    const { accessToken } = await loginUser('main@example.com');

    const res = await request(app)
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'other@example.com' });
    expect(res.status).toBe(409);
  });
});

describe('PATCH /api/v1/auth/change-password', () => {
  it('should change password with correct current password', async () => {
    await createVerifiedUser();
    const { accessToken } = await loginUser();

    const res = await request(app)
      .patch('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'Password1', newPassword: 'NewPassword2' });
    expect(res.status).toBe(200);
  });

  it('should return 401 for wrong current password', async () => {
    await createVerifiedUser();
    const { accessToken } = await loginUser();

    const res = await request(app)
      .patch('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'WrongPass1', newPassword: 'NewPassword2' });
    expect(res.status).toBe(401);
  });
});
