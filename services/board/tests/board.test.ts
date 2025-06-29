import request from 'supertest';
import app from '../src/index';
import prisma from '../src/prisma';

let accessToken: string;

// Suppress console.error during tests
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(async () => {
  (console.error as jest.Mock).mockRestore();
  await prisma.task.deleteMany({});
  await prisma.column.deleteMany({});
  await prisma.board.deleteMany({});
  await prisma.$disconnect();
});

beforeAll(async () => {
  // Register a test user (ignore errors if already exists)
  const email = `testuser${Date.now()}@example.com`;
  const password = 'testpassword';

  await request('http://auth:8000')
    .post('/api/v1/users/')
    .send({ email, password });

  // Login to get JWT
  const loginRes = await request('http://auth:8000')
    .post('/api/v1/token')
    .type('form')
    .send({ username: email, password });

  accessToken = loginRes.body.access_token;
});

beforeEach(async () => {
  await prisma.task.deleteMany({});
  await prisma.column.deleteMany({});
  await prisma.board.deleteMany({});
});

describe('Board API', () => {
  it('should create a new board', async () => {
    const res = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Test Board' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Test Board');
  });

  it('should not create a board with duplicate name', async () => {
    await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Unique Board' });
    const res = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Unique Board' });
    expect(res.statusCode).toBe(409);
  });

  it('should not create a board with missing name', async () => {
    const res = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});
    expect(res.statusCode).toBe(400);
  });

  it('should list all boards', async () => {
    const res = await request(app)
      .get('/api/boards')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should return 404 for a non-existent board', async () => {
    const res = await request(app)
      .get('/api/boards/999999')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.statusCode).toBe(404);
  });

  it('should return 404 when deleting a non-existent board', async () => {
    const res = await request(app)
      .delete('/api/boards/999999')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.statusCode).toBe(404);
  });
});