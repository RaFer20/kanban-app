import { Request, Response } from 'express';
import { createBoard } from '../services/boardService';

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