import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiGet, apiPost } from '@/utils/api';

export interface AvailableSlot {
  id: number;
  user_id: number;
  user_name: string | null;
  start_time: string;
  end_time: string;
  time_zone: string | null;
  slot_duration_minutes: number;
}

export interface AlternativeTime {
  scheduled_at: string;
  duration_minutes: number;
}

export interface ScheduledInterview {
  id: number;
  interview_id: string;
  scheduled_at: string;
  duration_minutes: number;
  format: string;
  time_zone: string | null;
  status: string;
  interviewers: { user_id: number; name: string; role: string }[];
  stage_name: string | null;
  stage_lifecycle_key: string | null;
  video_link: string | null;
  applicant_confirmed: boolean;
  alternative_times: AlternativeTime[] | null;
  meeting_link_auto: boolean;
}

export function useInterviewScheduling(applicationId: string | undefined) {
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [scheduledInterviews, setScheduledInterviews] = useState<ScheduledInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(false);
  const [confirmSlot, setConfirmSlot] = useState<AvailableSlot | null>(null);

  const loadData = useCallback(async () => {
    if (!applicationId) return;
    setLoading(true);
    try {
      const [slotsData, interviewsData] = await Promise.all([
        apiGet<{ slots: AvailableSlot[] }>(
          `/applicant-portal/interviews/available-slots/${applicationId}`
        ),
        apiGet<{ interviews: ScheduledInterview[] }>(
          `/applicant-portal/my-applications/${applicationId}/interviews`
        ),
      ]);
      setSlots(slotsData.slots || []);
      setScheduledInterviews(interviewsData.interviews || []);
      setError('');
    } catch {
      setError('Failed to load scheduling data');
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => { loadData(); }, [loadData]);

  const bookSlot = useCallback(async () => {
    if (!confirmSlot || !applicationId) return;
    setBooking(true);
    setError('');
    try {
      await apiPost(`/applicant-portal/interviews/book/${applicationId}`, {
        slot_id: confirmSlot.id,
      });
      setConfirmSlot(null);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to book interview');
    } finally {
      setBooking(false);
    }
  }, [confirmSlot, applicationId, loadData]);

  const availableDates = useMemo(
    () => new Set(slots.map(s => new Date(s.start_time).toISOString().split('T')[0])),
    [slots],
  );

  const scheduledDates = useMemo(
    () => new Set(
      scheduledInterviews
        .filter(iv => iv.scheduled_at)
        .map(iv => new Date(iv.scheduled_at).toISOString().split('T')[0])
    ),
    [scheduledInterviews],
  );

  const slotsForDate = useCallback(
    (dateStr: string) =>
      slots
        .filter(s => new Date(s.start_time).toISOString().split('T')[0] === dateStr)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
    [slots],
  );

  const interviewsForDate = useCallback(
    (dateStr: string) =>
      scheduledInterviews.filter(
        iv => iv.scheduled_at && new Date(iv.scheduled_at).toISOString().split('T')[0] === dateStr
      ),
    [scheduledInterviews],
  );

  const hasScheduledHrInterview = scheduledInterviews.some(
    iv => iv.stage_lifecycle_key === 'hr_interview' ||
          (iv.stage_name?.toLowerCase().includes('hr') ?? false),
  );

  const hasScheduledHmInterview = scheduledInterviews.some(
    iv => iv.stage_lifecycle_key === 'hiring_manager_interview' ||
          (iv.stage_name?.toLowerCase().includes('hiring manager') ?? false),
  );

  const confirmInterview = useCallback(async (interviewId: number) => {
    try {
      await apiPost(`/applicant-portal/interviews/${interviewId}/confirm`);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to confirm interview');
    }
  }, [loadData]);

  const selectAlternative = useCallback(async (interviewId: number, altIndex: number) => {
    try {
      await apiPost(`/applicant-portal/interviews/${interviewId}/select-alternative`, {
        alternative_index: altIndex,
      });
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to select alternative time');
    }
  }, [loadData]);

  const requestReschedule = useCallback(async (interviewId: number, reason: string, suggestedTimes: string) => {
    try {
      await apiPost(`/applicant-portal/interviews/${interviewId}/request-reschedule`, {
        reason,
        suggested_times: suggestedTimes,
      });
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to request reschedule');
    }
  }, [loadData]);

  const cancelForReschedule = useCallback(async (interviewId: number) => {
    try {
      await apiPost(`/applicant-portal/interviews/${interviewId}/cancel-for-reschedule`);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to cancel interview');
    }
  }, [loadData]);

  return {
    slots, scheduledInterviews, loading, error, booking,
    confirmSlot, setConfirmSlot, bookSlot,
    availableDates, scheduledDates, slotsForDate, interviewsForDate,
    hasScheduledHrInterview, hasScheduledHmInterview,
    confirmInterview, selectAlternative, requestReschedule, cancelForReschedule,
  };
}
