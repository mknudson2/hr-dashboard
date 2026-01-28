import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  User,
  Target,
  FileText,
  Calendar,
  Clock,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGet } from '@/utils/api';

interface SearchResult {
  id: string;
  type: 'employee' | 'goal' | 'request' | 'document';
  title: string;
  subtitle: string;
  url: string;
  metadata?: Record<string, string>;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // Fetch data from multiple sources
      const [goalsData, reportsData] = await Promise.all([
        apiGet<any[]>('/performance/goals').catch(() => []),
        apiGet<{ reports: any[] }>('/portal/team/reports').catch(() => ({ reports: [] })),
      ]);

      const searchResults: SearchResult[] = [];
      const lowerQuery = searchQuery.toLowerCase();

      // Search through goals
      if (Array.isArray(goalsData)) {
        goalsData.forEach((goal: any) => {
          if (
            goal.goal_title?.toLowerCase().includes(lowerQuery) ||
            goal.goal_description?.toLowerCase().includes(lowerQuery) ||
            goal.employee_name?.toLowerCase().includes(lowerQuery)
          ) {
            searchResults.push({
              id: `goal-${goal.id}`,
              type: 'goal',
              title: goal.goal_title,
              subtitle: `${goal.employee_name || 'Unknown'} • ${goal.status || 'No status'}`,
              url: '/team/goals',
              metadata: {
                progress: `${Math.round(goal.progress_percentage || 0)}%`,
                status: goal.status,
              },
            });
          }
        });
      }

      // Search through team members
      if (reportsData.reports && Array.isArray(reportsData.reports)) {
        reportsData.reports.forEach((employee: any) => {
          const fullName = `${employee.first_name} ${employee.last_name}`;
          if (
            fullName.toLowerCase().includes(lowerQuery) ||
            employee.employee_id?.toLowerCase().includes(lowerQuery)
          ) {
            searchResults.push({
              id: `employee-${employee.employee_id}`,
              type: 'employee',
              title: fullName,
              subtitle: `Employee ID: ${employee.employee_id}`,
              url: '/team/direct-reports',
            });
          }
        });
      }

      // Add static navigation results based on query
      const navigationItems = [
        { title: 'Dashboard', url: '/dashboard', keywords: ['dashboard', 'home', 'overview'] },
        { title: 'My Profile', url: '/my-hr/profile', keywords: ['profile', 'my info', 'personal'] },
        { title: 'Time Off', url: '/my-hr/time-off', keywords: ['time off', 'pto', 'vacation', 'leave'] },
        { title: 'Benefits', url: '/my-hr/benefits', keywords: ['benefits', 'health', 'insurance'] },
        { title: 'Compensation', url: '/my-hr/compensation', keywords: ['compensation', 'salary', 'pay'] },
        { title: 'Documents', url: '/my-hr/documents', keywords: ['documents', 'files', 'paperwork'] },
        { title: 'Team Goals', url: '/team/goals', keywords: ['goals', 'objectives', 'okr', 'performance'] },
        { title: 'Direct Reports', url: '/team/direct-reports', keywords: ['team', 'reports', 'employees', 'direct'] },
        { title: 'Performance Reviews', url: '/team/performance-reviews', keywords: ['reviews', 'performance', 'evaluation'] },
        { title: 'Pending Approvals', url: '/team/pending-approvals', keywords: ['approvals', 'pending', 'requests'] },
        { title: 'PTO Requests', url: '/requests/pto', keywords: ['pto', 'time off', 'request', 'vacation'] },
        { title: 'FAQs', url: '/resources/faqs', keywords: ['faq', 'help', 'questions', 'support'] },
        { title: 'Employee Handbook', url: '/resources/handbook', keywords: ['handbook', 'policies', 'rules'] },
      ];

      navigationItems.forEach((item) => {
        if (
          item.title.toLowerCase().includes(lowerQuery) ||
          item.keywords.some((kw) => kw.includes(lowerQuery))
        ) {
          // Avoid duplicates
          if (!searchResults.find((r) => r.url === item.url)) {
            searchResults.push({
              id: `nav-${item.url}`,
              type: 'document',
              title: item.title,
              subtitle: 'Navigation',
              url: item.url,
            });
          }
        }
      });

      setResults(searchResults.slice(0, 10)); // Limit to 10 results
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleResultClick(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  const handleResultClick = (result: SearchResult) => {
    navigate(result.url);
    onClose();
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'employee':
        return <User size={18} className="text-blue-500" />;
      case 'goal':
        return <Target size={18} className="text-green-500" />;
      case 'request':
        return <Clock size={18} className="text-yellow-500" />;
      case 'document':
        return <FileText size={18} className="text-purple-500" />;
      default:
        return <FileText size={18} className="text-gray-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <Search size={20} className="text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search goals, team members, pages..."
              className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none text-lg"
            />
            {loading && <Loader2 size={20} className="text-gray-400 animate-spin" />}
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
            >
              <X size={20} />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {query && results.length === 0 && !loading && (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                <Search size={40} className="mx-auto mb-3 opacity-50" />
                <p>No results found for "{query}"</p>
                <p className="text-sm mt-1">Try searching for goals, team members, or pages</p>
              </div>
            )}

            {results.length > 0 && (
              <div className="py-2">
                {results.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      index === selectedIndex
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      {getIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {result.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {result.subtitle}
                      </p>
                    </div>
                    {result.metadata?.progress && (
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {result.metadata.progress}
                      </span>
                    )}
                    <ChevronRight size={16} className="text-gray-400" />
                  </button>
                ))}
              </div>
            )}

            {!query && (
              <div className="px-4 py-6">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                  Quick Navigation
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { title: 'Team Goals', url: '/team/goals', icon: Target },
                    { title: 'Direct Reports', url: '/team/direct-reports', icon: User },
                    { title: 'Time Off', url: '/my-hr/time-off', icon: Calendar },
                    { title: 'My Profile', url: '/my-hr/profile', icon: User },
                  ].map((item) => (
                    <button
                      key={item.url}
                      onClick={() => {
                        navigate(item.url);
                        onClose();
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <item.icon size={16} />
                      {item.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↑</kbd>
                  <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↓</kbd>
                  to navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↵</kbd>
                  to select
                </span>
              </div>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">esc</kbd>
                to close
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
