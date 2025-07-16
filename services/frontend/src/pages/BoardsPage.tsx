import { useEffect, useState } from "react";
import { boardApi } from "../lib/api";

type Board = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export function BoardsPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    boardApi.getBoards()
      .then(result => {
        setBoards(result.items);
        setLoading(false);
      })
      .catch(_ => {
        setError("Failed to load boards.");
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8">Loading boards...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">My Boards</h1>
      {boards.length === 0 ? (
        <div>No boards found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {boards.map(board => (
            <div key={board.id} className="p-4 border rounded shadow bg-white">
              <h2 className="font-semibold text-lg">{board.name}</h2>
              <p className="text-sm text-gray-500">
                Created: {new Date(board.createdAt).toLocaleDateString()}
              </p>
              {/* Add a link to view board details here in the future */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}