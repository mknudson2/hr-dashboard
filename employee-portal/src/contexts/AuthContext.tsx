import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_URL } from '@/config/api';

export interface User {
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
  isEmployee: boolean;
  isSupervisor: boolean;
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
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const storedUser = localStorage.getItem('portal_auth_user');

        if (!storedUser) {
          setLoading(false);
          return;
        }

        // Verify with server if cookie is still valid
        const response = await fetch(`${API_URL}/auth/verify`, {
          credentials: 'include',
        });

        if (response.ok) {
          setUser(JSON.parse(storedUser));
        } else {
          localStorage.removeItem('portal_auth_user');
        }
      } catch {
        localStorage.removeItem('portal_auth_user');
      } finally {
        setLoading(false);
      }
    };

    loadAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include',
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
    localStorage.setItem('portal_auth_user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('portal_auth_user');
      setUser(null);
    }
  };

  // Check if user has supervisor role (manager or admin can supervise)
  const isSupervisor = user?.role === 'manager' || user?.role === 'admin';

  // All authenticated users with employee_id are employees
  const isEmployee = !!user?.employee_id;

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isEmployee,
    isSupervisor,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
