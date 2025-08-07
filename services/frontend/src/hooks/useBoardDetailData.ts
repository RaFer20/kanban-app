import { useEffect, useState } from "react";
import { boardApi } from "../lib/api";
import type { Board, Column } from "../types/board";

export function useBoardDetailData(boardId: string | undefined) {
  const [board, setBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchColumns() {
    try {
      const columnsData = await boardApi.getBoardColumns(Number(boardId));
      setColumns(columnsData);
    } catch {
      setError("Failed to load columns.");
    }
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const boardData = await boardApi.getBoard(Number(boardId));
        setBoard(boardData);
        await fetchColumns();
      } catch {
        setError("Failed to load board details.");
      } finally {
        setLoading(false);
      }
    }
    if (boardId) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  return { board, columns, setColumns, loading, error, fetchColumns };
}