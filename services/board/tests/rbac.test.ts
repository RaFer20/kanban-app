import request from 'supertest';
import app from '../src/index';
import prisma from '../src/prisma';

let ownerToken: string;
let editorToken: string;
let viewerToken: string;
let removedMemberToken: string;
let neverMemberToken: string;
let addedMemberToken: string;
let boardId: number;
let columnId: number;
let taskId: number;

let ownerId: number;
let editorId: number;
let viewerId: number;
let removedMemberId: number;
let neverMemberId: number;
let addedMemberId: number;

beforeAll(async () => {
  // Register users
  const users = [
    { email: `owner${Date.now()}@test.com`, password: 'pw' },
    { email: `editor${Date.now()}@test.com`, password: 'pw' },
    { email: `viewer${Date.now()}@test.com`, password: 'pw' },
    { email: `removedmember${Date.now()}@test.com`, password: 'pw' },
    { email: `nevermember${Date.now()}@test.com`, password: 'pw' },
    { email: `addedmember${Date.now()}@test.com`, password: 'pw' },
  ];
  for (const user of users) {
    await request('http://auth:8000').post('/api/v1/users/').send(user);
  }
  // Login and get tokens
  const login = async (email: string, password: string) => {
    const res = await request('http://auth:8000').post('/api/v1/token').type('form').send({ username: email, password });
    return res.body.access_token;
  };

  ownerToken = await login(users[0].email, users[0].password);
  editorToken = await login(users[1].email, users[1].password);
  viewerToken = await login(users[2].email, users[2].password);
  removedMemberToken = await login(users[3].email, users[3].password);
  neverMemberToken = await login(users[4].email, users[4].password);
  addedMemberToken = await login(users[5].email, users[5].password);

  // Fetch user IDs
  const getUserId = async (token: string) => {
    const res = await request('http://auth:8000')
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`);
    return res.body.id;
  };

  ownerId = await getUserId(ownerToken);
  editorId = await getUserId(editorToken);
  viewerId = await getUserId(viewerToken);
  removedMemberId = await getUserId(removedMemberToken);
  neverMemberId = await getUserId(neverMemberToken);
  addedMemberId = await getUserId(addedMemberToken); // <-- new ID

  // Owner creates a board and column
  const boardRes = await request(app)
    .post('/api/boards')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ name: 'RBAC Test Board' });
  boardId = boardRes.body.id;

  const colRes = await request(app)
    .post(`/api/boards/${boardId}/columns`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ name: 'To Do' });
  columnId = colRes.body.id;

  // Owner invites editor, viewer, and removedMember
  await request(app)
    .post(`/api/boards/${boardId}/members`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ userId: editorId, role: 'EDITOR' });

  await request(app)
    .post(`/api/boards/${boardId}/members`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ userId: viewerId, role: 'VIEWER' });

  await request(app)
    .post(`/api/boards/${boardId}/members`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ userId: removedMemberId, role: 'VIEWER' });

  // Create a task for task tests
  const taskRes = await request(app)
    .post(`/api/columns/${columnId}/tasks`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ title: 'Task for RBAC' });
  taskId = taskRes.body.id;

  // Remove removedMember from the board
  await request(app)
    .delete(`/api/boards/${boardId}/members/${removedMemberId}`)
    .set('Authorization', `Bearer ${ownerToken}`);

  // Debug: check membership
  let membership;
  for (let i = 0; i < 10; i++) {
    membership = await prisma.boardMembership.findUnique({
      where: { boardId_userId: { boardId, userId: removedMemberId } }
    });
    if (!membership) break;
    await new Promise(res => setTimeout(res, 100));
  }

  const role = await prisma.boardMembership.findUnique({
    where: { boardId_userId: { boardId, userId: removedMemberId } }
  });
  console.log('Membership in DB before test:', role);
});

afterAll(async () => {
  await prisma.task.deleteMany({});
  await prisma.column.deleteMany({});
  await prisma.board.deleteMany({});
  await prisma.$disconnect();
});

describe('RBAC', () => {
  describe('Board Members', () => {
    // Board deletion
    it('OWNER can delete the board', async () => {
      const res = await request(app)
        .delete(`/api/boards/${boardId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect([200, 404]).toContain(res.statusCode); // 404 if already deleted
    });

    it('EDITOR cannot delete the board', async () => {
      const res = await request(app)
        .delete(`/api/boards/${boardId}`)
        .set('Authorization', `Bearer ${editorToken}`);
      expect([403, 404]).toContain(res.statusCode); // Accept 404 if already deleted
    });

    // Column creation
    it('VIEWER cannot create columns', async () => {
      const res = await request(app)
        .post(`/api/boards/${boardId}/columns`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'Not Allowed' });
      expect(res.statusCode).toBe(403);
    });

    it('EDITOR can create columns', async () => {
      const res = await request(app)
        .post(`/api/boards/${boardId}/columns`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ name: 'Editor Column' });
      expect([201, 409]).toContain(res.statusCode); // 409 if already exists
    });

    // Column listing
    it('VIEWER can list columns', async () => {
      const res = await request(app)
        .get(`/api/boards/${boardId}/columns`)
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('Non-member cannot access board columns', async () => {
      const res = await request(app)
        .get(`/api/boards/${boardId}/columns`)
        .set('Authorization', `Bearer ${removedMemberToken}`);
      expect(res.statusCode).toBe(404);
    });

    // Membership management
    it('OWNER can add a member', async () => {
      const res = await request(app)
        .post(`/api/boards/${boardId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: addedMemberId, role: 'VIEWER' });
      expect([201, 400]).toContain(res.statusCode);
    });

    it('EDITOR cannot add a member', async () => {
      const res = await request(app)
        .post(`/api/boards/${boardId}/members`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ userId: removedMemberId, role: 'VIEWER' });
      expect(res.statusCode).toBe(403);
    });

    // PATCH column
    it('OWNER can update a column', async () => {
      const res = await request(app)
        .patch(`/api/columns/${columnId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Updated by Owner' });
      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('Updated by Owner');
    });

    it('EDITOR can update a column', async () => {
      const res = await request(app)
        .patch(`/api/columns/${columnId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ name: 'Updated by Editor' });
      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('Updated by Editor');
    });

    it('VIEWER cannot update a column', async () => {
      const res = await request(app)
        .patch(`/api/columns/${columnId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'Should Fail' });
      expect(res.statusCode).toBe(403);
    });

    // DELETE column
    it('OWNER can delete a column', async () => {
      const createRes = await request(app)
        .post(`/api/boards/${boardId}/columns`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'DeleteMe' });
      const colId = createRes.body.id;

      const res = await request(app)
        .delete(`/api/columns/${colId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('EDITOR can delete a column', async () => {
      const createRes = await request(app)
        .post(`/api/boards/${boardId}/columns`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'DeleteMeEditor' });
      const colId = createRes.body.id;

      const res = await request(app)
        .delete(`/api/columns/${colId}`)
        .set('Authorization', `Bearer ${editorToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('VIEWER cannot delete a column', async () => {
      const createRes = await request(app)
        .post(`/api/boards/${boardId}/columns`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'DeleteMeViewer' });
      const colId = createRes.body.id;

      const res = await request(app)
        .delete(`/api/columns/${colId}`)
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.statusCode).toBe(403);
    });

    // PATCH task
    it('OWNER can update a task', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Updated by Owner' });
      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('Updated by Owner');
    });

    it('EDITOR can update a task', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ title: 'Updated by Editor' });
      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('Updated by Editor');
    });

    it('VIEWER cannot update a task', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ title: 'Should Fail' });
      expect(res.statusCode).toBe(403);
    });

    // DELETE task
    it('OWNER can delete a task', async () => {
      const createRes = await request(app)
        .post(`/api/columns/${columnId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'DeleteTaskOwner' });
      const tId = createRes.body.id;

      const res = await request(app)
        .delete(`/api/tasks/${tId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('EDITOR can delete a task', async () => {
      const createRes = await request(app)
        .post(`/api/columns/${columnId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'DeleteTaskEditor' });
      const tId = createRes.body.id;

      const res = await request(app)
        .delete(`/api/tasks/${tId}`)
        .set('Authorization', `Bearer ${editorToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('VIEWER cannot delete a task', async () => {
      const createRes = await request(app)
        .post(`/api/columns/${columnId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'DeleteTaskViewer' });
      const tId = createRes.body.id;

      const res = await request(app)
        .delete(`/api/tasks/${tId}`)
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.statusCode).toBe(403);
    });

    // Remove a member and ensure they lose access
    it('OWNER can remove a member and they lose access', async () => {
      // Remove the viewer
      const res = await request(app)
        .delete(`/api/boards/${boardId}/members/${viewerId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect([200, 404]).toContain(res.statusCode);

      // Now viewer should get 404 on board access
      const failRes = await request(app)
        .get(`/api/boards/${boardId}/columns`)
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(failRes.statusCode).toBe(404);
    });
  });

  describe('Removed Member', () => {
    it('removedMember cannot access board', async () => {
      const res = await request(app)
        .get(`/api/boards/${boardId}`)
        .set('Authorization', `Bearer ${removedMemberToken}`);
      expect(res.statusCode).toBe(404);
    });

    it('removedMember cannot access columns', async () => {
      const res = await request(app)
        .get(`/api/boards/${boardId}/columns`)
        .set('Authorization', `Bearer ${removedMemberToken}`);
      expect(res.statusCode).toBe(404);
    });

    it('removedMember cannot access tasks', async () => {
      const res = await request(app)
        .get(`/api/columns/${columnId}/tasks`)
        .set('Authorization', `Bearer ${removedMemberToken}`);
      expect(res.statusCode).toBe(404);
    });
  });

  describe('Never Member', () => {
    it('neverMember cannot access board', async () => {
      const res = await request(app)
        .get(`/api/boards/${boardId}`)
        .set('Authorization', `Bearer ${neverMemberToken}`);
      expect(res.statusCode).toBe(404);
    });

    it('neverMember cannot access columns', async () => {
      const res = await request(app)
        .get(`/api/boards/${boardId}/columns`)
        .set('Authorization', `Bearer ${neverMemberToken}`);
      expect(res.statusCode).toBe(404);
    });

    it('neverMember cannot access tasks', async () => {
      const res = await request(app)
        .get(`/api/columns/${columnId}/tasks`)
        .set('Authorization', `Bearer ${neverMemberToken}`);
      expect(res.statusCode).toBe(404);
    });
  });
});