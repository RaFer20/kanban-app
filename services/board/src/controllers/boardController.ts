import { Request, Response } from 'express';
import { 
  createBoardWithOwner, getAllBoards, createColumn, getColumnsForBoard,
  createTask, getTasksForColumn, updateColumn, deleteColumn,
  updateTask, deleteTask, getUserRoleForBoard, deleteBoard,
  addBoardMember
} from '../services/boardService';
import { createBoardSchema } from "../schemas/boardSchema";
import { createColumnSchema, updateColumnSchema } from "../schemas/columnSchema";
import { createTaskSchema, updateTaskSchema } from "../schemas/taskSchema";
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AuthenticatedRequest } from "../types/express";
import { requireRole } from "../utils/requireRole";
import prisma from '../prisma';

// --- Board Handlers ---

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
  if (typeof userId !== 'number') {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const board = await createBoardWithOwner(name, userId);
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
  if (typeof userId !== 'number') {
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
 * /api/boards/{boardId}:
 *   delete:
 *     summary: Delete a board
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Board deleted
 *       400:
 *         description: Validation error
 *       404:
 *         description: Board not found
 */
export async function deleteBoardHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const boardId = Number(req.params.boardId);
  const userId = req.user?.id;
  if (typeof userId !== 'number') {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) {
    res.status(404).json({ error: "Board not found" });
    return;
  }
  const role = await getUserRoleForBoard(boardId, userId);
  if (!role) {
    res.status(404).json({ error: "Board not found" });
    return;
  }
  if (!requireRole(['OWNER'], role, res)) return;
  try {
    await deleteBoard(boardId);
    res.json({ message: 'Board deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete board' });
  }
}

// --- Column Handlers ---

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
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }
  if (typeof userId !== 'number') {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (isNaN(boardIdNum)) {
    res.status(400).json({ error: 'Board ID must be a number' });
    return;
  }
  const board = await prisma.board.findUnique({ where: { id: boardIdNum } });
  if (!board) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }
  const role = await getUserRoleForBoard(boardIdNum, userId);
  if (!role) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }
  if (!requireRole(['OWNER', 'EDITOR'], role, res)) return;
  try {
    const column = await createColumn(parseResult.data.name, boardIdNum);
    res.status(201).json(column);
  } catch (error: any) {
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
  const userId = (req as AuthenticatedRequest).user?.id;
  if (typeof userId !== 'number') {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (isNaN(boardIdNum)) {
    res.status(400).json({ error: 'Board ID must be a number' });
    return;
  }
  const board = await prisma.board.findUnique({ where: { id: boardIdNum } });
  if (!board) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }
  const role = await getUserRoleForBoard(boardIdNum, userId);
  if (!role) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }
  if (!requireRole(['OWNER', 'EDITOR', 'VIEWER'], role, res)) return;
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
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }
  if (typeof userId !== 'number') {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (isNaN(columnIdNum)) {
    res.status(400).json({ error: 'Column ID must be a number' });
    return;
  }
  const column = await prisma.column.findUnique({ where: { id: columnIdNum } });
  if (!column) {
    res.status(404).json({ error: 'Column not found' });
    return;
  }
  const role = await getUserRoleForBoard(column.boardId, userId);
  if (!role) {
    res.status(404).json({ error: 'Column not found' });
    return;
  }
  if (!requireRole(['OWNER', 'EDITOR'], role, res)) return;
  try {
    const updatedColumn = await updateColumn(columnIdNum, parseResult.data);
    res.json(updatedColumn);
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
  const userId = (req as AuthenticatedRequest).user?.id;
  if (typeof userId !== 'number') {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (isNaN(columnIdNum)) {
    res.status(400).json({ error: 'Column ID must be a number' });
    return;
  }
  const column = await prisma.column.findUnique({ where: { id: columnIdNum } });
  if (!column) {
    res.status(404).json({ error: 'Column not found' });
    return;
  }
  const role = await getUserRoleForBoard(column.boardId, userId);
  if (!role) {
    res.status(404).json({ error: 'Column not found' });
    return;
  }
  if (!requireRole(['OWNER', 'EDITOR'], role, res)) return;
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

// --- Task Handlers ---

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
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }
  if (typeof userId !== 'number') {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (isNaN(columnIdNum)) {
    res.status(400).json({ error: 'Column ID must be a number' });
    return;
  }
  const column = await prisma.column.findUnique({ where: { id: columnIdNum } });
  if (!column) {
    res.status(404).json({ error: 'Column not found' });
    return;
  }
  const role = await getUserRoleForBoard(column.boardId, userId);
  if (!role) {
    res.status(404).json({ error: 'Column not found' });
    return;
  }
  if (!requireRole(['OWNER', 'EDITOR'], role, res)) return;
  try {
    const task = await createTask(parseResult.data.title, columnIdNum, parseResult.data.description);
    res.status(201).json(task);
  } catch (error: any) {
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
  const userId = (req as AuthenticatedRequest).user?.id;
  if (typeof userId !== 'number') {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (isNaN(columnIdNum)) {
    res.status(400).json({ error: 'Column ID must be a number' });
    return;
  }
  const column = await prisma.column.findUnique({ where: { id: columnIdNum } });
  if (!column) {
    res.status(404).json({ error: 'Column not found' });
    return;
  }
  const role = await getUserRoleForBoard(column.boardId, userId);
  if (!role) {
    res.status(404).json({ error: 'Column not found' });
    return;
  }
  if (!requireRole(['OWNER', 'EDITOR', 'VIEWER'], role, res)) return;
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
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }
  if (typeof userId !== 'number') {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (isNaN(taskIdNum)) {
    res.status(400).json({ error: 'Task ID must be a number' });
    return;
  }
  const task = await prisma.task.findUnique({ where: { id: taskIdNum } });
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  const column = await prisma.column.findUnique({ where: { id: task.columnId } });
  if (!column) {
    res.status(404).json({ error: 'Column not found' });
    return;
  }
  const role = await getUserRoleForBoard(column.boardId, userId);
  if (!role) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  if (!requireRole(['OWNER', 'EDITOR'], role, res)) return;
  try {
    const updatedTask = await updateTask(taskIdNum, parseResult.data);
    res.json(updatedTask);
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
  const userId = (req as AuthenticatedRequest).user?.id;
  if (typeof userId !== 'number') {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (isNaN(taskIdNum)) {
    res.status(400).json({ error: 'Task ID must be a number' });
    return;
  }
  const task = await prisma.task.findUnique({ where: { id: taskIdNum } });
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  const column = await prisma.column.findUnique({ where: { id: task.columnId } });
  if (!column) {
    res.status(404).json({ error: 'Column not found' });
    return;
  }
  const role = await getUserRoleForBoard(column.boardId, userId);
  if (!role) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  if (!requireRole(['OWNER', 'EDITOR'], role, res)) return;
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

// --- Membership Handlers ---

/**
 * @openapi
 * /api/boards/{boardId}/members:
 *   post:
 *     summary: Add a member to the board
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
 *               - userId
 *               - role
 *             properties:
 *               userId:
 *                 type: integer
 *               role:
 *                 type: string
 *     responses:
 *       201:
 *         description: Member added
 *       400:
 *         description: Validation error
 *       404:
 *         description: Board not found
 *       403:
 *         description: Forbidden
 */
export async function addBoardMemberHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const boardId = Number(req.params.boardId);
  const { userId, role } = req.body;
  const requesterId = req.user?.id;
  if (typeof requesterId !== 'number') {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) {
    res.status(404).json({ error: "Board not found" });
    return;
  }
  const requesterRole = await getUserRoleForBoard(boardId, requesterId);
  if (!requesterRole) {
    res.status(404).json({ error: "Board not found" });
    return;
  }
  if (!requireRole(['OWNER'], requesterRole, res)) return;
  try {
    const membership = await addBoardMember(boardId, userId, role);
    res.status(201).json(membership);
  } catch (err) {
    res.status(400).json({ error: "Could not add member (maybe already exists?)" });
  }
}

/**
 * @openapi
 * /api/boards/{boardId}/members:
 *   get:
 *     summary: List members of the board
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of board members
 */
export async function listBoardMembersHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const boardId = Number(req.params.boardId);
  const userId = req.user?.id;
  if (typeof userId !== 'number') {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) {
    res.status(404).json({ error: "Board not found" });
    return;
  }
  const role = await getUserRoleForBoard(boardId, userId);
  if (!role) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (!requireRole(['OWNER', 'EDITOR', 'VIEWER'], role, res)) return;
  try {
    const members = await prisma.boardMembership.findMany({
      where: { boardId },
      select: { userId: true, role: true, createdAt: true, updatedAt: true }
    });
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch board members" });
  }
}

/**
 * @openapi
 * /api/boards/{boardId}/members/{userId}:
 *   delete:
 *     summary: Remove a member from the board
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Member removed
 *       404:
 *         description: Member not found
 */
export async function removeBoardMemberHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const boardId = Number(req.params.boardId);
  const memberId = Number(req.params.userId);
  const requesterId = req.user?.id;
  if (typeof requesterId !== 'number') {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) {
    res.status(404).json({ error: "Board not found" });
    return;
  }
  const requesterRole = await getUserRoleForBoard(boardId, requesterId);
  if (!requesterRole) {
    res.status(404).json({ error: "Board not found" });
    return;
  }
  if (!requireRole(['OWNER'], requesterRole, res)) return;
  try {
    await prisma.boardMembership.delete({
      where: { boardId_userId: { boardId, userId: memberId } }
    });
    res.json({ message: "Member removed successfully" });
  } catch (error) {
    res.status(404).json({ error: "Member not found" });
  }
}

/**
 * @openapi
 * /api/boards/{boardId}/members/{userId}:
 *   patch:
 *     summary: Update a member's role in the board
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: userId
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
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: Member role updated
 *       404:
 *         description: Member not found
 */
export async function updateBoardMemberRoleHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const boardId = Number(req.params.boardId);
  const memberId = Number(req.params.userId);
  const { role } = req.body;
  const requesterId = req.user?.id;
  if (typeof requesterId !== 'number') {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) {
    res.status(404).json({ error: "Board not found" });
    return;
  }
  const requesterRole = await getUserRoleForBoard(boardId, requesterId);
  if (!requesterRole) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (!requireRole(['OWNER'], requesterRole, res)) return;
  try {
    const updated = await prisma.boardMembership.update({
      where: { boardId_userId: { boardId, userId: memberId } },
      data: { role }
    });
    res.json(updated);
  } catch (error) {
    res.status(404).json({ error: "Member not found" });
  }
}
