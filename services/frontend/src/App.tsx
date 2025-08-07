import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import { Button } from '@/components/ui/button'
import './App.css'
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { BoardsPage } from './pages/BoardsPage';
import { BoardDetailPage } from './pages/BoardDetailPage';
import { authApi } from './lib/api';
import { AdminPage } from "./pages/AdminPage";
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminBoardsPage } from './pages/AdminBoardsPage'; 
import { AdminSystemPage } from './pages/AdminSystemPage';
import { BoardPermissionsPage } from './pages/BoardPermissionsPage';

// Auth Context for managing user state
interface User {
  id: number;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  register: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on app start
  useEffect(() => {
    fetch('/api/v1/me', { credentials: 'include' })
      .then(res => {
        if (res.status === 204 || res.status === 401) {
          setUser(null);
          return null;
        }
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then(userData => {
        if (userData && userData.id) {
          setUser(userData);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    // 1. Request token from backend (cookies will be set by backend)
    const response = await fetch('/api/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: email, password }),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Login failed:', response.status, errorText);
      throw new Error('Login failed');
    }

    // 2. Fetch user info from /me (cookies will be sent automatically)
    const meRes = await fetch('/api/v1/me', {
      credentials: 'include',
    });
    if (!meRes.ok) {
      throw new Error('Failed to fetch user info');
    }
    const userData = await meRes.json();
    setUser(userData);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    setUser(null);
  };

  const register = async (email: string, password: string) => {
    const response = await fetch('/api/v1/users/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Registration failed');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token: null, login, logout, loading, register }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

function HomePage() {
  const { user } = useAuth();
  
  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-foreground mb-4">Welcome to the Kanban Board!</h2>
      {user ? (
        <div className="space-y-4">
          <p className="text-muted-foreground">Hello, {user.email}!</p>
          <Button asChild>
            <Link to="/boards">View Boards</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-muted-foreground">Please log in to access your boards.</p>
          <Button asChild>
            <Link to="/login">Go to Login</Link>
          </Button>
        </div>
      )}
    </div>
  )
}

// Auth Guard component
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen">
          <header className="bg-primary text-primary-foreground shadow-sm border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <h1 className="text-xl font-bold">
                  <Link to="/" className="text-primary-foreground hover:text-primary-foreground/80">
                    Kanban Board
                  </Link>
                </h1>
                <AuthHeader />
              </div>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/boards" element={
                <AuthGuard>
                  <BoardsPage />
                </AuthGuard>
              } />
              <Route path="/boards/:boardId" element={
                  <AuthGuard>
                    <BoardDetailPage />
                  </AuthGuard>
              } />
              <Route path="/admin" element={
                <AuthGuard>
                  <AdminPage />
                </AuthGuard>
              } />
              <Route path="/admin/users" element={
                <AuthGuard>
                  <AdminUsersPage />
                </AuthGuard>
              } />
              <Route path="/admin/boards" element={
                <AuthGuard>
                  <AdminBoardsPage />
                </AuthGuard>
              } />
              <Route path="/admin/system" element={
                <AuthGuard>
                  <AdminSystemPage />
                </AuthGuard>
              } />
              <Route path="/admin/boards/:boardId/permissions" element={
                <AuthGuard>
                  <BoardPermissionsPage />
                </AuthGuard>
              } />
              <Route path="*" element={<CatchAllRedirect />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}

function AuthHeader() {
  const { user, logout } = useAuth();
  
  if (!user) return null;
  
  return (
    <div className="flex items-center space-x-4">
      <span className="text-black">Welcome, {user.email}</span>
      {/* Show admin panel link if user is admin */}
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
    </div>
  );
}

function CatchAllRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return <Navigate to={user ? "/boards" : "/login"} />;
}

export { useAuth };
export default App;