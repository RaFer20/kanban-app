import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "../App";
import { UserInfoModal } from "./UserInfoModal";
import { boardApi } from "../lib/api";

export function AuthHeader() {
  const { user, logout } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [boardsOwned, setBoardsOwned] = useState(0);
  const [boardsMember, setBoardsMember] = useState(0);

  useEffect(() => {
    if (!user) return;
    // Fetch counts of boards owned and member of
    boardApi.getOwnedBoards().then(result => {
      setBoardsOwned(result.items.length);
    });
    boardApi.getBoards().then(result => {
      setBoardsMember(result.items.length);
    });
  }, [user]);

  if (!user) return null;

  return (
    <div className="flex items-center space-x-4">
      <span
        className="text-black cursor-pointer underline"
        onClick={() => setModalOpen(true)}
        title="View account info"
      >
        {user.email}
      </span>
      {user.role === "admin" && (
        <Button asChild>
          <Link to="/admin">Admin Panel</Link>
        </Button>
      )}
      <Button 
        variant="destructive"
        size="sm"
        onClick={logout}
      >
        Logout
      </Button>
      <UserInfoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        email={user.email}
        role={user.role}
        joined={user.created_at ?? ""}
        boardsOwned={boardsOwned}
        boardsMember={boardsMember}
      />
    </div>
  );
}