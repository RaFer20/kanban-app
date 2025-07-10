import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import { Button } from '@/components/ui/button'
import './App.css'
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { BoardsPage } from './pages/BoardsPage';

// Auth Context for managing user state
interface User {
  id: number;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    if (token) {
      fetch('/api/auth/api/v1/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(userData => {
        if (userData.id) {
          setUser(userData);
        } else {
          localStorage.removeItem('token');
          setToken(null);
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
        setToken(null);
      })
      .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    // 1. Request token from backend
    const response = await fetch('/api/auth/api/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: email, password })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Login failed:', response.status, errorText);
      throw new Error('Login failed');
    }

    const data = await response.json();
    const accessToken = data.access_token;
    setToken(accessToken);
    localStorage.setItem('token', accessToken);

    // 2. Fetch user info from /me using the new token
    const meRes = await fetch('/api/auth/api/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!meRes.ok) {
      throw new Error('Failed to fetch user info');
    }
    const userData = await meRes.json();
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
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
        <div className="min-h-screen bg-background">
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