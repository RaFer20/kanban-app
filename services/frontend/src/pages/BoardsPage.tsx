import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const [showForm, setShowForm] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBoards();
  }, []);

  function fetchBoards() {
    setLoading(true);
    boardApi.getBoards()
      .then(result => {
        setBoards(result.items);
        setLoading(false);
      })
      .catch(_ => {
        setError("Failed to load boards.");
        setLoading(false);
      });
  }

  async function handleCreateBoard(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    try {
      await boardApi.createBoard(newBoardName);
      setShowForm(false);
      setNewBoardName("");
      fetchBoards(); // Refresh list
    } catch (err: any) {
      setCreateError(err?.message || "Failed to create board.");
    }
  }

  if (loading) return <div className="p-8">Loading boards...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">My Boards</h1>
      <button
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={() => setShowForm(true)}
      >
        + Create Board
      </button>
      {showForm && (
        <form onSubmit={handleCreateBoard} className="mb-6 p-4 bg-gray-100 rounded shadow w-full max-w-md">
          <input
            type="text"
            placeholder="Board name"
            value={newBoardName}
            onChange={e => setNewBoardName(e.target.value)}
            className="w-full p-2 mb-2 border rounded"
            required
          />
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded mr-2">Create</button>
          <button type="button" className="px-4 py-2" onClick={() => setShowForm(false)}>Cancel</button>
          {createError && <div className="mt-2 text-red-600">{createError}</div>}
        </form>
      )}
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
              <button
                className="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={() => navigate(`/boards/${board.id}`)}
              >
                View Board
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}