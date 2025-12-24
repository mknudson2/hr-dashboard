/**
 * iCalendar (.ics) export utility
 * Converts events to iCalendar format for import into calendar applications
 */

interface Event {
  event_id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  organizer: string | null;
  priority: string;
  status: string;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  recurrence_end_date?: string | null;
}

/**
 * Format a date for iCalendar (YYYYMMDD or YYYYMMDDTHHMMSS)
 */
const formatICalDate = (dateString: string, includeTime = false): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  if (includeTime) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}`;
  }

  return `${year}${month}${day}`;
};

/**
 * Convert recurrence pattern to RRULE format
 */
const getRecurrenceRule = (pattern: string | null, endDate?: string | null): string => {
  if (!pattern) return '';

  const ruleMap: Record<string, string> = {
    'Daily': 'FREQ=DAILY',
    'Weekly': 'FREQ=WEEKLY',
    'Monthly': 'FREQ=MONTHLY',
    'Quarterly': 'FREQ=MONTHLY;INTERVAL=3',
    'Yearly': 'FREQ=YEARLY'
  };

  let rule = ruleMap[pattern] || '';

  if (rule && endDate) {
    rule += `;UNTIL=${formatICalDate(endDate)}`;
  }

  return rule;
};

/**
 * Escape special characters for iCalendar format
 */
const escapeICalText = (text: string | null): string => {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
};

/**
 * Convert a single event to iCalendar format
 */
export const eventToICalendar = (event: Event): string => {
  const now = new Date();
  const timestamp = formatICalDate(now.toISOString(), true);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HR Dashboard//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.event_id}@hr-dashboard.local`,
    `DTSTAMP:${timestamp}Z`,
    `DTSTART:${formatICalDate(event.start_date)}`,
  ];

  // Add end date if available
  if (event.end_date) {
    lines.push(`DTEND:${formatICalDate(event.end_date)}`);
  } else {
    // If no end date, make it a one-day event
    const endDate = new Date(event.start_date);
    endDate.setDate(endDate.getDate() + 1);
    lines.push(`DTEND:${formatICalDate(endDate.toISOString())}`);
  }

  // Add recurrence rule if recurring
  if (event.is_recurring && event.recurrence_pattern) {
    const rrule = getRecurrenceRule(event.recurrence_pattern, event.recurrence_end_date);
    if (rrule) {
      lines.push(`RRULE:${rrule}`);
    }
  }

  // Add other fields
  lines.push(`SUMMARY:${escapeICalText(event.title)}`);

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICalText(event.location)}`);
  }

  if (event.organizer) {
    lines.push(`ORGANIZER:CN=${escapeICalText(event.organizer)}`);
  }

  // Map priority (low=9, medium=5, high=3, critical=1)
  const priorityMap: Record<string, number> = {
    'low': 9,
    'medium': 5,
    'high': 3,
    'critical': 1
  };
  lines.push(`PRIORITY:${priorityMap[event.priority] || 5}`);

  // Map status
  const statusMap: Record<string, string> = {
    'scheduled': 'CONFIRMED',
    'in_progress': 'CONFIRMED',
    'completed': 'CONFIRMED',
    'cancelled': 'CANCELLED'
  };
  lines.push(`STATUS:${statusMap[event.status] || 'CONFIRMED'}`);

  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
};

/**
 * Convert multiple events to iCalendar format
 */
export const eventsToICalendar = (events: Event[]): string => {
  const now = new Date();
  const timestamp = formatICalDate(now.toISOString(), true);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HR Dashboard//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  events.forEach(event => {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.event_id}@hr-dashboard.local`);
    lines.push(`DTSTAMP:${timestamp}Z`);
    lines.push(`DTSTART:${formatICalDate(event.start_date)}`);

    // Add end date
    if (event.end_date) {
      lines.push(`DTEND:${formatICalDate(event.end_date)}`);
    } else {
      const endDate = new Date(event.start_date);
      endDate.setDate(endDate.getDate() + 1);
      lines.push(`DTEND:${formatICalDate(endDate.toISOString())}`);
    }

    // Add recurrence
    if (event.is_recurring && event.recurrence_pattern) {
      const rrule = getRecurrenceRule(event.recurrence_pattern, event.recurrence_end_date);
      if (rrule) {
        lines.push(`RRULE:${rrule}`);
      }
    }

    lines.push(`SUMMARY:${escapeICalText(event.title)}`);

    if (event.description) {
      lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
    }

    if (event.location) {
      lines.push(`LOCATION:${escapeICalText(event.location)}`);
    }

    if (event.organizer) {
      lines.push(`ORGANIZER:CN=${escapeICalText(event.organizer)}`);
    }

    const priorityMap: Record<string, number> = {
      'low': 9,
      'medium': 5,
      'high': 3,
      'critical': 1
    };
    lines.push(`PRIORITY:${priorityMap[event.priority] || 5}`);

    const statusMap: Record<string, string> = {
      'scheduled': 'CONFIRMED',
      'in_progress': 'CONFIRMED',
      'completed': 'CONFIRMED',
      'cancelled': 'CANCELLED'
    };
    lines.push(`STATUS:${statusMap[event.status] || 'CONFIRMED'}`);

    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
};

/**
 * Download an iCalendar file
 */
export const downloadICalendar = (icsContent: string, filename: string): void => {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
