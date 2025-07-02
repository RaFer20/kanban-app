import prisma from '../prisma';

export async function ensureBoardActive(boardId: number) {
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  return board && !board.deletedAt ? board : null;
}

export async function ensureColumnActive(columnId: number) {
  const column = await prisma.column.findUnique({ where: { id: columnId } });
  return column && !column.deletedAt ? column : null;
}

export async function ensureTaskActive(taskId: number) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  return task && !task.deletedAt ? task : null;
}