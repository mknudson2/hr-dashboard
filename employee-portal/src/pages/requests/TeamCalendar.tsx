import { useEffect, useState, useCallback } from 'react';
import { apiGet } from '@/utils/api';
import { AlertCircle, CalendarRange } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEmployeeFeatures } from '@/contexts/EmployeeFeaturesContext';
import AuroraPageHeader from '@/components/bifrost/AuroraPageHeader';
import MonthNavigator from '@/components/calendar/MonthNavigator';
import CalendarTimeline from '@/components/calendar/CalendarTimeline';
import CalendarLegend from '@/components/calendar/CalendarLegend';
import CeilingSettingsBanner from '@/components/calendar/CeilingSettingsBanner';

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

interface CalendarEventsData {
  people: CalendarPerson[];
  events: CalendarEvent[];
  effective_ceiling: string;
  can_modify_ceiling: boolean;
}

interface CeilingLevel {
  value: string;
  label: string;
}

interface CeilingData {
  effective_ceiling: string;
  can_modify: boolean;
  current_override: string | null;
  available_levels: CeilingLevel[];
}

function getMonthRange(month: Date): { start: string; end: string } {
  const year = month.getFullYear();
  const m = month.getMonth();
  const start = new Date(year, m, 1);
  const end = new Date(year, m + 1, 0);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return { start: fmt(start), end: fmt(end) };
}

export default function TeamCalendar() {
  const { viewMode } = useEmployeeFeatures();

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [calendarData, setCalendarData] = useState<CalendarEventsData | null>(null);
  const [ceilingData, setCeilingData] = useState<CeilingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendarData = useCallback(async (month: Date) => {
    try {
      setLoading(true);
      setError(null);
      const { start, end } = getMonthRange(month);
      const result = await apiGet<CalendarEventsData>(
        `/portal/pto-calendar/events?start_date=${start}&end_date=${end}`
      );
      setCalendarData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCeilingData = useCallback(async () => {
    try {
      const result = await apiGet<CeilingData>('/portal/pto-calendar/ceiling');
      setCeilingData(result);
    } catch {
      // Non-critical — ceiling banner just won't render
    }
  }, []);

  useEffect(() => {
    fetchCalendarData(currentMonth);
  }, [currentMonth, fetchCalendarData]);

  useEffect(() => {
    fetchCeilingData();
  }, [fetchCeilingData]);

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
  };

  const handleCeilingChanged = () => {
    fetchCeilingData();
    fetchCalendarData(currentMonth);
  };

  if (loading && !calendarData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !calendarData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-500" size={48} />
          <p className="text-gray-600 dark:text-gray-400 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {viewMode === 'bifrost' ? (
        <AuroraPageHeader
          title="Team Calendar"
          subtitle="See who in your team is in or out of office"
          icon={CalendarRange}
        />
      ) : (
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Calendar</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            See who in your team is in or out of office
          </p>
        </div>
      )}

      {/* Ceiling Settings Banner — only for authorized users */}
      {ceilingData?.can_modify && (
        <CeilingSettingsBanner
          effectiveCeiling={ceilingData.effective_ceiling}
          currentOverride={ceilingData.current_override}
          availableLevels={ceilingData.available_levels}
          onCeilingChanged={handleCeilingChanged}
        />
      )}

      {/* Controls row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <MonthNavigator
          currentMonth={currentMonth}
          onMonthChange={handleMonthChange}
        />
        <CalendarLegend viewMode={viewMode} />
      </motion.div>

      {/* Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4"
      >
        {calendarData && calendarData.people.length > 0 ? (
          <CalendarTimeline
            people={calendarData.people}
            events={calendarData.events}
            currentMonth={currentMonth}
            viewMode={viewMode}
          />
        ) : (
          <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
            No team members found in your org chain.
          </div>
        )}

        {loading && calendarData && (
          <div className="flex items-center justify-center py-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
