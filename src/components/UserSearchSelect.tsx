import { useState, useEffect, useRef } from 'react';
import { Search, X, User } from 'lucide-react';

const API_URL = '';

interface UserOption {
  id: number;
  full_name: string;
  email: string;
}

interface SelectedInterviewer {
  user_id: number;
  name: string;
  email: string;
  role: string;
}

interface UserSearchSelectProps {
  selected: SelectedInterviewer[];
  onChange: (selected: SelectedInterviewer[]) => void;
  placeholder?: string;
}

export default function UserSearchSelect({ selected, onChange, placeholder = 'Search users...' }: UserSearchSelectProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/users?search=${encodeURIComponent(query)}&limit=10`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          // Filter out already-selected users
          const selectedIds = new Set(selected.map(s => s.user_id));
          const filtered = (data.users || data || []).filter((u: UserOption) => !selectedIds.has(u.id));
          setResults(filtered);
        }
      } catch (error) {
        console.error('User search failed:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, selected]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addUser = (user: UserOption) => {
    onChange([
      ...selected,
      {
        user_id: user.id,
        name: user.full_name,
        email: user.email,
        role: selected.length === 0 ? 'lead' : 'interviewer',
      },
    ]);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  const removeUser = (userId: number) => {
    const updated = selected.filter(s => s.user_id !== userId);
    // Reassign lead if removed
    if (updated.length > 0 && !updated.some(s => s.role === 'lead')) {
      updated[0].role = 'lead';
    }
    onChange(updated);
  };

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Selected users */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map(s => (
            <div
              key={s.user_id}
              className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 pl-3 pr-1.5 py-1.5 rounded-lg text-sm"
            >
              <User className="w-3.5 h-3.5" />
              <span className="font-medium">{s.name}</span>
              <span className="text-blue-500 dark:text-blue-400 text-xs">({s.role})</span>
              <button
                onClick={() => removeUser(s.user_id)}
                className="p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="flex items-center border dark:border-gray-600 rounded-lg overflow-hidden">
          <Search className="w-4 h-4 text-gray-400 ml-3" />
          <input
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            className="flex-1 px-3 py-2 text-sm bg-transparent dark:text-white outline-none"
            placeholder={placeholder}
          />
          {loading && (
            <div className="mr-3">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Dropdown results */}
        {showDropdown && results.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {results.map(user => (
              <button
                key={user.id}
                onClick={() => addUser(user)}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm"
              >
                <div className="w-7 h-7 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{user.full_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
