export function BoardHeader({
  boardName,
  onAddColumn,
}: {
  boardName: string;
  onAddColumn: () => void;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{boardName}</h1>
      <button
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={onAddColumn}
      >
        + Add Column
      </button>
    </div>
  );
}