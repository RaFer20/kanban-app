import request from 'supertest';
import app from '../src/index';
import prisma from '../src/prisma';

// Suppress console.error during tests
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  (console.error as jest.Mock).mockRestore();
  prisma.$disconnect();
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
      .send({ name: `Board for Columns ${unique}` });
    boardId = res.body.id;
  });

  it('should create a column for a board', async () => {
    const res = await request(app)
      .post(`/api/boards/${boardId}/columns`)
      .send({ name: `To Do ${unique}` });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe(`To Do ${unique}`);
    columnId = res.body.id;
  });

  it('should not create a column with duplicate name in the same board', async () => {
    await request(app)
      .post(`/api/boards/${boardId}/columns`)
      .send({ name: `To Do ${unique}` });
    const res = await request(app)
      .post(`/api/boards/${boardId}/columns`)
      .send({ name: `To Do ${unique}` });
    expect(res.statusCode).toBe(409);
  });

  it('should not create a column with missing name', async () => {
    const res = await request(app)
      .post(`/api/boards/${boardId}/columns`)
      .send({});
    expect(res.statusCode).toBe(400);
  });

  it('should list columns for a board', async () => {
    const createRes = await request(app)
      .post(`/api/boards/${boardId}/columns`)
      .send({ name: `To Do ${unique}` });
    expect(createRes.statusCode).toBe(201);

    const res = await request(app).get(`/api/boards/${boardId}/columns`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0); // Defensive check
    expect(res.body[0].name).toBe(`To Do ${unique}`);
  });
});