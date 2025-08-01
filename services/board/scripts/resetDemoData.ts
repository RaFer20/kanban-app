import prisma from '../src/prisma';

async function main() {
  const guestUserId = 1;
  const bobUserId = 2;

  // Find all unique board IDs for guest and bob
  const memberships = await prisma.boardMembership.findMany({
    where: { userId: { in: [guestUserId, bobUserId] } },
    select: { boardId: true }
  });
  const boardIds = [...new Set(memberships.map(m => m.boardId))];

  // Delete each board only once
  for (const boardId of boardIds) {
    await prisma.board.delete({ where: { id: boardId } }).catch(() => {});
  }

  // Board where guest is OWNER
  await prisma.board.create({
    data: {
      name: "Guest's Demo Board",
      ownerId: guestUserId,
      memberships: {
        create: {
          userId: guestUserId,
          role: 'OWNER',
        },
      },
      columns: {
        create: [
          {
            name: 'To Do',
            order: 1,
            tasks: {
              create: [
                { title: 'Welcome Task', order: 1 },
                { title: 'Try moving me!', order: 2 },
              ],
            },
          },
          {
            name: 'In Progress',
            order: 2,
            tasks: {
              create: [
                { title: 'Working on this!', order: 1 },
              ],
            },
          },
          {
            name: 'Awaiting Review',
            order: 3,
            tasks: {
              create: [
                { title: 'Needs feedback', order: 1 },
              ],
            },
          },
          {
            name: 'Done',
            order: 4,
            tasks: {
              create: [
                { title: 'Completed Example', order: 1 },
              ],
            },
          },
        ],
      },
    },
  });

  // Board where Bob is OWNER and guest is VIEWER
  await prisma.board.create({
    data: {
      name: "Shared Board (Guest is Viewer)",
      ownerId: bobUserId,
      memberships: {
        create: [
          { userId: bobUserId, role: 'OWNER' },
          { userId: guestUserId, role: 'VIEWER' },
        ],
      },
      columns: {
        create: [
          {
            name: 'Ideas',
            order: 1,
            tasks: {
              create: [
                { title: 'Viewer can see this', order: 1 },
                { title: 'But not edit!', order: 2 },
              ],
            },
          },
          {
            name: 'In Progress',
            order: 2,
            tasks: {
              create: [
                { title: 'Bob is working on this', order: 1 },
              ],
            },
          },
          {
            name: 'Done',
            order: 3,
            tasks: {
              create: [
                { title: 'Completed by Bob', order: 1 },
              ],
            },
          },
        ],
      },
    },
  });

  console.log("Seeded guest's own board (with 4 columns) and a shared board (with 3 columns) where guest is VIEWER.");
  console.log('Demo data reset complete!');
}

main().then(() => process.exit(0));