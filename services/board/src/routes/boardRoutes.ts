import { Router } from 'express';
import {
  createBoardHandler,
  deleteBoardHandler,
  getBoardsPaginatedHandler,
  getBoardHandler,
  getOwnedBoardsPaginatedHandler,
} from '../controllers/boardController';
import {
  createColumnHandler,
  getColumnsForBoardHandler,
  updateColumnHandler,
  deleteColumnHandler,
} from '../controllers/columnController';
import {
  createTaskHandler,
  getTasksForColumnHandler,
  updateTaskHandler,
  deleteTaskHandler,
} from '../controllers/taskController';
import {
  addBoardMemberHandler,
  listBoardMembersHandler,
  removeBoardMemberHandler,
  updateBoardMemberRoleHandler,
} from '../controllers/membershipController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

router.post('/boards', createBoardHandler);
router.get('/boards', getBoardsPaginatedHandler);
router.get('/boards/owned', authenticateJWT, getOwnedBoardsPaginatedHandler);
router.get('/boards/:boardId', getBoardHandler);
router.delete('/boards/:boardId', deleteBoardHandler);

router.post('/boards/:boardId/columns', createColumnHandler);
router.get('/boards/:boardId/columns', getColumnsForBoardHandler);
router.patch('/columns/:columnId', updateColumnHandler);
router.delete('/columns/:columnId', deleteColumnHandler);

router.post('/columns/:columnId/tasks', createTaskHandler);
router.get('/columns/:columnId/tasks', getTasksForColumnHandler);
router.patch('/tasks/:taskId', updateTaskHandler);
router.delete('/tasks/:taskId', deleteTaskHandler);

router.post('/boards/:boardId/members', addBoardMemberHandler);
router.get('/boards/:boardId/members', listBoardMembersHandler);
router.delete('/boards/:boardId/members/:userId', removeBoardMemberHandler);
router.patch('/boards/:boardId/members/:userId', updateBoardMemberRoleHandler);

export default router;