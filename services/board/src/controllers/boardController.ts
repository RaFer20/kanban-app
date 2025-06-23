import { Request, Response } from 'express';
import { 
  createBoard, 
  getAllBoards, 
  createColumn, 
  getColumnsForBoard,
  createTask,
  getTasksForColumn,
  updateColumn,
  deleteColumn,
  updateTask,
  deleteTask,
} from '../services/boardService';

/**
 * Express handler for creating a new board.
 * Expects a JSON body with a "name" field.
 * 
 * @route POST /api/boards
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export async function createBoardHandler(
  req: Request,
  res: Response
): Promise<void> {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Board name is required' });
    return;
  }
  try {
    const board = await createBoard(name);
    res.status(201).json(board);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create board' });
  }
}

/**
 * Express handler for fetching all boards.
 * 
 * @route GET /api/boards
 */
export async function getAllBoardsHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const boards = await getAllBoards();
    res.json(boards);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
}

/**
 * Express handler for creating a new column.
 * Expects a JSON body with "name" and "boardId" fields.
 * 
 * @route POST /api/columns
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export async function createColumnHandler(
  req: Request,
  res: Response
): Promise<void> {
  const { name } = req.body;
  const { boardId } = req.params;
  if (!name || !boardId) {
    res.status(400).json({ error: 'Column name and board ID are required' });
    return;
  }
  const boardIdNum = Number(boardId);
  if (isNaN(boardIdNum)) {
    res.status(400).json({ error: 'Board ID must be a number' });
    return;
  }
  try {
    const column = await createColumn(name, boardIdNum);
    res.status(201).json(column);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create column' });
  }
}

/**
 * Express handler for fetching all columns for a board.
 * @route GET /api/boards/:boardId/columns
 */
export async function getColumnsForBoardHandler(
  req: Request,
  res: Response
): Promise<void> {
  const { boardId } = req.params;
  const boardIdNum = Number(boardId);
  if (isNaN(boardIdNum)) {
    res.status(400).json({ error: 'Board ID must be a number' });
    return;
  }
  try {
    const columns = await getColumnsForBoard(boardIdNum);
    res.json(columns);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch columns' });
  }
}

/**
 * Express handler for creating a new task in a column.
 * @route POST /api/columns/:columnId/tasks
 */
export async function createTaskHandler(
  req: Request,
  res: Response
): Promise<void> {
  const { title, description } = req.body;
  const { columnId } = req.params;
  const columnIdNum = Number(columnId);
  if (!title || isNaN(columnIdNum)) {
    res.status(400).json({ error: 'Task title and valid column ID are required' });
    return;
  }
  try {
    const task = await createTask(title, columnIdNum, description);
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
}

/**
 * Express handler for fetching all tasks in a column.
 * @route GET /api/columns/:columnId/tasks
 */
export async function getTasksForColumnHandler(
  req: Request,
  res: Response
): Promise<void> {
  const { columnId } = req.params;
  const columnIdNum = Number(columnId);
  if (isNaN(columnIdNum)) {
    res.status(400).json({ error: 'Column ID must be a number' });
    return;
  }
  try {
    const tasks = await getTasksForColumn(columnIdNum);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
}

/**
 * Express handler for updating a column.
 * @route PATCH /api/columns/:columnId
 */
export async function updateColumnHandler(req: Request, res: Response): Promise<void> {
  const { columnId } = req.params;
  const data = req.body;
  const columnIdNum = Number(columnId);
  if (isNaN(columnIdNum)) {
    res.status(400).json({ error: 'Column ID must be a number' });
    return;
  }
  try {
    const column = await updateColumn(columnIdNum, data);
    res.json(column);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update column' });
  }
}

/**
 * Express handler for deleting a column.
 * @route DELETE /api/columns/:columnId
 */
export async function deleteColumnHandler(req: Request, res: Response): Promise<void> {
  const { columnId } = req.params;
  const columnIdNum = Number(columnId);
  if (isNaN(columnIdNum)) {
    res.status(400).json({ error: 'Column ID must be a number' });
    return;
  }
  try {
    const column = await deleteColumn(columnIdNum);
    res.json(column);
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete column' });
  }
}

/**
 * Express handler for updating a task.
 * @route PATCH /api/tasks/:taskId
 */
export async function updateTaskHandler(req: Request, res: Response): Promise<void> {
  const { taskId } = req.params;
  const data = req.body;
  const taskIdNum = Number(taskId);
  if (isNaN(taskIdNum)) {
    res.status(400).json({ error: 'Task ID must be a number' });
    return;
  }
  try {
    const task = await updateTask(taskIdNum, data);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
}

/**
 * Express handler for deleting a task.
 * @route DELETE /api/tasks/:taskId
 */
export async function deleteTaskHandler(req: Request, res: Response): Promise<void> {
  const { taskId } = req.params;
  const taskIdNum = Number(taskId);
  if (isNaN(taskIdNum)) {
    res.status(400).json({ error: 'Task ID must be a number' });
    return;
  }
  try {
    const task = await deleteTask(taskIdNum);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
}

