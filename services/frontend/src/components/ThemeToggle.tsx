import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("theme") === "dark"
      : false
  );

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return (
    <button
      className="h-8 px-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition font-medium text-sm shadow"
      onClick={() => setDark(d => !d)}
      aria-label="Toggle dark mode"
      type="button"
      style={{ minWidth: "88px" }} // Optional: ensures width matches Logout
    >
      {dark ? "Dark" : "Light"}
    </button>
  );
}