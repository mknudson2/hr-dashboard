import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Clock, Video, CheckCircle, ArrowLeft } from 'lucide-react';
import { apiGet, apiPost } from '@/utils/api';
import BifrostLightCard from '@/components/bifrost-light/BifrostLightCard';

interface Slot {
  id: number;
  user_id: number;
  user_name: string | null;
  start_time: string;
  end_time: string;
  time_zone: string | null;
  slot_duration_minutes: number;
}

interface BookedInterview {
  id: number;
  interview_id: string;
  scheduled_at: string;
  duration_minutes: number;
  format: string;
  time_zone: string | null;
  interviewers: { user_id: number; name: string; role: string }[];
}

function groupSlotsByDate(slots: Slot[]): Record<string, Slot[]> {
  const groups: Record<string, Slot[]> = {};
  for (const slot of slots) {
    const date = new Date(slot.start_time).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(slot);
  }
  return groups;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

export default function InterviewSchedulingPage() {
  const { id } = useParams<{ id: string }>();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingSlotId, setBookingSlotId] = useState<number | null>(null);
  const [confirmSlot, setConfirmSlot] = useState<Slot | null>(null);
  const [bookedInterview, setBookedInterview] = useState<BookedInterview | null>(null);

  useEffect(() => {
    loadSlots();
  }, [id]);

  async function loadSlots() {
    try {
      const data = await apiGet<{ slots: Slot[] }>(`/applicant-portal/interviews/available-slots/${id}`);
      setSlots(data.slots || []);
    } catch {
      setError('Failed to load available times');
    } finally {
      setLoading(false);
    }
  }

  async function handleBook() {
    if (!confirmSlot) return;
    setBookingSlotId(confirmSlot.id);
    setError('');
    try {
      const data = await apiPost<{ interview: BookedInterview }>(
        `/applicant-portal/interviews/book/${id}`,
        { slot_id: confirmSlot.id },
      );
      setBookedInterview(data.interview);
      setConfirmSlot(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to book slot');
    } finally {
      setBookingSlotId(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-frost rounded w-1/3" />
          <div className="h-48 bg-frost rounded" />
        </div>
      </div>
    );
  }

  // Success state — interview booked
  if (bookedInterview) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <BifrostLightCard accent="teal" className="text-center py-10">
          <CheckCircle className="w-16 h-16 text-aurora-teal mx-auto mb-4" />
          <h1 className="text-2xl font-display font-semibold text-[#1A1A2E] mb-2">
            Interview Scheduled!
          </h1>
          <p className="text-[#4A4A62] mb-6">
            Your interview has been confirmed.
          </p>
          <div className="bg-frost rounded-xl p-5 max-w-sm mx-auto text-left space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-bifrost-violet" />
              <span className="text-[#1A1A2E] font-medium">
                {new Date(bookedInterview.scheduled_at).toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-bifrost-violet" />
              <span className="text-[#1A1A2E]">
                {formatTime(bookedInterview.scheduled_at)} ({bookedInterview.duration_minutes} min)
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Video className="w-4 h-4 text-bifrost-violet" />
              <span className="text-[#1A1A2E]">{bookedInterview.format}</span>
            </div>
            {bookedInterview.interviewers?.[0]?.name && (
              <p className="text-sm text-[#4A4A62]">
                With: {bookedInterview.interviewers[0].name}
              </p>
            )}
          </div>
          <Link
            to={`/my-applications/${id}`}
            className="inline-block mt-6 text-sm text-bifrost-violet hover:text-bifrost-violet-dark font-medium"
          >
            &larr; Back to Application
          </Link>
        </BifrostLightCard>
      </div>
    );
  }

  const grouped = groupSlotsByDate(slots);
  const dateKeys = Object.keys(grouped);

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Link
        to={`/my-applications/${id}`}
        className="flex items-center gap-1 text-sm text-bifrost-violet hover:text-bifrost-violet-dark mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Application
      </Link>

      <h1 className="text-2xl font-display font-semibold text-[#1A1A2E] mb-2">
        Schedule Your Interview
      </h1>
      <p className="text-[#4A4A62] mb-6">
        Choose a time that works best for you. All interviews are conducted via video call.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {dateKeys.length === 0 ? (
        <BifrostLightCard className="text-center py-10">
          <Calendar className="w-12 h-12 text-[#8E8E9E] mx-auto mb-3" />
          <p className="text-[#4A4A62] font-medium">No interview times are currently available</p>
          <p className="text-sm text-[#8E8E9E] mt-1">Please check back later or contact our team.</p>
        </BifrostLightCard>
      ) : (
        <div className="space-y-6">
          {dateKeys.map(date => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-bifrost-violet mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {date}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {grouped[date].map(slot => (
                  <BifrostLightCard
                    key={slot.id}
                    className="cursor-pointer hover:border-bifrost-violet/20 !p-4"
                    accent="none"
                  >
                    <button
                      onClick={() => setConfirmSlot(slot)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-aurora-teal" />
                        <span className="font-medium text-[#1A1A2E]">
                          {formatTime(slot.start_time)} — {formatTime(slot.end_time)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#8E8E9E]">
                        <span>{slot.slot_duration_minutes} min</span>
                        {slot.user_name && <span>with {slot.user_name}</span>}
                      </div>
                    </button>
                  </BifrostLightCard>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation modal */}
      {confirmSlot && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <BifrostLightCard className="max-w-md w-full !p-6">
            <h3 className="text-lg font-display font-semibold text-[#1A1A2E] mb-4">
              Confirm Interview Time
            </h3>
            <div className="bg-frost rounded-lg p-4 mb-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-bifrost-violet" />
                <span className="font-medium">
                  {new Date(confirmSlot.start_time).toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-bifrost-violet" />
                <span>
                  {formatTime(confirmSlot.start_time)} — {formatTime(confirmSlot.end_time)}
                </span>
              </div>
              {confirmSlot.user_name && (
                <p className="text-sm text-[#4A4A62]">Interviewer: {confirmSlot.user_name}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmSlot(null)}
                className="flex-1 px-4 py-2.5 border border-[rgba(108,63,160,0.12)] rounded-xl text-sm text-[#4A4A62] hover:bg-frost"
              >
                Cancel
              </button>
              <button
                onClick={handleBook}
                disabled={bookingSlotId !== null}
                className="flex-1 px-4 py-2.5 bg-bifrost-violet text-white rounded-xl text-sm font-medium hover:bg-bifrost-violet-dark disabled:opacity-50"
              >
                {bookingSlotId ? 'Booking...' : 'Confirm'}
              </button>
            </div>
          </BifrostLightCard>
        </div>
      )}
    </div>
  );
}
