import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Home,
  FileText,
  Clock,
  Send,
  History,
  Users,
  ClipboardCheck,
  FileBarChart,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MainLayout() {
  const { user, logout, isSupervisor, isEmployee } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Dashboard is always shown; other employee links only for users with employee records
  const employeeLinks = isEmployee
    ? [
        { to: '/dashboard', label: 'Dashboard', icon: Home },
        { to: '/my-cases', label: 'My Cases', icon: FileText },
        { to: '/submit-time', label: 'Submit Time', icon: Clock },
        { to: '/request-leave', label: 'Request Leave', icon: Send },
        { to: '/my-submissions', label: 'My Submissions', icon: History },
      ]
    : [{ to: '/dashboard', label: 'Dashboard', icon: Home }];

  const supervisorLinks = [
    { to: '/team', label: 'Team Dashboard', icon: Users },
    { to: '/pending-reviews', label: 'Pending Reviews', icon: ClipboardCheck },
    { to: '/reports', label: 'Reports', icon: FileBarChart },
  ];

  const NavItem = ({ to, label, icon: Icon }: { to: string; label: string; icon: React.ElementType }) => (
    <NavLink
      to={to}
      onClick={() => setMobileMenuOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
          isActive
            ? 'bg-blue-50 text-blue-700 font-medium'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`
      }
    >
      <Icon size={20} />
      <span>{label}</span>
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <FileText className="text-white" size={18} />
          </div>
          <span className="font-semibold text-gray-900">FMLA Portal</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-gray-600 hover:text-gray-900"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-gray-200">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="text-white" size={22} />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">FMLA Portal</h1>
              <p className="text-xs text-gray-500">Self-Service</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {/* Employee section */}
            <div className="mb-6">
              <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Employee
              </p>
              {employeeLinks.map((link) => (
                <NavItem key={link.to} {...link} />
              ))}
            </div>

            {/* Supervisor section */}
            {isSupervisor && (
              <div>
                <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Supervisor
                </p>
                {supervisorLinks.map((link) => (
                  <NavItem key={link.to} {...link} />
                ))}
              </div>
            )}
          </nav>

          {/* User info */}
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-medium">
                  {user?.full_name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        {/* Mobile menu overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden fixed inset-0 bg-black/50 z-40"
              />
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'tween', duration: 0.2 }}
                className="lg:hidden fixed inset-y-0 left-0 w-72 bg-white z-50 flex flex-col"
              >
                <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <FileText className="text-white" size={18} />
                    </div>
                    <span className="font-semibold text-gray-900">FMLA Portal</span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                  <div className="mb-6">
                    <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Employee
                    </p>
                    {employeeLinks.map((link) => (
                      <NavItem key={link.to} {...link} />
                    ))}
                  </div>

                  {isSupervisor && (
                    <div>
                      <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Supervisor
                      </p>
                      {supervisorLinks.map((link) => (
                        <NavItem key={link.to} {...link} />
                      ))}
                    </div>
                  )}
                </nav>

                <div className="px-4 py-4 border-t border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-medium">
                        {user?.full_name?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <LogOut size={18} />
                    <span>Sign out</span>
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className="flex-1 lg:ml-64">
          <div className="p-4 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
