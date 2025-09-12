import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "../types/board";
import { getEmail } from "../lib/userUtils";

// DraggableTask component
export function DraggableTask({
  task,
  columnId,
  onClick,
  activeTaskId,
  users,
  boardMembers,
}: {
  task: Task;
  columnId: number;
  onClick: () => void;
  activeTaskId?: string | null;
  users: Array<{ id: number; email: string }>;
  boardMembers: Array<{ userId: number; email: string }>;
}) {
  const { attributes, listeners, setNodeRef, transform } = useSortable({
    id: task.id.toString(),
    data: { columnId: columnId.toString() },
  });

  // Hide the original task while dragging
  if (activeTaskId === task.id.toString()) {
    return <li style={{ minHeight: 48 }} />;
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: "transform 200ms cubic-bezier(0.22, 1, 0.36, 1)",
    cursor: "grab",
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="bg-white rounded shadow p-2 mb-2 transition hover:scale-105 hover:shadow-lg cursor-pointer"
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      <span>{task.title}</span>
      {task.assigneeId && (
        <span className="absolute top-2 right-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
          Assigned
        </span>
      )}
      {task.assigneeId && (
        <div className="text-xs text-gray-500 mt-2">
          Assigned to: {getEmail(task.assigneeId, users, boardMembers)}
        </div>
      )}
    </li>
  );
}