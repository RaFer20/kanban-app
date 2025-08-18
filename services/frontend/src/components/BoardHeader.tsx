export function BoardHeader({
  boardName,
  onAddColumn,
  actions,
}: {
  boardName: string;
  onAddColumn: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{boardName}</h1>
      <div className="flex items-center gap-2 mb-4">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={onAddColumn}
        >
          + Add Column
        </button>
        {actions}
      </div>
    </div>
  );
}