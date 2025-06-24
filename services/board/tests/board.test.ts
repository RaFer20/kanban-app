import request from 'supertest';
import app from '../src/index';
import prisma from '../src/prisma';

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

describe('Board API', () => {
  it('should create a new board', async () => {
    const res = await request(app)
      .post('/api/boards')
      .send({ name: 'Test Board' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Test Board');
  });

  it('should not create a board with duplicate name', async () => {
    await request(app).post('/api/boards').send({ name: 'Unique Board' });
    const res = await request(app).post('/api/boards').send({ name: 'Unique Board' });
    expect(res.statusCode).toBe(409);
  });

  it('should not create a board with missing name', async () => {
    const res = await request(app).post('/api/boards').send({});
    expect(res.statusCode).toBe(400);
  });

  it('should list all boards', async () => {
    const res = await request(app).get('/api/boards');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should return 404 for a non-existent board', async () => {
    const res = await request(app).get('/api/boards/999999');
    expect(res.statusCode).toBe(404);
  });

  it('should return 404 when deleting a non-existent board', async () => {
    const res = await request(app).delete('/api/boards/999999');
    expect(res.statusCode).toBe(404);
  });
});