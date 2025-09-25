import type { Board } from "../types/board";

export function BoardCard({ board, onClick }: { board: Board; onClick: () => void }) {
  return (
    <div
      className="p-4 border rounded shadow bg-white w-full flex flex-col gap-2 hover:shadow-xl hover:scale-[1.02] transition duration-200 cursor-pointer group"
      tabIndex={0}
      role="button"
      aria-label={`View board ${board.name}`}
      onClick={onClick}
      onKeyDown={e => (e.key === "Enter" || e.key === " ") && onClick()}
    >
      <h2 className="font-semibold text-lg group-hover:text-blue-700 transition">{board.name}</h2>
      <p className="text-sm text-gray-500">
        Created: {new Date(board.createdAt).toLocaleDateString()}
      </p>
      <button
        className="mt-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:ring-2 focus:ring-blue-400 w-full transition"
        onClick={onClick}
        tabIndex={-1}
      >
        View Board
      </button>
    </div>
  );
}