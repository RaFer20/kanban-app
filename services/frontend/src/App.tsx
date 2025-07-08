import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import './App.css'

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
      // FIX: Correct the endpoint - remove the extra "1"
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
    setToken(data.access_token);
    setUser({ id: data.user_id || 1, email }); // Fallback user_id if not provided
    localStorage.setItem('token', data.access_token);
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

function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await login(email, password);
      // Redirect handled by AuthGuard
    } catch (err) {
      setError('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h2 className="text-2xl font-bold mb-6 text-foreground">Login</h2>
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button 
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
        <div className="mt-6 p-3 bg-muted rounded-md">
          <p className="text-sm text-muted-foreground mb-1">Demo credentials:</p>
          <p className="text-xs font-mono text-foreground">guest@example.com / guest123</p>
        </div>
        <div className="mt-4 text-center">
          <Button variant="link" asChild>
            <Link to="/">← Back to Home</Link>
          </Button>
        </div>
      </div>
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
              <Route path="/boards" element={
                <AuthGuard>
                  <BoardsPage />
                </AuthGuard>
              } />
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
      <span className="text-white">Welcome, {user.email}</span>
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

// Placeholder Boards page
function BoardsPage() {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Your Boards</h2>
      <p>Board list coming soon...</p>
    </div>
  );
}

export default App