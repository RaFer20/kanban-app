import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { boardApi } from "../lib/api";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable, useDraggable } from "@dnd-kit/core";

type Board = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type Task = {
  id: number;
  title: string;
  order: number;
  description?: string;
};

type Column = {
  id: number;
  name: string;
  order: number;
  tasks: Task[];
};

export function BoardDetailPage() {
  const { boardId } = useParams();
  const [board, setBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [addColumnError, setAddColumnError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Fetch columns only
  async function fetchColumns() {
    try {
      const columnsData = await boardApi.getBoardColumns(Number(boardId));
      setColumns(columnsData);
    } catch {
      setError("Failed to load columns.");
    }
  }

  // Fetch board and columns on mount or boardId change
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const boardData = await boardApi.getBoard(Number(boardId));
        setBoard(boardData);
        await fetchColumns();
      } catch (err) {
        setError("Failed to load board details.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [boardId]);

  async function handleAddColumn(e: React.FormEvent) {
    e.preventDefault();
    setAddColumnError(null);
    try {
      await boardApi.createColumn(Number(boardId), newColumnName);
      setNewColumnName("");
      setShowAddColumn(false);
      await fetchColumns();
    } catch (err: any) {
      setAddColumnError(err?.message || "Failed to add column.");
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Handler for drag end
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    // --- COLUMN DRAG ---
    // If both IDs are columns (numbers), handle column move
    if (
      !isNaN(Number(active.id)) &&
      !isNaN(Number(over.id)) &&
      columns.some(col => col.id.toString() === active.id) &&
      columns.some(col => col.id.toString() === over.id)
    ) {
      const oldIndex = columns.findIndex(col => col.id.toString() === active.id);
      const newIndex = columns.findIndex(col => col.id.toString() === over.id);
      if (oldIndex !== newIndex) {
        const newColumns = arrayMove(columns, oldIndex, newIndex);
        // Update order in backend for all affected columns
        for (let i = 0; i < newColumns.length; i++) {
          if (newColumns[i].order !== i + 1) {
            await boardApi.updateColumn(newColumns[i].id, { order: i + 1 });
          }
        }
        await fetchColumns();
      }
      return;
    }

    // --- TASK DRAG (existing logic) ---
    // Find source column
    const sourceCol = columns.find(col =>
      col.tasks.some(t => t.id.toString() === active.id)
    );

    // Find destination column
    let destCol: Column | undefined;
    // If dropped onto a task, find its column
    destCol = columns.find(col =>
      col.tasks.some(t => t.id.toString() === over.id)
    );
    // If dropped onto a column (empty space), find by column droppable id
    if (!destCol && typeof over.id === "string" && over.id.startsWith("col-")) {
      const colId = Number(over.id.replace("col-", ""));
      destCol = columns.find(col => col.id === colId);
    }

    // Debugging logs
    console.log("active.id", active.id, "over.id", over.id, typeof over.id);
    console.log("destCol", destCol);

    if (!sourceCol || !destCol) return;

    // If dropped in the same column, reorder
    if (sourceCol.id === destCol.id) {
      const oldIndex = sourceCol.tasks.findIndex(
        t => t.id.toString() === active.id
      );
      const newIndex = destCol.tasks.findIndex(
        t => t.id.toString() === over.id
      );

      // If dropped into empty space, newIndex will be -1
      if (newIndex === -1) {
        // Place at end
        await boardApi.updateTask(sourceCol.tasks[oldIndex].id, { order: destCol.tasks.length });
        await fetchColumns();
        return;
      }

      if (oldIndex !== newIndex) {
        const newTasks = arrayMove(sourceCol.tasks, oldIndex, newIndex);
        for (let i = 0; i < newTasks.length; i++) {
          if (newTasks[i].order !== i + 1) {
            await boardApi.updateTask(newTasks[i].id, { order: i + 1 });
          }
        }
        await fetchColumns();
      }
    } else {
      // Move to another column
      const task = sourceCol.tasks.find(t => t.id.toString() === active.id);
      if (task) {
        await boardApi.updateTask(task.id, {
          columnId: destCol.id,
          order: destCol.tasks.length + 1,
        });
        await fetchColumns();
      }
    }
  }

  if (loading) return <div className="p-8">Loading board...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!board) return <div className="p-8">Board not found.</div>;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={event => setActiveTaskId(event.active.id.toString())}
      onDragEnd={event => {
        setActiveTaskId(null);
        handleDragEnd(event);
      }}
    >
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">{board.name}</h1>
        <button
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => setShowAddColumn(true)}
        >
          + Add Column
        </button>
        <SimpleModal
          open={showAddColumn}
          onClose={() => setShowAddColumn(false)}
        >
          <form
            onSubmit={handleAddColumn}
            className="flex flex-col gap-4"
          >
            <h2 className="text-xl font-bold mb-2">Create Column</h2>
            <input
              type="text"
              placeholder="Column name"
              value={newColumnName}
              onChange={e => setNewColumnName(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                Add
              </button>
              <button
                type="button"
                className="px-4 py-2"
                onClick={() => setShowAddColumn(false)}
              >
                Cancel
              </button>
            </div>
            {addColumnError && (
              <div className="text-red-600">{addColumnError}</div>
            )}
          </form>
        </SimpleModal>
        <div className="flex gap-4">
          <SortableContext
            items={columns.map(col => col.id.toString())}
            strategy={horizontalListSortingStrategy}
          >
            {columns.map(col => (
              <SortableColumn
                key={col.id}
                col={col}
                tasks={col.tasks}
                activeTaskId={activeTaskId}
                onTaskClick={task => {
                  setSelectedTask(task);
                  setShowTaskModal(true);
                }}
                onChanged={fetchColumns}
              />
            ))}
          </SortableContext>
        </div>
        {showTaskModal && selectedTask && (
          <TaskModal
            task={selectedTask}
            onClose={() => setShowTaskModal(false)}
            onChanged={fetchColumns}
          />
        )}
        <DragOverlay>
          {activeTaskId
            ? (() => {
                const task = columns.flatMap(col => col.tasks).find(t => t.id.toString() === activeTaskId);
                return task ? (
                  <li
                    className="bg-white rounded-md shadow p-3 text-left min-w-[180px] opacity-90"
                    style={{ cursor: "grabbing" }}
                  >
                    <span>{task.title}</span>
                  </li>
                ) : null;
              })()
            : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

function AddTaskForm({
  columnId,
  onTaskAdded,
}: {
  columnId: number;
  onTaskAdded: () => void;
}) {
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await boardApi.createTask(columnId, title, desc);
      setTitle("");
      setDesc("");
      setShow(false);
      onTaskAdded();
    } catch (err: any) {
      setError(err?.message || "Failed to add task.");
    }
  }

  return (
    <>
      <button
        className="mt-2 text-sm text-blue-600 hover:underline"
        onClick={() => setShow(true)}
      >
        + Add Task
      </button>
      <SimpleModal open={show} onClose={() => setShow(false)}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h2 className="text-xl font-bold mb-2">Create Task</h2>
          <input
            type="text"
            placeholder="Task title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Add
            </button>
            <button
              type="button"
              className="px-4 py-2"
              onClick={() => setShow(false)}
            >
              Cancel
            </button>
          </div>
          {error && <div className="text-red-600">{error}</div>}
        </form>
      </SimpleModal>
    </>
  );
}

function ColumnActions({
  column,
  onChanged,
}: {
  column: Column;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.name);
  const [error, setError] = useState<string | null>(null);

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await boardApi.updateColumn(column.id, { name });
      setEditing(false);
      onChanged();
    } catch (err: any) {
      setError(err?.message || "Failed to update column.");
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this column and all its tasks?")) return;
    try {
      await boardApi.deleteColumn(column.id);
      onChanged();
    } catch (err: any) {
      setError(err?.message || "Failed to delete column.");
    }
  }

  if (editing) {
    return (
      <form onSubmit={handleEdit} className="flex gap-2 items-center">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
          required
        />
        <button
          type="submit"
          className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
        >
          Save
        </button>
        <button
          type="button"
          className="text-xs px-2 py-1"
          onClick={() => setEditing(false)}
        >
          Cancel
        </button>
        {error && <span className="text-red-600 text-xs">{error}</span>}
      </form>
    );
  }

  return (
    <span className="flex gap-2">
      <button
        className="text-xs text-blue-600 hover:underline"
        onClick={() => setEditing(true)}
      >
        Edit
      </button>
      <button
        className="text-xs text-red-600 hover:underline"
        onClick={handleDelete}
      >
        Delete
      </button>
      {error && <span className="text-red-600 text-xs">{error}</span>}
    </span>
  );
}

function TaskModal({
  task,
  onClose,
  onChanged,
}: {
  task: Task;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description || "");
  const [error, setError] = useState<string | null>(null);

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await boardApi.updateTask(task.id, { title, description: desc });
      setEditing(false);
      onChanged();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update task.");
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this task?")) return;
    try {
      await boardApi.deleteTask(task.id);
      onChanged();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to delete task.");
    }
  }

  // Prevent click inside modal from closing
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <SimpleModal
      open={true}
      onClose={onClose}
      onOverlayClick={handleOverlayClick}
    >
      {editing ? (
        <form onSubmit={handleEdit} className="flex flex-col gap-2">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
            required
          />
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
            placeholder="Description"
          />
          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              className="bg-blue-500 text-white px-3 py-1 rounded"
            >
              Save
            </button>
            <button
              type="button"
              className="px-3 py-1"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
          {error && <span className="text-red-600 text-xs">{error}</span>}
        </form>
      ) : (
        <div>
          <h3 className="text-lg font-bold mb-2">{task.title}</h3>
          {task.description && <p className="mb-2">{task.description}</p>}
          {/* TODO: Show assigned user if available */}
          <div className="flex gap-2 mt-4">
            <button
              className="bg-blue-500 text-white px-3 py-1 rounded"
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
            <button
              className="bg-red-500 text-white px-3 py-1 rounded"
              onClick={handleDelete}
            >
              Delete
            </button>
          </div>
          {error && <span className="text-red-600 text-xs">{error}</span>}
        </div>
      )}
    </SimpleModal>
  );
}

function SimpleModal({
  open,
  onClose,
  children,
  onOverlayClick,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  onOverlayClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  if (!open) return null;
  return createPortal(
    <div
      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
      className="fixed inset-0 flex items-center justify-center z-50"
      onClick={onOverlayClick || onClose}
      tabIndex={-1}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          ×
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}

// DraggableTask component
function DraggableTask({
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

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
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

function DroppableColumn({ col, children }: { col: Column; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: `col-${col.id}` });
  return (
    <div ref={setNodeRef} className="bg-gray-200 rounded-lg p-4 min-w-[220px]">
      {children}
    </div>
  );
}

function SortableColumn({
  col,
  tasks,
  activeTaskId,
  onTaskClick,
  onChanged,
}: {
  col: Column;
  tasks: Task[];
  activeTaskId: string | null;
  onTaskClick: (task: Task) => void;
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

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <h2 className="font-semibold mb-2 flex justify-between items-center">
        <span>{col.name}</span>
        <ColumnActions column={col} onChanged={onChanged} />
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
                    activeTaskId={activeTaskId}
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