import { Request, Response } from 'express';
import { 
  createBoard, getAllBoards, createColumn, getColumnsForBoard,
  createTask, getTasksForColumn, updateColumn, deleteColumn,
  updateTask, deleteTask,
} from '../services/boardService';
import { createBoardSchema } from "../schemas/boardSchema";
import { createColumnSchema, updateColumnSchema } from "../schemas/columnSchema";
import { createTaskSchema, updateTaskSchema } from "../schemas/taskSchema";
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AuthenticatedRequest } from "../types/express";

/**
 * @openapi
 * /api/boards:
 *   post:
 *     summary: Create a new board
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Board created
 *       400:
 *         description: Validation error
 *       409:
 *         description: Duplicate board name
 */
export async function createBoardHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const parseResult = createBoardSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }
  const { name } = parseResult.data;
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const board = await createBoard(name, userId);
    res.status(201).json(board);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'A board with this name already exists.' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create board' });
  }
}

/**
 * @openapi
 * /api/boards:
 *   get:
 *     summary: List all boards
 *     responses:
 *       200:
 *         description: List of boards
 */
export async function getAllBoardsHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const boards = await getAllBoards(userId);
    res.json(boards);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
}

/**
 * @openapi
 * /api/boards/{boardId}/columns:
 *   post:
 *     summary: Create a column for a board
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Column created
 *       400:
 *         description: Validation error
 *       404:
 *         description: Board not found
 *       409:
 *         description: Duplicate column name
 */
export async function createColumnHandler(
  req: Request,
  res: Response
): Promise<void> {
  const parseResult = createColumnSchema.safeParse(req.body);
  const { boardId } = req.params;
  const boardIdNum = Number(boardId);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }
  if (isNaN(boardIdNum)) {
    res.status(400).json({ error: 'Board ID must be a number' });
    return;
  }
  try {
    const column = await createColumn(parseResult.data.name, boardIdNum);
    res.status(201).json(column);
  } catch (error: any) {
    if (error?.code === 'P2003') {
      res.status(404).json({ error: 'Board not found' });
      return;
    }
    if (error?.code === 'P2002') {
      res.status(409).json({ error: 'A column with this name already exists in this board.' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create column' });
  }
}

/**
 * @openapi
 * /api/boards/{boardId}/columns:
 *   get:
 *     summary: List columns for a board
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of columns
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
 * @openapi
 * /api/columns/{columnId}:
 *   patch:
 *     summary: Update a column (name/order)
 *     parameters:
 *       - in: path
 *         name: columnId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               order:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Column updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: Column not found
 */
export async function updateColumnHandler(req: Request, res: Response): Promise<void> {
  const parseResult = updateColumnSchema.safeParse(req.body);
  const { columnId } = req.params;
  const columnIdNum = Number(columnId);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }
  if (isNaN(columnIdNum)) {
    res.status(400).json({ error: 'Column ID must be a number' });
    return;
  }
  try {
    const column = await updateColumn(columnIdNum, parseResult.data);
    res.json(column);
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'Column not found' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update column' });
  }
}

/**
 * @openapi
 * /api/columns/{columnId}:
 *   delete:
 *     summary: Delete a column
 *     parameters:
 *       - in: path
 *         name: columnId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Column deleted
 *       400:
 *         description: Validation error
 *       404:
 *         description: Column not found
 */
export async function deleteColumnHandler(req: Request, res: Response): Promise<void> {
  const { columnId } = req.params;
  const columnIdNum = Number(columnId);
  if (isNaN(columnIdNum)) {
    res.status(400).json({ error: 'Column ID must be a number' });
    return;
  }
  try {
    await deleteColumn(columnIdNum);
    res.json({ message: 'Column deleted successfully' });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'Column not found' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to delete column' });
  }
}

/**
 * @openapi
 * /api/columns/{columnId}/tasks:
 *   post:
 *     summary: Create a task in a column
 *     parameters:
 *       - in: path
 *         name: columnId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Task created
 *       400:
 *         description: Validation error
 *       404:
 *         description: Column not found
 *       409:
 *         description: Duplicate task title
 */
export async function createTaskHandler(
  req: Request,
  res: Response
): Promise<void> {
  const parseResult = createTaskSchema.safeParse(req.body);
  const { columnId } = req.params;
  const columnIdNum = Number(columnId);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }
  if (isNaN(columnIdNum)) {
    res.status(400).json({ error: 'Column ID must be a number' });
    return;
  }
  try {
    const task = await createTask(parseResult.data.title, columnIdNum, parseResult.data.description);
    res.status(201).json(task);
  } catch (error: any) {
    if (error?.code === 'P2003') {
      res.status(404).json({ error: 'Column not found' });
      return;
    }
    if (error?.code === 'P2002') {
      res.status(409).json({ error: 'A task with this title already exists in this column.' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create task' });
  }
}

/**
 * @openapi
 * /api/columns/{columnId}/tasks:
 *   get:
 *     summary: List tasks in a column
 *     parameters:
 *       - in: path
 *         name: columnId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of tasks
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
 * @openapi
 * /api/tasks/{taskId}:
 *   patch:
 *     summary: Update a task
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               order:
 *                 type: integer
 *               columnId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Task updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: Task not found
 */
export async function updateTaskHandler(req: Request, res: Response): Promise<void> {
  const parseResult = updateTaskSchema.safeParse(req.body);
  const { taskId } = req.params;
  const taskIdNum = Number(taskId);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }
  if (isNaN(taskIdNum)) {
    res.status(400).json({ error: 'Task ID must be a number' });
    return;
  }
  try {
    const task = await updateTask(taskIdNum, parseResult.data);
    res.json(task);
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update task' });
  }
}

/**
 * @openapi
 * /api/tasks/{taskId}:
 *   delete:
 *     summary: Delete a task
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Task deleted
 *       400:
 *         description: Validation error
 *       404:
 *         description: Task not found
 */
export async function deleteTaskHandler(req: Request, res: Response): Promise<void> {
  const { taskId } = req.params;
  const taskIdNum = Number(taskId);
  if (isNaN(taskIdNum)) {
    res.status(400).json({ error: 'Task ID must be a number' });
    return;
  }
  try {
    await deleteTask(taskIdNum);
    res.json({ message: 'Task deleted successfully' });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
}

