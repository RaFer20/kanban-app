import type { Column } from "../types/board";

export function BoardDragOverlay({
  activeColumnId,
  activeTaskId,
  columns,
}: {
  activeColumnId: string | null;
  activeTaskId: string | null;
  columns: Column[];
}) {
  if (activeColumnId) {
    const col = columns.find(c => c.id.toString() === activeColumnId);
    if (!col) return null;
    return (
      <div
        className="bg-gray-200 rounded-lg p-4 min-w-[220px] max-w-[320px] shadow-lg"
        style={{
          opacity: 0.95,
          border: "2px solid #3b82f6",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        }}
      >
        <h2 className="font-semibold mb-2 flex justify-between items-center">
          <span>{col.name}</span>
        </h2>
        <ul className="space-y-2">
          {col.tasks && col.tasks.length > 0 ? (
            col.tasks
              .sort((a, b) => a.order - b.order)
              .map(task => (
                <li
                  key={task.id}
                  className="bg-white rounded-md shadow p-3 text-left min-w-[180px] opacity-70"
                >
                  <span>{task.title}</span>
                </li>
              ))
          ) : (
            <li className="text-gray-500">No tasks</li>
          )}
        </ul>
      </div>
    );
  }
  if (activeTaskId) {
    const col = columns.find(c =>
      c.tasks.some(t => t.id.toString() === activeTaskId)
    );
    const task = col?.tasks.find(t => t.id.toString() === activeTaskId);
    if (!task) return null;
    return (
      <li
        className="bg-white rounded-md shadow p-3 text-left min-w-[180px]"
        style={{
          opacity: 0.9,
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        }}
      >
        <span>{task.title}</span>
      </li>
    );
  }
  return null;
}