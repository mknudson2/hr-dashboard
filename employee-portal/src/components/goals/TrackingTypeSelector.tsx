import { Percent, Target, Hash, TrendingUp, Flag } from 'lucide-react';
import { motion } from 'framer-motion';

export type TrackingType = 'percentage' | 'target_percentage' | 'counter' | 'average' | 'milestone';

interface TrackingTypeOption {
  type: TrackingType;
  label: string;
  description: string;
  icon: React.ElementType;
  example: string;
}

const TRACKING_TYPES: TrackingTypeOption[] = [
  {
    type: 'percentage',
    label: 'Percentage',
    description: 'Track progress from 0-100%',
    icon: Percent,
    example: 'e.g., Complete 80% of training modules',
  },
  {
    type: 'target_percentage',
    label: 'Target Percentage',
    description: 'Reach a specific percentage target',
    icon: Target,
    example: 'e.g., Achieve 95% customer satisfaction',
  },
  {
    type: 'counter',
    label: 'Counter',
    description: 'Count towards a numerical target',
    icon: Hash,
    example: 'e.g., Complete 10 certifications',
  },
  {
    type: 'average',
    label: 'Average',
    description: 'Track running average of values',
    icon: TrendingUp,
    example: 'e.g., Maintain 4.5+ review score',
  },
  {
    type: 'milestone',
    label: 'Milestones',
    description: 'Complete specific milestones',
    icon: Flag,
    example: 'e.g., Launch product phases 1-4',
  },
];

interface TrackingTypeSelectorProps {
  value: TrackingType;
  onChange: (type: TrackingType) => void;
  disabled?: boolean;
}

export default function TrackingTypeSelector({
  value,
  onChange,
  disabled = false,
}: TrackingTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Tracking Type
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TRACKING_TYPES.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.type;

          return (
            <motion.button
              key={option.type}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.type)}
              whileHover={{ scale: disabled ? 1 : 1.02 }}
              whileTap={{ scale: disabled ? 1 : 0.98 }}
              className={`
                relative p-4 rounded-lg border-2 text-left transition-all
                ${isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
                ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`
                    p-2 rounded-lg
                    ${isSelected
                      ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }
                  `}
                >
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`
                      font-medium
                      ${isSelected
                        ? 'text-blue-900 dark:text-blue-100'
                        : 'text-gray-900 dark:text-white'
                      }
                    `}
                  >
                    {option.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {option.description}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">
                    {option.example}
                  </p>
                </div>
              </div>
              {isSelected && (
                <motion.div
                  layoutId="tracking-type-indicator"
                  className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export { TRACKING_TYPES };
