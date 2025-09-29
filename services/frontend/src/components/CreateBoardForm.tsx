import { useState, useEffect } from "react";
import { boardApi } from "../lib/api";

type CreateBoardFormProps = {
  onCreated: () => void;
  onCancel: () => void;
};

export function CreateBoardForm({ onCreated, onCancel }: CreateBoardFormProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError(null);
  }, [name]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await boardApi.createBoard(name);
      setName("");
      onCreated();
    } catch (err: any) {
      setError(err?.message || "Failed to create board.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 p-4 bg-gray-100 rounded shadow-lg w-full max-w-xs sm:max-w-md mx-auto flex flex-col gap-4 transition-shadow duration-200"
    >
      {error && <div className="text-red-600">{error}</div>}
      <input
        type="text"
        placeholder="Board name"
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-400 transition"
        required
        disabled={loading}
      />
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded w-full sm:w-auto transition hover:bg-blue-600 hover:scale-105 active:scale-95"
          disabled={loading}
        >
          {loading ? "Creating..." : "Create"}
        </button>
        <button
          type="button"
          className="px-4 py-2 rounded border w-full sm:w-auto transition hover:bg-gray-200 hover:scale-105 active:scale-95"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}