import { Request, Response } from 'express';
import { 
  createBoardWithOwner,
  getUserRoleForBoard, 
  deleteBoard,
  getBoardsPaginated
} from '../services/boardService';
import { createBoardSchema } from "../schemas/boardSchema";
import { AuthenticatedRequest } from "../types/express";
import { requireRole } from "../utils/requireRole";
import prisma from '../prisma';
import { boardsCreated } from '../metrics';
import { ensureBoardActive } from '../utils/entityChecks';

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
  const role = await getUserRoleForBoard(boardId, userId);
  if (!role) {
    req.log?.warn({ userId, boardId }, 'User not a member of board for delete');
    res.status(404).json({ error: "Board not found" });
    return;
  }
  if (!requireRole(['OWNER'], role, res)) {
    req.log?.warn({ userId, boardId, role }, 'Insufficient role for board delete');
    return;
  }
  try {
    await deleteBoard(boardId);
    req.log?.info({ userId, boardId }, 'Board deleted');
    res.json({ message: 'Board deleted successfully' });
  } catch (error: any) {
    req.log?.error({ err: error, userId, boardId }, 'Failed to delete board');
    res.status(500).json({ error: 'Failed to delete board' });
  }
}
