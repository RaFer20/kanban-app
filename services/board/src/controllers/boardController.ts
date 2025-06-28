import { Request, Response } from 'express';
import { 
  createBoardWithOwner, 
  getAllBoards, 
  getUserRoleForBoard, 
  deleteBoard
} from '../services/boardService';
import { createBoardSchema } from "../schemas/boardSchema";
import { AuthenticatedRequest } from "../types/express";
import { requireRole } from "../utils/requireRole";
import prisma from '../prisma';
import { boardsCreated } from '../metrics';

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
    req.log?.warn('Unauthorized board list attempt');
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const boards = await getAllBoards(userId);
    req.log?.info({ userId }, 'Fetched all boards');
    res.json(boards);
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
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) {
    req.log?.warn({ userId, boardId }, 'Board not found for delete');
    res.status(404).json({ error: "Board not found" });
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
