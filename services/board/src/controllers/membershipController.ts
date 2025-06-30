import { AuthenticatedRequest } from "../types/express";
import { Request, Response } from "express";
import prisma from '../prisma';
import { getUserRoleForBoard, addBoardMember } from '../services/boardService';
import { requireRole } from "../utils/requireRole";

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
    req.log?.warn({ requesterId }, 'Unauthorized add member attempt');
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) {
    req.log?.warn({ requesterId, boardId }, 'Board not found for add member');
    res.status(404).json({ error: "Board not found" });
    return;
  }
  const requesterRole = await getUserRoleForBoard(boardId, requesterId);
  if (!requesterRole) {
    req.log?.warn({ requesterId, boardId }, 'No role found for add member');
    res.status(404).json({ error: "Board not found" });
    return;
  }
  if (!requireRole(['OWNER'], requesterRole, res)) return;
  try {
    const membership = await addBoardMember(boardId, userId, role);
    req.log?.info({ requesterId, boardId, addedUserId: userId, role }, 'Board member added');
    res.status(201).json(membership);
  } catch (err) {
    req.log?.error({ err, requesterId, boardId, addedUserId: userId, role }, 'Failed to add board member');
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
    req.log?.warn({ userId }, 'Unauthorized list members attempt');
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) {
    req.log?.warn({ userId, boardId }, 'Board not found for list members');
    res.status(404).json({ error: "Board not found" });
    return;
  }
  const role = await getUserRoleForBoard(boardId, userId);
  if (!role) {
    req.log?.warn({ userId, boardId }, 'No role found for list members');
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (!requireRole(['OWNER', 'EDITOR', 'VIEWER'], role, res)) return;
  try {
    const members = await prisma.boardMembership.findMany({
      where: { boardId },
      select: { userId: true, role: true, createdAt: true, updatedAt: true }
    });
    req.log?.info({ userId, boardId }, 'Listed board members');
    res.json(members);
  } catch (error) {
    req.log?.error({ err: error, userId, boardId }, 'Failed to fetch board members');
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
    req.log?.warn({ requesterId }, 'Unauthorized remove member attempt');
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) {
    req.log?.warn({ requesterId, boardId }, 'Board not found for remove member');
    res.status(404).json({ error: "Board not found" });
    return;
  }
  const requesterRole = await getUserRoleForBoard(boardId, requesterId);
  if (!requesterRole) {
    req.log?.warn({ requesterId, boardId }, 'No role found for remove member');
    res.status(404).json({ error: "Board not found" });
    return;
  }
  if (!requireRole(['OWNER'], requesterRole, res)) return;
  try {
    await prisma.boardMembership.delete({
      where: { boardId_userId: { boardId, userId: memberId } }
    });
    req.log?.info({ requesterId, boardId, removedUserId: memberId }, 'Board member removed');
    res.json({ message: "Member removed successfully" });
  } catch (error) {
    req.log?.error({ err: error, requesterId, boardId, removedUserId: memberId }, 'Failed to remove board member');
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
    req.log?.warn({ requesterId }, 'Unauthorized update member role attempt');
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) {
    req.log?.warn({ requesterId, boardId }, 'Board not found for update member role');
    res.status(404).json({ error: "Board not found" });
    return;
  }
  const requesterRole = await getUserRoleForBoard(boardId, requesterId);
  if (!requesterRole) {
    req.log?.warn({ requesterId, boardId }, 'No role found for update member role');
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (!requireRole(['OWNER'], requesterRole, res)) return;
  try {
    const updated = await prisma.boardMembership.update({
      where: { boardId_userId: { boardId, userId: memberId } },
      data: { role }
    });
    req.log?.info({ requesterId, boardId, memberId, newRole: role }, 'Board member role updated');
    res.json(updated);
  } catch (error) {
    req.log?.error({ err: error, requesterId, boardId, memberId, newRole: role }, 'Failed to update board member role');
    res.status(404).json({ error: "Member not found" });
  }
}
