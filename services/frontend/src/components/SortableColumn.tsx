import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DroppableColumn } from "./DroppableColumn";
import { DraggableTask } from "./DraggableTask";
import { AddTaskForm } from "./AddTaskForm";
import { DroppableGhost } from "./DroppableGhost";
import type { Column, Task } from "../types/board";

export function SortableColumn({
  col,
  tasks,
  activeTaskId,
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
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center mb-2">
        <span className="font-semibold flex-1" onClick={() => onColumnClick(col)}>
          {col.name}
        </span>
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab px-2"
          title="Drag column"
          style={{ display: "inline-block" }}
        >
          {/* Use an icon here */}
          ☰
        </span>
      </div>
      <SortableContext
        id={`col-${col.id}`}
        items={[...tasks.map(t => t.id.toString()), `col-${col.id}`]} // <-- add ghost drop zone id here
        strategy={verticalListSortingStrategy}
      >
        <DroppableColumn col={col}>
          <ul className="space-y-4 py-2 min-h-[60px] flex flex-col justify-center">
            {tasks.length === 0 ? (
              <DroppableGhost id={`col-${col.id}`} />
            ) : (
              <>
                {tasks
                  .sort((a, b) => a.order - b.order)
                  .map(task => (
                    <DraggableTask
                      key={task.id}
                      task={task}
                      columnId={col.id}
                      onClick={() => onTaskClick(task)}
                      activeTaskId={activeTaskId}
                    />
                  ))}
                <DroppableGhost id={`col-${col.id}`} />
              </>
            )}
          </ul>
          <AddTaskForm columnId={col.id} onTaskAdded={onChanged} />
        </DroppableColumn>
      </SortableContext>
    </div>
  );
}