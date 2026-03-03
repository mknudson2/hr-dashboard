import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthNavigatorProps {
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
}

export default function MonthNavigator({ currentMonth, onMonthChange }: MonthNavigatorProps) {
  const monthLabel = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const goToPrevMonth = () => {
    const prev = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    onMonthChange(prev);
  };

  const goToNextMonth = () => {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    onMonthChange(next);
  };

  const goToToday = () => {
    const now = new Date();
    onMonthChange(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={goToPrevMonth}
        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
        aria-label="Previous month"
      >
        <ChevronLeft size={20} />
      </button>

      <span className="text-lg font-semibold text-gray-900 dark:text-white min-w-[180px] text-center">
        {monthLabel}
      </span>

      <button
        onClick={goToNextMonth}
        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
        aria-label="Next month"
      >
        <ChevronRight size={20} />
      </button>

      <button
        onClick={goToToday}
        className="ml-2 px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        Today
      </button>
    </div>
  );
}
