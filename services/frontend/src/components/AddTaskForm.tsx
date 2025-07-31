import { useState } from "react";
import { SimpleModal } from "./SimpleModal";
import { boardApi } from "../lib/api";

export function AddTaskForm({
  columnId,
  onTaskAdded,
}: {
  columnId: number;
  onTaskAdded: () => void;
}) {
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await boardApi.createTask(columnId, title, desc);
      setTitle("");
      setDesc("");
      setShow(false);
      onTaskAdded();
    } catch (err: any) {
      setError(err?.message || "Failed to add task.");
    }
  }

  return (
    <>
      <button
        className="mt-2 text-sm text-blue-600 hover:underline"
        onClick={() => setShow(true)}
      >
        + Add Task
      </button>
      <SimpleModal open={show} onClose={() => setShow(false)}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h2 className="text-xl font-bold mb-2">Create Task</h2>
          <input
            type="text"
            placeholder="Task title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Add
            </button>
            <button
              type="button"
              className="px-4 py-2"
              onClick={() => setShow(false)}
            >
              Cancel
            </button>
          </div>
          {error && <div className="text-red-600">{error}</div>}
        </form>
      </SimpleModal>
    </>
  );
}