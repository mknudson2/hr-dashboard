import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Calendar, Clock, Video, Phone, MapPin, Users, Check } from 'lucide-react';

const BASE_URL = '';

export default function InterviewSchedulerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const applicationId = searchParams.get('applicationId');
  const stageId = searchParams.get('stageId');
  const stageName = searchParams.get('stageName') || 'Interview';

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [timeZone, setTimeZone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [format, setFormat] = useState('Video');
  const [location, setLocation] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [interviewerName, setInterviewerName] = useState('');
  const [interviewers, setInterviewers] = useState<{ user_id: number; name: string; role: string }[]>([]);

  // Also create a scorecard checkbox
  const [createScorecard, setCreateScorecard] = useState(true);

  const addInterviewer = () => {
    if (!interviewerName.trim()) return;
    setInterviewers([
      ...interviewers,
      { user_id: 0, name: interviewerName.trim(), role: interviewers.length === 0 ? 'lead' : 'interviewer' },
    ]);
    setInterviewerName('');
  };

  const removeInterviewer = (idx: number) => {
    setInterviewers(interviewers.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!scheduledDate || !scheduledTime || !applicationId) return;

    setSubmitting(true);
    setError('');

    const scheduledAt = `${scheduledDate}T${scheduledTime}:00`;

    try {
      // Schedule interview
      const res = await fetch(`${BASE_URL}/recruiting/interviews`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: parseInt(applicationId),
          stage_id: stageId ? parseInt(stageId) : null,
          scheduled_at: scheduledAt,
          duration_minutes: duration,
          time_zone: timeZone,
          format,
          location: location || null,
          video_link: videoLink || null,
          interviewers: interviewers.length > 0 ? interviewers : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to schedule interview');
      }

      // Optionally create scorecards for interviewers
      if (createScorecard && interviewers.length > 0) {
        for (const int of interviewers) {
          if (int.user_id > 0) {
            await fetch(`${BASE_URL}/recruiting/scorecards`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                application_id: parseInt(applicationId),
                stage_id: stageId ? parseInt(stageId) : null,
                interviewer_id: int.user_id,
              }),
            });
          }
        }
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (!applicationId) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">Missing application information.</p>
        <button onClick={() => navigate(-1)} className="text-blue-600 dark:text-blue-400 mt-2">Go back</button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center py-16">
        <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Interview Scheduled</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          {stageName} scheduled for {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString()}
        </p>
        <button
          onClick={() => navigate(`/recruiting/applications/${applicationId}`)}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          View Application
        </button>
      </div>
    );
  }

  const formatOptions = [
    { value: 'Video', icon: Video, label: 'Video Call' },
    { value: 'Phone', icon: Phone, label: 'Phone Call' },
    { value: 'In-Person', icon: MapPin, label: 'In-Person' },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Schedule Interview</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Stage: {stageName}</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Date & Time */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Calendar className="w-4 h-4" /> Date & Time</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time *</label>
            <input
              type="time"
              value={scheduledTime}
              onChange={e => setScheduledTime(e.target.value)}
              className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration</label>
            <select
              value={duration}
              onChange={e => setDuration(parseInt(e.target.value))}
              className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time Zone</label>
            <input
              type="text"
              value={timeZone}
              onChange={e => setTimeZone(e.target.value)}
              className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Format */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Video className="w-4 h-4" /> Interview Format</h2>
        <div className="grid grid-cols-3 gap-3">
          {formatOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFormat(opt.value)}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                format === opt.value
                  ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              <opt.icon className="w-4 h-4" />
              {opt.label}
            </button>
          ))}
        </div>

        {format === 'In-Person' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              placeholder="Office, conference room, etc."
            />
          </div>
        )}

        {format === 'Video' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Video Link</label>
            <input
              type="url"
              value={videoLink}
              onChange={e => setVideoLink(e.target.value)}
              className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              placeholder="https://zoom.us/j/..."
            />
          </div>
        )}
      </div>

      {/* Interviewers */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4" /> Interviewers</h2>

        {interviewers.length > 0 && (
          <div className="space-y-2">
            {interviewers.map((int, idx) => (
              <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium dark:text-gray-200">{int.name}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">({int.role})</span>
                </div>
                <button
                  onClick={() => removeInterviewer(idx)}
                  className="text-red-400 hover:text-red-600 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={interviewerName}
            onChange={e => setInterviewerName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addInterviewer()}
            className="flex-1 border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
            placeholder="Interviewer name"
          />
          <button
            onClick={addInterviewer}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-600 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-500"
          >
            Add
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            checked={createScorecard}
            onChange={e => setCreateScorecard(e.target.checked)}
            className="rounded"
          />
          Auto-create scorecards for interviewers
        </label>
      </div>

      {/* Submit */}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={submitting || !scheduledDate || !scheduledTime}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Calendar className="w-4 h-4" />
          {submitting ? 'Scheduling...' : 'Schedule Interview'}
        </button>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2.5 border dark:border-gray-600 rounded-lg text-sm dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
