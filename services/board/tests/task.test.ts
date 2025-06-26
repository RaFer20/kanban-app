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

describe('Task API', () => {
  let boardId: number;
  let columnId: number;
  let unique: string;

  beforeEach(async () => {
    unique = `${Date.now()}-${Math.random()}`;
    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `Board for Tasks ${unique}` });
    boardId = boardRes.body.id;

    const colRes = await request(app)
      .post(`/api/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `To Do ${unique}` });
    columnId = colRes.body.id;
  });

  it('should create a task in a column', async () => {
    const res = await request(app)
      .post(`/api/columns/${columnId}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'First Task', description: 'Test task' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('First Task');
  });

  it('should not create a task with duplicate title in the same column', async () => {
    const firstRes = await request(app)
      .post(`/api/columns/${columnId}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'First Task' });
    expect(firstRes.statusCode).toBe(201);

    const res = await request(app)
      .post(`/api/columns/${columnId}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'First Task' });
    expect(res.statusCode).toBe(409);
  });

  it('should not create a task with missing title', async () => {
    const res = await request(app)
      .post(`/api/columns/${columnId}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 when creating a task with an empty title', async () => {
    const res = await request(app)
      .post(`/api/columns/${columnId}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: '' });
    expect(res.statusCode).toBe(400);
  });

  it('should list tasks for a column', async () => {
    const createRes = await request(app)
      .post(`/api/columns/${columnId}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'First Task' });
    expect(createRes.statusCode).toBe(201);

    const res = await request(app)
      .get(`/api/columns/${columnId}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].title).toBe('First Task');
  });

  it('should return 404 when creating a task in a non-existent column', async () => {
    const res = await request(app)
      .post('/api/columns/999999/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Ghost Task' });
    expect(res.statusCode).toBe(404);
  });

  it('should return 404 when updating a non-existent task', async () => {
    const res = await request(app)
      .patch('/api/tasks/999999')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Updated Task' });
    expect(res.statusCode).toBe(404);
  });

  it('should return 404 when deleting a non-existent task', async () => {
    const res = await request(app)
      .delete('/api/tasks/999999')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.statusCode).toBe(404);
  });
});