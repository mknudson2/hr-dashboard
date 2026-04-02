import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MiniMonthCalendarProps {
  availableDates: Set<string>;
  scheduledDates: Set<string>;
  selectedDate: string | null;
  onSelectDate: (dateStr: string) => void;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function MiniMonthCalendar({
  availableDates,
  scheduledDates,
  selectedDate,
  onSelectDate,
}: MiniMonthCalendarProps) {
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="p-1 rounded hover:bg-frost text-[#4A4A62]"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-[#1A1A2E]">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="p-1 rounded hover:bg-frost text-[#4A4A62]"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day of week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="text-center text-xs font-medium text-[#8E8E9E] py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;

          const dateStr = toDateStr(viewYear, viewMonth, day);
          const isPast = dateStr < todayStr;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const hasAvailable = availableDates.has(dateStr);
          const hasScheduled = scheduledDates.has(dateStr);
          const isClickable = !isPast && (hasAvailable || hasScheduled);

          return (
            <button
              key={dateStr}
              onClick={() => isClickable && onSelectDate(dateStr)}
              disabled={!isClickable}
              className={`
                relative flex flex-col items-center justify-center py-1.5 text-sm rounded-lg transition-colors
                ${isSelected
                  ? 'bg-bifrost-violet text-white font-semibold'
                  : isClickable
                    ? 'hover:bg-frost text-[#1A1A2E] cursor-pointer'
                    : isPast
                      ? 'text-[#C8C8D0] cursor-default'
                      : 'text-[#4A4A62] cursor-default'
                }
                ${isToday && !isSelected ? 'ring-1 ring-bifrost-violet/30' : ''}
              `}
            >
              {day}
              {/* Dot indicators */}
              {(hasAvailable || hasScheduled) && (
                <div className="flex gap-0.5 mt-0.5">
                  {hasAvailable && (
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/70' : 'bg-aurora-teal'}`} />
                  )}
                  {hasScheduled && (
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/70' : 'bg-bifrost-violet'}`} />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
