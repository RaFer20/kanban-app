import { useState, useEffect } from "react";
import type { Board, Column } from "../types/board";
import { boardApi } from "../lib/api";

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

  async function fetchBoard() {
    setLoading(true);
    setError(null);
    try {
      const data = await boardApi.getBoard(Number(boardId));
      setBoard({
        ...data,
        members: data.members.map((m: any) => ({
          ...m,
          role: m.role as "OWNER" | "EDITOR" | "VIEWER"
        }))
      });
      await fetchColumns();
    } catch {
      setError("Failed to load board details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (boardId) fetchBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  return { board, columns, setColumns, loading, error, fetchColumns, fetchBoard };
}