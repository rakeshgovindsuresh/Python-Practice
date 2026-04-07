// tests/integration/auth.routes.test.js
const request = require('supertest');
const app = require('../../src/app');

// Mock all external deps for integration tests
jest.mock('../../src/config/database', () => ({
  user: { findUnique: jest.fn(), create: jest.fn() },
  refreshToken: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  $transaction: jest.fn(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
}));

jest.mock('../../src/config/redis', () => ({
  on: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
}));

jest.mock('../../src/queues/transaction.queue', () => ({
  transactionQueue: { add: jest.fn() },
  startWorker: jest.fn(),
  stopWorker: jest.fn(),
}));

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(), http: jest.fn(),
}));

const bcrypt = require('bcryptjs');
const prisma = require('../../src/config/database');

describe('POST /api/v1/auth/register', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 201 with user on valid registration', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'uuid-1', email: 'test@example.com',
      firstName: 'Jane', lastName: 'Doe',
      status: 'ACTIVE', kycStatus: 'UNVERIFIED', createdAt: new Date(),
    });

    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'Jane',
      lastName: 'Doe',
    });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.user.email).toBe('test@example.com');
  });

  it('returns 422 for invalid email', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'not-an-email',
      password: 'Password123!',
      firstName: 'Jane',
      lastName: 'Doe',
    });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 for weak password', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'test@example.com',
      password: 'weak',
      firstName: 'Jane',
      lastName: 'Doe',
    });
    expect(res.status).toBe(422);
  });

  it('returns 409 for duplicate email', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'taken@example.com',
      password: 'Password123!',
      firstName: 'Jane',
      lastName: 'Doe',
    });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_TAKEN');
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with tokens on valid credentials', async () => {
    const hash = await bcrypt.hash('Password123!', 1);
    prisma.user.findUnique.mockResolvedValue({
      id: 'uuid-1', email: 'test@example.com', passwordHash: hash,
      status: 'ACTIVE', firstName: 'Jane', lastName: 'Doe', kycStatus: 'UNVERIFIED',
    });
    prisma.refreshToken.create.mockResolvedValue({});

    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'test@example.com',
      password: 'Password123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
  });

  it('returns 401 for wrong password', async () => {
    const hash = await bcrypt.hash('Password123!', 1);
    prisma.user.findUnique.mockResolvedValue({
      id: 'uuid-1', email: 'test@example.com', passwordHash: hash, status: 'ACTIVE',
    });

    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'test@example.com',
      password: 'WrongPassword1!',
    });
    expect(res.status).toBe(401);
  });

  it('returns 422 for missing fields', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'test@example.com' });
    expect(res.status).toBe(422);
  });
});

describe('GET /health', () => {
  it('returns 200 with uptime info', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('uptime');
  });
});

describe('GET /unknown-route', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
  });
});
