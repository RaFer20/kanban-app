import { useDroppable } from "@dnd-kit/core";

export function DroppableGhost({ id }: { id: string }) {
  const { setNodeRef } = useDroppable({ id });
  return <li ref={setNodeRef} className="h-8 bg-transparent" />;
}