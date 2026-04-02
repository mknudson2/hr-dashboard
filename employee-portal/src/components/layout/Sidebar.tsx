import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeFeatures } from '@/contexts/EmployeeFeaturesContext';
import { getFilteredNavigation, type NavItem, type NavSection } from '@/config/navigation';
import DarkModeToggle from '@/components/DarkModeToggle';

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const { user, logout, isSupervisor, isEmployee } = useAuth();
  const { features } = useEmployeeFeatures();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Pass features to navigation filter for conditional display
  const filteredNav = getFilteredNavigation(isEmployee, isSupervisor, features);

  const NavItemComponent = ({ item }: { item: NavItem }) => {
    const Icon = item.icon;
    // Use 'end' prop for paths that could be prefixes of other paths
    // This ensures exact matching (e.g., /team won't match /team/approvals)
    const needsExactMatch = ['/team', '/dashboard', '/my-hr', '/requests'].includes(item.path);

    return (
      <NavLink
        to={item.path}
        end={needsExactMatch}
        onClick={onNavigate}
        className={({ isActive }) =>
          `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
            isActive
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
          }`
        }
      >
        <Icon size={20} />
        <span>{item.label}</span>
      </NavLink>
    );
  };

  const NavSectionComponent = ({ section }: { section: NavSection }) => (
    <div className="mb-6">
      <p className="px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
        {section.label}
      </p>
      {section.items.map((item) => (
        <NavItemComponent key={item.path} item={item} />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-300 dark:border-gray-700">
        <img src="/bifrost-logo.png" alt="Bifröst" className="w-10 h-10 object-contain" />
        <div>
          <h1 className="font-semibold text-gray-900 dark:text-white">BIFRÖST</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Employee Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {/* Main navigation items */}
        <div className="mb-6">
          {filteredNav.main.map((item) => (
            <NavItemComponent key={item.path} item={item} />
          ))}
        </div>

        {/* Grouped sections */}
        {filteredNav.sections.map((section) => (
          <NavSectionComponent key={section.label} section={section} />
        ))}
      </nav>

      {/* User info, View Toggle & Dark mode toggle */}
      <div className="px-4 py-4 border-t border-gray-300 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <span className="text-gray-600 dark:text-gray-300 font-medium">
              {user?.full_name?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user?.full_name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Dark mode toggle */}
        <div className="mb-3">
          <DarkModeToggle />
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <LogOut size={18} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}
