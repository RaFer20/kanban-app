import { Navigate } from "react-router-dom";
import { useAuth } from "../App";

export function CatchAllRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return <Navigate to={user ? "/boards" : "/login"} />;
}
