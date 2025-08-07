import request from 'supertest';
import app from '../src/index';
import prisma from '../src/prisma';

const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth:8000';

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
    { email: `owner${Date.now()}@boardtests.com`, password: 'pw' },
    { email: `editor${Date.now()}@boardtests.com`, password: 'pw' },
    { email: `viewer${Date.now()}@boardtests.com`, password: 'pw' },
    { email: `removedmember${Date.now()}@boardtests.com`, password: 'pw' },
    { email: `nevermember${Date.now()}@boardtests.com`, password: 'pw' },
    { email: `addedmember${Date.now()}@boardtests.com`, password: 'pw' },
  ];
  for (const user of users) {
    await request(authServiceUrl).post('/api/v1/users/').send(user);
  }
  // Login and get tokens
  const login = async (email: string, password: string) => {
    const res = await request(authServiceUrl).post('/api/v1/token').type('form').send({ username: email, password });
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
    const res = await request(authServiceUrl)
      .get('/api/v1/me')
      .set('Cookie', [`access_token=${token}`]);
    return res.body.id;
  };

  ownerId = await getUserId(ownerToken);
  editorId = await getUserId(editorToken);
  viewerId = await getUserId(viewerToken);
  removedMemberId = await getUserId(removedMemberToken);
  neverMemberId = await getUserId(neverMemberToken);
  addedMemberId = await getUserId(addedMemberToken);

  // Owner creates a board and column
  const boardRes = await request(app)
    .post('/api/boards')
    .set('Cookie', [`access_token=${ownerToken}`])
    .send({ name: 'RBAC Test Board' });
  boardId = boardRes.body.id;

  const colRes = await request(app)
    .post(`/api/boards/${boardId}/columns`)
    .set('Cookie', [`access_token=${ownerToken}`])
    .send({ name: 'To Do' });
  columnId = colRes.body.id;

  // Owner invites editor, viewer, and removedMember
  await request(app)
    .post(`/api/boards/${boardId}/members`)
    .set('Cookie', [`access_token=${ownerToken}`])
    .send({ userId: editorId, role: 'EDITOR' });

  await request(app)
    .post(`/api/boards/${boardId}/members`)
    .set('Cookie', [`access_token=${ownerToken}`])
    .send({ userId: viewerId, role: 'VIEWER' });

  await request(app)
    .post(`/api/boards/${boardId}/members`)
    .set('Cookie', [`access_token=${ownerToken}`])
    .send({ userId: removedMemberId, role: 'VIEWER' });

  // Create a task for task tests
  const taskRes = await request(app)
    .post(`/api/columns/${columnId}/tasks`)
    .set('Cookie', [`access_token=${ownerToken}`])
    .send({ title: 'Task for RBAC' });
  taskId = taskRes.body.id;

  // Remove removedMember from the board
  await request(app)
    .delete(`/api/boards/${boardId}/members/${removedMemberId}`)
    .set('Cookie', [`access_token=${ownerToken}`]);
});

afterAll(async () => {
  await prisma.task.deleteMany({});
  await prisma.column.deleteMany({});
  await prisma.board.deleteMany({});
  await prisma.$disconnect();
});

