import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../App";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate("/boards");
    } catch (err) {
      setError("Invalid email or password");
    }
  };

  const handleGuestLogin = async () => {
    setError(null);
    try {
      await login("guest@example.com", "guest123");
      navigate("/boards");
    } catch (err) {
      setError("Guest login failed");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 sm:p-8 rounded shadow-md w-full max-w-xs sm:max-w-sm border-2 border-blue-300 mx-auto"
    >
      <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center">Login</h2>
      {error && <div className="mb-4 text-red-600 text-base">{error}</div>}
      <input
        type="email"
        placeholder="Email"
        className="input-visible-border w-full h-12 px-3 mb-4 rounded shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition text-base"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        className="input-visible-border w-full h-12 px-3 mb-6 rounded shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition text-base"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
      />
      <button
        type="submit"
        className="w-full h-12 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-base"
      >
        Login
      </button>
      <button
        type="button"
        className="w-full h-12 bg-teal-600 text-white rounded mt-2 hover:bg-teal-700 transition text-base"
        onClick={handleGuestLogin}
      >
        Log in as Guest
      </button>
      <div className="mt-4 text-center text-base">
        <span>Don't have an account? </span>
        <Link to="/register" className="text-blue-600 hover:underline">
          Register
        </Link>
      </div>
    </form>
  );
}