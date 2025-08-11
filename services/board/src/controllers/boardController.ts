import { Request, Response } from 'express';
import { 
  createBoardWithOwner,
  getUserRoleForBoard, 
  deleteBoard,
  getBoardsPaginated,
  getOwnedBoardsPaginated,
  getAllBoards,
  resetDemoData,
  restoreBoard,
  getBoardsForUserWithRoles
} from '../services/boardService';
import { createBoardSchema } from "../schemas/boardSchema";
import { AuthenticatedRequest } from "../types/express";
import { requireRole } from "../utils/requireRole";
import prisma from '../prisma';
import { boardsCreated } from '../metrics';
import { ensureBoardActive } from '../utils/entityChecks';
import { exec } from 'child_process';

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
 *         description: Duplicate name
 */
export async function createBoardHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const parseResult = createBoardSchema.safeParse(req.body);
  if (!parseResult.success) {
    req.log?.warn({ userId: req.user?.id }, 'Validation failed for createBoard');
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }
  const { name } = parseResult.data;
  const userId = req.user?.id;
  if (typeof userId !== 'number') {
    req.log?.warn('Unauthorized board creation attempt');
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const board = await createBoardWithOwner(name, userId);
    boardsCreated.inc();
    req.log?.info({ userId, boardId: board.id }, 'Board created');
    res.status(201).json(board);
  } catch (error: any) {
    req.log?.error({ err: error, userId }, 'Failed to create board');
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'A board with this name already exists.' });
      return;
    }
    req.log?.error({ err: error }, 'Unhandled error during board creation');
    res.status(500).json({ error: 'Failed to create board' });
  }
}


/**
 * @openapi
 * /api/boards:
 *   get:
 *     summary: List all boards with pagination
 *     parameters:
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         required: false
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of boards
 */
export async function getBoardsPaginatedHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const userId = req.user?.id;
  if (typeof userId !== 'number') {
    req.log?.warn('Unauthorized board list attempt');
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  // Parse limit/offset from query params, with defaults and max limit
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    const result = await getBoardsPaginated(userId, limit, offset);
    req.log?.info({ userId, limit, offset }, 'Fetched paginated boards');
    res.json(result);
  } catch (error) {
    req.log?.error({ err: error, userId }, 'Failed to fetch boards');
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
}

/**
 * @openapi
 * /api/boards/{boardId}:
 *   delete:
 *     summary: Delete a board (soft delete)
 *     description: |
 *       Soft-deletes the board and all its columns and tasks.
 *       Any further actions on this board, its columns, or tasks will return 404.
 *       Only the OWNER can delete a board.
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
 *         description: Board not found or already deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export async function deleteBoardHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const boardId = Number(req.params.boardId);
  const userId = req.user?.id;
  if (typeof userId !== 'number') {
    req.log?.warn('Unauthorized board delete attempt');
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const board = await ensureBoardActive(boardId);
  if (!board) {
    req.log?.warn({ userId, boardId }, 'Board not found or deleted');
    res.status(404).json({ error: 'Board not found' });
    return;
  }
  const isAdmin = req.user?.role === 'admin';
  const role = await getUserRoleForBoard(boardId, userId);

  if (!isAdmin) {
    if (role == null) {
      req.log?.warn({ userId, boardId }, 'User not a member of board for delete');
      res.status(404).json({ error: "Board not found" });
      return;
    }
    if (role !== 'OWNER') {
      req.log?.warn({ userId, boardId, role }, 'Insufficient role for board delete');
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }
  // If admin, skip checks and allow deletion
  try {
    await deleteBoard(boardId);
    req.log?.info({ userId, boardId }, 'Board deleted');
    res.json({ message: 'Board deleted successfully' });
  } catch (error: any) {
    req.log?.error({ err: error, userId, boardId }, 'Failed to delete board');
    res.status(500).json({ error: 'Failed to delete board' });
  }
}

/**
 * @openapi
 * /api/boards/{boardId}:
 *   get:
 *     summary: Get a specific board by ID
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Board details
 *       404:
 *         description: Board not found
 *       401:
 *         description: Unauthorized
 */
export async function getBoardHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const boardId = Number(req.params.boardId);
  const userId = req.user?.id;
  const isAdmin = req.user?.role === 'admin';
  if (typeof userId !== 'number') {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const board = await ensureBoardActive(boardId);
  if (!board) {
    res.status(404).json({ error: "Board not found" });
    return;
  }
  if (!isAdmin) {
    const role = await getUserRoleForBoard(boardId, userId);
    if (role == null) {
      res.status(404).json({ error: "Board not found" });
      return;
    }
  }
  res.json(board);
}

/**
 * @openapi
 * /api/boards/owned:
 *   get:
 *     summary: List all boards owned by the user with pagination
 *     parameters:
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         required: false
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of owned boards
 */
export async function getOwnedBoardsPaginatedHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const userId = req.user?.id;
  if (typeof userId !== 'number') {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const offset = parseInt(req.query.offset as string) || 0;
  try {
    const result = await getOwnedBoardsPaginated(userId, limit, offset);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch owned boards' });
  }
}

/**
 * @openapi
 * /api/admin/boards:
 *   get:
 *     summary: List all boards (admin only)
 *     responses:
 *       200:
 *         description: List of all boards
 */
export async function listAllBoardsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const boards = await getAllBoards();
    res.json(boards);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
}

/**
 * @openapi
 * /api/admin/reset-demo:
 *   post:
 *     summary: Reset demo data (admin only)
 *     responses:
 *       200:
 *         description: Demo data reset
 */
export async function resetDemoDataHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { stdout } = await resetDemoData();
    res.json({ message: 'Demo data reset', output: stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.stderr || 'Failed to reset demo data' });
  }
}

/**
 * @openapi
 * /api/admin/boards/{boardId}/restore:
 *   post:
 *     summary: Restore a soft-deleted board (admin only)
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Board restored
 *       404:
 *         description: Board not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export async function restoreBoardHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const boardId = Number(req.params.boardId);
  const isAdmin = req.user?.role === 'admin';
  if (!isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    await restoreBoard(boardId);
    res.json({ message: "Board restored successfully" });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to restore board" });
  }
}

/**
 * @openapi
 * /api/users/{userId}/boards:
 *   get:
 *     summary: Get all boards for a user (admin only)
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of boards with user roles
 *       400:
 *         description: Invalid userId
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to fetch user boards
 */
export async function getUserBoardsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = Number(req.params.userId);
  if (!userId) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }
  try {
    const boards = await getBoardsForUserWithRoles(userId);
    res.json(boards);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch user boards" });
  }
}
