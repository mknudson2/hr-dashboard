import { useState, useMemo } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, MapPin, Video, Users, Coffee, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEmployeeFeatures } from '@/contexts/EmployeeFeaturesContext';
import AuroraPageHeader from '@/components/bifrost/AuroraPageHeader';

type EventType = 'meeting' | 'focus' | 'pto' | 'holiday' | 'training';
type ViewMode = 'week' | 'day';

interface ScheduleEvent {
  id: string;
  title: string;
  type: EventType;
  startTime: Date;
  endTime: Date;
  location?: string;
  isVirtual?: boolean;
  attendees?: number;
  description?: string;
}

// Helper to create dates relative to today
function createDate(daysOffset: number, hours: number, minutes: number = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

// Mock schedule data
const mockEvents: ScheduleEvent[] = [
  {
    id: '1',
    title: 'Daily Standup',
    type: 'meeting',
    startTime: createDate(0, 9, 30),
    endTime: createDate(0, 9, 45),
    isVirtual: true,
    attendees: 8,
    description: 'Daily team sync-up',
  },
  {
    id: '2',
    title: 'Focus Time - Project Work',
    type: 'focus',
    startTime: createDate(0, 10, 0),
    endTime: createDate(0, 12, 0),
    description: 'Blocked for deep work',
  },
  {
    id: '3',
    title: 'Team Lunch',
    type: 'meeting',
    startTime: createDate(0, 12, 0),
    endTime: createDate(0, 13, 0),
    location: 'Cafeteria - Level 2',
    attendees: 12,
  },
  {
    id: '4',
    title: '1:1 with Manager',
    type: 'meeting',
    startTime: createDate(0, 14, 0),
    endTime: createDate(0, 14, 30),
    isVirtual: true,
    attendees: 2,
    description: 'Weekly check-in',
  },
  {
    id: '5',
    title: 'Sprint Planning',
    type: 'meeting',
    startTime: createDate(1, 10, 0),
    endTime: createDate(1, 11, 30),
    isVirtual: true,
    attendees: 10,
    description: 'Plan next sprint work items',
  },
  {
    id: '6',
    title: 'Security Training',
    type: 'training',
    startTime: createDate(1, 14, 0),
    endTime: createDate(1, 15, 0),
    isVirtual: true,
    description: 'Annual IT security awareness training',
  },
  {
    id: '7',
    title: 'Design Review',
    type: 'meeting',
    startTime: createDate(2, 11, 0),
    endTime: createDate(2, 12, 0),
    location: 'Conference Room A',
    attendees: 5,
  },
  {
    id: '8',
    title: 'PTO - Personal Day',
    type: 'pto',
    startTime: createDate(3, 0, 0),
    endTime: createDate(3, 23, 59),
    description: 'Approved time off',
  },
  {
    id: '9',
    title: 'Project Deadline',
    type: 'focus',
    startTime: createDate(4, 9, 0),
    endTime: createDate(4, 17, 0),
    description: 'Final deliverables due',
  },
  {
    id: '10',
    title: 'All-Hands Meeting',
    type: 'meeting',
    startTime: createDate(5, 15, 0),
    endTime: createDate(5, 16, 0),
    isVirtual: true,
    attendees: 200,
    description: 'Monthly company all-hands',
  },
];

const eventTypeConfig: Record<EventType, { color: string; bgColor: string; icon: React.ElementType }> = {
  meeting: { color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700', icon: Users },
  focus: { color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700', icon: Coffee },
  pto: { color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700', icon: Briefcase },
  holiday: { color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700', icon: Calendar },
  training: { color: 'text-orange-700 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700', icon: Briefcase },
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDateHeader(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

function getWeekDays(startDate: Date): Date[] {
  const days: Date[] = [];
  const start = new Date(startDate);
  start.setDate(start.getDate() - start.getDay()); // Start from Sunday

  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }
  return days;
}

export default function MySchedule() {
  const { viewMode: portalViewMode } = useEmployeeFeatures();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getEventsForDay = (date: Date) => {
    return mockEvents.filter(event => isSameDay(event.startTime, date));
  };

  const todayEvents = getEventsForDay(currentDate);

  // Calculate work hours summary
  const totalMeetingHours = mockEvents
    .filter(e => e.type === 'meeting')
    .reduce((sum, e) => sum + (e.endTime.getTime() - e.startTime.getTime()) / (1000 * 60 * 60), 0);

  const totalFocusHours = mockEvents
    .filter(e => e.type === 'focus')
    .reduce((sum, e) => sum + (e.endTime.getTime() - e.startTime.getTime()) / (1000 * 60 * 60), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      {portalViewMode === 'bifrost' ? (
        <AuroraPageHeader
          title="My Schedule"
          subtitle="View your work schedule and upcoming events"
          icon={Calendar}
          rightContent={
            <div className="flex items-center bg-white/10 rounded-lg p-1">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  viewMode === 'day'
                    ? 'bg-white/20 text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  viewMode === 'week'
                    ? 'bg-white/20 text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Week
              </button>
            </div>
          }
        />
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Calendar className="text-blue-600 dark:text-blue-400" />
              My Schedule
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              View your work schedule and upcoming events
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  viewMode === 'day'
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  viewMode === 'week'
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Week
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-200/60 dark:shadow-none border border-gray-300 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Meetings This Week</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{totalMeetingHours.toFixed(1)}h</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-200/60 dark:shadow-none border border-gray-300 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Coffee className="text-purple-600 dark:text-purple-400" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Focus Time</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{totalFocusHours.toFixed(1)}h</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-200/60 dark:shadow-none border border-gray-300 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Briefcase className="text-green-600 dark:text-green-400" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">PTO Days</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">1</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-200/60 dark:shadow-none border border-gray-300 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Clock className="text-orange-600 dark:text-orange-400" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Events Today</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{todayEvents.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-200/60 dark:shadow-none border border-gray-300 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => viewMode === 'week' ? navigateWeek('prev') : navigateDay('prev')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => viewMode === 'week' ? navigateWeek('next') : navigateDay('next')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Next"
            >
              <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              Today
            </button>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {viewMode === 'week'
              ? `${weekDays[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${weekDays[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
              : currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h2>
          <div className="w-24" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'week' ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-200/60 dark:shadow-none border border-gray-300 dark:border-gray-700 overflow-hidden">
          {/* Week Header */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={`p-3 text-center border-r last:border-r-0 border-gray-200 dark:border-gray-700 ${
                  isToday(day) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <p className={`text-lg font-semibold mt-1 ${
                  isToday(day)
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {day.getDate()}
                </p>
              </div>
            ))}
          </div>

          {/* Week Events */}
          <div className="grid grid-cols-7 min-h-[400px]">
            {weekDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`border-r last:border-r-0 border-gray-200 dark:border-gray-700 p-2 ${
                    isToday(day) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  {dayEvents.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4">No events</p>
                  ) : (
                    <div className="space-y-1">
                      {dayEvents.map((event) => {
                        const config = eventTypeConfig[event.type];
                        return (
                          <motion.button
                            key={event.id}
                            onClick={() => setSelectedEvent(event)}
                            whileHover={{ scale: 1.02 }}
                            className={`w-full text-left p-2 rounded-lg border text-xs ${config.bgColor} ${config.color}`}
                          >
                            <p className="font-medium truncate">{event.title}</p>
                            {event.type !== 'pto' && (
                              <p className="opacity-75 mt-0.5">
                                {formatTime(event.startTime)}
                              </p>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-200/60 dark:shadow-none border border-gray-300 dark:border-gray-700 overflow-hidden">
          {/* Day View */}
          <div className="p-6">
            {todayEvents.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">No events scheduled</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Enjoy your free day!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayEvents
                  .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
                  .map((event) => {
                    const config = eventTypeConfig[event.type];
                    const Icon = config.icon;
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => setSelectedEvent(event)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${config.bgColor}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-2 rounded-lg bg-white/50 dark:bg-black/20`}>
                            <Icon size={20} className={config.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-semibold ${config.color}`}>
                              {event.title}
                            </h3>
                            <div className="flex items-center gap-4 mt-2 text-sm opacity-75">
                              <span className="flex items-center gap-1">
                                <Clock size={14} />
                                {event.type === 'pto'
                                  ? 'All Day'
                                  : `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`}
                              </span>
                              {event.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin size={14} />
                                  {event.location}
                                </span>
                              )}
                              {event.isVirtual && (
                                <span className="flex items-center gap-1">
                                  <Video size={14} />
                                  Virtual
                                </span>
                              )}
                              {event.attendees && (
                                <span className="flex items-center gap-1">
                                  <Users size={14} />
                                  {event.attendees}
                                </span>
                              )}
                            </div>
                            {event.description && (
                              <p className="mt-2 text-sm opacity-75">{event.description}</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium">Legend:</span>
        {Object.entries(eventTypeConfig).map(([type, config]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${config.bgColor}`} />
            <span className="capitalize">{type}</span>
          </div>
        ))}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full overflow-hidden"
          >
            <div className={`p-4 ${eventTypeConfig[selectedEvent.type].bgColor}`}>
              <h2 className={`text-lg font-semibold ${eventTypeConfig[selectedEvent.type].color}`}>
                {selectedEvent.title}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <Clock size={18} />
                <span>
                  {formatDateHeader(selectedEvent.startTime)}, {' '}
                  {selectedEvent.type === 'pto'
                    ? 'All Day'
                    : `${formatTime(selectedEvent.startTime)} - ${formatTime(selectedEvent.endTime)}`}
                </span>
              </div>
              {selectedEvent.location && (
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <MapPin size={18} />
                  <span>{selectedEvent.location}</span>
                </div>
              )}
              {selectedEvent.isVirtual && (
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <Video size={18} />
                  <span>Virtual Meeting</span>
                </div>
              )}
              {selectedEvent.attendees && (
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <Users size={18} />
                  <span>{selectedEvent.attendees} attendees</span>
                </div>
              )}
              {selectedEvent.description && (
                <p className="text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                  {selectedEvent.description}
                </p>
              )}
              <button
                onClick={() => setSelectedEvent(null)}
                className="w-full mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
