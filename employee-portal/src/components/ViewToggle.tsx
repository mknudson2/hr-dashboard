import { motion } from 'framer-motion';
import { LayoutGrid, Sparkles, Mountain } from 'lucide-react';
import { useEmployeeFeatures } from '@/contexts/EmployeeFeaturesContext';

type ViewOption = 'og' | 'bifrost' | 'modern';

const views: { key: ViewOption; label: string; icon: typeof LayoutGrid }[] = [
  { key: 'og', label: 'Classic', icon: LayoutGrid },
  { key: 'bifrost', label: 'Bifröst', icon: Mountain },
  { key: 'modern', label: 'Modern', icon: Sparkles },
];

/**
 * ViewToggle - Animated 3-way toggle between Classic, Bifröst, and Modern views.
 * Uses Framer Motion for smooth sliding indicator.
 */
export default function ViewToggle() {
  const { viewMode, setViewMode, loading } = useEmployeeFeatures();

  if (loading) {
    return (
      <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
    );
  }

  const activeIndex = views.findIndex((v) => v.key === viewMode);
  const widthPercent = 100 / views.length;

  return (
    <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg p-1 flex">
      {/* Sliding background indicator */}
      <motion.div
        className="absolute inset-y-1 bg-white dark:bg-gray-600 rounded-md shadow-sm"
        initial={false}
        animate={{
          left: `calc(${activeIndex * widthPercent}% + 4px)`,
          right: `calc(${(views.length - 1 - activeIndex) * widthPercent}% + 4px)`,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />

      {views.map((view) => {
        const Icon = view.icon;
        return (
          <button
            key={view.key}
            onClick={() => setViewMode(view.key)}
            className={`relative z-10 flex-1 flex items-center justify-center gap-1 px-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === view.key
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Icon size={12} />
            <span>{view.label}</span>
          </button>
        );
      })}
    </div>
  );
}
