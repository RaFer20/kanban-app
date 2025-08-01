import prisma from '../prisma';

/**
 * Creates a new board and automatically assigns the owner.
 * @param name - The name of the board to create.
 * @param userId - The ID of the user who will be the owner of the board.
 * @returns The created board object.
 */
export async function createBoardWithOwner(name: string, userId: number) {
  return prisma.$transaction(async (tx) => {
    const board = await tx.board.create({
      data: { 
        name,
        ownerId: userId,
       },
    });
    await tx.boardMembership.create({
      data: {
        boardId: board.id,
        userId,
        role: 'OWNER',
      },
    });
    return board;
  });
}

/**
 * Fetches a paginated list of boards for a specific user.
 * @param userId - The ID of the user.
 * @param limit - Max number of boards to return.
 * @param offset - How many boards to skip (for pagination).
 * @returns An object with items (boards) and total count.
 */
export async function getBoardsPaginated(userId: number, limit = 10, offset = 0) {
  const [items, total] = await Promise.all([
    prisma.board.findMany({
      where: { 
        memberships: { some: { userId } },
        deletedAt: null,
      },
      orderBy: { id: 'asc' },
      skip: offset,
      take: limit,
    }),
    prisma.board.count({
      where: { 
        memberships: { some: { userId } },
        deletedAt: null,
      },
    }),
  ]);
  return { items, total, limit, offset };
}

/**
 * Fetches a paginated list of boards owned by a specific user.
 * @param userId - The ID of the user.
 * @param limit - Max number of boards to return.
 * @param offset - How many boards to skip (for pagination).
 * @returns An object with items (boards) and total count.
 */
export async function getOwnedBoardsPaginated(userId: number, limit = 10, offset = 0) {
  const [items, total] = await Promise.all([
    prisma.board.findMany({
      where: { ownerId: userId, deletedAt: null },
      orderBy: { id: 'asc' },
      skip: offset,
      take: limit,
    }),
    prisma.board.count({
      where: { ownerId: userId, deletedAt: null },
    }),
  ]);
  return { items, total, limit, offset };
}

/**
 * Gets the user's role for a specific board.
 * @param boardId - The ID of the board.
 * @param userId - The ID of the user.
 * @returns The role as a string, or null if not a member.
 */
export async function getUserRoleForBoard(boardId: number, userId: number) {
  const membership = await prisma.boardMembership.findUnique({
    where: { boardId_userId: { boardId, userId } },
  });
  return membership?.role || null;
}

/**
 * Deletes a board by its ID.
 * @param boardId - The ID of the board to delete.
 * @returns The deleted board object.
 */
export async function deleteBoard(boardId: number) {
  const now = new Date();
  // Soft-delete board, columns, and tasks in a transaction
  return prisma.$transaction(async (tx) => {
    await tx.board.update({
      where: { id: boardId },
      data: { deletedAt: now },
    });
    await tx.column.updateMany({
      where: { boardId },
      data: { deletedAt: now },
    });
    await tx.task.updateMany({
      where: { column: { boardId } },
      data: { deletedAt: now },
    });
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
    where: { boardId, deletedAt: null },
    orderBy: { order: 'asc' },
    include: {
      tasks: {
        where: { deletedAt: null },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          order: true,
          description: true,
        }
      }
    }
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
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    await tx.column.update({
      where: { id: columnId },
      data: { deletedAt: now },
    });
    await tx.task.updateMany({
      where: { columnId },
      data: { deletedAt: now },
    });
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
export async function createTask(
  title: string,
  columnId: number,
  description?: string,
  assigneeId?: number
) {
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
      assigneeId,
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
    where: { columnId, deletedAt: null },
    orderBy: { order: 'asc' },
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
  data: { title?: string; description?: string; columnId?: number; order?: number; assigneeId?: number }
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
  return prisma.task.update({
    where: { id: taskId },
    data: { deletedAt: new Date() },
  });
}

/**
 * Adds a new member to a board with a specific role.
 * @param boardId - The ID of the board.
 * @param userId - The ID of the user to add.
 * @param role - The role to assign to the user on the board.
 * @returns The created board membership object.
 */
export async function addBoardMember(boardId: number, userId: number, role: 'OWNER' | 'EDITOR' | 'VIEWER') {
  return prisma.boardMembership.create({
    data: {
      boardId,
      userId,
      role,
    },
  });
}

/**
 * Fetches paginated and filtered tasks for a column.
 * @param columnId - The ID of the column.
 * @param filters - Optional filters (status, assigneeId, etc.).
 * @param limit - Max number of tasks to return.
 * @param offset - How many tasks to skip.
 * @returns An object with items (tasks) and total count.
 */
export async function getTasksForColumnPaginated(
  columnId: number,
  filters: { status?: string; assigneeId?: number } = {},
  limit = 10,
  offset = 0
) {
  const where: any = { columnId };
  if (filters.status) where.status = filters.status;
  if (filters.assigneeId) where.assigneeId = filters.assigneeId;

  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: { order: 'asc' },
      skip: offset,
      take: limit,
    }),
    prisma.task.count({ where }),
  ]);
  return { items, total, limit, offset };
}

