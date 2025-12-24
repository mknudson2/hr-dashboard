import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Filter, Plus, X, Edit2, Trash2, Clock, MapPin, User, AlertCircle, ChevronLeft, ChevronRight, Search, Bell, Download, Keyboard } from 'lucide-react';
import { getEvents, getEventTypes, createEvent, updateEvent, deleteEvent } from '../services/eventService';
import EventModal from '../components/EventModal';
import { eventToICalendar, eventsToICalendar, downloadICalendar } from '../utils/icalendar';
import { EventCardSkeleton } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import KeyboardShortcutsModal from '../components/KeyboardShortcutsModal';
import { getPreference, setPreference } from '../utils/preferences';

interface Event {
  id: number;
  event_id: number;
  title: string;
  description: string;
  event_type: string;
  category: string;
  tags?: string[];
  start_date: string;
  end_date: string | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  status: string;
  location: string | null;
  organizer: string | null;
  participants: string | null;
  employee_id: number | null;
  employee_name?: string;
  department: string | null;
  reminder_days: number | null;
  priority: string;
  notes: string | null;
}

interface EventType {
  type_id: number;
  type_name: string;
  category: string;
  default_duration_days: number;
  default_reminder_days: number;
  color_code: string;
  description: string;
}

interface CalendarViewProps {
  events: Event[];
  onEditEvent: (event: Event) => void;
  onDeleteEvent: (eventId: number) => void;
  getPriorityColor: (priority: string) => string;
  getStatusColor: (status: string) => string;
  formatDate: (dateString: string) => string;
}

