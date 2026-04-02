/**
 * FCRA Permissible Purpose Certification Modal.
 * This is a LEGAL REQUIREMENT — do not allow bypassing.
 */

import { useState, useEffect } from "react";
import { fetchCertificationText } from "../api/screeningApi";

interface CertificationGateProps {
  onCertified: () => void;
  onCancel: () => void;
}

export function CertificationGate({ onCertified, onCancel }: CertificationGateProps) {
  const [certText, setCertText] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCertificationText()
      .then((text) => {
        setCertText(text);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load certification text. Please try again.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-lg shadow-xl">
          <p className="text-gray-500 dark:text-gray-400">Loading certification...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Permissible Purpose Certification
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Federal law requires this certification before ordering a background check.
          </p>
        </div>

        {/* Certification Text */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error ? (
            <p className="text-red-600 dark:text-red-400">{error}</p>
          ) : (
            <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {certText}
            </div>
          )}
        </div>

        {/* Acknowledgment */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              I certify that I have a permissible purpose under the Fair Credit
              Reporting Act to request this consumer report, and that I have
              complied with all applicable disclosure and authorization
              requirements.
            </span>
          </label>

          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onCertified}
              disabled={!acknowledged || !!error}
              className="px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Certify and Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
