import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
      {showAddColumn && (
        <form onSubmit={handleAddColumn} className="mb-6 p-4 bg-gray-100 rounded shadow w-full max-w-md">
          <input
            type="text"
            placeholder="Column name"
            value={newColumnName}
            onChange={e => setNewColumnName(e.target.value)}
            className="w-full p-2 mb-2 border rounded"
            required
          />
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded mr-2">Add</button>
          <button type="button" className="px-4 py-2" onClick={() => setShowAddColumn(false)}>Cancel</button>
          {addColumnError && <div className="mt-2 text-red-600">{addColumnError}</div>}
        </form>
      )}
      <div className="flex gap-4">
        {columns.map(col => (
          <div key={col.id} className="bg-gray-200 rounded-lg p-4 min-w-[220px]">
            <h2 className="font-semibold mb-2">{col.name}</h2>
            <ul className="space-y-2">
              {col.tasks && col.tasks.length > 0 ? (
                col.tasks.map(task => (
                  <li
                    key={task.id}
                    className="bg-white rounded-md shadow p-3 text-left"
                  >
                    {task.title}
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

  if (!show) {
    return (
      <button className="mt-2 text-sm text-blue-600 hover:underline" onClick={() => setShow(true)}>
        + Add Task
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2">
      <input
        type="text"
        placeholder="Task title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="w-full p-1 mb-1 border rounded"
        required
      />
      <input
        type="text"
        placeholder="Description (optional)"
        value={desc}
        onChange={e => setDesc(e.target.value)}
        className="w-full p-1 mb-1 border rounded"
      />
      <button type="submit" className="bg-blue-500 text-white px-2 py-1 rounded mr-2 text-xs">Add</button>
      <button type="button" className="px-2 py-1 text-xs" onClick={() => setShow(false)}>Cancel</button>
      {error && <div className="text-red-600 text-xs mt-1">{error}</div>}
    </form>
  );
}