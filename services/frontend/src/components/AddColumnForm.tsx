import { useState, useEffect } from "react";
import { boardApi } from "../lib/api";

export function AddColumnForm({ boardId, onAdded, onCancel }: { boardId: number; onAdded: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setError(null); }, [name]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await boardApi.createColumn(boardId, name);
      setName("");
      onAdded();
    } catch (err: any) {
      setError(err?.message || "Failed to add column.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-xs sm:max-w-md mx-auto p-4">
      <h2 className="text-xl font-bold mb-2 text-center sm:text-left">Create Column</h2>
      <input
        type="text"
        placeholder="Column name"
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full p-2 border rounded"
        required
        disabled={loading}
      />
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded w-full sm:w-auto transition hover:bg-blue-700 hover:scale-105"
          disabled={loading}
        >
          {loading ? "Adding..." : "Add"}
        </button>
        <button
          type="button"
          className="px-4 py-2 rounded border w-full sm:w-auto transition hover:bg-gray-100 dark:hover:bg-zinc-700 hover:scale-105"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </button>
      </div>
      {error && <div className="text-red-600">{error}</div>}
    </form>
  );
}