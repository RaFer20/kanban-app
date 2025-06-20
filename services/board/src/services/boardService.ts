import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

/**
 * Creates a new board with the given name.
 * @param name - The name of the board to create.
 * @returns The created board object.
 */
export async function createBoard(name: string) {
  return prisma.board.create({
    data: { name },
  });
}