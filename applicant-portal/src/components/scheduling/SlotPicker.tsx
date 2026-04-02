import { Clock, CheckCircle, Video, ExternalLink } from 'lucide-react';
import type { AvailableSlot, ScheduledInterview } from '@/hooks/useInterviewScheduling';

interface SlotPickerProps {
  selectedDate: string | null;
  slots: AvailableSlot[];
  scheduledInterviews: ScheduledInterview[];
  onSelectSlot: (slot: AvailableSlot) => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function formatDateHeading(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

export default function SlotPicker({
  selectedDate,
  slots,
  scheduledInterviews,
  onSelectSlot,
}: SlotPickerProps) {
  if (!selectedDate) {
    return (
      <div className="text-center py-6 text-sm text-[#8E8E9E]">
        Select a date to see available times
      </div>
    );
  }

  const heading = formatDateHeading(selectedDate);

  return (
    <div>
      <h3 className="text-sm font-semibold text-[#1A1A2E] mb-3">{heading}</h3>

      {/* Scheduled interviews for this date */}
      {scheduledInterviews.length > 0 && (
        <div className="space-y-2 mb-4">
          {scheduledInterviews.map(iv => (
            <div
              key={iv.id}
              className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg"
            >
              <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                  <span>{formatTime(iv.scheduled_at)}</span>
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                    {iv.status}
                  </span>
                </div>
                <p className="text-xs text-emerald-700 mt-0.5">
                  {iv.stage_name || (iv.stage_lifecycle_key === 'hiring_manager_interview' ? 'Hiring Manager Interview' : 'Interview')}
                  {' '}&middot; {iv.duration_minutes} min &middot; {iv.format}
                </p>
                {iv.interviewers?.[0]?.name && (
                  <p className="text-xs text-emerald-600 mt-0.5">
                    with {iv.interviewers[0].name}
                  </p>
                )}
                {iv.video_link && (
                  <a
                    href={iv.video_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                  >
                    <Video className="w-3 h-3" />
                    Join Meeting
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Available slots */}
      {slots.length > 0 ? (
        <div className="space-y-2">
          {slots.map(slot => (
            <button
              key={slot.id}
              onClick={() => onSelectSlot(slot)}
              className="w-full flex items-center gap-3 p-3 border border-[rgba(108,63,160,0.08)] rounded-lg text-left hover:border-bifrost-violet/20 hover:bg-frost transition-colors"
            >
              <Clock className="w-4 h-4 text-aurora-teal shrink-0" />
              <div className="min-w-0">
                <span className="text-sm font-medium text-[#1A1A2E]">
                  {formatTime(slot.start_time)} — {formatTime(slot.end_time)}
                </span>
                <div className="flex items-center gap-2 text-xs text-[#8E8E9E] mt-0.5">
                  <span>{slot.slot_duration_minutes} min</span>
                  <Video className="w-3 h-3" />
                  <span>Video</span>
                  {slot.user_name && <span>&middot; {slot.user_name}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : scheduledInterviews.length === 0 ? (
        <div className="text-center py-4 text-sm text-[#8E8E9E]">
          No times available on this date
        </div>
      ) : null}
    </div>
  );
}
