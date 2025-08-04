import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DroppableColumn } from "./DroppableColumn";
import { DraggableTask } from "./DraggableTask";
import { AddTaskForm } from "./AddTaskForm";
import type { Column, Task } from "../types/board";

export function SortableColumn({
  col,
  tasks,
  activeColumnId,
  onTaskClick,
  onColumnClick,
  onChanged,
}: {
  col: Column;
  tasks: Task[];
  activeTaskId: string | null;
  activeColumnId: string | null;
  onTaskClick: (task: Task) => void;
  onColumnClick: (col: Column) => void;
  onChanged: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: col.id.toString() });

  // Style for dragging columns
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    cursor: "grab",
    minWidth: 220,
    maxWidth: 320,
    background: "var(--card, #f3f4f6)",
    borderRadius: "0.5rem",
    padding: "1rem",
    marginRight: "1rem",
    boxShadow: isDragging
      ? "0 4px 16px rgba(0,0,0,0.12)"
      : "0 1px 4px rgba(0,0,0,0.04)",
  };

  if (activeColumnId === col.id.toString()) {
    // Hide the original column while dragging
    return <div style={{ minWidth: 220, maxWidth: 320, marginRight: "1rem" }} />;
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <h2 className="font-semibold mb-2 flex justify-between items-center">
        <span
          className="cursor-pointer hover:underline"
          onClick={() => onColumnClick(col)}
        >
          {col.name}
        </span>
      </h2>
      <SortableContext
        id={`col-${col.id}`}
        items={tasks.map(t => t.id.toString())}
        strategy={verticalListSortingStrategy}
      >
        <DroppableColumn col={col}>
          <ul className="space-y-2">
            {tasks && tasks.length > 0 ? (
              tasks
                .sort((a, b) => a.order - b.order)
                .map(task => (
                  <DraggableTask
                    key={task.id}
                    task={task}
                    columnId={col.id}
                    onClick={() => onTaskClick(task)}
                  />
                ))
            ) : (
              <li className="text-gray-500">No tasks</li>
            )}
          </ul>
          <AddTaskForm columnId={col.id} onTaskAdded={onChanged} />
        </DroppableColumn>
      </SortableContext>
    </div>
  );
}