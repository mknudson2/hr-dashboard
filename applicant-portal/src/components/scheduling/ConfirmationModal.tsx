import { Calendar, Clock } from 'lucide-react';
import BifrostLightCard from '@/components/bifrost-light/BifrostLightCard';
import type { AvailableSlot } from '@/hooks/useInterviewScheduling';

interface ConfirmationModalProps {
  slot: AvailableSlot;
  booking: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

export default function ConfirmationModal({ slot, booking, onConfirm, onCancel }: ConfirmationModalProps) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <BifrostLightCard className="max-w-md w-full !p-6">
        <h3 className="text-lg font-display font-semibold text-[#1A1A2E] mb-4">
          Confirm Interview Time
        </h3>
        <div className="bg-frost rounded-lg p-4 mb-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-bifrost-violet" />
            <span className="font-medium">
              {new Date(slot.start_time).toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric',
              })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-bifrost-violet" />
            <span>
              {formatTime(slot.start_time)} — {formatTime(slot.end_time)}
            </span>
          </div>
          {slot.user_name && (
            <p className="text-sm text-[#4A4A62]">Interviewer: {slot.user_name}</p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-[rgba(108,63,160,0.12)] rounded-xl text-sm text-[#4A4A62] hover:bg-frost"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={booking}
            className="flex-1 px-4 py-2.5 bg-bifrost-violet text-white rounded-xl text-sm font-medium hover:bg-bifrost-violet-dark disabled:opacity-50"
          >
            {booking ? 'Booking...' : 'Confirm'}
          </button>
        </div>
      </BifrostLightCard>
    </div>
  );
}