const CalendarView = ({ events, onEditEvent, onDeleteEvent, getPriorityColor, getStatusColor, formatDate }: CalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = getFirstDayOfMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Create array of days
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null); // Empty cells before first day
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(event => event.start_date.startsWith(dateStr));
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() &&
           currentDate.getMonth() === today.getMonth() &&
           currentDate.getFullYear() === today.getFullYear();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
    >
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{monthName}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-semibold text-gray-600 dark:text-gray-400 py-2">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {days.map((day, index) => {
          const dayEvents = day ? getEventsForDay(day) : [];
          const today = day && isToday(day);

          return (
            <div
              key={index}
              className={`min-h-[120px] border border-gray-200 dark:border-gray-700 rounded-lg p-2 ${
                day ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'
              } ${today ? 'ring-2 ring-blue-500' : ''}`}
            >
              {day && (
                <>
                  <div className={`text-sm font-semibold mb-1 ${
                    today ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                  }`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map(event => (
                      <div
                        key={event.event_id}
                        onClick={() => onEditEvent(event)}
                        className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${getPriorityColor(event.priority)}`}
                        title={event.title}
                      >
                        <div className="truncate font-medium">{event.title}</div>
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 pl-1">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

const EventsPage = () => {
  const { showToast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>(getPreference('eventsFilterType') || 'all');
  const [filterStatus, setFilterStatus] = useState<string>(getPreference('eventsFilterStatus') || 'all');
  const [filterPriority, setFilterPriority] = useState<string>(getPreference('eventsFilterPriority') || 'all');
  const [filterTag, setFilterTag] = useState<string>(getPreference('eventsFilterTag') || 'all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>(getPreference('eventsViewMode') || 'list');
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [pendingEditEvent, setPendingEditEvent] = useState<Event | null>(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Save preferences when filters change
  useEffect(() => {
    setPreference('eventsFilterType', filterType);
  }, [filterType]);

  useEffect(() => {
    setPreference('eventsFilterStatus', filterStatus);
  }, [filterStatus]);

  useEffect(() => {
    setPreference('eventsFilterPriority', filterPriority);
  }, [filterPriority]);

  useEffect(() => {
    setPreference('eventsFilterTag', filterTag);
  }, [filterTag]);

  useEffect(() => {
    setPreference('eventsViewMode', viewMode);
  }, [viewMode]);

  // Get all unique tags from events
  const allTags = Array.from(new Set(events.flatMap(event => event.tags || [])));

  useEffect(() => {
    fetchEvents();
    fetchEventTypes();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await getEvents();
      setEvents(response.events);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventTypes = async () => {
    try {
      const response = await getEventTypes();
      setEventTypes(response.event_types);
    } catch (error) {
      console.error('Error fetching event types:', error);
    }
  };

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setShowEventModal(true);
  };

  const handleEditEvent = (event: Event) => {
    if (event.is_recurring) {
      setPendingEditEvent(event);
      setShowRecurringDialog(true);
    } else {
      setEditingEvent(event);
      setShowEventModal(true);
    }
  };

  const handleEditThisOccurrence = () => {
    if (pendingEditEvent) {
      // For this occurrence only, we'll create a copy without the recurring flag
      const singleOccurrence = { ...pendingEditEvent, is_recurring: false, recurrence_pattern: null };
      setEditingEvent(singleOccurrence);
      setShowRecurringDialog(false);
      setShowEventModal(true);
    }
  };

  const handleEditEntireSeries = () => {
    if (pendingEditEvent) {
      setEditingEvent(pendingEditEvent);
      setShowRecurringDialog(false);
      setShowEventModal(true);
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      await deleteEvent(eventId);
      await fetchEvents();
      showToast('Event deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting event:', error);
      showToast('Failed to delete event', 'error');
    }
  };

  const handleExportEvent = (event: Event) => {
    try {
      const icsContent = eventToICalendar(event);
      const filename = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_event.ics`;
      downloadICalendar(icsContent, filename);
      showToast(`Event "${event.title}" exported successfully`, 'success');
    } catch (error) {
      console.error('Error exporting event:', error);
      showToast('Failed to export event', 'error');
    }
  };

  const handleExportAllEvents = () => {
    try {
      const icsContent = eventsToICalendar(filteredEvents);
      const filename = `hr_dashboard_events_${new Date().toISOString().split('T')[0]}.ics`;
      downloadICalendar(icsContent, filename);
      showToast(`${filteredEvents.length} events exported successfully`, 'success');
    } catch (error) {
      console.error('Error exporting events:', error);
      showToast('Failed to export events', 'error');
    }
  };

  const filteredEvents = events.filter(event => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const tagMatch = event.tags && event.tags.some(tag => tag.toLowerCase().includes(query));
      const matchesSearch =
        event.title.toLowerCase().includes(query) ||
        (event.description && event.description.toLowerCase().includes(query)) ||
        event.event_type.toLowerCase().includes(query) ||
        (event.organizer && event.organizer.toLowerCase().includes(query)) ||
        (event.location && event.location.toLowerCase().includes(query)) ||
        (event.department && event.department.toLowerCase().includes(query)) ||
        (event.employee_name && event.employee_name.toLowerCase().includes(query)) ||
        (event.notes && event.notes.toLowerCase().includes(query)) ||
        tagMatch;

      if (!matchesSearch) return false;
    }

    // Type filter
    if (filterType !== 'all' && event.event_type !== filterType) return false;

    // Status filter
    if (filterStatus !== 'all' && event.status !== filterStatus) return false;

    // Priority filter
    if (filterPriority !== 'all' && event.priority !== filterPriority) return false;

    // Tag filter
    if (filterTag !== 'all' && (!event.tags || !event.tags.includes(filterTag))) return false;

    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      case 'high': return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
      case 'low': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
      case 'in_progress': return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30';
      case 'completed': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'cancelled': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDaysUntil = (dateString: string) => {
    const today = new Date();
    const eventDate = new Date(dateString);
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  // Get upcoming events with reminders
  const getUpcomingReminders = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return events
      .filter(event => {
        if (!event.reminder_days || event.status === 'cancelled' || event.status === 'completed') {
          return false;
        }

        const eventDate = new Date(event.start_date);
        eventDate.setHours(0, 0, 0, 0);

        const diffTime = eventDate.getTime() - today.getTime();
        const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Show reminders for events happening within the reminder_days window
        return daysUntil >= 0 && daysUntil <= event.reminder_days;
      })
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  };

  const upcomingReminders = getUpcomingReminders();

  // Keyboard shortcuts
  const shortcuts = useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'n',
        ctrl: true,
        description: 'Create new event',
        action: () => handleCreateEvent(),
      },
      {
        key: 'e',
        ctrl: true,
        description: 'Export all events',
        action: () => handleExportAllEvents(),
      },
      {
        key: 'f',
        ctrl: true,
        description: 'Focus search',
        action: () => {
          const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
          searchInput?.focus();
        },
      },
      {
        key: 'l',
        ctrl: true,
        description: 'Switch to list view',
        action: () => setViewMode('list'),
      },
      {
        key: 'c',
        ctrl: true,
        description: 'Switch to calendar view',
        action: () => setViewMode('calendar'),
      },
      {
        key: '?',
        shift: true,
        description: 'Show keyboard shortcuts',
        action: () => setShowShortcutsModal(true),
      },
    ],
    enabled: !showEventModal && !showRecurringDialog && !showShortcutsModal,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="h-12 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </motion.div>

          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Events</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage HR events, deadlines, and important dates
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowShortcutsModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                title="Show keyboard shortcuts (Shift + ?)"
              >
                <Keyboard className="w-5 h-5" />
                <span className="hidden md:inline">Shortcuts</span>
              </button>
              <button
                onClick={handleExportAllEvents}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                title="Export all events to iCalendar (.ics) format"
              >
                <Download className="w-5 h-5" />
                <span className="hidden sm:inline">Export All</span>
              </button>
              <button
                onClick={handleCreateEvent}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Create Event</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Upcoming Reminders */}
        {upcomingReminders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-l-4 border-amber-500 dark:border-amber-600 rounded-xl shadow-lg p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <Bell className="w-6 h-6 text-amber-600 dark:text-amber-400 animate-pulse" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-amber-900 dark:text-amber-200 mb-3">
                    Upcoming Event Reminders ({upcomingReminders.length})
                  </h3>
                  <div className="space-y-3">
                    {upcomingReminders.slice(0, 3).map((event, index) => {
                      const daysUntil = Math.ceil((new Date(event.start_date).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
                      return (
                        <motion.div
                          key={event.event_id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => handleEditEvent(event)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900 dark:text-white">{event.title}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getPriorityColor(event.priority)}`}>
                                {event.priority}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {formatDate(event.start_date)}
                              </span>
                              <span className="font-medium text-amber-600 dark:text-amber-400">
                                {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
                              </span>
                              {event.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {event.location}
                                </span>
                              )}
                            </div>
                          </div>
                          <AlertCircle className="w-5 h-5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                        </motion.div>
                      );
                    })}
                    {upcomingReminders.length > 3 && (
                      <p className="text-sm text-amber-700 dark:text-amber-300 text-center mt-2">
                        And {upcomingReminders.length - 3} more upcoming reminder{upcomingReminders.length - 3 !== 1 ? 's' : ''}...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search events by title, description, organizer, location, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Event Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Types</option>
                {eventTypes.map(type => (
                  <option key={type.type_id} value={type.type_name}>{type.type_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags
              </label>
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                View Mode
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex-1 px-3 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`flex-1 px-3 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === 'calendar'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Calendar
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Events List or Calendar */}
        {viewMode === 'calendar' ? (
          <CalendarView
            events={filteredEvents}
            onEditEvent={handleEditEvent}
            onDeleteEvent={handleDeleteEvent}
            getPriorityColor={getPriorityColor}
            getStatusColor={getStatusColor}
            formatDate={formatDate}
          />
        ) : (
          <div className="space-y-4">
            {filteredEvents.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center"
              >
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No events found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {searchQuery || filterType !== 'all' || filterStatus !== 'all' || filterPriority !== 'all'
                    ? 'Try adjusting your search or filters, or create a new event.'
                    : 'Get started by creating your first event.'}
                </p>
              </motion.div>
            ) : (
              filteredEvents.map((event, index) => (
              <motion.div
                key={event.event_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {event.title}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(event.priority)}`}>
                        {event.priority.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(event.status)}`}>
                        {event.status.replace('_', ' ').toUpperCase()}
                      </span>
                      {event.is_recurring && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                          {event.recurrence_pattern}
                        </span>
                      )}
                      {event.reminder_days && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Bell className="w-3 h-3" />
                          REMINDER
                        </span>
                      )}
                    </div>

                    {event.description && (
                      <p className="text-gray-600 dark:text-gray-400 mb-3">{event.description}</p>
                    )}

                    {event.tags && event.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {event.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-1 rounded-md text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Start Date</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{formatDate(event.start_date)}</p>
                          <p className="text-xs text-gray-500">{getDaysUntil(event.start_date)}</p>
                        </div>
                      </div>

                      {event.end_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">End Date</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{formatDate(event.end_date)}</p>
                          </div>
                        </div>
                      )}

                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Location</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{event.location}</p>
                          </div>
                        </div>
                      )}

                      {event.organizer && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Organizer</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{event.organizer}</p>
                          </div>
                        </div>
                      )}

                      {event.reminder_days && (
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Reminder</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{event.reminder_days} days before</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Type</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{event.event_type}</p>
                        </div>
                      </div>

                      {event.department && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Department</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{event.department}</p>
                        </div>
                      )}

                      {event.employee_name && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Employee</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{event.employee_name}</p>
                        </div>
                      )}
                    </div>

                    {event.notes && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">{event.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleExportEvent(event)}
                      className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                      title="Export to iCalendar (.ics)"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleEditEvent(event)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      title="Edit event"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.event_id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Recurring Event Edit Dialog */}
      <AnimatePresence>
        {showRecurringDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    Edit Recurring Event
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    This is a recurring event. Would you like to edit just this occurrence or the entire series?
                  </p>
                </div>
              </div>

              {pendingEditEvent && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {pendingEditEvent.title}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Recurrence: {pendingEditEvent.recurrence_pattern}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleEditThisOccurrence}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-left flex items-center justify-between group"
                >
                  <div>
                    <div className="font-semibold">This Occurrence Only</div>
                    <div className="text-sm text-blue-100">Make changes to just this event</div>
                  </div>
                  <Edit2 className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={handleEditEntireSeries}
                  className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-left flex items-center justify-between group"
                >
                  <div>
                    <div className="font-semibold">Entire Series</div>
                    <div className="text-sm text-purple-100">Update all occurrences of this event</div>
                  </div>
                  <Calendar className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>

                <button
                  onClick={() => {
                    setShowRecurringDialog(false);
                    setPendingEditEvent(null);
                  }}
                  className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Event Modal */}
      <AnimatePresence>
        {showEventModal && (
          <EventModal
            event={editingEvent}
            eventTypes={eventTypes}
            onClose={() => {
              setShowEventModal(false);
              setEditingEvent(null);
            }}
            onSave={async (eventData) => {
              try {
                if (editingEvent) {
                  await updateEvent(editingEvent.event_id, eventData);
                  showToast('Event updated successfully', 'success');
                } else {
                  await createEvent(eventData);
                  showToast('Event created successfully', 'success');
                }
                await fetchEvents();
                setShowEventModal(false);
                setEditingEvent(null);
              } catch (error) {
                console.error('Error saving event:', error);
                showToast('Failed to save event. Please try again.', 'error');
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Modal */}
      <AnimatePresence>
        {showShortcutsModal && (
          <KeyboardShortcutsModal
            shortcuts={shortcuts}
            onClose={() => setShowShortcutsModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventsPage;
