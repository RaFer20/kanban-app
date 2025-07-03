import { Request, Response } from 'express';
import { createColumn, getColumnsForBoard, updateColumn, deleteColumn, getUserRoleForBoard } from '../services/boardService';
import { createColumnSchema, updateColumnSchema } from "../schemas/columnSchema";
import { AuthenticatedRequest } from "../types/express";
import { requireRole } from "../utils/requireRole";
import prisma from '../prisma';
import { logger } from '../logger';
import { ensureBoardActive, ensureColumnActive } from '../utils/entityChecks';

/**
 * @openapi
 * /api/boards/{boardId}/columns:
 *   post:
 *     summary: Create a column for a board
 *     description: |
 *       Only OWNER or EDITOR can create columns.
 *       Returns 404 if the board is soft-deleted.
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
 *         description: Board not found or deleted
 *       409:
 *         description: Duplicate column name
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
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
    req.log?.warn({ userId }, 'Validation failed for createColumn');
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }
  if (typeof userId !== 'number') {
    req.log?.warn('Unauthorized column creation attempt');
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (isNaN(boardIdNum)) {
    req.log?.warn({ userId }, 'Invalid boardId for createColumn');
    res.status(400).json({ error: 'Board ID must be a number' });
    return;
  }
  const board = await ensureBoardActive(boardIdNum);
  if (!board) {
    req.log?.warn({ userId, boardId: boardIdNum }, 'Board not found or deleted for createColumn');
    res.status(404).json({ error: 'Board not found' });
    return;
  }
  const role = await getUserRoleForBoard(boardIdNum, userId);
  if (!role) {
    req.log?.warn({ userId, boardId: boardIdNum }, 'No role found for createColumn');
    res.status(404).json({ error: 'Board not found' });
    return;
  }
  if (!requireRole(['OWNER', 'EDITOR'], role, res)) return;
  try {
    const column = await createColumn(parseResult.data.name, boardIdNum);
    req.log?.info({ userId, boardId: boardIdNum, columnId: column.id }, 'Column created');
    res.status(201).json(column);
  } catch (error: any) {
    req.log?.error({ err: error, userId, boardId: boardIdNum }, 'Failed to create column');
    if (error?.code === 'P2002') {
      res.status(409).json({ error: 'A column with this name already exists in this board.' });
      return;
    }
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
    req.log?.warn('Unauthorized columns list attempt');
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (isNaN(boardIdNum)) {
    req.log?.warn({ userId }, 'Invalid boardId for getColumns');
    res.status(400).json({ error: 'Board ID must be a number' });
    return;
  }
  const board = await ensureBoardActive(boardIdNum);
  if (!board) {
    req.log?.warn({ userId, boardId: boardIdNum }, 'Board not found or deleted for getColumns');
    res.status(404).json({ error: 'Board not found' });
    return;
  }
  const role = await getUserRoleForBoard(boardIdNum, userId);
  if (!role) {
    req.log?.warn({ userId, boardId: boardIdNum }, 'No role found for getColumns');
    res.status(404).json({ error: 'Board not found' });
    return;
  }
  if (!requireRole(['OWNER', 'EDITOR', 'VIEWER'], role, res)) return;
  try {
    const columns = await getColumnsForBoard(boardIdNum);
    req.log?.info({ userId, boardId: boardIdNum }, 'Listed columns for board');
    res.json(columns);
  } catch (error) {
    req.log?.error({ err: error, userId, boardId: boardIdNum }, 'Failed to fetch columns');
    res.status(500).json({ error: 'Failed to fetch columns' });
  } 
}

/**
 * @openapi
 * /api/columns/{columnId}:
 *   patch:
 *     summary: Update a column (name/order)
 *     description: |
 *       Only OWNER or EDITOR can update columns.
 *       Returns 404 if the column or its board is soft-deleted.
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
 *         description: Column not found or deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export async function updateColumnHandler(req: Request, res: Response): Promise<void> {
  const parseResult = updateColumnSchema.safeParse(req.body);
  const { columnId } = req.params;
  const columnIdNum = Number(columnId);
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!parseResult.success) {
    req.log?.warn({ userId }, 'Validation failed for updateColumn');
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }
  if (typeof userId !== 'number') {
    req.log?.warn('Unauthorized column update attempt');
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (isNaN(columnIdNum)) {
    req.log?.warn({ userId }, 'Invalid columnId for updateColumn');
    res.status(400).json({ error: 'Column ID must be a number' });
    return;
  }
  const column = await ensureColumnActive(columnIdNum);
  if (!column) {
    req.log?.warn({ userId, columnId: columnIdNum }, 'Column not found or deleted');
    res.status(404).json({ error: 'Column not found' });
    return;
  }
  const role = await getUserRoleForBoard(column.boardId, userId);
  if (!role) {
    req.log?.warn({ userId, columnId: columnIdNum }, 'No role found for updateColumn');
    res.status(404).json({ error: 'Column not found' });
    return;
  }
  if (!requireRole(['OWNER', 'EDITOR'], role, res)) return;
  try {
    const updatedColumn = await updateColumn(columnIdNum, parseResult.data);
    req.log?.info({ userId, boardId: column.boardId, columnId: columnIdNum }, 'Column updated');
    res.json(updatedColumn);
  } catch (error: any) {
    req.log?.error({ err: error, userId, boardId: column.boardId, columnId: columnIdNum }, 'Failed to update column');
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'Column not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to update column' });
  }
}

/**
 * @openapi
 * /api/columns/{columnId}:
 *   delete:
 *     summary: Delete a column (soft delete)
 *     description: |
 *       Soft-deletes the column and all its tasks.
 *       Only OWNER or EDITOR can delete columns.
 *       Returns 404 if the column or its board is soft-deleted.
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
 *         description: Column not found or already deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export async function deleteColumnHandler(req: Request, res: Response): Promise<void> {
  const { columnId } = req.params;
  const columnIdNum = Number(columnId);
  const userId = (req as AuthenticatedRequest).user?.id;
  if (typeof userId !== 'number') {
    req.log?.warn('Unauthorized column delete attempt');
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (isNaN(columnIdNum)) {
    req.log?.warn({ userId }, 'Invalid columnId for deleteColumn');
    res.status(400).json({ error: 'Column ID must be a number' });
    return;
  }
  const column = await ensureColumnActive(columnIdNum);
  if (!column) {
    req.log?.warn({ userId, columnId: columnIdNum }, 'Column not found or already deleted');
    res.status(404).json({ error: 'Column not found' });
    return;
  }
  const role = await getUserRoleForBoard(column.boardId, userId);
  if (!role) {
    req.log?.warn({ userId, columnId: columnIdNum }, 'No role found for deleteColumn');
    res.status(404).json({ error: 'Column not found' });
    return;
  }
  if (!requireRole(['OWNER', 'EDITOR'], role, res)) return;
  try {
    await deleteColumn(columnIdNum);
    req.log?.info({ userId, boardId: column.boardId, columnId: columnIdNum }, 'Column deleted');
    res.json({ message: 'Column deleted successfully' });
  } catch (error: any) {
    req.log?.error({ err: error, userId, boardId: column.boardId, columnId: columnIdNum }, 'Failed to delete column');
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'Column not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete column' });
  }
}