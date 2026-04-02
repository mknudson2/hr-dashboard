import { useState } from 'react';
import { Calendar, CheckCircle, Clock, Video, ExternalLink, AlertCircle, ChevronDown, ChevronUp, Send, RefreshCw } from 'lucide-react';
import { useInterviewScheduling } from '@/hooks/useInterviewScheduling';
import MiniMonthCalendar from './MiniMonthCalendar';
import SlotPicker from './SlotPicker';
import ConfirmationModal from './ConfirmationModal';

interface InterviewCalendarProps {
  applicationId: string;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${formatTime(iso)}`;
}

function isHrInterview(stageKey: string | null, stageName: string | null): boolean {
  if (stageKey === 'hr_interview') return true;
  if (stageName?.toLowerCase().includes('hr') && !stageName?.toLowerCase().includes('hiring manager')) return true;
  return false;
}

export default function InterviewCalendar({ applicationId }: InterviewCalendarProps) {
  const {
    scheduledInterviews, loading, error, booking,
    confirmSlot, setConfirmSlot, bookSlot,
    availableDates, scheduledDates, slotsForDate, interviewsForDate,
    hasScheduledHrInterview, hasScheduledHmInterview,
    confirmInterview, selectAlternative, requestReschedule, cancelForReschedule,
  } = useInterviewScheduling(applicationId);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [suggestedTimes, setSuggestedTimes] = useState('');
  const [confirming, setConfirming] = useState<number | null>(null);
  const [selectingAlt, setSelectingAlt] = useState<number | null>(null);
  const [reschedulingHr, setReschedulingHr] = useState(false);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[rgba(108,63,160,0.08)] p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-frost rounded w-2/3" />
          <div className="h-48 bg-frost rounded" />
          <div className="h-24 bg-frost rounded" />
        </div>
      </div>
    );
  }

  const dateSlots = selectedDate ? slotsForDate(selectedDate) : [];
  const dateInterviews = selectedDate ? interviewsForDate(selectedDate) : [];

  return (
    <div className="bg-white rounded-xl border border-[rgba(108,63,160,0.08)] p-6 space-y-5">
      <h2 className="text-base font-display font-semibold text-[#1A1A2E] flex items-center gap-2">
        <Calendar className="w-4 h-4 text-bifrost-violet" />
        Interview Schedule
      </h2>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Scheduled interviews summary */}
      {scheduledInterviews.length > 0 && (
        <div className="space-y-3">
          {scheduledInterviews.map(iv => {
            const needsConfirmation = !iv.applicant_confirmed && iv.status === 'Scheduled';
            const isConfirmed = iv.applicant_confirmed;
            const hasAlternatives = iv.alternative_times && iv.alternative_times.length > 0;
            const showingReschedule = rescheduleId === iv.id;

            return (
              <div
                key={iv.id}
                className={`p-4 rounded-xl border ${
                  isConfirmed
                    ? 'bg-emerald-50 border-emerald-200'
                    : needsConfirmation
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                {/* Interview header */}
                <div className="flex items-start gap-3">
                  {isConfirmed ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  ) : needsConfirmation ? (
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${isConfirmed ? 'text-emerald-800' : needsConfirmation ? 'text-amber-800' : 'text-gray-800'}`}>
                        {iv.stage_name || (iv.stage_lifecycle_key === 'hiring_manager_interview' ? 'Hiring Manager Interview' : 'HR Interview')}
                      </p>
                      {isConfirmed && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase bg-emerald-100 text-emerald-700 rounded-full">
                          <CheckCircle className="w-2.5 h-2.5" /> Confirmed
                        </span>
                      )}
                      {needsConfirmation && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase bg-amber-100 text-amber-700 rounded-full">
                          Action Required
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{formatDateTime(iv.scheduled_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <Video className="w-3 h-3" />
                      <span>{iv.format} &middot; {iv.duration_minutes} min</span>
                      {iv.interviewers?.[0]?.name && (
                        <span>&middot; {iv.interviewers[0].name}</span>
                      )}
                    </div>

                    {/* Teams meeting link */}
                    {iv.video_link && (
                      <a
                        href={iv.video_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 text-xs font-medium bg-aurora-teal/10 text-aurora-teal border border-aurora-teal/20 rounded-lg hover:bg-aurora-teal/20 transition-colors"
                      >
                        <Video className="w-3 h-3" />
                        Join Teams Meeting
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Confirm / Alternative Times / Reschedule */}
                {needsConfirmation && (
                  <div className="mt-3 pt-3 border-t border-amber-200/60 space-y-3">
                    {/* Confirm button */}
                    <button
                      onClick={async () => {
                        setConfirming(iv.id);
                        await confirmInterview(iv.id);
                        setConfirming(null);
                      }}
                      disabled={confirming === iv.id}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {confirming === iv.id ? 'Confirming...' : 'Confirm Attendance'}
                    </button>

                    {isHrInterview(iv.stage_lifecycle_key, iv.stage_name) ? (
                      /* HR Interview: Reschedule button — cancels and reopens slot picker */
                      <button
                        onClick={async () => {
                          setReschedulingHr(true);
                          await cancelForReschedule(iv.id);
                          setReschedulingHr(false);
                        }}
                        disabled={reschedulingHr}
                        className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 rounded-lg transition-colors"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${reschedulingHr ? 'animate-spin' : ''}`} />
                        {reschedulingHr ? 'Rescheduling...' : 'Reschedule'}
                      </button>
                    ) : (
                      /* HM Interview: Alternative times + "None of these work" form */
                      <>
                        {/* Alternative times */}
                        {hasAlternatives && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-gray-600">Or select an alternative time:</p>
                            {iv.alternative_times!.map((alt, idx) => (
                              <button
                                key={idx}
                                onClick={async () => {
                                  setSelectingAlt(iv.id);
                                  await selectAlternative(iv.id, idx);
                                  setSelectingAlt(null);
                                }}
                                disabled={selectingAlt === iv.id}
                                className="w-full flex items-center justify-between p-2.5 text-sm bg-white border border-gray-200 rounded-lg hover:border-bifrost-violet hover:bg-bifrost-violet/5 transition-colors disabled:opacity-50"
                              >
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5 text-bifrost-violet" />
                                  <span className="text-gray-800">{formatDateTime(alt.scheduled_at)}</span>
                                  <span className="text-xs text-gray-500">{alt.duration_minutes} min</span>
                                </div>
                                <span className="text-xs font-medium text-bifrost-violet">
                                  {selectingAlt === iv.id ? 'Selecting...' : 'Select'}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* None of these work toggle */}
                        <button
                          onClick={() => setRescheduleId(showingReschedule ? null : iv.id)}
                          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          {showingReschedule ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          None of these times work
                        </button>

                        {/* Reschedule form */}
                        {showingReschedule && (
                          <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-2.5">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Why don&apos;t these times work? <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                value={rescheduleReason}
                                onChange={e => setRescheduleReason(e.target.value)}
                                placeholder="Please explain why you can't attend at any of the proposed times..."
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-bifrost-violet/20 focus:border-bifrost-violet resize-none"
                                rows={2}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Suggest alternative times <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                value={suggestedTimes}
                                onChange={e => setSuggestedTimes(e.target.value)}
                                placeholder="e.g., Mondays and Wednesdays between 2-5pm, or any morning next week..."
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-bifrost-violet/20 focus:border-bifrost-violet resize-none"
                                rows={2}
                              />
                            </div>
                            <button
                              onClick={async () => {
                                if (!rescheduleReason.trim() || !suggestedTimes.trim()) return;
                                await requestReschedule(iv.id, rescheduleReason, suggestedTimes);
                                setRescheduleId(null);
                                setRescheduleReason('');
                                setSuggestedTimes('');
                              }}
                              disabled={!rescheduleReason.trim() || !suggestedTimes.trim()}
                              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-sm font-medium text-white bg-bifrost-violet hover:bg-bifrost-violet/90 disabled:bg-gray-300 disabled:text-gray-500 rounded-lg transition-colors"
                            >
                              <Send className="w-3.5 h-3.5" />
                              Request Reschedule
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pending HM interview note */}
      {hasScheduledHrInterview && !hasScheduledHmInterview && (
        <p className="text-xs text-[#8E8E9E] italic">
          Your Hiring Manager interview will appear here once it&apos;s been scheduled.
        </p>
      )}

      {/* Calendar + slot picker (only if HR interview not yet scheduled) */}
      {!hasScheduledHrInterview && (
        <>
          {availableDates.size > 0 ? (
            <>
              <MiniMonthCalendar
                availableDates={availableDates}
                scheduledDates={scheduledDates}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
              <div className="border-t border-[rgba(108,63,160,0.06)] pt-4">
                <SlotPicker
                  selectedDate={selectedDate}
                  slots={dateSlots}
                  scheduledInterviews={dateInterviews}
                  onSelectSlot={setConfirmSlot}
                />
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <Calendar className="w-10 h-10 text-[#C8C8D0] mx-auto mb-2" />
              <p className="text-sm text-[#4A4A62] font-medium">No interview times available yet</p>
              <p className="text-xs text-[#8E8E9E] mt-1">Please check back later.</p>
            </div>
          )}
        </>
      )}

      {/* Confirmation modal */}
      {confirmSlot && (
        <ConfirmationModal
          slot={confirmSlot}
          booking={booking}
          onConfirm={bookSlot}
          onCancel={() => setConfirmSlot(null)}
        />
      )}
    </div>
  );
}
