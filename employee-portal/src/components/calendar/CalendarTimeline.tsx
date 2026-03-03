import { useMemo, useState } from 'react';
import { getBarColor } from './CalendarLegend';

interface CalendarPerson {
  employee_id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  department: string | null;
  relationship: string;
}

interface CalendarEvent {
  id: number;
  employee_id: string;
  start_date: string;
  end_date: string;
  pto_type: string;
  status: string;
  hours_requested: number;
}

interface CalendarTimelineProps {
  people: CalendarPerson[];
  events: CalendarEvent[];
  currentMonth: Date;
  viewMode: 'og' | 'modern' | 'bifrost';
}

interface TooltipData {
  name: string;
  ptoType: string;
  startDate: string;
  endDate: string;
  hours: number;
  x: number;
  y: number;
}

const RELATIONSHIP_ORDER = ['supervisor', 'self', 'peer', 'report'] as const;

const GROUP_LABELS: Record<string, string> = {
  supervisor: 'Supervisors',
  self: 'You',
  peer: 'Peers',
  report: 'My Team',
};

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const daysCount = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysCount; d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function CalendarTimeline({
  people,
  events,
  currentMonth,
  viewMode,
}: CalendarTimelineProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const today = new Date();

  // Group people by relationship
  const groupedPeople = useMemo(() => {
    const groups: { label: string; people: CalendarPerson[] }[] = [];

    for (const rel of RELATIONSHIP_ORDER) {
      const members = people.filter((p) => p.relationship === rel);
      if (members.length > 0) {
        groups.push({ label: GROUP_LABELS[rel], people: members });
      }
    }

    return groups;
  }, [people]);

  // Index events by employee_id for fast lookup
  const eventsByEmployee = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const list = map.get(event.employee_id) || [];
      list.push(event);
      map.set(event.employee_id, list);
    }
    return map;
  }, [events]);

  // Calculate bar positions for a person on a given day
  const getEventsForDay = (employeeId: string, day: Date): CalendarEvent[] => {
    const empEvents = eventsByEmployee.get(employeeId) || [];
    return empEvents.filter((ev) => {
      const start = new Date(ev.start_date + 'T00:00:00');
      const end = new Date(ev.end_date + 'T00:00:00');
      return day >= start && day <= end;
    });
  };

  const handleBarHover = (
    e: React.MouseEvent,
    person: CalendarPerson,
    event: CalendarEvent,
  ) => {
    setTooltip({
      name: `${person.first_name} ${person.last_name}`,
      ptoType: event.pto_type,
      startDate: event.start_date,
      endDate: event.end_date,
      hours: event.hours_requested,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const nameColWidth = 180;

  return (
    <div className="relative">
      {/* Scrollable container */}
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <div
          className="inline-grid min-w-full"
          style={{
            gridTemplateColumns: `${nameColWidth}px repeat(${days.length}, minmax(28px, 1fr))`,
          }}
        >
          {/* Header row — day numbers */}
          <div className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800 border-b border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            Name
          </div>
          {days.map((day) => {
            const isToday = isSameDay(day, today);
            const weekend = isWeekend(day);
            return (
              <div
                key={day.getDate()}
                className={`border-b border-gray-200 dark:border-gray-700 px-0.5 py-2 text-center text-xs ${
                  isToday
                    ? 'bg-blue-50 dark:bg-blue-900/20 font-bold text-blue-700 dark:text-blue-300 border-x border-blue-300 dark:border-blue-700'
                    : weekend
                    ? 'bg-gray-100 dark:bg-gray-800/80 text-gray-400 dark:text-gray-500'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                <div>{day.getDate()}</div>
                <div className="text-[10px]">
                  {day.toLocaleDateString('en-US', { weekday: 'narrow' })}
                </div>
              </div>
            );
          })}

          {/* Grouped rows */}
          {groupedPeople.map((group) => (
            <>
              {/* Group header */}
              <div
                key={`group-${group.label}`}
                className="sticky left-0 z-10 col-span-1 bg-gray-100 dark:bg-gray-750 border-b border-r border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {group.label}
              </div>
              <div
                className="bg-gray-100 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700"
                style={{ gridColumn: `2 / -1` }}
              />

              {/* Person rows */}
              {group.people.map((person) => (
                <>
                  {/* Name cell — sticky left */}
                  <div
                    key={`name-${person.employee_id}`}
                    className="sticky left-0 z-10 bg-white dark:bg-gray-900 border-b border-r border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center"
                  >
                    <div className="truncate">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {person.first_name} {person.last_name}
                      </div>
                      {person.position && (
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                          {person.position}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Day cells */}
                  {days.map((day) => {
                    const dayEvents = getEventsForDay(person.employee_id, day);
                    const isToday = isSameDay(day, today);
                    const weekend = isWeekend(day);

                    return (
                      <div
                        key={`${person.employee_id}-${day.getDate()}`}
                        className={`border-b border-gray-200 dark:border-gray-700 relative min-h-[40px] ${
                          isToday
                            ? 'border-x border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/10'
                            : weekend
                            ? 'bg-gray-50 dark:bg-gray-800/50'
                            : 'bg-white dark:bg-gray-900'
                        }`}
                      >
                        {dayEvents.map((ev) => (
                          <div
                            key={ev.id}
                            className="absolute inset-x-0 top-1/2 -translate-y-1/2 mx-px h-5 rounded-sm cursor-pointer opacity-85 hover:opacity-100 transition-opacity"
                            style={{ backgroundColor: getBarColor(ev.pto_type, viewMode) }}
                            onMouseEnter={(e) => handleBarHover(e, person, ev)}
                            onMouseLeave={() => setTooltip(null)}
                          />
                        ))}
                      </div>
                    );
                  })}
                </>
              ))}
            </>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg pointer-events-none"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 10,
          }}
        >
          <div className="font-medium">{tooltip.name}</div>
          <div className="capitalize">{tooltip.ptoType}</div>
          <div>
            {formatShortDate(tooltip.startDate)}
            {tooltip.startDate !== tooltip.endDate && ` – ${formatShortDate(tooltip.endDate)}`}
          </div>
          <div>{tooltip.hours} hours</div>
        </div>
      )}
    </div>
  );
}
