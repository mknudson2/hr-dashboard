import { motion } from 'framer-motion';
import { LayoutGrid, Sparkles } from 'lucide-react';
import { useEmployeeFeatures } from '@/contexts/EmployeeFeaturesContext';

/**
 * ViewToggle - Animated toggle switch between Classic and Modern views.
 * Uses Framer Motion for smooth animations.
 */
export default function ViewToggle() {
  const { viewMode, setViewMode, loading } = useEmployeeFeatures();

  if (loading) {
    return (
      <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
    );
  }

  return (
    <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg p-1 flex">
      {/* Sliding background indicator */}
      <motion.div
        className="absolute inset-y-1 bg-white dark:bg-gray-600 rounded-md shadow-sm"
        initial={false}
        animate={{
          left: viewMode === 'og' ? '4px' : '50%',
          right: viewMode === 'og' ? '50%' : '4px',
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />

      {/* Classic button */}
      <button
        onClick={() => setViewMode('og')}
        className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          viewMode === 'og'
            ? 'text-gray-900 dark:text-white'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
      >
        <LayoutGrid size={14} />
        <span>Classic</span>
      </button>

      {/* Modern button */}
      <button
        onClick={() => setViewMode('modern')}
        className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          viewMode === 'modern'
            ? 'text-gray-900 dark:text-white'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
      >
        <Sparkles size={14} />
        <span>Modern</span>
      </button>
    </div>
  );
}
