import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiFetch } from '@/utils/api';

interface ConversionDetail {
  id: number;
  application_id: number;
  applicant_id: number;
  applicant_name: string | null;
  applicant_email: string | null;
  offer_id: string | null;
  position: string | null;
  department: string | null;
  location: string | null;
  hire_date: string | null;
  salary: number | null;
  wage_type: string | null;
  status: string;
  employee_id: string | null;
  user_id: number | null;
  is_internal_transfer: boolean;
  eeo_transferred: boolean;
  error_message: string | null;
  created_at: string | null;
  employee_created_at: string | null;
  user_created_at: string | null;
  onboarding_started_at: string | null;
  completed_at: string | null;
}

interface OnboardingTemplate {
  id: number;
  name: string;
  description: string | null;
  is_default: boolean;
}

const STEPS = [
  { key: 'review', label: 'Review' },
  { key: 'employee', label: 'Create Employee' },
  { key: 'user', label: 'Create Account' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'eeo', label: 'EEO Transfer' },
  { key: 'complete', label: 'Complete' },
];

function getStepIndex(status: string): number {
  switch (status) {
    case 'Pending': return 0;
    case 'Employee Created': return 2;
    case 'User Created': return 3;
    case 'Onboarding Started': return 4;
    case 'Completed': return 5;
    default: return 0;
  }
}

