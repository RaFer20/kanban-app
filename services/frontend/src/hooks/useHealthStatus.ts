import { useState, useEffect } from "react";

const authUrl = import.meta.env.VITE_AUTH_API_URL || "http://localhost:8000";
const boardUrl = import.meta.env.VITE_BOARD_API_URL || "http://localhost:3000";

export function useHealthStatus() {
  const [status, setStatus] = useState({ auth: false, board: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkHealth() {
      try {
        const authRes = await fetch(`${authUrl}/health`);
        const boardRes = await fetch(`${boardUrl}/health`);
        setStatus({
          auth: (await authRes.json()).status === "ok",
          board: (await boardRes.json()).status === "ok",
        });
      } catch {
        setStatus({ auth: false, board: false });
      } finally {
        setLoading(false);
      }
    }
    checkHealth();
  }, []);

  return { status, loading };
}