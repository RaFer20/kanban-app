import { LoginForm } from "../components";
import { useHealthStatus } from "../hooks/useHealthStatus";

export function LoginPage() {
  const { status, loading } = useHealthStatus();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-solid mb-4"></div>
        <div className="text-lg text-gray-700">Checking service health...</div>
      </div>
    );
  }

  if (!status.auth || !status.board) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-600 text-lg mb-2">Some services are unavailable.</div>
        <div className="text-gray-700">Please wait or try again later.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <LoginForm />
    </div>
  );
}