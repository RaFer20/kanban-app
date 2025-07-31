import { useState } from "react";
import { SimpleModal } from "./SimpleModal";
import type { Task } from "../types/board";
import { boardApi } from "../lib/api";

export function TaskModal({
  task,
  onClose,
  onChanged,
}: {
  task: Task;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description || "");
  const [error, setError] = useState<string | null>(null);

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await boardApi.updateTask(task.id, { title, description: desc });
      setEditing(false);
      onChanged();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update task.");
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this task?")) return;
    try {
      await boardApi.deleteTask(task.id);
      onChanged();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to delete task.");
    }
  }

  // Prevent click inside modal from closing
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <SimpleModal
      open={true}
      onClose={onClose}
      onOverlayClick={handleOverlayClick}
    >
      {editing ? (
        <form onSubmit={handleEdit} className="flex flex-col gap-2">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
            required
          />
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
            placeholder="Description"
          />
          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              className="bg-blue-500 text-white px-3 py-1 rounded"
            >
              Save
            </button>
            <button
              type="button"
              className="px-3 py-1"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
          {error && <span className="text-red-600 text-xs">{error}</span>}
        </form>
      ) : (
        <div>
          <h3 className="text-lg font-bold mb-2">{task.title}</h3>
          {task.description && <p className="mb-2">{task.description}</p>}
          {/* TODO: Show assigned user if available */}
          <div className="flex gap-2 mt-4">
            <button
              className="bg-blue-500 text-white px-3 py-1 rounded"
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
            <button
              className="bg-red-500 text-white px-3 py-1 rounded"
              onClick={handleDelete}
            >
              Delete
            </button>
          </div>
          {error && <span className="text-red-600 text-xs">{error}</span>}
        </div>
      )}
    </SimpleModal>
  );
}