import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Briefcase, User, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function PortalLayout() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/jobs');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/jobs" className="flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Careers</span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link to="/jobs" className="text-sm text-gray-600 hover:text-gray-900">
                Job Openings
              </Link>
              {isAuthenticated ? (
                <>
                  <Link to="/my-applications" className="text-sm text-gray-600 hover:text-gray-900">
                    My Applications
                  </Link>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span>{user?.first_name}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-gray-500">
          Equal Opportunity Employer
        </div>
      </footer>
    </div>
  );
}
