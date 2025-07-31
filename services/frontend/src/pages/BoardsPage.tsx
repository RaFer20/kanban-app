import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { boardApi } from "../lib/api";
import { BoardCard, CreateBoardForm } from "../components";
import type { Board } from "../types/board";


export function BoardsPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBoards();    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <CreateBoardForm
          onCreated={() => {
            setShowForm(false);
            fetchBoards();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
      {boards.length === 0 ? (
        <div>No boards found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {boards.map(board => (
            <BoardCard key={board.id} board={board} onClick={() => navigate(`/boards/${board.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}