import { motion } from 'framer-motion';
import { X, Building2 } from 'lucide-react';
import Sidebar from './Sidebar';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileNav({ isOpen, onClose }: MobileNavProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="lg:hidden fixed inset-0 bg-black/50 z-40"
      />

      {/* Drawer */}
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        exit={{ x: -280 }}
        transition={{ type: 'tween', duration: 0.2 }}
        className="lg:hidden fixed inset-y-0 left-0 w-72 z-50"
      >
        {/* Mobile header with close button */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-4 border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="text-white" size={18} />
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">Employee HR Portal</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sidebar content with padding for the header */}
        <div className="h-full pt-16">
          <Sidebar onNavigate={onClose} />
        </div>
      </motion.aside>
    </>
  );
}
