import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '@/utils/api';
import {
  ArrowLeft, Clock, Check, CheckCircle, ChevronLeft, ChevronRight, UserX, Calendar,
} from 'lucide-react';

interface StakeholderStatus {
  user_id: number;
  name: string;
  role: string;
  slots_submitted: number;
  opted_out: boolean;
}

interface ExistingSlot {
  id: number;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

const HOURS = Array.from({ length: 20 }, (_, i) => 8 + i * 0.5); // 8:00 to 17:30

function formatHour(h: number): string {
  const hour = Math.floor(h);
  const min = h % 1 === 0.5 ? '30' : '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${min} ${ampm}`;
}

function getWeekDates(baseDate: Date): Date[] {
  const d = new Date(baseDate);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  const dates: Date[] = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date);
  }
  return dates;
}

function toDateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

export default function AvailabilitySubmissionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [reqTitle, setReqTitle] = useState('');
  const [stakeholders, setStakeholders] = useState<StakeholderStatus[]>([]);
  const [existingSlots, setExistingSlots] = useState<ExistingSlot[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set()); // "YYYY-MM-DD|HH:MM"
  const [submittedSlots, setSubmittedSlots] = useState<Set<string>>(new Set()); // slots already saved server-side
  const [weekBase, setWeekBase] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + (d.getDay() === 0 ? 1 : d.getDay() === 6 ? 2 : 0));
    return d;
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [myRole] = useState<string | null>(null);
  const [optingOut, setOptingOut] = useState(false);

  const weekDates = useMemo(() => getWeekDates(weekBase), [weekBase.toISOString()]);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statusData, slotsData] = await Promise.all([
        apiGet<{ stakeholders: StakeholderStatus[]; requisition_title: string }>(
          `/portal/hiring-manager/requisitions/${id}/availability-status`
        ),
        apiGet<{ slots: ExistingSlot[] }>(
          `/portal/hiring-manager/requisitions/${id}/my-availability`
        ).catch(() => ({ slots: [] })),
      ]);

      setReqTitle(statusData.requisition_title);
      setStakeholders(statusData.stakeholders);
      setExistingSlots(slotsData.slots || []);

      // Find current user's role in stakeholders
      // (the status endpoint includes all stakeholders — we'll detect by slots_submitted or name)
      // We'll determine from the stakeholders list which one is "me" based on matching later
    } catch {
      // Error loading
    } finally {
      setLoading(false);
    }
  };

  // Preload existing slots into the selection grid and mark them as submitted
  useEffect(() => {
    const existing = new Set<string>();
    for (const slot of existingSlots) {
      const start = new Date(slot.start_time);
      const key = `${toDateKey(start)}|${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`;
      existing.add(key);
    }
    setSelectedSlots(existing);
    setSubmittedSlots(existing);
  }, [existingSlots]);

  const toggleSlot = (dateKey: string, hour: number) => {
    const h = Math.floor(hour);
    const m = hour % 1 === 0.5 ? '30' : '00';
    const key = `${dateKey}|${h.toString().padStart(2, '0')}:${m}`;
    setSelectedSlots(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isSlotSelected = (dateKey: string, hour: number) => {
    const h = Math.floor(hour);
    const m = hour % 1 === 0.5 ? '30' : '00';
    return selectedSlots.has(`${dateKey}|${h.toString().padStart(2, '0')}:${m}`);
  };

  const isSlotSubmitted = (dateKey: string, hour: number) => {
    const h = Math.floor(hour);
    const m = hour % 1 === 0.5 ? '30' : '00';
    return submittedSlots.has(`${dateKey}|${h.toString().padStart(2, '0')}:${m}`);
  };

  const handleSubmit = async () => {
    if (selectedSlots.size === 0) return;

    setSubmitting(true);
    try {
      const slots = Array.from(selectedSlots).map(key => {
        const [dateStr, time] = key.split('|');
        // Send as local time strings (no Z suffix) so they round-trip correctly
        const startStr = `${dateStr}T${time}:00`;
        const [hh, mm] = time.split(':').map(Number);
        const endMin = mm + 30;
        const endH = hh + Math.floor(endMin / 60);
        const endM = endMin % 60;
        const endStr = `${dateStr}T${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}:00`;
        return {
          start_time: startStr,
          end_time: endStr,
          time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      });

      await apiPost(`/portal/hiring-manager/requisitions/${id}/availability`, { slots });
      setSubmitted(true);
      loadData();
    } catch {
      // Handle error
    } finally {
      setSubmitting(false);
    }
  };

  const handleOptOut = async () => {
    setOptingOut(true);
    try {
      await apiPost(`/portal/hiring-manager/requisitions/${id}/opt-out-availability`);
      loadData();
    } catch {
      // Handle error
    } finally {
      setOptingOut(false);
    }
  };

  const prevWeek = () => {
    const d = new Date(weekBase);
    d.setDate(d.getDate() - 7);
    setWeekBase(d);
  };

  const nextWeek = () => {
    const d = new Date(weekBase);
    d.setDate(d.getDate() + 7);
    setWeekBase(d);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const pendingStakeholders = stakeholders.filter(s => s.slots_submitted === 0 && !s.opted_out);
  const submittedStakeholders = stakeholders.filter(s => s.slots_submitted > 0);
  const optedOutStakeholders = stakeholders.filter(s => s.opted_out);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/hiring/requisitions/${id}`)}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Submit Your Availability</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {reqTitle} — Hiring Manager Interview
          </p>
        </div>
      </div>

      {/* Success Banner */}
      {submitted && (
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
          <p className="text-sm text-green-800 dark:text-green-300">
            Your availability has been submitted. You can update it anytime by selecting different time slots.
          </p>
        </div>
      )}

      {/* Stakeholder Status */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Team Submission Status</h2>
        <div className="space-y-2">
          {submittedStakeholders.map(s => (
            <div key={s.user_id} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-900 dark:text-white">{s.name}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 capitalize">{s.role.replace('_', '/')}</span>
              </div>
              <span className="text-xs text-green-600 dark:text-green-400">{s.slots_submitted} slots</span>
            </div>
          ))}
          {pendingStakeholders.map(s => (
            <div key={s.user_id} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-gray-900 dark:text-white">{s.name}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 capitalize">{s.role.replace('_', '/')}</span>
              </div>
              <span className="text-xs text-amber-600 dark:text-amber-400">Pending</span>
            </div>
          ))}
          {optedOutStakeholders.map(s => (
            <div key={s.user_id} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <UserX className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">{s.name}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 capitalize">{s.role.replace('_', '/')}</span>
              </div>
              <span className="text-xs text-gray-400">Opted out</span>
            </div>
          ))}
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevWeek} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {weekDates[0].toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} — {weekDates[4].toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
        </h3>
        <button onClick={nextWeek} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Time Slot Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                {weekDates.map(date => (
                  <th key={toDateKey(date)} className="px-2 py-2 text-center font-medium text-gray-600 dark:text-gray-300 min-w-[120px]">
                    <div>{date.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                    <div className="font-normal text-gray-400">{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map(hour => (
                <tr key={hour} className={`border-t dark:border-gray-700 ${hour % 1 === 0 ? 'border-t-gray-300 dark:border-t-gray-600' : ''}`}>
                  {weekDates.map(date => {
                    const dateKey = toDateKey(date);
                    const selected = isSlotSelected(dateKey, hour);
                    const alreadySubmitted = isSlotSubmitted(dateKey, hour);
                    const timeLabel = formatHour(hour);
                    return (
                      <td key={dateKey} className="px-1 py-0.5">
                        <button
                          onClick={() => toggleSlot(dateKey, hour)}
                          className={`w-full h-7 rounded transition-colors flex items-center justify-center gap-1 text-[10px] font-medium ${
                            alreadySubmitted && selected
                              ? 'bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-500'
                              : selected
                              ? 'bg-green-200 dark:bg-green-700 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 hover:bg-green-300 dark:hover:bg-green-600'
                              : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                          }`}
                          title={`${date.toLocaleDateString(undefined, { weekday: 'short' })} ${timeLabel} — ${alreadySubmitted ? 'Submitted' : selected ? 'Available' : 'Click to mark available'}`}
                        >
                          {selected ? <Check className="w-3 h-3 shrink-0" /> : null}
                          <span>{timeLabel}</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {selectedSlots.size} slot{selectedSlots.size !== 1 ? 's' : ''} selected
        </div>
        <div className="flex items-center gap-3">
          {(myRole === 'vp_svp' || myRole === 'observer') && (
            <button
              onClick={handleOptOut}
              disabled={optingOut}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <UserX className="w-4 h-4" />
              {optingOut ? 'Opting out...' : 'Opt Out'}
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting || selectedSlots.size === 0}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            {submitting ? 'Submitting...' : submittedSlots.size > 0 ? 'Resubmit Availability' : 'Submit Availability'}
          </button>
        </div>
      </div>
    </div>
  );
}