describe('RBAC', () => {
  describe('Board Members', () => {
    it('EDITOR cannot delete the board', async () => {
      const res = await request(app)
        .delete(`/api/boards/${boardId}`)
        .set('Cookie', [`access_token=${editorToken}`]);
      expect([403, 404]).toContain(res.statusCode);
    });

    it('VIEWER cannot create columns', async () => {
      const res = await request(app)
        .post(`/api/boards/${boardId}/columns`)
        .set('Cookie', [`access_token=${viewerToken}`])
        .send({ name: 'Not Allowed' });
      expect(res.statusCode).toBe(403);
    });

    it('EDITOR can create columns', async () => {
      const res = await request(app)
        .post(`/api/boards/${boardId}/columns`)
        .set('Cookie', [`access_token=${editorToken}`])
        .send({ name: 'Editor Column' });
      expect([201, 409]).toContain(res.statusCode);
    });

    it('VIEWER can list columns', async () => {
      const res = await request(app)
        .get(`/api/boards/${boardId}/columns`)
        .set('Cookie', [`access_token=${viewerToken}`]);
      expect(res.statusCode).toBe(200);
    });

    it('Non-member cannot access board columns', async () => {
      const res = await request(app)
        .get(`/api/boards/${boardId}/columns`)
        .set('Cookie', [`access_token=${removedMemberToken}`]);
      expect(res.statusCode).toBe(404);
    });

    it('OWNER can add a member', async () => {
      const res = await request(app)
        .post(`/api/boards/${boardId}/members`)
        .set('Cookie', [`access_token=${ownerToken}`])
        .send({ userId: addedMemberId, role: 'VIEWER' });
      expect([201, 400]).toContain(res.statusCode);
    });

    it('EDITOR cannot add a member', async () => {
      const res = await request(app)
        .post(`/api/boards/${boardId}/members`)
        .set('Cookie', [`access_token=${editorToken}`])
        .send({ userId: removedMemberId, role: 'VIEWER' });
      expect(res.statusCode).toBe(403);
    });

    it('OWNER can update a column', async () => {
      const res = await request(app)
        .patch(`/api/columns/${columnId}`)
        .set('Cookie', [`access_token=${ownerToken}`])
        .send({ name: 'Updated by Owner' });
      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('Updated by Owner');
    });

    it('EDITOR can update a column', async () => {
      const res = await request(app)
        .patch(`/api/columns/${columnId}`)
        .set('Cookie', [`access_token=${editorToken}`])
        .send({ name: 'Updated by Editor' });
      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('Updated by Editor');
    });

    it('VIEWER cannot update a column', async () => {
      const res = await request(app)
        .patch(`/api/columns/${columnId}`)
        .set('Cookie', [`access_token=${viewerToken}`])
        .send({ name: 'Should Fail' });
      expect(res.statusCode).toBe(403);
    });

    it('OWNER can delete a column', async () => {
      const createRes = await request(app)
        .post(`/api/boards/${boardId}/columns`)
        .set('Cookie', [`access_token=${ownerToken}`])
        .send({ name: 'DeleteMe' });
      const colId = createRes.body.id;

      const res = await request(app)
        .delete(`/api/columns/${colId}`)
        .set('Cookie', [`access_token=${ownerToken}`]);
      expect(res.statusCode).toBe(200);
    });

    it('EDITOR can delete a column', async () => {
      const createRes = await request(app)
        .post(`/api/boards/${boardId}/columns`)
        .set('Cookie', [`access_token=${ownerToken}`])
        .send({ name: 'DeleteMeEditor' });
      const colId = createRes.body.id;

      const res = await request(app)
        .delete(`/api/columns/${colId}`)
        .set('Cookie', [`access_token=${editorToken}`]);
      expect(res.statusCode).toBe(200);
    });

    it('VIEWER cannot delete a column', async () => {
      const createRes = await request(app)
        .post(`/api/boards/${boardId}/columns`)
        .set('Cookie', [`access_token=${ownerToken}`])
        .send({ name: 'DeleteMeViewer' });
      const colId = createRes.body.id;

      const res = await request(app)
        .delete(`/api/columns/${colId}`)
        .set('Cookie', [`access_token=${viewerToken}`]);
      expect(res.statusCode).toBe(403);
    });

    it('OWNER can update a task', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Cookie', [`access_token=${ownerToken}`])
        .send({ title: 'Updated by Owner' });
      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('Updated by Owner');
    });

    it('EDITOR can update a task', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Cookie', [`access_token=${editorToken}`])
        .send({ title: 'Updated by Editor' });
      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('Updated by Editor');
    });

    it('VIEWER cannot update a task', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Cookie', [`access_token=${viewerToken}`])
        .send({ title: 'Should Fail' });
      expect(res.statusCode).toBe(403);
    });

    it('OWNER can delete a task', async () => {
      const createRes = await request(app)
        .post(`/api/columns/${columnId}/tasks`)
        .set('Cookie', [`access_token=${ownerToken}`])
        .send({ title: 'DeleteTaskOwner' });
      const tId = createRes.body.id;

      const res = await request(app)
        .delete(`/api/tasks/${tId}`)
        .set('Cookie', [`access_token=${ownerToken}`]);
      expect(res.statusCode).toBe(200);
    });

    it('EDITOR can delete a task', async () => {
      const createRes = await request(app)
        .post(`/api/columns/${columnId}/tasks`)
        .set('Cookie', [`access_token=${ownerToken}`])
        .send({ title: 'DeleteTaskEditor' });
      const tId = createRes.body.id;

      const res = await request(app)
        .delete(`/api/tasks/${tId}`)
        .set('Cookie', [`access_token=${editorToken}`]);
      expect(res.statusCode).toBe(200);
    });

    it('VIEWER cannot delete a task', async () => {
      const createRes = await request(app)
        .post(`/api/columns/${columnId}/tasks`)
        .set('Cookie', [`access_token=${ownerToken}`])
        .send({ title: 'DeleteTaskViewer' });
      const tId = createRes.body.id;

      const res = await request(app)
        .delete(`/api/tasks/${tId}`)
        .set('Cookie', [`access_token=${viewerToken}`]);
      expect(res.statusCode).toBe(403);
    });

    it('OWNER can remove a member and they lose access', async () => {
      // Remove the viewer
      const res = await request(app)
        .delete(`/api/boards/${boardId}/members/${viewerId}`)
        .set('Cookie', [`access_token=${ownerToken}`]);
      expect([200, 404]).toContain(res.statusCode);

      // Now viewer should get 404 on board access
      const failRes = await request(app)
        .get(`/api/boards/${boardId}/columns`)
        .set('Cookie', [`access_token=${viewerToken}`]);
      expect(failRes.statusCode).toBe(404);
    });

    it('should not allow adding a member to a soft-deleted board', async () => {
      // Create a board
      const boardRes = await request(app)
        .post('/api/boards')
        .set('Cookie', [`access_token=${ownerToken}`])
        .send({ name: 'Soft Delete Membership Board' });
      const boardId = boardRes.body.id;

      // Soft-delete the board
      await request(app)
        .delete(`/api/boards/${boardId}`)
        .set('Cookie', [`access_token=${ownerToken}`]);

      // Try to add a member
      const res = await request(app)
        .post(`/api/boards/${boardId}/members`)
        .set('Cookie', [`access_token=${ownerToken}`])
        .send({ userId: viewerId, role: 'VIEWER' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('Removed Member', () => {
    it('removedMember cannot access board', async () => {
      const res = await request(app)
        .get(`/api/boards/${boardId}`)
        .set('Cookie', [`access_token=${removedMemberToken}`]);
      expect(res.statusCode).toBe(404);
    });

    it('removedMember cannot access columns', async () => {
      const res = await request(app)
        .get(`/api/boards/${boardId}/columns`)
        .set('Cookie', [`access_token=${removedMemberToken}`]);
      expect(res.statusCode).toBe(404);
    });

    it('removedMember cannot access tasks', async () => {
      const res = await request(app)
        .get(`/api/columns/${columnId}/tasks`)
        .set('Cookie', [`access_token=${removedMemberToken}`]);
      expect(res.statusCode).toBe(404);
    });
  });

  describe('Never Member', () => {
    it('neverMember cannot access board', async () => {
      const res = await request(app)
        .get(`/api/boards/${boardId}`)
        .set('Cookie', [`access_token=${neverMemberToken}`]);
      expect(res.statusCode).toBe(404);
    });

    it('neverMember cannot access columns', async () => {
      const res = await request(app)
        .get(`/api/boards/${boardId}/columns`)
        .set('Cookie', [`access_token=${neverMemberToken}`]);
      expect(res.statusCode).toBe(404);
    });

    it('neverMember cannot access tasks', async () => {
      const res = await request(app)
        .get(`/api/columns/${columnId}/tasks`)
        .set('Cookie', [`access_token=${neverMemberToken}`]);
      expect(res.statusCode).toBe(404);
    });
  });

  describe('Board Deletion', () => {
    let tempBoardId: number;
    beforeAll(async () => {
      // create a new board just for this test
      const res = await request(app)
        .post('/api/boards')
        .set('Cookie', [`access_token=${ownerToken}`])
        .send({ name: `Delete Test Board ${Date.now()}` });
      tempBoardId = res.body.id;
    });

    it('OWNER can delete the board', async () => {
      const res = await request(app)
        .delete(`/api/boards/${tempBoardId}`)
        .set('Cookie', [`access_token=${ownerToken}`]);
      expect([200, 404]).toContain(res.statusCode);
    });
  });
});