import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, CheckCheck, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '@/utils/api';

interface Notification {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  priority: string;
  resource_type: string | null;
  resource_id: number | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
  employee_id: string | null;
}

interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
}

interface NotificationSummary {
  pending_hr_requests: number;
  pending_pto_requests: number;
  pending_fmla_cases: number;
  unread_notifications: number;
  total_pending: number;
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fetch unread count on mount and periodically
  useEffect(() => {
    fetchUnreadCount();
    fetchSummary();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
      fetchSummary();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
  }, [isOpen]);

  const fetchUnreadCount = async () => {
    try {
      const result = await apiGet<{ unread_count: number }>('/in-app-notifications/count');
      setUnreadCount(result.unread_count);
    } catch (err) {
      console.error('Failed to fetch notification count:', err);
    }
  };

  const fetchSummary = async () => {
    try {
      const result = await apiGet<NotificationSummary>('/in-app-notifications/summary');
      setSummary(result);
    } catch (err) {
      console.error('Failed to fetch notification summary:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const result = await apiGet<NotificationListResponse>('/in-app-notifications?include_read=true&limit=10');
      setNotifications(result.notifications);
      setUnreadCount(result.unread_count);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAllRead = async () => {
    try {
      await apiPost('/in-app-notifications/mark-all-read', {});
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      try {
        await apiPost('/in-app-notifications/mark-read', { notification_ids: [notification.id] });
        setNotifications(notifications.map(n =>
          n.id === notification.id ? { ...n, is_read: true } : n
        ));
        setUnreadCount(Math.max(0, unreadCount - 1));
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }

    // Navigate to action URL if present
    if (notification.action_url) {
      setIsOpen(false);
      navigate(notification.action_url);
    }
  };

  const handleDismiss = async (e: React.MouseEvent, notificationId: number) => {
    e.stopPropagation();
    try {
      await apiPost(`/in-app-notifications/${notificationId}/dismiss`, {});
      setNotifications(notifications.filter(n => n.id !== notificationId));
      const dismissed = notifications.find(n => n.id === notificationId);
      if (dismissed && !dismissed.is_read) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500';
      case 'high': return 'border-l-orange-500';
      default: return 'border-l-blue-500';
    }
  };

  const totalPending = summary?.total_pending || 0;
  const displayCount = unreadCount + totalPending;

  const dropdownContent = isOpen && (
    <div
      ref={dropdownRef}
      className="fixed w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        zIndex: 99999
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      {/* Summary Section */}
      {summary && summary.total_pending > 0 && (
        <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Pending Actions</p>
          <div className="flex flex-wrap gap-2">
            {summary.pending_hr_requests > 0 && (
              <button
                onClick={() => { setIsOpen(false); navigate('/par-approvals'); }}
                className="text-xs px-2 py-1 bg-white dark:bg-gray-700 rounded-full border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                {summary.pending_hr_requests} HR Request{summary.pending_hr_requests !== 1 ? 's' : ''}
              </button>
            )}
            {summary.pending_pto_requests > 0 && (
              <button
                onClick={() => { setIsOpen(false); navigate('/overtime'); }}
                className="text-xs px-2 py-1 bg-white dark:bg-gray-700 rounded-full border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              >
                {summary.pending_pto_requests} PTO Request{summary.pending_pto_requests !== 1 ? 's' : ''}
              </button>
            )}
            {summary.pending_fmla_cases > 0 && (
              <button
                onClick={() => { setIsOpen(false); navigate('/fmla'); }}
                className="text-xs px-2 py-1 bg-white dark:bg-gray-700 rounded-full border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
              >
                {summary.pending_fmla_cases} FMLA Case{summary.pending_fmla_cases !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors border-l-4 ${getPriorityColor(notification.priority)} ${
                !notification.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium truncate ${
                      notification.is_read
                        ? 'text-gray-700 dark:text-gray-300'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {notification.title}
                    </p>
                    {!notification.is_read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {formatTimeAgo(notification.created_at)}
                    </span>
                    {notification.action_url && (
                      <ExternalLink size={12} className="text-gray-400" />
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDismiss(e, notification.id)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors flex-shrink-0"
                  aria-label="Dismiss"
                >
                  <X size={14} className="text-gray-400" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center">
            <Bell className="mx-auto text-gray-300 dark:text-gray-600" size={32} />
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">No notifications</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={() => { setIsOpen(false); navigate('/par-approvals'); }}
            className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View all pending approvals
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="relative p-2 rounded-lg hover:bg-gray-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} className="text-gray-300" />
        {displayCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full px-1">
            {displayCount > 99 ? '99+' : displayCount}
          </span>
        )}
      </button>

      {/* Portal for dropdown */}
      {createPortal(dropdownContent, document.body)}
    </div>
  );
}
