import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Eye, EyeOff, AlertCircle, LayoutGrid, Sparkles, Mountain } from 'lucide-react';
import { motion } from 'framer-motion';
import ShimmerBar from '@/components/bifrost/ShimmerBar';
import BifrostLogo from '@/components/bifrost/BifrostLogo';

type ViewMode = 'og' | 'modern' | 'bifrost';

const VIEW_MODE_KEY = 'portal_view_mode';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewView, setPreviewView] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(VIEW_MODE_KEY);
    if (stored === 'modern' || stored === 'bifrost') return stored;
    return 'bifrost';
  });

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleViewChange = (mode: ViewMode) => {
    setPreviewView(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const isBifrost = previewView === 'bifrost';

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      isBifrost
        ? 'bg-realm-white'
        : 'bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800'
    }`}>
      {/* Bifröst shimmer bar */}
      {isBifrost && <ShimmerBar />}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Logo and title */}
        <div className="text-center mb-8">
          {isBifrost ? (
            <>
              <div className="inline-flex items-center justify-center mb-4">
                <BifrostLogo size="lg" />
              </div>
              <h1 className="font-display text-2xl font-semibold text-deep-night tracking-wide">BIFRÖST</h1>
              <p className="text-gray-500 mt-2">Your self-service portal for HR needs</p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4 shadow-lg">
                <Users className="text-white" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employee HR Hub</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Your self-service portal for HR needs</p>
            </>
          )}
        </div>

        {/* Login card */}
        <div className={`rounded-2xl shadow-xl p-8 ${
          isBifrost
            ? 'bg-white border border-[rgba(108,63,160,0.06)]'
            : 'bg-white dark:bg-gray-800'
        }`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm"
              >
                <AlertCircle size={18} />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Username field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-all placeholder-gray-400 ${
                  isBifrost
                    ? 'border-gray-200 focus:ring-bifrost-violet'
                    : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-blue-500 dark:placeholder-gray-500'
                }`}
                placeholder="Enter your username"
                required
                autoComplete="username"
              />
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-all pr-12 placeholder-gray-400 ${
                    isBifrost
                      ? 'border-gray-200 focus:ring-bifrost-violet'
                      : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-blue-500 dark:placeholder-gray-500'
                  }`}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed transition-colors ${
                isBifrost
                  ? 'bg-bifrost-violet hover:bg-bifrost-violet-dark focus:ring-bifrost-violet disabled:bg-bifrost-violet/50'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 dark:focus:ring-offset-gray-800 disabled:bg-blue-400'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* 3-way view toggle */}
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-center text-gray-400 mb-3">Portal Theme</p>
            <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg p-1 flex">
              <motion.div
                className="absolute inset-y-1 bg-white dark:bg-gray-600 rounded-md shadow-sm"
                initial={false}
                animate={{
                  left: `calc(${(['og', 'bifrost', 'modern'].indexOf(previewView)) * 33.333}% + 4px)`,
                  right: `calc(${(2 - ['og', 'bifrost', 'modern'].indexOf(previewView)) * 33.333}% + 4px)`,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
              {([
                { key: 'og' as ViewMode, label: 'Classic', icon: LayoutGrid },
                { key: 'bifrost' as ViewMode, label: 'Bifröst', icon: Mountain },
                { key: 'modern' as ViewMode, label: 'Modern', icon: Sparkles },
              ]).map((view) => {
                const Icon = view.icon;
                return (
                  <button
                    key={view.key}
                    type="button"
                    onClick={() => handleViewChange(view.key)}
                    className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      previewView === view.key
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon size={12} />
                    <span>{view.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Use your company credentials to sign in
        </p>
      </motion.div>
    </div>
  );
}
