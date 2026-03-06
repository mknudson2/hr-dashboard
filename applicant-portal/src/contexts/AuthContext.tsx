import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_URL } from '@/config/api';

export interface ApplicantUser {
  id: number;
  applicant_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface AuthContextType {
  user: ApplicantUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithMagicLink: (token: string) => Promise<void>;
  register: (data: { email: string; password: string; first_name: string; last_name: string }) => Promise<void>;
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<ApplicantUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const stored = localStorage.getItem('applicant_user');
        if (!stored) {
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_URL}/applicant-portal/auth/verify`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.applicant);
          localStorage.setItem('applicant_user', JSON.stringify(data.applicant));
        } else {
          localStorage.removeItem('applicant_user');
        }
      } catch {
        localStorage.removeItem('applicant_user');
      } finally {
        setLoading(false);
      }
    };

    loadAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/applicant-portal/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    localStorage.setItem('applicant_user', JSON.stringify(data.applicant));
    setUser(data.applicant);
  };

  const loginWithMagicLink = async (token: string) => {
    const response = await fetch(`${API_URL}/applicant-portal/auth/verify/${token}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Invalid or expired link');
    }

    const data = await response.json();
    localStorage.setItem('applicant_user', JSON.stringify(data.applicant));
    setUser(data.applicant);
  };

  const register = async (data: { email: string; password: string; first_name: string; last_name: string }) => {
    const response = await fetch(`${API_URL}/applicant-portal/auth/register`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    const result = await response.json();
    localStorage.setItem('applicant_user', JSON.stringify(result.applicant));
    setUser(result.applicant);
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/applicant-portal/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('applicant_user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      loginWithMagicLink,
      register,
      logout,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
