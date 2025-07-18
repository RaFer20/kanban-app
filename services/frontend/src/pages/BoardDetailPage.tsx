import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { boardApi } from "../lib/api";

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

  if (loading) return <div className="p-8">Loading board...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!board) return <div className="p-8">Board not found.</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">{board.name}</h1>
      <button
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={() => setShowAddColumn(true)}
      >
        + Add Column
      </button>
      <SimpleModal open={showAddColumn} onClose={() => setShowAddColumn(false)}>
        <form onSubmit={handleAddColumn} className="flex flex-col gap-4">
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
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Add</button>
            <button type="button" className="px-4 py-2" onClick={() => setShowAddColumn(false)}>Cancel</button>
          </div>
          {addColumnError && <div className="text-red-600">{addColumnError}</div>}
        </form>
      </SimpleModal>
      <div className="flex gap-4">
        {columns.map(col => (
          <div key={col.id} className="bg-gray-200 rounded-lg p-4 min-w-[220px]">
            <h2 className="font-semibold mb-2 flex justify-between items-center">
              <span>{col.name}</span>
              <ColumnActions column={col} onChanged={fetchColumns} />
            </h2>
            <ul className="space-y-2">
              {col.tasks && col.tasks.length > 0 ? (
                col.tasks.map(task => (
                  <li
                    key={task.id}
                    className="bg-white rounded-md shadow p-3 text-left cursor-pointer"
                    onClick={() => {
                      setSelectedTask(task);
                      setShowTaskModal(true);
                    }}
                  >
                    <span>{task.title}</span>
                  </li>
                ))
              ) : (
                <li className="text-gray-500">No tasks</li>
              )}
            </ul>
            <AddTaskForm columnId={col.id} onTaskAdded={fetchColumns} />
          </div>
        ))}
      </div>
      {showTaskModal && selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setShowTaskModal(false)}
          onChanged={fetchColumns}
        />
      )}
    </div>
  );
}

function AddTaskForm({ columnId, onTaskAdded }: { columnId: number; onTaskAdded: () => void }) {
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
      <button className="mt-2 text-sm text-blue-600 hover:underline" onClick={() => setShow(true)}>
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
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Add</button>
            <button type="button" className="px-4 py-2" onClick={() => setShow(false)}>Cancel</button>
          </div>
          {error && <div className="text-red-600">{error}</div>}
        </form>
      </SimpleModal>
    </>
  );
}

function ColumnActions({ column, onChanged }: { column: Column; onChanged: () => void }) {
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
        <button type="submit" className="text-xs bg-blue-500 text-white px-2 py-1 rounded">Save</button>
        <button type="button" className="text-xs px-2 py-1" onClick={() => setEditing(false)}>Cancel</button>
        {error && <span className="text-red-600 text-xs">{error}</span>}
      </form>
    );
  }

  return (
    <span className="flex gap-2">
      <button className="text-xs text-blue-600 hover:underline" onClick={() => setEditing(true)}>Edit</button>
      <button className="text-xs text-red-600 hover:underline" onClick={handleDelete}>Delete</button>
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
    <SimpleModal open={true} onClose={onClose} onOverlayClick={handleOverlayClick}>
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
            <button type="submit" className="bg-blue-500 text-white px-3 py-1 rounded">Save</button>
            <button type="button" className="px-3 py-1" onClick={() => setEditing(false)}>Cancel</button>
          </div>
          {error && <span className="text-red-600 text-xs">{error}</span>}
        </form>
      ) : (
        <div>
          <h3 className="text-lg font-bold mb-2">{task.title}</h3>
          {task.description && <p className="mb-2">{task.description}</p>}
          {/* TODO: Show assigned user if available */}
          <div className="flex gap-2 mt-4">
            <button className="bg-blue-500 text-white px-3 py-1 rounded" onClick={() => setEditing(true)}>Edit</button>
            <button className="bg-red-500 text-white px-3 py-1 rounded" onClick={handleDelete}>Delete</button>
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