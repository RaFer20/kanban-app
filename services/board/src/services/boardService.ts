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

/**
 * Fetches all boards from the database.
 * @returns An array of board objects.
 */
export async function getAllBoards() {
  return prisma.board.findMany({
    orderBy: { id: 'asc' },
  });
}

/**
 * Creates a new column for a specific board.
 * @param name - The name of the column.
 * @param boardId - The ID of the board to attach the column to.
 * @returns The created column object.
 */
export async function createColumn(name: string, boardId: number) {
  // Find the current max order for columns on this board
  const maxOrder = await prisma.column.aggregate({
    where: { boardId },
    _max: { order: true },
  });

  const nextOrder = (maxOrder._max.order ?? 0) + 1;

  return prisma.column.create({
    data: {
      name,
      boardId,
      order: nextOrder,
    },
  });
}

/**
 * Fetches all columns for a specific board.
 * @param boardId - The ID of the board.
 * @returns An array of column objects.
 */
export async function getColumnsForBoard(boardId: number) {
  return prisma.column.findMany({
    where: { boardId },
    orderBy: { order: 'asc' },
  });
}

/**
 * Creates a new task in a specific column.
 * Finds the current maximum order for tasks in the column and adds the new task at the end.
 * @param title - The title of the task to create.
 * @param columnId - The ID of the column to add the task to.
 * @param description - (Optional) The description of the task.
 * @returns The created task object.
 */
export async function createTask(title: string, columnId: number, description?: string) {
  // Find the current max order for tasks in this column
  const maxOrder = await prisma.task.aggregate({
    where: { columnId },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? 0) + 1;
  return prisma.task.create({
    data: {
      title,
      description,
      columnId,
      order: nextOrder,
    },
  });
}

/**
 * Fetches all tasks for a specific column, ordered by their position.
 * @param columnId - The ID of the column to fetch tasks for.
 * @returns An array of task objects.
 */
export async function getTasksForColumn(columnId: number) {
  return prisma.task.findMany({
    where: { columnId },
    orderBy: { order: 'asc' },
  });
}

/**
 * Updates a column's name or order.
 * @param columnId - The ID of the column to update.
 * @param data - An object with optional 'name' and/or 'order' fields.
 * @returns The updated column object.
 */
export async function updateColumn(
  columnId: number,
  data: { name?: string; order?: number }
) {
  return prisma.column.update({
    where: { id: columnId },
    data,
  });
}

/**
 * Deletes a column by its ID.
 * @param columnId - The ID of the column to delete.
 * @returns The deleted column object.
 */
export async function deleteColumn(columnId: number) {
  return prisma.column.delete({
    where: { id: columnId },
  });
}

/**
 * Updates a task's title, description, column, or order.
 * @param taskId - The ID of the task to update.
 * @param data - An object with optional 'title', 'description', 'columnId', and/or 'order' fields.
 * @returns The updated task object.
 */
export async function updateTask(
  taskId: number,
  data: { title?: string; description?: string; columnId?: number; order?: number }
) {
  return prisma.task.update({
    where: { id: taskId },
    data,
  });
}

/**
 * Deletes a task by its ID.
 * @param taskId - The ID of the task to delete.
 * @returns The deleted task object.
 */
export async function deleteTask(taskId: number) {
  return prisma.task.delete({
    where: { id: taskId },
  });
}

