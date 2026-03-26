import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Briefcase, User, LogOut, LogIn, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ShimmerBarLight from './bifrost-light/ShimmerBarLight';

export default function PortalLayout() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/jobs');
  };

  return (
    <div className="bifrost-light min-h-screen bg-realm-white font-body">
      {/* Shimmer Bar */}
      <ShimmerBarLight />

      {/* Header */}
      <header className="backdrop-blur-sm bg-white/90 border-b border-[rgba(108,63,160,0.06)] sticky top-[3px] z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/jobs" className="flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-bifrost-violet" />
              <span className="text-xl font-display font-semibold text-[#1A1A2E]">Careers</span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link to="/jobs" className="text-sm text-[#4A4A62] hover:text-bifrost-violet transition-colors">
                Job Openings
              </Link>
              {isAuthenticated ? (
                <>
                  <Link to="/my-applications" className="text-sm text-[#4A4A62] hover:text-bifrost-violet transition-colors">
                    My Applications
                  </Link>
                  <Link to="/my-messages" className="flex items-center gap-1 text-sm text-[#4A4A62] hover:text-bifrost-violet transition-colors">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Messages
                  </Link>
                  <div className="flex items-center gap-2 text-sm text-[#4A4A62]">
                    <User className="w-4 h-4" />
                    <span>{user?.first_name}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-sm text-[#8E8E9E] hover:text-[#4A4A62] transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-1 text-sm text-bifrost-violet hover:text-bifrost-violet-dark transition-colors"
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
      <footer className="bg-white/80 border-t border-[rgba(108,63,160,0.06)] mt-auto relative">
        <div
          className="absolute top-0 left-0 right-0 h-[2px] opacity-30"
          style={{ background: 'linear-gradient(90deg, #6C3FA0, #2ABFBF, #E8B84B)' }}
          aria-hidden="true"
        />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-[#8E8E9E]">
          Equal Opportunity Employer
        </div>
      </footer>
    </div>
  );
}
