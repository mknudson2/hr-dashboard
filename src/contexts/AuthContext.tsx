import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_URL } from '@/config/api';

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  employee_id?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Verify authentication on mount using httpOnly cookie
  // Token is stored in httpOnly cookie (not accessible via JS for XSS protection)
  useEffect(() => {
    const loadAuth = async () => {
      try {
        // Check if we have cached user info
        const storedUser = localStorage.getItem('auth_user');

        // Only verify with server if we have cached user info
        // This prevents unnecessary 401 console messages when not logged in
        if (!storedUser) {
          setLoading(false);
          return;
        }

        // Verify with server if cookie is still valid (cookie sent automatically)
        const response = await fetch(`${API_URL}/auth/verify`, {
          credentials: 'include',  // Send httpOnly cookie with request
        });

        if (response.ok) {
          // Cookie is valid, restore user from cache
          setUser(JSON.parse(storedUser));
        } else {
          // Cookie invalid or expired, clear cached user
          localStorage.removeItem('auth_user');
        }
      } catch (error) {
        // Network error - clear cached user to be safe
        localStorage.removeItem('auth_user');
      } finally {
        setLoading(false);
      }
    };

    loadAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include',  // Receive httpOnly cookie from server
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const data = await response.json();

      // Store user info for UI display (token is in httpOnly cookie, not accessible via JS)
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      setUser(data.user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Server will clear the httpOnly cookie and blacklist the token
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',  // Send httpOnly cookie with request
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state and cached user info
      localStorage.removeItem('auth_user');
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
