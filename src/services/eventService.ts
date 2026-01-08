const API_BASE_URL = '';

// Authentication is handled via httpOnly cookies (credentials: 'include')

export const getEvents = async (params?: {
  start_date?: string;
  end_date?: string;
  event_type?: string;
  department?: string;
  status?: string;
  priority?: string;
}) => {
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
  }

  const url = `${API_BASE_URL}/events${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch events');
  return response.json();
};

export const getEvent = async (eventId: number) => {
  const response = await fetch(`${API_BASE_URL}/events/${eventId}`, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch event');
  return response.json();
};

export const createEvent = async (eventData: any) => {
  const response = await fetch(`${API_BASE_URL}/events`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData),
  });
  if (!response.ok) throw new Error('Failed to create event');
  return response.json();
};

export const updateEvent = async (eventId: number, eventData: any) => {
  const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData),
  });
  if (!response.ok) throw new Error('Failed to update event');
  return response.json();
};

export const deleteEvent = async (eventId: number) => {
  const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to delete event');
  return response.json();
};

export const getUpcomingEvents = async (days: number = 30) => {
  const response = await fetch(`${API_BASE_URL}/events/upcoming/summary?days=${days}`, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch upcoming events');
  return response.json();
};

export const getEventTypes = async () => {
  const response = await fetch(`${API_BASE_URL}/event-types`, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch event types');
  return response.json();
};

export const getEventsByType = async (eventType: string) => {
  const response = await fetch(`${API_BASE_URL}/events/by-type/${eventType}`, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch events by type');
  return response.json();
};
