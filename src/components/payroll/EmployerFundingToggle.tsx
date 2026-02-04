interface EmployerFundingToggleProps {
  enabled: boolean;
  onChange: () => void;
}

export default function EmployerFundingToggle({ enabled, onChange }: EmployerFundingToggleProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Employer Funding</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Fund employer portion of medical insurance this period
          </p>
        </div>
        <button
          onClick={onChange}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
