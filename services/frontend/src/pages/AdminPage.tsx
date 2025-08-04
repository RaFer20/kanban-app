import { useEffect, useState } from "react";
import { boardApi, authApi } from "../lib/api";
import type { Board } from "../types/board";

type User = { id: number; email: string };

export function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetMsg, setResetMsg] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const usersData = await authApi.getAllUsers();
        const boardsData = await boardApi.getAllBoardsAdmin();
        setUsers(usersData);
        setBoards(boardsData);
      } catch (err) {
        // handle error
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function handleResetDemo() {
    setResetMsg("Resetting...");
    try {
      const result = await boardApi.resetDemoData();
      setResetMsg(result.message || "Demo data reset!");
    } catch (err) {
      setResetMsg("Failed to reset demo data.");
    }
  }

  return (
    <div>
      <h2>Admin Panel</h2>
      <button onClick={handleResetDemo}>Reset Demo Data</button>
      <p>{resetMsg}</p>
      <h3>All Users</h3>
      {loading ? <div>Loading...</div> : (
        <ul>
          {users.map(u => <li key={u.id}>{u.email}</li>)}
        </ul>
      )}
      <h3>All Boards</h3>
      {loading ? <div>Loading...</div> : (
        <ul>
          {boards.map(b => <li key={b.id}>{b.name}</li>)}
        </ul>
      )}
    </div>
  );
}