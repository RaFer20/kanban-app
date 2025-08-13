import { useState } from "react";
import { SimpleModal } from "./SimpleModal";
import type { Task } from "../types/board";
import { boardApi } from "../lib/api";

export function TaskModal({
  task,
  onClose,
  onChanged,
  user,
  boardMembers,
  users,
}: {
  task: Task;
  onClose: () => void;
  onChanged: () => void;
  user: { id: number } | null | undefined;
  boardMembers: Array<{ userId: number; email: string; role: string }>;
  users: Array<{ id: number; email: string }>;
}) {
  const myUserId = typeof user?.id === "number" ? user.id : -1;
  const userRole =
    boardMembers.find((m: { userId: number; role: string }) => m.userId === myUserId)?.role || "VIEWER";

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description || "");
  const [error, setError] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId || "");
  const [assignError, setAssignError] = useState<string | null>(null);

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

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setAssignError(null);
    try {
      await boardApi.updateTask(task.id, { assigneeId: assigneeId ? Number(assigneeId) : null });
      onChanged();
      onClose();
    } catch (err: any) {
      setAssignError(err?.message || "Failed to assign task.");
    }
  }

  // Prevent click inside modal from closing
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function getEmail(userId: number) {
    const user = users.find(u => u.id === userId);
    if (user) return user.email;
    const member = boardMembers.find(m => m.userId === userId);
    if (member && member.email) return member.email;
    return `User ${userId}`;
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
          {/* Assignment Section */}
          {(userRole === "OWNER" || userRole === "EDITOR") && (
            <form onSubmit={handleAssign} className="mb-2">
              <label className="block text-sm mb-1">Assign to:</label>
              <select
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
                className="border rounded px-2 py-1 text-sm mb-2"
              >
                <option value="">Unassigned</option>
                {boardMembers.map(m => (
                  <option key={m.userId} value={m.userId}>
                    {getEmail(m.userId)}
                    {m.userId === myUserId ? " (me)" : ""}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="bg-blue-500 text-white px-3 py-1 rounded"
              >
                Save Assignment
              </button>
              {assignError && <span className="text-red-600 text-xs">{assignError}</span>}
            </form>
          )}
          {/* Show assigned user if available */}
          {task.assigneeId && (
            <div className="text-xs text-gray-500 mb-2">
              Assigned to: {getEmail(task.assigneeId)}
            </div>
          )}
          <div className="text-xs text-gray-400 mb-2">Role: {userRole}</div>
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