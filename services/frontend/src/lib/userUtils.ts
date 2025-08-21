export function getEmail(
  userId: number,
  users: Array<{ id: number; email: string }>,
  boardMembers: Array<{ userId: number; email: string }>
) {
  const user = users.find(u => u.id === userId);
  if (user) return user.email;
  const member = boardMembers.find(m => m.userId === userId);
  if (member && member.email) return member.email;
  return `User ${userId}`;
}