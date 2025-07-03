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
  await prisma.$disconnect();
});

beforeAll(async () => {
  // Register a test user (ignore errors if already exists)
  const email = `testuser${Date.now()}@boardtests.com`;
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

describe('Column API', () => {
  let boardId: number;
  let columnId: number;
  let unique: string;

  beforeEach(async () => {
    unique = `${Date.now()}-${Math.random()}`;
    const res = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `Board for Columns ${unique}` });
    boardId = res.body.id;
  });

  it('should create a column for a board', async () => {
    const res = await request(app)
      .post(`/api/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `To Do ${unique}` });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe(`To Do ${unique}`);
  });

  it('should not create a column with duplicate name in the same board', async () => {
    await request(app)
      .post(`/api/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `To Do ${unique}` });
    const res = await request(app)
      .post(`/api/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `To Do ${unique}` });
    expect(res.statusCode).toBe(409);
  });

  it('should not create a column with missing name', async () => {
    const res = await request(app)
      .post(`/api/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});
    expect(res.statusCode).toBe(400);
  });

  it('should list columns for a board', async () => {
    const createRes = await request(app)
      .post(`/api/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `To Do ${unique}` });
    expect(createRes.statusCode).toBe(201);

    const res = await request(app)
      .get(`/api/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0); // Defensive check
    expect(res.body[0].name).toBe(`To Do ${unique}`);
  });

  it('should return 404 when creating a column for a non-existent board', async () => {
    const res = await request(app)
      .post('/api/boards/999999/columns')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Ghost Column' });
    expect(res.statusCode).toBe(404);
  });

  it('should return 404 when updating a non-existent column', async () => {
    const res = await request(app)
      .patch('/api/columns/999999')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Updated Name' });
    expect(res.statusCode).toBe(404);
  });

  it('should return 404 when deleting a non-existent column', async () => {
    const res = await request(app)
      .delete('/api/columns/999999')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.statusCode).toBe(404);
  });

  it('should return 400 for invalid column ID format', async () => {
    const res = await request(app)
      .post('/api/columns/notanumber/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Task' });
    expect(res.statusCode).toBe(400);
  });

  it('should not allow creating a task on a soft-deleted column', async () => {
    // Create board and column
    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Board for Soft Delete Column' });
    const boardId = boardRes.body.id;

    const colRes = await request(app)
      .post(`/api/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Soft Delete Column' });
    const columnId = colRes.body.id;

    // Soft-delete the column
    await request(app)
      .delete(`/api/columns/${columnId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    // Try to create a task
    const res = await request(app)
      .post(`/api/columns/${columnId}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Should Fail' });
    expect(res.statusCode).toBe(404);
  });
});