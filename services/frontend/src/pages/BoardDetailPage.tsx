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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const boardData = await boardApi.getBoard(Number(boardId));
        const columnsData = await boardApi.getBoardColumns(Number(boardId));
        setBoard(boardData);
        setColumns(columnsData);
      } catch (err) {
        setError("Failed to load board details.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [boardId]);

  if (loading) return <div className="p-8">Loading board...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!board) return <div className="p-8">Board not found.</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">{board.name}</h1>
      <div className="flex gap-4">
        {columns.map(col => (
          <div key={col.id} className="bg-gray-100 rounded p-4 min-w-[200px]">
            <h2 className="font-semibold">{col.name}</h2>
            <ul>
              {col.tasks && col.tasks.length > 0 ? (
                col.tasks.map(task => (
                  <li key={task.id} className="mb-2 p-2 bg-white rounded shadow">
                    {task.title}
                  </li>
                ))
              ) : (
                <li className="text-gray-400">No tasks</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}