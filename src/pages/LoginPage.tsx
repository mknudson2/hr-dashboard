import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, User, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import TwoFactorVerifyModal from '@/components/TwoFactorVerifyModal';
import TwoFactorSetupModal from '@/components/TwoFactorSetupModal';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import { API_URL } from '@/config/api';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [show2FASetupModal, setShow2FASetupModal] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // First attempt - check if 2FA is required
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include',  // Required for httpOnly cookies
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      // Check if 2FA is required
      if (data.requires_2fa) {
        setShow2FAModal(true);
        setLoading(false);
        return;
      }

      // Store user info (token is in httpOnly cookie, not accessible via JS)
      localStorage.setItem('auth_user', JSON.stringify(data.user));

      // Check if password change is required
      if (data.password_must_change) {
        setPasswordChangeRequired(true);
        setTemporaryPassword(password); // Save the temporary password
        setShowPasswordChangeModal(true);
        setLoading(false);
        return;
      }

      // Check if 2FA setup is required
      if (data.requires_2fa_setup) {
        setShow2FASetupModal(true);
        setLoading(false);
        return;
      }

      // No 2FA, password change, or setup required - complete login
      // Use full page navigation to ensure cookie is properly picked up
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  const handle2FAVerify = async (code: string) => {
    // Login with 2FA code
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include',  // Required for httpOnly cookies
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, totp_code: code }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Invalid code');
    }

    // Store user info (token is in httpOnly cookie, not accessible via JS)
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    setShow2FAModal(false);

    // Check if password change is required
    if (data.password_must_change) {
      setPasswordChangeRequired(true);
      setTemporaryPassword(password); // Save the temporary password
      setShowPasswordChangeModal(true);
      return;
    }

    // Check if 2FA setup is required
    if (data.requires_2fa_setup) {
      setShow2FASetupModal(true);
      return;
    }

    // Complete login - use full page navigation to ensure cookie is properly picked up
    window.location.href = '/dashboard';
  };

  const handle2FACancel = () => {
    setShow2FAModal(false);
    setUsername('');
    setPassword('');
  };

  const handlePasswordChangeSuccess = () => {
    setShowPasswordChangeModal(false);

    // After password change, navigate to dashboard
    // Use full page navigation to ensure auth state is properly initialized
    window.location.href = '/dashboard';
  };

  const handle2FASetupSuccess = () => {
    setShow2FASetupModal(false);
    // Use full page navigation to ensure auth state is properly initialized
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-block p-4 bg-blue-600 rounded-2xl shadow-lg mb-4"
          >
            <User className="w-12 h-12 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            HR Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sign in to access your account
          </p>
        </div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </motion.div>
            )}

            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your username"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign In
                </>
              )}
            </button>
          </form>

        </motion.div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          © Bifröstin - HR Hub
        </p>
      </motion.div>

      {/* 2FA Verification Modal */}
      <TwoFactorVerifyModal
        isOpen={show2FAModal}
        username={username}
        password={password}
        onVerify={handle2FAVerify}
        onCancel={handle2FACancel}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showPasswordChangeModal}
        onClose={() => setShowPasswordChangeModal(false)}
        isRequired={passwordChangeRequired}
        onSuccess={handlePasswordChangeSuccess}
        temporaryPassword={temporaryPassword}
      />

      {/* 2FA Setup Modal - Required for new users */}
      <TwoFactorSetupModal
        isOpen={show2FASetupModal}
        onClose={() => {}} // Prevent closing - setup is required
        onSuccess={handle2FASetupSuccess}
        isRequired={true}
      />
    </div>
  );
};

export default LoginPage;
