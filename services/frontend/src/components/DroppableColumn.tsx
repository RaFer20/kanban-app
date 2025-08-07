import { useDroppable } from "@dnd-kit/core";
import type { Column } from "../types/board";

export function DroppableColumn({ col, children }: { col: Column; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: `col-${col.id}` });
  return (
    <div ref={setNodeRef} className="bg-gray-200 rounded-lg p-4 min-w-[220px]">
      {children}
    </div>
  );
}