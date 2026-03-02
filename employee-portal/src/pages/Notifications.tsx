import { useState, useEffect, useCallback } from 'react';
import { Bell, Check, Clock, AlertCircle, Info, CheckCircle, Filter, MailOpen, Mail, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '@/utils/api';
import { useEmployeeFeatures } from '@/contexts/EmployeeFeaturesContext';
import AuroraPageHeader from '@/components/bifrost/AuroraPageHeader';

// Valid employee portal route prefixes for action_url links
const PORTAL_ROUTE_PREFIXES = [
  '/dashboard', '/notifications', '/directory', '/announcements', '/schedule',
  '/my-hr/', '/requests/', '/resources/', '/team', '/admin/',
];

function isPortalRoute(url: string): boolean {
  return PORTAL_ROUTE_PREFIXES.some(prefix => url.startsWith(prefix));
}

type NotificationType = 'info' | 'success' | 'warning' | 'action';
type NotificationCategory = 'all' | 'unread' | 'action_required';

interface BackendNotification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  priority: string;
  is_read: boolean;
  action_url?: string;
  action_label?: string;
  category?: string;
  created_at: string;
}

interface NotificationsResponse {
  notifications: BackendNotification[];
  total: number;
  unread_count: number;
}

function mapNotificationType(notification_type: string, priority: string): NotificationType {
  if (priority === 'urgent' || priority === 'high') return 'warning';
  switch (notification_type) {
    case 'pto_request':
    case 'fmla_request':
    case 'hr_request':
      return 'action';
    case 'approval':
    case 'completed':
      return 'success';
    case 'reminder':
    case 'deadline':
      return 'warning';
    default:
      return 'info';
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

function getTypeIcon(type: NotificationType) {
  switch (type) {
    case 'success':
      return <CheckCircle className="text-green-500" size={20} />;
    case 'warning':
      return <AlertCircle className="text-yellow-500" size={20} />;
    case 'action':
      return <Clock className="text-blue-500" size={20} />;
    default:
      return <Info className="text-gray-500" size={20} />;
  }
}

function getTypeBadgeColor(type: NotificationType): string {
  switch (type) {
    case 'success':
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
    case 'warning':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
    case 'action':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400';
  }
}

export default function Notifications() {
  const { viewMode } = useEmployeeFeatures();
  const [notifications, setNotifications] = useState<BackendNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<NotificationCategory>('all');
  const [showFilters, setShowFilters] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setError(null);
      const data = await apiGet<NotificationsResponse>(
        '/in-app-notifications?include_read=true&limit=50'
      );
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const actionRequiredCount = notifications.filter(n => {
    const uiType = mapNotificationType(n.notification_type, n.priority);
    return (uiType === 'action' || uiType === 'warning') && !n.is_read;
  }).length;

  const filteredNotifications = notifications.filter(n => {
    const uiType = mapNotificationType(n.notification_type, n.priority);
    if (filter === 'unread') return !n.is_read;
    if (filter === 'action_required') return uiType === 'action' || uiType === 'warning';
    return true;
  });

  const markAsRead = async (id: string) => {
    try {
      await apiPost('/in-app-notifications/mark-read', { notification_ids: [id] });
      await fetchNotifications();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiPost('/in-app-notifications/mark-all-read');
      await fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const dismissNotification = async (id: string) => {
    try {
      await apiPost(`/in-app-notifications/${id}/dismiss`);
      await fetchNotifications();
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="text-red-500" size={48} />
        <p className="text-gray-700 dark:text-gray-300">{error}</p>
        <button
          onClick={() => { setLoading(true); fetchNotifications(); }}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {viewMode === 'bifrost' ? (
        <AuroraPageHeader
          title="Notifications"
          subtitle={unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          icon={Bell}
          rightContent={
            unreadCount > 0 ? (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 border border-white/20 text-white hover:bg-white/20 rounded-lg transition-colors text-sm"
              >
                <Check size={16} />
                Mark all read
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Bell className="text-blue-600 dark:text-blue-400" />
              Notifications
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                <Check size={16} />
                Mark all read
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-200/60 dark:shadow-none border border-gray-300 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Bell className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-200/60 dark:shadow-none border border-gray-300 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Mail className="text-yellow-600 dark:text-yellow-400" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Unread</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{unreadCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-200/60 dark:shadow-none border border-gray-300 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Action Required</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{actionRequiredCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-200/60 dark:shadow-none border border-gray-300 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('action_required')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'action_required'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Action Required
            </button>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-200/60 dark:shadow-none border border-gray-300 dark:border-gray-700 overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <MailOpen className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No notifications</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {filter === 'all' ? "You're all caught up!" : 'No notifications match this filter.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            <AnimatePresence>
              {filteredNotifications.map((notification) => {
                const uiType = mapNotificationType(notification.notification_type, notification.priority);
                const displayCategory = notification.category || notification.notification_type;
                return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    !notification.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Status indicator */}
                    <div className="flex-shrink-0 mt-1">
                      {getTypeIcon(uiType)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className={`font-medium ${!notification.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                              {notification.title}
                            </h3>
                            {!notification.is_read && (
                              <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-500 dark:text-gray-500">
                              {formatTimeAgo(new Date(notification.created_at))}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeBadgeColor(uiType)}`}>
                              {displayCategory.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        {notification.action_url && isPortalRoute(notification.action_url) && (
                          <button
                            onClick={() => navigate(notification.action_url!)}
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          >
                            {notification.action_label || 'View'}
                          </button>
                        )}
                        {!notification.is_read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                          >
                            Mark as read
                          </button>
                        )}
                        <button
                          onClick={() => dismissNotification(notification.id)}
                          className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 ml-auto"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Settings Info */}
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Notification Preferences</h3>
        <p className="text-sm text-blue-800 dark:text-blue-400">
          You can manage your notification preferences including email alerts and push notifications in your{' '}
          <a href="/my-hr/profile" className="underline font-medium">
            Profile Settings
          </a>.
        </p>
      </div>
    </div>
  );
}
