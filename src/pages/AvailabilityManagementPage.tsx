import { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2, Lock } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Slot {
  id: number;
  user_id: number;
  user_name: string | null;
  start_time: string;
  end_time: string;
  time_zone: string | null;
  slot_duration_minutes: number;
  is_booked: boolean;
  booked_interview_id: number | null;
  requisition_id: number | null;
  created_at: string | null;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function groupByDate(slots: Slot[]): Record<string, Slot[]> {
  const groups: Record<string, Slot[]> = {};
  for (const slot of slots) {
    const key = new Date(slot.start_time).toLocaleDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(slot);
  }
  return groups;
}

export default function AvailabilityManagementPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Add form state
  const [addDate, setAddDate] = useState('');
  const [addStartTime, setAddStartTime] = useState('09:00');
  const [addEndTime, setAddEndTime] = useState('10:00');
  const [addDuration, setAddDuration] = useState(60);
  const [adding, setAdding] = useState(false);

  useEffect(() => { loadSlots(); }, []);

  async function loadSlots() {
    try {
      const res = await fetch(`${API_URL}/recruiting/availability`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setSlots(data.slots || []);
    } catch {
      setError('Failed to load availability slots');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSlot() {
    if (!addDate || !addStartTime || !addEndTime) return;
    setAdding(true);
    setError('');
    try {
      const start_time = `${addDate}T${addStartTime}:00`;
      const end_time = `${addDate}T${addEndTime}:00`;

      const res = await fetch(`${API_URL}/recruiting/availability`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slots: [{ start_time, end_time, slot_duration_minutes: addDuration }],
        }),
      });
      if (!res.ok) throw new Error('Failed to create');
      setSuccess('Slot created successfully');
      setShowAddForm(false);
      setAddDate('');
      await loadSlots();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to create slot');
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteSlot(slotId: number) {
    if (!confirm('Delete this availability slot?')) return;
    setError('');
    try {
      const res = await fetch(`${API_URL}/recruiting/availability/${slotId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete');
      setSuccess('Slot deleted');
      await loadSlots();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to delete slot');
    }
  }

  const grouped = groupByDate(slots);
  const dateKeys = Object.keys(grouped).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Interview Availability</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your available time slots for candidate interviews
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Slot
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Add Slot Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-5 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Add Availability Slot</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input
                type="date"
                value={addDate}
                onChange={e => setAddDate(e.target.value)}
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
              <input
                type="time"
                value={addStartTime}
                onChange={e => setAddStartTime(e.target.value)}
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
              <input
                type="time"
                value={addEndTime}
                onChange={e => setAddEndTime(e.target.value)}
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration</label>
              <select
                value={addDuration}
                onChange={e => setAddDuration(Number(e.target.value))}
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              >
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddSlot}
              disabled={adding || !addDate}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {adding ? 'Creating...' : 'Create Slot'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Slots Grid */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse h-16 bg-gray-100 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      ) : dateKeys.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No availability slots set up yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Add slots so candidates can self-schedule interviews</p>
        </div>
      ) : (
        <div className="space-y-6">
          {dateKeys.map(dateKey => (
            <div key={dateKey}>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {formatDate(grouped[dateKey][0].start_time)}
              </h3>
              <div className="space-y-2">
                {grouped[dateKey].map(slot => (
                  <div
                    key={slot.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      slot.is_booked
                        ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Clock className={`w-4 h-4 ${slot.is_booked ? 'text-green-500' : 'text-gray-400'}`} />
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatTime(slot.start_time)} — {formatTime(slot.end_time)}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                          ({slot.slot_duration_minutes} min)
                        </span>
                      </div>
                      {slot.is_booked && (
                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <Lock className="w-3 h-3" />
                          Booked
                        </span>
                      )}
                    </div>
                    {!slot.is_booked && (
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete slot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
