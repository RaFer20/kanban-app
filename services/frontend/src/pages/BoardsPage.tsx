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
  const [viewOwned, setViewOwned] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchBoards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewOwned]);

  function fetchBoards() {
    setLoading(true);
    const fetchFn = viewOwned ? boardApi.getOwnedBoards : boardApi.getBoards;
    fetchFn()
      .then(result => {
        setBoards(result.items);
        setLoading(false);
      })
      .catch(_ => {
        setError("Failed to load boards.");
        setLoading(false);
      });
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid mb-4"></div>
      <div className="text-lg text-gray-700">Loading boards...</div>
    </div>
  );
  if (error) return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="text-red-600 text-lg mb-2">{error}</div>
      <button
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={fetchBoards}
      >
        Retry
      </button>
    </div>
  );

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold mb-6 text-center md:text-left">My Boards</h1>
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <button
          className={`px-4 py-2 rounded ${!viewOwned ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          onClick={() => setViewOwned(false)}
        >
          All Boards
        </button>
        <button
          className={`px-4 py-2 rounded ${viewOwned ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          onClick={() => setViewOwned(true)}
        >
          Owned Boards
        </button>
      </div>
      <button
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full sm:w-auto"
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
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mb-2">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2m-6 0h6m-6 0a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2m-6 0v2a2 2 0 002 2h6a2 2 0 002-2v-2" />
          </svg>
          <span>No boards found. Create your first board!</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map(board => (
            <BoardCard key={board.id} board={board} onClick={() => navigate(`/boards/${board.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}