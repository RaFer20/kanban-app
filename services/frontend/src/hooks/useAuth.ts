// filepath: /home/zinath/stuff/small_projects/kanban-app/services/frontend/src/hooks/useAuth.ts
import { useContext } from "react";
import { AuthContext } from "../App";

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}