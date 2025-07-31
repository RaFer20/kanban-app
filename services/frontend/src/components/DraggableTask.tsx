import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "../types/board";

// DraggableTask component
export function DraggableTask({
  task,
  columnId,
  activeTaskId,
  onClick,
}: {
  task: Task;
  columnId: number;
  activeTaskId: string | null;
  onClick: () => void;
}) {
  if (activeTaskId === task.id.toString()) return null;

  const { attributes, listeners, setNodeRef, transform } = useSortable({
    id: task.id.toString(),
    data: { columnId: columnId.toString() },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: "transform 200ms cubic-bezier(0.22, 1, 0.36, 1)",
    cursor: "grab",
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-md shadow p-3 text-left min-w-[180px]"
      onClick={onClick}
    >
      <span>{task.title}</span>
    </li>
  );
}