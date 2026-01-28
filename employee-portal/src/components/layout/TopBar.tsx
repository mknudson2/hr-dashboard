import { Menu, X, Building2 } from 'lucide-react';

interface TopBarProps {
  mobileMenuOpen: boolean;
  onToggleMenu: () => void;
}

export default function TopBar({ mobileMenuOpen, onToggleMenu }: TopBarProps) {
  return (
    <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Building2 className="text-white" size={18} />
        </div>
        <span className="font-semibold text-gray-900 dark:text-white">Employee HR Portal</span>
      </div>
      <button
        onClick={onToggleMenu}
        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
    </div>
  );
}
