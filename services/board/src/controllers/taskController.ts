import { Request, Response } from 'express';
import { createTask, getTasksForColumn, updateTask, deleteTask, getUserRoleForBoard } from '../services/boardService';
import { createTaskSchema, updateTaskSchema } from "../schemas/taskSchema";
import { AuthenticatedRequest } from "../types/express";
import { requireRole } from "../utils/requireRole";
import prisma from '../prisma';
import { tasksCreated } from '../metrics';

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
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!parseResult.success) {
    req.log?.warn({ userId }, 'Validation failed for createTask');
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }
  if (typeof userId !== 'number') {
    req.log?.warn('Unauthorized task creation attempt');
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (isNaN(columnIdNum)) {
    req.log?.warn({ userId }, 'Invalid columnId for createTask');
    res.status(400).json({ error: 'Column ID must be a number' });
    return;
  }
  const column = await prisma.column.findUnique({ where: { id: columnIdNum } });
  if (!column) {
    req.log?.warn({ userId, columnId: columnIdNum }, 'Column not found for createTask');
    res.status(404).json({ error: 'Column not found' });
    return;
  }
  const role = await getUserRoleForBoard(column.boardId, userId);
  if (!role) {
    req.log?.warn({ userId, columnId: columnIdNum }, 'No role found for createTask');
    res.status(404).json({ error: 'Column not found' });
    return;
  }
  if (!requireRole(['OWNER', 'EDITOR'], role, res)) return;
  try {
    const task = await createTask(parseResult.data.title, columnIdNum, parseResult.data.description);
    tasksCreated.inc();
    req.log?.info({ userId, boardId: column.boardId, columnId: columnIdNum, taskId: task.id }, 'Task created');
    res.status(201).json(task);
  } catch (error: any) {
    req.log?.error({ err: error, userId, boardId: column.boardId, columnId: columnIdNum }, 'Failed to create task');
    if (error?.code === 'P2002') {
      res.status(409).json({ error: 'A task with this title already exists in this column.' });
      return;
    }
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
  const userId = (req as AuthenticatedRequest).user?.id;
  if (typeof userId !== 'number') {
    req.log?.warn('Unauthorized tasks list attempt');
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (isNaN(columnIdNum)) {
    req.log?.warn({ userId }, 'Invalid columnId for getTasks');
    res.status(400).json({ error: 'Column ID must be a number' });
    return;
  }
  const column = await prisma.column.findUnique({ where: { id: columnIdNum } });
  if (!column) {
    req.log?.warn({ userId, columnId: columnIdNum }, 'Column not found for getTasks');
    res.status(404).json({ error: 'Column not found' });
    return;
  }
  const role = await getUserRoleForBoard(column.boardId, userId);
  if (!role) {
    req.log?.warn({ userId, columnId: columnIdNum }, 'No role found for getTasks');
    res.status(404).json({ error: 'Column not found' });
    return;
  }
  if (!requireRole(['OWNER', 'EDITOR', 'VIEWER'], role, res)) return;
  try {
    const tasks = await getTasksForColumn(columnIdNum);
    req.log?.info({ userId, boardId: column.boardId, columnId: columnIdNum }, 'Listed tasks for column');
    res.json(tasks);
  } catch (error) {
    req.log?.error({ err: error, userId, boardId: column.boardId, columnId: columnIdNum }, 'Failed to fetch tasks');
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
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!parseResult.success) {
    req.log?.warn({ userId }, 'Validation failed for updateTask');
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }
  if (typeof userId !== 'number') {
    req.log?.warn('Unauthorized task update attempt');
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (isNaN(taskIdNum)) {
    req.log?.warn({ userId }, 'Invalid taskId for updateTask');
    res.status(400).json({ error: 'Task ID must be a number' });
    return;
  }
  const task = await prisma.task.findUnique({ where: { id: taskIdNum } });
  if (!task) {
    req.log?.warn({ userId, taskId: taskIdNum }, 'Task not found for update');
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  const column = await prisma.column.findUnique({ where: { id: task.columnId } });
  if (!column) {
    req.log?.warn({ userId, taskId: taskIdNum }, 'Column not found for updateTask');
    res.status(404).json({ error: 'Column not found' });
    return;
  }
  const role = await getUserRoleForBoard(column.boardId, userId);
  if (!role) {
    req.log?.warn({ userId, taskId: taskIdNum }, 'No role found for updateTask');
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  if (!requireRole(['OWNER', 'EDITOR'], role, res)) return;
  try {
    const updatedTask = await updateTask(taskIdNum, parseResult.data);
    req.log?.info({ userId, boardId: column.boardId, columnId: column.id, taskId: taskIdNum }, 'Task updated');
    res.json(updatedTask);
  } catch (error: any) {
    req.log?.error({ err: error, userId, boardId: column.boardId, columnId: column.id, taskId: taskIdNum }, 'Failed to update task');
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
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
  const userId = (req as AuthenticatedRequest).user?.id;
  if (typeof userId !== 'number') {
    req.log?.warn('Unauthorized task delete attempt');
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (isNaN(taskIdNum)) {
    req.log?.warn({ userId }, 'Invalid taskId for deleteTask');
    res.status(400).json({ error: 'Task ID must be a number' });
    return;
  }
  const task = await prisma.task.findUnique({ where: { id: taskIdNum } });
  if (!task) {
    req.log?.warn({ userId, taskId: taskIdNum }, 'Task not found for delete');
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  const column = await prisma.column.findUnique({ where: { id: task.columnId } });
  if (!column) {
    req.log?.warn({ userId, taskId: taskIdNum }, 'Column not found for deleteTask');
    res.status(404).json({ error: 'Column not found' });
    return;
  }
  const role = await getUserRoleForBoard(column.boardId, userId);
  if (!role) {
    req.log?.warn({ userId, taskId: taskIdNum }, 'No role found for deleteTask');
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  if (!requireRole(['OWNER', 'EDITOR'], role, res)) return;
  try {
    await deleteTask(taskIdNum);
    req.log?.info({ userId, boardId: column.boardId, columnId: column.id, taskId: taskIdNum }, 'Task deleted');
    res.json({ message: 'Task deleted successfully' });
  } catch (error: any) {
    req.log?.error({ err: error, userId, boardId: column.boardId, columnId: column.id, taskId: taskIdNum }, 'Failed to delete task');
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete task' });
  }
}