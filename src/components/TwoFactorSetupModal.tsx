import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Copy, Check, AlertCircle, Download } from 'lucide-react';

const API_URL = 'http://localhost:8000';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface SetupData {
  secret: string;
  qr_code: string;
  backup_codes: string[];
}

export default function TwoFactorSetupModal({ isOpen, onClose, onSuccess }: TwoFactorSetupModalProps) {
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup');
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/auth/2fa/setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to setup 2FA');
      }

      const data = await response.json();
      setSetupData(data);
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/auth/2fa/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: verificationCode }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Invalid verification code');
      }

      setStep('backup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (setupData) {
      navigator.clipboard.writeText(setupData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleCopyBackupCodes = () => {
    if (setupData) {
      navigator.clipboard.writeText(setupData.backup_codes.join('\n'));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  const handleDownloadBackupCodes = () => {
    if (setupData) {
      const content = `HR Dashboard - Backup Codes\n\nThese codes can be used to access your account if you lose your authenticator device.\nEach code can only be used once.\n\n${setupData.backup_codes.join('\n')}\n\nKeep these codes in a safe place!`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hr-dashboard-backup-codes.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
    resetModal();
  };

  const resetModal = () => {
    setStep('setup');
    setSetupData(null);
    setVerificationCode('');
    setError('');
    setCopiedSecret(false);
    setCopiedCodes(false);
  };

  const handleClose = () => {
    onClose();
    resetModal();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Enable Two-Factor Authentication
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {step === 'setup' && 'Scan the QR code with your authenticator app'}
                      {step === 'verify' && 'Enter the code from your authenticator app'}
                      {step === 'backup' && 'Save your backup codes'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {error && (
                  <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                  </div>
                )}

                {/* Step 1: Setup */}
                {step === 'setup' && !setupData && (
                  <div className="text-center">
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      Two-factor authentication adds an extra layer of security to your account by requiring a code from your phone in addition to your password.
                    </p>
                    <button
                      onClick={handleSetup}
                      disabled={loading}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                    >
                      {loading ? 'Setting up...' : 'Start Setup'}
                    </button>
                  </div>
                )}

                {/* Step 2: Scan QR Code */}
                {step === 'verify' && setupData && (
                  <div className="space-y-6">
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                        Step 1: Scan QR Code
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        Scan this QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)
                      </p>
                      <div className="flex justify-center mb-4">
                        <img
                          src={`data:image/png;base64,${setupData.qr_code}`}
                          alt="2FA QR Code"
                          className="w-64 h-64 bg-white p-4 rounded-lg"
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          Or enter this code manually:
                        </p>
                        <div className="flex items-center justify-center gap-2">
                          <code className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded font-mono text-sm">
                            {setupData.secret}
                          </code>
                          <button
                            onClick={handleCopySecret}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                          >
                            {copiedSecret ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                        Step 2: Verify Setup
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        Enter the 6-digit code from your authenticator app:
                      </p>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000"
                          className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                          maxLength={6}
                        />
                        <button
                          onClick={handleVerify}
                          disabled={loading || verificationCode.length !== 6}
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                        >
                          {loading ? 'Verifying...' : 'Verify'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Backup Codes */}
                {step === 'backup' && setupData && (
                  <div className="space-y-6">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                            Save Your Backup Codes
                          </h3>
                          <p className="text-sm text-yellow-800 dark:text-yellow-300">
                            These codes can be used to access your account if you lose your authenticator device. Each code can only be used once.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6">
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {setupData.backup_codes.map((code, index) => (
                          <div
                            key={index}
                            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded font-mono text-sm text-center"
                          >
                            {code}
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={handleCopyBackupCodes}
                          className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                        >
                          {copiedCodes ? (
                            <>
                              <Check className="w-4 h-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copy Codes
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleDownloadBackupCodes}
                          className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleFinish}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Finish Setup
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
