import { useState, useEffect, useMemo } from 'react';
import { Loader, AlertCircle } from 'lucide-react';

const API_URL = '';

interface BusySlot {
  start: string;
  end: string;
  status: string;
}

interface AvailabilityGridProps {
  emails: string[];
  names: string[];
  date: string;  // YYYY-MM-DD
  timeZone: string;
  startHour?: number;
  endHour?: number;
  onSlotClick?: (time: string) => void;
}

export default function AvailabilityGrid({
  emails,
  names,
  date,
  timeZone,
  startHour = 8,
  endHour = 18,
  onSlotClick,
}: AvailabilityGridProps) {
  const [availability, setAvailability] = useState<Record<string, BusySlot[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Generate 30-minute time slots
  const slots = useMemo(() => {
    const result: string[] = [];
    for (let h = startHour; h < endHour; h++) {
      result.push(`${h.toString().padStart(2, '0')}:00`);
      result.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return result;
  }, [startHour, endHour]);

  useEffect(() => {
    if (!emails.length || !date) return;

    const fetchAvailability = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_URL}/calendar/availability`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emails,
            date,
            start_hour: startHour,
            end_hour: endHour,
            time_zone: timeZone,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || 'Failed to fetch availability');
        }

        const data = await res.json();
        setAvailability(data.availability || {});
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load availability');
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [emails.join(','), date, timeZone, startHour, endHour]);

  const isSlotBusy = (email: string, slotTime: string): 'busy' | 'tentative' | 'free' | 'unknown' => {
    const busySlots = availability[email];
    if (!busySlots) return 'unknown';

    const slotStart = new Date(`${date}T${slotTime}:00`);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

    for (const busy of busySlots) {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);

      // Check overlap
      if (slotStart < busyEnd && slotEnd > busyStart) {
        return busy.status === 'tentative' ? 'tentative' : 'busy';
      }
    }
    return 'free';
  };

  const slotColors: Record<string, string> = {
    busy: 'bg-red-200 dark:bg-red-900/40 border-red-300 dark:border-red-800',
    tentative: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-800',
    free: 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-800/40 cursor-pointer',
    unknown: 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 bg-stripes',
  };

  // Check if all interviewers are free at a given slot
  const isAllFree = (slotTime: string) => {
    return emails.every(email => isSlotBusy(email, slotTime) === 'free');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500 dark:text-gray-400">
        <Loader className="w-5 h-5 animate-spin mr-2" />
        Loading availability...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }

  if (!Object.keys(availability).length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-200 dark:bg-green-900/40 border border-green-300 dark:border-green-700" />
          Free
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-200 dark:bg-red-900/40 border border-red-300 dark:border-red-700" />
          Busy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700" />
          Tentative
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600" />
          No data
        </span>
      </div>

      <div className="overflow-x-auto border dark:border-gray-700 rounded-lg">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50">
              <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700/50 px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300 min-w-[120px]">
                Person
              </th>
              {slots.map(slot => (
                <th
                  key={slot}
                  className={`px-1 py-2 text-center font-normal text-gray-500 dark:text-gray-400 min-w-[40px] ${
                    slot.endsWith(':00') ? 'border-l dark:border-gray-600' : ''
                  }`}
                >
                  {slot.endsWith(':00') ? slot : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {emails.map((email, idx) => (
              <tr key={email} className="border-t dark:border-gray-700">
                <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-3 py-2 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                  {names[idx] || email}
                </td>
                {slots.map(slot => {
                  const status = isSlotBusy(email, slot);
                  return (
                    <td
                      key={slot}
                      className={`px-0 py-1 ${slot.endsWith(':00') ? 'border-l dark:border-gray-600' : ''}`}
                    >
                      <div
                        className={`h-6 mx-0.5 rounded-sm border ${slotColors[status]} transition-colors`}
                        onClick={() => {
                          if (status === 'free' && onSlotClick) onSlotClick(slot);
                        }}
                        title={`${names[idx] || email}: ${slot} — ${status}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Summary row: all-free highlights */}
            {emails.length > 1 && (
              <tr className="border-t-2 dark:border-gray-600">
                <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-3 py-2 font-medium text-gray-500 dark:text-gray-400 text-xs italic">
                  All free
                </td>
                {slots.map(slot => {
                  const allFree = isAllFree(slot);
                  return (
                    <td
                      key={slot}
                      className={`px-0 py-1 ${slot.endsWith(':00') ? 'border-l dark:border-gray-600' : ''}`}
                    >
                      <div
                        className={`h-6 mx-0.5 rounded-sm border transition-colors ${
                          allFree
                            ? 'bg-emerald-300 dark:bg-emerald-700 border-emerald-400 dark:border-emerald-600 cursor-pointer hover:bg-emerald-400 dark:hover:bg-emerald-600'
                            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        }`}
                        onClick={() => {
                          if (allFree && onSlotClick) onSlotClick(slot);
                        }}
                        title={`${slot} — ${allFree ? 'Everyone available' : 'Conflict'}`}
                      />
                    </td>
                  );
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
