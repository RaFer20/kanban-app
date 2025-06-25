import { Router } from 'express';
import {
  createBoardHandler,
  getAllBoardsHandler,
  createColumnHandler,
  getColumnsForBoardHandler,
  createTaskHandler,
  getTasksForColumnHandler,
  updateColumnHandler,
  deleteColumnHandler,
  updateTaskHandler,
  deleteTaskHandler,
} from '../controllers/boardController';

const router = Router();

router.post('/boards', createBoardHandler);
router.get('/boards', getAllBoardsHandler);
router.post('/boards/:boardId/columns', createColumnHandler);
router.get('/boards/:boardId/columns', getColumnsForBoardHandler);
router.post('/columns/:columnId/tasks', createTaskHandler);
router.get('/columns/:columnId/tasks', getTasksForColumnHandler);
router.patch('/columns/:columnId', updateColumnHandler);
router.delete('/columns/:columnId', deleteColumnHandler);
router.patch('/tasks/:taskId', updateTaskHandler);
router.delete('/tasks/:taskId', deleteTaskHandler);

export default router;