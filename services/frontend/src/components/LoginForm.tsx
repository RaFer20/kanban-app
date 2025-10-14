import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../App";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/boards");
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError(null);
    setGuestLoading(true);
    try {
      await login("guest@example.com", "guest123");
      navigate("/boards");
    } catch (err) {
      setError("Guest login failed");
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="
        p-6 sm:p-8
        rounded
        shadow-md
        w-full max-w-xs sm:max-w-sm
        border-2 border-blue-300 dark:border-border
        mx-auto flex flex-col gap-4
        transition-transform duration-200
        hover:shadow-lg hover:scale-[1.01]
        focus-within:shadow-lg focus-within:scale-[1.01]
      "
    >
      <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center text-foreground dark:text-card-foreground">Login</h2>
      {error && <div className="mb-4 text-red-600 text-base">{error}</div>}
      <input
        type="email"
        placeholder="Email"
        className="input-visible-border w-full h-12 px-3 rounded shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-blue-50 dark:focus:bg-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 transition text-base"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        className="input-visible-border w-full h-12 px-3 rounded shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-blue-50 dark:focus:bg-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 transition text-base"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
      />
      <button
        type="submit"
        className="w-full h-12 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center justify-center gap-2 text-base"
        disabled={loading}
      >
        {loading && (
          <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-white border-solid"></span>
        )}
        {loading ? "Logging in..." : "Login"}
      </button>
      <button
        type="button"
        className="w-full h-12 bg-teal-600 text-white rounded mt-2 hover:bg-teal-700 transition flex items-center justify-center gap-2 text-base"
        onClick={handleGuestLogin}
        disabled={guestLoading}
      >
        {guestLoading && (
          <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-white border-solid"></span>
        )}
        {guestLoading ? "Logging in..." : "Log in as Guest"}
      </button>
      <div className="mt-4 text-center text-base text-muted-foreground dark:text-zinc-400">
        <span>Don't have an account? </span>
        <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:underline">
          Register
        </Link>
      </div>
    </form>
  );
}