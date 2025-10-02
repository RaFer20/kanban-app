import { useState, useRef, useEffect } from "react";
import { SimpleModal } from "./SimpleModal";
import type { Column } from "../types/board";
import { boardApi } from "../lib/api";

export function ColumnModal({
  column,
  onClose,
  onChanged,
}: {
  column: Column;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.name);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await boardApi.updateColumn(column.id, { name });
      setEditing(false);
      onChanged();
    } catch (err: any) {
      setError(err?.message || "Failed to update column.");
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this column and all its tasks?")) return;
    try {
      await boardApi.deleteColumn(column.id);
      onChanged();
    } catch (err: any) {
      setError(err?.message || "Failed to delete column.");
    }
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <SimpleModal open={true} onClose={onClose} onOverlayClick={handleOverlayClick}>
      <div className="bg-card text-card-foreground p-4 rounded">
        {editing ? (
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            <h2 className="text-xl md:text-2xl font-bold mb-2 md:mb-4">Edit Column</h2>
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded w-full sm:w-auto">
                Save
              </button>
              <button type="button" className="px-4 py-2 rounded border w-full sm:w-auto" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
            {error && <div className="text-red-600">{error}</div>}
          </form>
        ) : (
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-2 md:mb-4">{column.name}</h2>
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded w-full sm:w-auto"
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
              <button
                className="bg-red-500 text-white px-4 py-2 rounded w-full sm:w-auto"
                onClick={handleDelete}
              >
                Delete
              </button>
              <button className="px-4 py-2 rounded border w-full sm:w-auto" onClick={onClose}>
                Close
              </button>
            </div>
            {error && <div className="text-red-600 mt-2">{error}</div>}
          </div>
        )}
      </div>
    </SimpleModal>
  );
}