export default function HireConversionWizard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const applicationId = searchParams.get('applicationId');
  const conversionId = searchParams.get('conversionId');

  const [conversion, setConversion] = useState<ConversionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Initiation form
  const [hireDate, setHireDate] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [location, setLocation] = useState('');

  // Onboarding
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);

  // User creation
  const [skipUserCreation, setSkipUserCreation] = useState(false);

  // EEO
  const [skipEeo, setSkipEeo] = useState(false);

  useEffect(() => {
    if (conversionId) {
      loadConversion(parseInt(conversionId));
    } else if (applicationId) {
      loadApplicationDetails(parseInt(applicationId));
    } else {
      setLoading(false);
    }
  }, [conversionId, applicationId]);

  async function loadConversion(id: number) {
    try {
      const data = await apiGet<ConversionDetail>(`/recruiting/hire-conversions/${id}`);
      setConversion(data);
      if (data.status === 'Onboarding Started' || data.status === 'Employee Created' || data.status === 'User Created') {
        loadTemplates();
      }
    } catch {
      setError('Failed to load conversion details');
    } finally {
      setLoading(false);
    }
  }

  async function loadApplicationDetails(appId: number) {
    try {
      const data = await apiGet<{
        position_title?: string;
        department?: string;
        requisition?: { department?: string; location?: string };
      }>(`/recruiting/applications/${appId}`);
      setPosition(data.position_title || '');
      setDepartment(data.department || data.requisition?.department || '');
      setLocation(data.requisition?.location || '');
    } catch {
      // Non-critical, form will just be empty
    } finally {
      setLoading(false);
    }
  }

  async function loadTemplates() {
    try {
      const data = await apiGet<OnboardingTemplate[]>('/recruiting/pipeline-templates');
      setTemplates(data);
    } catch {
      // Onboarding templates endpoint may differ — use empty list
    }
  }

  async function handleInitiate() {
    if (!applicationId) return;
    setActionLoading(true);
    setError('');
    try {
      const data = await apiPost<{ id: number }>(`/recruiting/applications/${applicationId}/convert-to-hire`, {
        hire_date: hireDate || null,
        department: department || null,
        position: position || null,
        location: location || null,
      });
      navigate(`/recruiting/hire-wizard?conversionId=${data.id}`, { replace: true });
      await loadConversion(data.id);
      setSuccess('Hire conversion initiated');
    } catch {
      setError('Failed to initiate hire conversion');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreateEmployee() {
    if (!conversion) return;
    setActionLoading(true);
    setError('');
    try {
      await apiPost(`/recruiting/hire-conversions/${conversion.id}/create-employee`);
      setSuccess('Employee record created');
      await loadConversion(conversion.id);
    } catch {
      setError('Failed to create employee record');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreateUser() {
    if (!conversion) return;
    if (skipUserCreation) {
      // Skip user creation, go to onboarding
      setSuccess('User creation skipped');
      loadTemplates();
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      await apiPost(`/recruiting/hire-conversions/${conversion.id}/create-user`);
      setSuccess('User account created');
      await loadConversion(conversion.id);
      loadTemplates();
    } catch {
      setError('Failed to create user account');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStartOnboarding() {
    if (!conversion) return;
    setActionLoading(true);
    setError('');
    try {
      await apiPost(`/recruiting/hire-conversions/${conversion.id}/start-onboarding`, {
        template_id: selectedTemplate,
      });
      setSuccess('Onboarding started');
      await loadConversion(conversion.id);
    } catch {
      setError('Failed to start onboarding');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleTransferEeo() {
    if (!conversion) return;
    if (skipEeo) {
      await handleComplete();
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      await apiPost(`/recruiting/hire-conversions/${conversion.id}/transfer-eeo`);
      setSuccess('EEO data transferred');
      await handleComplete();
    } catch {
      setError('Failed to transfer EEO data');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleComplete() {
    if (!conversion) return;
    setActionLoading(true);
    setError('');
    try {
      await apiPost(`/recruiting/hire-conversions/${conversion.id}/complete`);
      setSuccess('Hire conversion completed!');
      await loadConversion(conversion.id);
    } catch {
      setError('Failed to complete conversion');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  const currentStep = conversion ? getStepIndex(conversion.status) : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate('/recruiting/conversions')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-1">
          &larr; All Conversions
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hire Conversion Wizard</h1>
        {conversion && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {conversion.applicant_name} — {conversion.position}
            {conversion.is_internal_transfer && (
              <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs rounded-full">Internal Transfer</span>
            )}
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg text-sm">{success}</div>
      )}

      {/* Step Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, i) => (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i < currentStep ? 'bg-green-600 text-white' :
                  i === currentStep ? 'bg-blue-600 text-white' :
                  'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                }`}>
                  {i < currentStep ? '✓' : i + 1}
                </div>
                <span className={`text-xs mt-1 ${i <= currentStep ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${i < currentStep ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-600'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        {/* Step 0: Initiate / Review */}
        {!conversion && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Review & Initiate Conversion</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Position</label>
                <input
                  type="text" value={position}
                  onChange={e => setPosition(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                <input
                  type="text" value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                <input
                  type="text" value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hire Date</label>
                <input
                  type="date" value={hireDate}
                  onChange={e => setHireDate(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              onClick={handleInitiate}
              disabled={actionLoading}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading ? 'Initiating...' : 'Start Conversion'}
            </button>
          </div>
        )}

        {/* Step 1: Create Employee */}
        {conversion?.status === 'Pending' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create Employee Record</h2>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Employee Details (from offer)</h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div><dt className="text-gray-500 dark:text-gray-400">Name</dt><dd className="dark:text-gray-200">{conversion.applicant_name}</dd></div>
                <div><dt className="text-gray-500 dark:text-gray-400">Position</dt><dd className="dark:text-gray-200">{conversion.position}</dd></div>
                <div><dt className="text-gray-500 dark:text-gray-400">Department</dt><dd className="dark:text-gray-200">{conversion.department}</dd></div>
                <div><dt className="text-gray-500 dark:text-gray-400">Location</dt><dd className="dark:text-gray-200">{conversion.location}</dd></div>
                <div><dt className="text-gray-500 dark:text-gray-400">Hire Date</dt><dd className="dark:text-gray-200">{conversion.hire_date}</dd></div>
                <div><dt className="text-gray-500 dark:text-gray-400">Salary</dt><dd className="dark:text-gray-200">{conversion.salary ? `$${conversion.salary.toLocaleString()} ${conversion.wage_type}` : 'N/A'}</dd></div>
              </dl>
            </div>
            <button
              onClick={handleCreateEmployee}
              disabled={actionLoading}
              className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading ? 'Creating...' : 'Create Employee Record'}
            </button>
          </div>
        )}

        {/* Step 2: Create User */}
        {conversion?.status === 'Employee Created' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create User Account</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Employee <strong>{conversion.employee_id}</strong> has been created.
              Create a user account so they can sign in to the employee portal.
            </p>
            <div className="mb-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">Email: <strong>{conversion.applicant_email}</strong></p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">A temporary password will be set. The employee must change it on first login.</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mb-4">
              <input
                type="checkbox"
                checked={skipUserCreation}
                onChange={e => setSkipUserCreation(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Skip user account creation (can be done later)
            </label>
            <button
              onClick={handleCreateUser}
              disabled={actionLoading}
              className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading ? 'Creating...' : skipUserCreation ? 'Skip & Continue' : 'Create User Account'}
            </button>
          </div>
        )}

        {/* Step 3: Onboarding */}
        {(conversion?.status === 'User Created' || (conversion?.status === 'Employee Created' && skipUserCreation)) && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Start Onboarding</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select an onboarding template to create tasks for the new hire.
            </p>
            {templates.length > 0 ? (
              <div className="space-y-2 mb-4">
                {templates.map(t => (
                  <label key={t.id} className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="template"
                      checked={selectedTemplate === t.id}
                      onChange={() => setSelectedTemplate(t.id)}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</span>
                      {t.is_default && <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(Default)</span>}
                      {t.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.description}</p>}
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No templates found. Default onboarding tasks will be used.</p>
            )}
            <button
              onClick={handleStartOnboarding}
              disabled={actionLoading}
              className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading ? 'Starting...' : 'Start Onboarding'}
            </button>
          </div>
        )}

        {/* Step 4: EEO Transfer */}
        {conversion?.status === 'Onboarding Started' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">EEO Data Transfer</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              If the applicant provided voluntary EEO self-identification data, you can transfer it to their employee record.
              This requires EEO Read permission.
            </p>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mb-4">
              <input
                type="checkbox"
                checked={skipEeo}
                onChange={e => setSkipEeo(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Skip EEO data transfer
            </label>
            <button
              onClick={handleTransferEeo}
              disabled={actionLoading}
              className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading ? 'Processing...' : skipEeo ? 'Skip & Complete' : 'Transfer EEO & Complete'}
            </button>
          </div>
        )}

        {/* Completed */}
        {conversion?.status === 'Completed' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Conversion Complete!</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {conversion.applicant_name} has been successfully converted to Employee {conversion.employee_id}.
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-6">
              {conversion.employee_created_at && <p>Employee created: {new Date(conversion.employee_created_at).toLocaleString()}</p>}
              {conversion.user_created_at && <p>User account created: {new Date(conversion.user_created_at).toLocaleString()}</p>}
              {conversion.onboarding_started_at && <p>Onboarding started: {new Date(conversion.onboarding_started_at).toLocaleString()}</p>}
              {conversion.eeo_transferred && <p>EEO data transferred</p>}
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate(`/employees/${conversion.employee_id}`)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                View Employee
              </button>
              <button
                onClick={() => navigate('/onboarding')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                View Onboarding
              </button>
            </div>
          </div>
        )}

        {/* Failed */}
        {conversion?.status === 'Failed' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Conversion Failed</h2>
            {conversion.error_message && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-4">{conversion.error_message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
