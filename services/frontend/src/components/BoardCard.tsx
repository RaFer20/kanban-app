import type { Board } from "../types/board";

export function BoardCard({ board, onClick }: { board: Board; onClick: () => void }) {
  return (
    <div className="p-4 border rounded shadow bg-white w-full flex flex-col gap-2 hover:shadow-lg transition cursor-pointer">
      <h2 className="font-semibold text-lg">{board.name}</h2>
      <p className="text-sm text-gray-500">
        Created: {new Date(board.createdAt).toLocaleDateString()}
      </p>
      <button
        className="mt-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 w-full"
        onClick={onClick}
      >
        View Board
      </button>
    </div>
  );
}