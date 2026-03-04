import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Search,
  Bell,
  LogOut,
  User,
  Moon,
  Sun,
  LayoutGrid,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeFeatures } from '@/contexts/EmployeeFeaturesContext';
import { getModernNavigation, type NavDropdown, type NavItem } from '@/config/navigation';
import SearchModal from '@/components/common/SearchModal';

interface ModernTopNavProps {
  onMobileMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
}

export default function ModernTopNav({ onMobileMenuToggle, mobileMenuOpen }: ModernTopNavProps) {
  const { user, logout, isSupervisor, isEmployee } = useAuth();
  const { features, viewMode, setViewMode } = useEmployeeFeatures();
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Get navigation items for modern layout
  const dropdowns = getModernNavigation(isEmployee, isSupervisor, features);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Check dropdown refs
      let clickedInDropdown = false;
      Object.values(dropdownRefs.current).forEach((ref) => {
        if (ref && ref.contains(target)) {
          clickedInDropdown = true;
        }
      });

      if (!clickedInDropdown) {
        setOpenDropdown(null);
      }

      // Check user menu
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut for search (/)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if (e.key === '/' && !searchOpen) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const DropdownMenu = ({ dropdown }: { dropdown: NavDropdown }) => {
    const isOpen = openDropdown === dropdown.label;

    return (
      <div
        className="relative"
        ref={(el) => {
          dropdownRefs.current[dropdown.label] = el;
        }}
      >
        <button
          onClick={() => setOpenDropdown(isOpen ? null : dropdown.label)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            isOpen
              ? 'bg-white/20 dark:bg-gray-800/50 text-gray-900 dark:text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-white/10 dark:hover:bg-gray-800/30'
          }`}
        >
          {dropdown.label}
          <ChevronDown
            size={16}
            className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 py-2 z-50"
            >
              {dropdown.items.map((item) => (
                <DropdownItem key={item.path} item={item} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const DropdownItem = ({ item }: { item: NavItem }) => {
    const Icon = item.icon;

    // Use 'end' prop for paths that could be prefixes of other paths
    // This ensures exact matching (e.g., /team won't match /team/approvals)
    const needsExactMatch = [
      '/team',
      '/dashboard',
      '/my-hr',
      '/requests',
      '/requests/fmla',
      '/requests/pto',
      '/requests/garnishments'
    ].includes(item.path);

    return (
      <NavLink
        to={item.path}
        end={needsExactMatch}
        onClick={() => setOpenDropdown(null)}
        className={({ isActive }) =>
          `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
            isActive
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }`
        }
      >
        <Icon size={18} className="text-gray-400 dark:text-gray-500" />
        {item.label}
      </NavLink>
    );
  };

  return (
    <>
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-3 cursor-pointer">
            <img src="/bifrost-logo.png" alt="Bifröst" className="w-9 h-9 object-contain" />
            <span className="hidden sm:block font-semibold text-gray-900 dark:text-white">
              BIFRÖST
            </span>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {/* Dashboard link */}
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-white/20 dark:bg-gray-800/50 text-gray-900 dark:text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-white/10 dark:hover:bg-gray-800/30'
                }`
              }
            >
              Dashboard
            </NavLink>

            {/* Dropdown menus */}
            {dropdowns.map((dropdown) => (
              <DropdownMenu key={dropdown.label} dropdown={dropdown} />
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Search (hidden on mobile) */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Search size={16} />
              <span className="hidden lg:inline">Search...</span>
              <kbd className="hidden lg:inline px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">
                /
              </kbd>
            </button>

            {/* Notifications */}
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Bell size={20} />
              {features && features.total_action_items > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-medium text-sm">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 py-2 z-50"
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {user?.full_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                    </div>

                    {/* Menu items */}
                    <div className="py-2">
                      <NavLink
                        to="/my-hr/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <User size={18} className="text-gray-400" />
                        My Profile
                      </NavLink>

                      {/* View toggle — all 3 options */}
                      <div className="px-4 py-2">
                        <p className="text-xs text-gray-400 mb-1.5">Switch View</p>
                        <div className="flex gap-1">
                          {([
                            { key: 'og' as const, label: 'Classic', icon: LayoutGrid },
                            { key: 'bifrost' as const, label: 'Bifröst', icon: LayoutGrid },
                            { key: 'modern' as const, label: 'Modern', icon: LayoutGrid },
                          ]).map((view) => (
                            <button
                              key={view.key}
                              onClick={() => {
                                setViewMode(view.key);
                                setUserMenuOpen(false);
                              }}
                              className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                viewMode === view.key
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              {view.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dark mode toggle */}
                      <button
                        onClick={toggleDarkMode}
                        className="flex items-center gap-3 px-4 py-2 w-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        {darkMode ? (
                          <Sun size={18} className="text-gray-400" />
                        ) : (
                          <Moon size={18} className="text-gray-400" />
                        )}
                        {darkMode ? 'Light Mode' : 'Dark Mode'}
                      </button>
                    </div>

                    {/* Sign out */}
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2 w-full text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <LogOut size={18} />
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={onMobileMenuToggle}
              className="lg:hidden p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

    </header>

    {/* Search Modal */}
    <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
