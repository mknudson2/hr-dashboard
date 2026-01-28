import { useState, useEffect } from 'react';
import { X, Calendar, Users, FileText, Clock, CheckCircle, AlertCircle, Mail, AlertTriangle, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Helper function to format currency with comma separators
const formatCurrency = (value: number): string => {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

interface OffboardingTask {
  id: number;
  task_id: string;
  employee_id: string;
  task_name: string;
  task_description: string | null;
  category: string;
  status: string;
  priority: string;
  assigned_to_role: string | null;
  due_date: string | null;
  completed_date: string | null;
  days_from_termination: number | null;
  notes: string | null;
  notes_history?: Array<{
    note: string;
    timestamp: string;
    created_by: string;
  }>;
  completion_notes: string | null;
  task_details?: {
    participants?: string[];
    scheduled_date?: string;
    interview_time?: string;
  };
  uncheck_history?: Array<{
    action: string;
    timestamp: string;
    reason: string;
  }>;
  created_at: string;
  updated_at: string;
}

interface Employee {
  employee_id: string;
  first_name: string;
  last_name: string;
  hire_date: string | null;
  termination_date: string | null;
  supervisor: string | null;
  department: string | null;
  medical_plan: string | null;
  dental_plan: string | null;
  vision_plan: string | null;
  retirement_plan_type: string | null;
  retirement_ee_contribution_pct: number | null;
  retirement_ee_contribution_amount: number | null;
  hsa_ee_contribution: number | null;
  hsa_er_contribution: number | null;
  fsa_contribution: number | null;
  lfsa_contribution: number | null;
  pto_allotted: number | null;
  pto_used: number | null;
}

interface OffboardingTaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: OffboardingTask | null;
  onUpdate: (taskId: number, updates: any) => void;
}

const BASE_URL = '';

export default function OffboardingTaskDrawer({
  isOpen,
  onClose,
  task,
  onUpdate
}: OffboardingTaskDrawerProps) {
  const [newNote, setNewNote] = useState('');
  const [participants, setParticipants] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [showUncheckModal, setShowUncheckModal] = useState(false);
  const [uncheckReason, setUncheckReason] = useState('');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [hoursWorkedLastPeriod, setHoursWorkedLastPeriod] = useState<string>('');
  const [contributionChecks, setContributionChecks] = useState<{[key: string]: boolean}>({});
  const [garnishments, setGarnishments] = useState<any[]>([]);
  const [isSendingGarnishmentEmail, setIsSendingGarnishmentEmail] = useState(false);
  const [fundsTransfer, setFundsTransfer] = useState({
    payrollDirectDeposits: '',
    payrollTax: '',
    payroll401k: '',
    payrollHSA: '',
    payrollGarnishment: '',
    insuranceEmployerEmployee: '',
    insuranceEmployerSpouse: '',
    insuranceEmployerChildren: '',
    insuranceEmployerFamily: '',
    insuranceEmployerKaiser: '',
    insuranceEmployeeEmployee: '',
    insuranceEmployeeSpouse: '',
    insuranceEmployeeChildren: '',
    insuranceEmployeeFamily: '',
    insuranceEmployeeKaiser: ''
  });
  const [isSendingFundsTransferEmail, setIsSendingFundsTransferEmail] = useState(false);
  const [isDownloadingExitDoc, setIsDownloadingExitDoc] = useState(false);
  const [exitDocForm, setExitDocForm] = useState({
    ptoHours: '',
    lastPayDate: '',
    lastCoverageDate: '',
    supervisorName: '',
    supervisorEmail: ''
  });

  useEffect(() => {
    if (task) {
      setParticipants(task.task_details?.participants?.join(', ') || '');
      setScheduledDate(task.task_details?.scheduled_date || '');
      setInterviewTime(task.task_details?.interview_time || '');

      // Fetch employee data for I-9 and COBRA sections
      const fetchEmployee = async () => {
        try {
          const response = await fetch(`${BASE_URL}/analytics/employees/${task.employee_id}`);
          if (response.ok) {
            const data = await response.json();
            setEmployee(data);
          }
        } catch (error) {
          console.error('Error fetching employee data:', error);
        }
      };

      // Fetch garnishments for garnishment notification task
      const fetchGarnishments = async () => {
        try {
          const response = await fetch(`${BASE_URL}/garnishments?employee_id=${task.employee_id}&status=Active`);
          if (response.ok) {
            const data = await response.json();
            setGarnishments(data.garnishments || []);
          }
        } catch (error) {
          console.error('Error fetching garnishments:', error);
        }
      };

      fetchEmployee();
      fetchGarnishments();
    }
  }, [task]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !task) return null;

  const isExitInterviewTask = task.task_name.toLowerCase().includes('exit interview');
  const isTermChecklistTask = task.task_name.toLowerCase().includes('complete term checklist');
  const isCOBRATask = task.task_name.toLowerCase().includes('cobra');
  const isPTOTask = task.task_name.toLowerCase().includes('calculate final pto') || task.task_name.toLowerCase().includes('pto');
  const isContributionTask = task.task_name.toLowerCase().includes('contribution') || task.task_name.toLowerCase().includes('final contribution upload');
  const isGarnishmentTask = task.task_name.toLowerCase().includes('garnishment');
  const isFundsTransferTask = task.task_name.toLowerCase().includes('send funds transfer') || task.task_name.toLowerCase().includes('funds transfer email');
  const isExitDocumentsTask = task.task_name.toLowerCase().includes('exit document') || task.task_name.toLowerCase().includes('prepare exit') || task.task_name.toLowerCase().includes('important information');

  // Calculate I-9 retention dates
  const calculateI9RetentionDates = () => {
    if (!employee?.hire_date || !employee?.termination_date) return null;

    const hireDate = new Date(employee.hire_date);
    const termDate = new Date(employee.termination_date);

    // Hire date + 3 years
    const hirePlus3 = new Date(hireDate);
    hirePlus3.setFullYear(hirePlus3.getFullYear() + 3);

    // Term date + 1 year
    const termPlus1 = new Date(termDate);
    termPlus1.setFullYear(termPlus1.getFullYear() + 1);

    // Return the later date
    const retentionDate = hirePlus3 > termPlus1 ? hirePlus3 : termPlus1;
    const isHireDateLater = hirePlus3 > termPlus1;

    return {
      hirePlus3,
      termPlus1,
      retentionDate,
      isHireDateLater
    };
  };

  const i9Dates = calculateI9RetentionDates();

  // Calculate PTO accrual rate based on tenure
  const calculatePTOAccrualRate = () => {
    if (!employee?.hire_date) return 0;

    const hireDate = new Date(employee.hire_date);
    const today = new Date();
    const yearsOfService = (today.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    // Accrual rates based on tenure (hours per pay period, assuming bi-weekly)
    // User needs to confirm these rates
    if (yearsOfService < 5) {
      return 3.08; // 0-4 years
    } else if (yearsOfService < 8) {
      return 4.62; // 5-7 years
    } else {
      return 6.16; // 8+ years
    }
  };

  const ptoAccrualRate = calculatePTOAccrualRate();
  const currentPTOBalance = employee ? ((employee.pto_allotted || 0) - (employee.pto_used || 0)) : 0;
  const hoursWorked = parseFloat(hoursWorkedLastPeriod) || 0;
  const ptoEarnedLastPeriod = hoursWorked > 0 ? ptoAccrualRate : 0;
  const totalPTOPayout = currentPTOBalance + ptoEarnedLastPeriod;

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    onUpdate(task.id, { add_note: newNote });
    setNewNote('');
  };

  const handleSaveInterviewDetails = () => {
    const participantsList = participants.split(',').map(p => p.trim()).filter(p => p);
    onUpdate(task.id, {
      task_details: {
        ...task.task_details,
        participants: participantsList,
        scheduled_date: scheduledDate,
        interview_time: interviewTime
      }
    });
  };

  const handleCheckboxChange = (checked: boolean) => {
    if (!checked && task.status === 'Completed') {
      // Unchecking - show modal for reason
      setShowUncheckModal(true);
    } else if (checked && task.status !== 'Completed') {
      // Checking - mark as completed
      onUpdate(task.id, {
        status: 'Completed',
        completed_date: new Date().toISOString()
      });
    }
  };

  const handleConfirmUncheck = () => {
    if (!uncheckReason.trim()) {
      alert('Please provide a reason for unchecking this task.');
      return;
    }

    const historyEntry = {
      action: 'unchecked',
      timestamp: new Date().toISOString(),
      reason: uncheckReason
    };

    onUpdate(task.id, {
      status: 'Not Started',
      completed_date: null,
      uncheck_history: historyEntry
    });

    setShowUncheckModal(false);
    setUncheckReason('');
  };

  const handleSendGarnishmentEmail = async (garnishment: any) => {
    if (!employee) return;

    setIsSendingGarnishmentEmail(true);

    try {
      const response = await fetch(`${BASE_URL}/emails/offboarding/garnishment-termination`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to_email: garnishment.agency_email || import.meta.env.VITE_DEFAULT_EMAIL,
          employee_name: `${employee.first_name} ${employee.last_name}`,
          employee_id: employee.employee_id,
          termination_date: employee.termination_date,
          case_number: garnishment.case_number,
          garnishment_type: garnishment.garnishment_type,
          agency_name: garnishment.agency_name,
          case_reference: garnishment.case_reference,
          amount_paid: garnishment.amount_paid,
          amount_remaining: garnishment.amount_remaining,
          department: employee.department,
          from_name: 'Michael Knudson, Ph.D.',
          from_email: import.meta.env.VITE_DEFAULT_EMAIL
        }),
      });

      if (response.ok) {
        alert(`Garnishment termination email sent successfully to ${garnishment.agency_name}!`);
      } else {
        throw new Error('Failed to send garnishment email');
      }
    } catch (error) {
      console.error('Error sending garnishment email:', error);
      alert('Failed to send garnishment email. Please try again.');
    } finally {
      setIsSendingGarnishmentEmail(false);
    }
  };

  const handleDownloadExitDocument = async () => {
    if (!employee) return;

    setIsDownloadingExitDoc(true);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (exitDocForm.ptoHours) params.append('pto_hours', exitDocForm.ptoHours);
      if (exitDocForm.lastPayDate) params.append('last_pay_date', exitDocForm.lastPayDate);
      if (exitDocForm.lastCoverageDate) params.append('last_coverage_date', exitDocForm.lastCoverageDate);
      if (exitDocForm.supervisorName) params.append('supervisor_name', exitDocForm.supervisorName);
      if (exitDocForm.supervisorEmail) params.append('supervisor_email', exitDocForm.supervisorEmail);

      const response = await fetch(
        `${BASE_URL}/offboarding/exit-document/${employee.employee_id}?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to generate exit document');
      }

      // Get the blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Exit_Info_${employee.first_name}_${employee.last_name}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error('Error downloading exit document:', error);
      alert('Failed to download exit document. Please try again.');
    } finally {
      setIsDownloadingExitDoc(false);
    }
  };

  const handleSendFundsTransferEmail = async () => {
    if (!employee) return;

    // Calculate totals
    const payrollTotal =
      (parseFloat(fundsTransfer.payrollDirectDeposits) || 0) +
      (parseFloat(fundsTransfer.payrollTax) || 0) +
      (parseFloat(fundsTransfer.payroll401k) || 0) +
      (parseFloat(fundsTransfer.payrollHSA) || 0) +
      (parseFloat(fundsTransfer.payrollGarnishment) || 0);

    const insuranceEmployerTotal =
      (parseFloat(fundsTransfer.insuranceEmployerEmployee) || 0) +
      (parseFloat(fundsTransfer.insuranceEmployerSpouse) || 0) +
      (parseFloat(fundsTransfer.insuranceEmployerChildren) || 0) +
      (parseFloat(fundsTransfer.insuranceEmployerFamily) || 0) +
      (parseFloat(fundsTransfer.insuranceEmployerKaiser) || 0);

    const insuranceEmployeeTotal =
      (parseFloat(fundsTransfer.insuranceEmployeeEmployee) || 0) +
      (parseFloat(fundsTransfer.insuranceEmployeeSpouse) || 0) +
      (parseFloat(fundsTransfer.insuranceEmployeeChildren) || 0) +
      (parseFloat(fundsTransfer.insuranceEmployeeFamily) || 0) +
      (parseFloat(fundsTransfer.insuranceEmployeeKaiser) || 0);

    const insuranceTotal = insuranceEmployerTotal + insuranceEmployeeTotal;

    setIsSendingFundsTransferEmail(true);

    try {
      const response = await fetch(`${BASE_URL}/emails/offboarding/funds-transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to_email: import.meta.env.VITE_DEFAULT_EMAIL, // Shelli's email
          employee_name: `${employee.first_name} ${employee.last_name}`,
          employee_id: employee.employee_id,
          termination_date: employee.termination_date,
          payroll_direct_deposits: parseFloat(fundsTransfer.payrollDirectDeposits) || null,
          payroll_tax: parseFloat(fundsTransfer.payrollTax) || null,
          payroll_401k: parseFloat(fundsTransfer.payroll401k) || null,
          payroll_hsa: parseFloat(fundsTransfer.payrollHSA) || null,
          payroll_garnishment: parseFloat(fundsTransfer.payrollGarnishment) || null,
          payroll_total: payrollTotal,
          insurance_employer_employee: parseFloat(fundsTransfer.insuranceEmployerEmployee) || null,
          insurance_employer_spouse: parseFloat(fundsTransfer.insuranceEmployerSpouse) || null,
          insurance_employer_children: parseFloat(fundsTransfer.insuranceEmployerChildren) || null,
          insurance_employer_family: parseFloat(fundsTransfer.insuranceEmployerFamily) || null,
          insurance_employer_kaiser: parseFloat(fundsTransfer.insuranceEmployerKaiser) || null,
          insurance_employee_employee: parseFloat(fundsTransfer.insuranceEmployeeEmployee) || null,
          insurance_employee_spouse: parseFloat(fundsTransfer.insuranceEmployeeSpouse) || null,
          insurance_employee_children: parseFloat(fundsTransfer.insuranceEmployeeChildren) || null,
          insurance_employee_family: parseFloat(fundsTransfer.insuranceEmployeeFamily) || null,
          insurance_employee_kaiser: parseFloat(fundsTransfer.insuranceEmployeeKaiser) || null,
          insurance_total: insuranceTotal,
          department: employee.department,
          from_name: 'Michael Knudson, Ph.D.'
        }),
      });

      if (response.ok) {
        alert('Funds transfer email sent successfully to Shelli!');
      } else {
        throw new Error('Failed to send funds transfer email');
      }
    } catch (error) {
      console.error('Error sending funds transfer email:', error);
      alert('Failed to send funds transfer email. Please try again.');
    } finally {
      setIsSendingFundsTransferEmail(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'In Progress':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'Not Started':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'text-red-600 dark:text-red-400';
      case 'High':
        return 'text-orange-600 dark:text-orange-400';
      case 'Medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'Low':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && task && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white dark:bg-gray-800 shadow-2xl z-50"
          >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-4 flex-1">
              <input
                type="checkbox"
                checked={task.status === 'Completed'}
                onChange={(e) => handleCheckboxChange(e.target.checked)}
                className="w-6 h-6 mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <h2 className={`text-2xl font-bold mb-2 ${task.status === 'Completed' ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                  {task.task_name}
                </h2>
              {task.task_description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {task.task_description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-3">
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>
                <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                  {task.priority} Priority
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {task.category}
                </span>
              </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 ml-4"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Task Details */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Task Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {task.assigned_to_role && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Assigned to:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{task.assigned_to_role}</p>
                  </div>
                )}
                {task.due_date && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Due Date:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(task.due_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {task.days_from_termination !== null && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Timeline:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Day {task.days_from_termination >= 0 ? '+' : ''}{task.days_from_termination}
                    </p>
                  </div>
                )}
                {task.completed_date && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Completed:</span>
                    <p className="font-medium text-green-600 dark:text-green-400">
                      {new Date(task.completed_date).toLocaleDateString()} at {new Date(task.completed_date).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Exit Interview Fields */}
            {isExitInterviewTask && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Interview Details
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Participants
                    </label>
                    <input
                      type="text"
                      value={participants}
                      onChange={(e) => setParticipants(e.target.value)}
                      placeholder="Enter names separated by commas"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Time
                      </label>
                      <input
                        type="time"
                        value={interviewTime}
                        onChange={(e) => setInterviewTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSaveInterviewDetails}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Save Interview Details
                  </button>
                </div>
              </div>
            )}

            {/* I-9 Retention Dates - Complete Term Checklist */}
            {isTermChecklistTask && employee && i9Dates && (
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  I-9 Retention Information
                </h3>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Hire Date
                      </label>
                      <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-white font-medium">
                        {new Date(employee.hire_date!).toLocaleDateString()}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Termination Date
                      </label>
                      <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-white font-medium">
                        {new Date(employee.termination_date!).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-purple-200 dark:border-purple-700 pt-3 mt-3">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      I-9 Retention Calculation
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className={`px-3 py-2 rounded-lg ${i9Dates.isHireDateLater ? 'bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-500' : 'bg-gray-100 dark:bg-gray-800'}`}>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Hire Date + 3 Years
                        </label>
                        <div className="text-gray-900 dark:text-white font-medium">
                          {i9Dates.hirePlus3.toLocaleDateString()}
                        </div>
                      </div>

                      <div className={`px-3 py-2 rounded-lg ${!i9Dates.isHireDateLater ? 'bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-500' : 'bg-gray-100 dark:bg-gray-800'}`}>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Term Date + 1 Year
                        </label>
                        <div className="text-gray-900 dark:text-white font-medium">
                          {i9Dates.termPlus1.toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 p-3 bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-500 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-700 dark:text-yellow-400" />
                        <div>
                          <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">
                            I-9 Must Be Retained Until
                          </p>
                          <p className="text-lg font-bold text-yellow-900 dark:text-yellow-100">
                            {i9Dates.retentionDate.toLocaleDateString()}
                          </p>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                            (The later of the two dates above)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* COBRA Benefits Information */}
            {isCOBRATask && employee && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  COBRA Benefits Enrollment
                </h3>

                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Employee is enrolled in the following benefits:
                  </p>

                  <div className="grid grid-cols-1 gap-2">
                    {employee.medical_plan && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-green-300 dark:border-green-700">
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Medical Plan</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{employee.medical_plan}</p>
                        </div>
                      </div>
                    )}

                    {employee.dental_plan && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-green-300 dark:border-green-700">
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Dental Plan</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{employee.dental_plan}</p>
                        </div>
                      </div>
                    )}

                    {employee.vision_plan && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-green-300 dark:border-green-700">
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Vision Plan</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{employee.vision_plan}</p>
                        </div>
                      </div>
                    )}

                    {!employee.medical_plan && !employee.dental_plan && !employee.vision_plan && (
                      <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No benefits enrollment found
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Contribution Upload Checklist */}
            {isContributionTask && employee && (
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Final Contribution Upload Verification
                </h3>

                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Verify that the following contributions match the final paycheck amounts:
                  </p>

                  <div className="space-y-2">
                    {/* 401k Contributions */}
                    {employee.retirement_plan_type && (
                      <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-orange-300 dark:border-orange-700">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={contributionChecks['retirement'] || false}
                            onChange={(e) => setContributionChecks({
                              ...contributionChecks,
                              retirement: e.target.checked
                            })}
                            className="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                {employee.retirement_plan_type}
                              </p>
                              <div className="text-right">
                                {employee.retirement_ee_contribution_pct && (
                                  <p className="text-sm text-gray-900 dark:text-white font-medium">
                                    {employee.retirement_ee_contribution_pct}%
                                  </p>
                                )}
                                {employee.retirement_ee_contribution_amount && (
                                  <p className="text-sm text-gray-900 dark:text-white font-medium">
                                    ${employee.retirement_ee_contribution_amount.toFixed(2)}/month
                                  </p>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Employee retirement contribution
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* HSA Contributions */}
                    {(employee.hsa_ee_contribution || employee.hsa_er_contribution) && (
                      <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-orange-300 dark:border-orange-700">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={contributionChecks['hsa'] || false}
                            onChange={(e) => setContributionChecks({
                              ...contributionChecks,
                              hsa: e.target.checked
                            })}
                            className="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                HSA (Health Savings Account)
                              </p>
                              <div className="text-right space-y-1">
                                {employee.hsa_ee_contribution && (
                                  <p className="text-sm text-gray-900 dark:text-white font-medium">
                                    EE: ${employee.hsa_ee_contribution.toFixed(2)}/month
                                  </p>
                                )}
                                {employee.hsa_er_contribution && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    ER: ${employee.hsa_er_contribution.toFixed(2)}/month
                                  </p>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Health Savings Account contributions
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* FSA Contributions */}
                    {employee.fsa_contribution && (
                      <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-orange-300 dark:border-orange-700">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={contributionChecks['fsa'] || false}
                            onChange={(e) => setContributionChecks({
                              ...contributionChecks,
                              fsa: e.target.checked
                            })}
                            className="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                FSA (Flexible Spending Account)
                              </p>
                              <p className="text-sm text-gray-900 dark:text-white font-medium">
                                ${employee.fsa_contribution.toFixed(2)}/month
                              </p>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Healthcare FSA contribution
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Limited FSA Contributions */}
                    {employee.lfsa_contribution && (
                      <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-orange-300 dark:border-orange-700">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={contributionChecks['lfsa'] || false}
                            onChange={(e) => setContributionChecks({
                              ...contributionChecks,
                              lfsa: e.target.checked
                            })}
                            className="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                Limited FSA
                              </p>
                              <p className="text-sm text-gray-900 dark:text-white font-medium">
                                ${employee.lfsa_contribution.toFixed(2)}/month
                              </p>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Dental/Vision only FSA contribution
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* No contributions found */}
                    {!employee.retirement_plan_type &&
                     !employee.hsa_ee_contribution &&
                     !employee.hsa_er_contribution &&
                     !employee.fsa_contribution &&
                     !employee.lfsa_contribution && (
                      <div className="px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No active contributions found for this employee
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  {(employee.retirement_plan_type || employee.hsa_ee_contribution || employee.fsa_contribution || employee.lfsa_contribution) && (
                    <div className="pt-3 border-t border-orange-200 dark:border-orange-700">
                      <div className="flex items-center justify-between px-4 py-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                        <p className="text-sm font-semibold text-orange-900 dark:text-orange-200">
                          Verification Progress
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-bold text-orange-900 dark:text-orange-100">
                            {Object.values(contributionChecks).filter(Boolean).length} / {
                              [
                                employee.retirement_plan_type,
                                employee.hsa_ee_contribution || employee.hsa_er_contribution,
                                employee.fsa_contribution,
                                employee.lfsa_contribution
                              ].filter(Boolean).length
                            }
                          </p>
                          <span className="text-sm text-orange-700 dark:text-orange-300">verified</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PTO Calculation */}
            {isPTOTask && employee && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Final PTO Calculation
                </h3>

                <div className="space-y-4">
                  {/* Current PTO Balance */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        PTO Allotted
                      </label>
                      <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-white font-medium">
                        {employee.pto_allotted?.toFixed(2) || '0.00'} hours
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        PTO Used
                      </label>
                      <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-white font-medium">
                        {employee.pto_used?.toFixed(2) || '0.00'} hours
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <label className="block text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                      Current PTO Balance
                    </label>
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {currentPTOBalance.toFixed(2)} hours
                    </div>
                  </div>

                  {/* PTO Accrual Rate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      PTO Accrual Rate (per pay period)
                    </label>
                    <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-white font-medium">
                      {ptoAccrualRate.toFixed(2)} hours/period
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        (Based on {employee.hire_date ? Math.floor((new Date().getTime() - new Date(employee.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : 0} years of service)
                      </span>
                    </div>
                  </div>

                  {/* Hours Worked Last Period - Manual Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Total Hours Worked in Last Pay Period
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={hoursWorkedLastPeriod}
                      onChange={(e) => setHoursWorkedLastPeriod(e.target.value)}
                      placeholder="Enter hours worked (e.g., 80.00)"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Calculation Results */}
                  {hoursWorked > 0 && (
                    <div className="border-t border-indigo-200 dark:border-indigo-700 pt-4 space-y-3">
                      <div className="px-4 py-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <label className="block text-sm font-medium text-indigo-900 dark:text-indigo-200 mb-1">
                          PTO Earned for Last Period
                        </label>
                        <div className="text-xl font-bold text-indigo-900 dark:text-indigo-100">
                          {ptoEarnedLastPeriod.toFixed(2)} hours
                        </div>
                      </div>

                      <div className="px-4 py-3 bg-green-100 dark:bg-green-900/30 border-2 border-green-500 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-6 h-6 text-green-700 dark:text-green-400" />
                          <div className="flex-1">
                            <label className="block text-sm font-semibold text-green-900 dark:text-green-200 mb-1">
                              Total PTO to be Paid Out
                            </label>
                            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                              {totalPTOPayout.toFixed(2)} hours
                            </div>
                            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                              Current Balance ({currentPTOBalance.toFixed(2)}) + Earned Last Period ({ptoEarnedLastPeriod.toFixed(2)})
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {hoursWorked === 0 && (
                    <div className="px-4 py-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                      <p className="text-sm text-yellow-900 dark:text-yellow-200">
                        Enter hours worked in the last pay period to calculate final PTO payout
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Garnishment Notification */}
            {isGarnishmentTask && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Garnishment Agency Notification
                </h3>

                {garnishments.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      This employee has {garnishments.length} active garnishment{garnishments.length > 1 ? 's' : ''}.
                      Send termination notification to the garnishment {garnishments.length > 1 ? 'agencies' : 'agency'}:
                    </p>

                    {garnishments.map((garnishment, index) => (
                      <div key={garnishment.id || index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-red-200 dark:border-red-800">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Agency Name</p>
                            <p className="font-medium text-gray-900 dark:text-white">{garnishment.agency_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Case Number</p>
                            <p className="font-medium text-gray-900 dark:text-white">{garnishment.case_number}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Garnishment Type</p>
                            <p className="font-medium text-gray-900 dark:text-white">{garnishment.garnishment_type}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Agency Email</p>
                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                              {garnishment.agency_email || 'Not on file (will send to default email)'}
                            </p>
                          </div>
                          {garnishment.case_reference && (
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Agency Reference</p>
                              <p className="font-medium text-gray-900 dark:text-white">{garnishment.case_reference}</p>
                            </div>
                          )}
                          {garnishment.amount_remaining > 0 && (
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Amount Remaining</p>
                              <p className="font-medium text-red-600 dark:text-red-400">
                                ${garnishment.amount_remaining.toFixed(2)}
                              </p>
                            </div>
                          )}
                          {garnishment.amount_paid > 0 && (
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Total Paid</p>
                              <p className="font-medium text-green-600 dark:text-green-400">
                                ${garnishment.amount_paid.toFixed(2)}
                              </p>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleSendGarnishmentEmail(garnishment)}
                          disabled={isSendingGarnishmentEmail}
                          className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <Mail className="w-4 h-4" />
                          {isSendingGarnishmentEmail ? 'Sending...' : `Send Termination Notice to ${garnishment.agency_name}`}
                        </button>
                      </div>
                    ))}

                    <div className="px-4 py-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <p className="text-sm text-blue-900 dark:text-blue-200">
                        The termination notification email will inform the agency that the employee is no longer employed
                        and no further deductions will be processed.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      No active garnishments found for this employee. This task can be marked as complete.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Funds Transfer Email */}
            {isFundsTransferTask && employee && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  Send Funds Transfer Email to Shelli
                </h3>

                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Fill in the transfer amounts for {employee.first_name} {employee.last_name}'s final paycheck processing:
                </p>

                {/* Payroll Account Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Summary of Total Cash to Transfer to Payroll Account
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">RF Final Paycheck</p>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3 items-center">
                      <label className="text-sm text-gray-700 dark:text-gray-300">Direct Deposits</label>
                      <input
                        type="number"
                        step="0.01"
                        value={fundsTransfer.payrollDirectDeposits}
                        onChange={(e) => setFundsTransfer({...fundsTransfer, payrollDirectDeposits: e.target.value})}
                        placeholder="0.00"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 items-center">
                      <label className="text-sm text-gray-700 dark:text-gray-300">Tax</label>
                      <input
                        type="number"
                        step="0.01"
                        value={fundsTransfer.payrollTax}
                        onChange={(e) => setFundsTransfer({...fundsTransfer, payrollTax: e.target.value})}
                        placeholder="0.00"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 items-center">
                      <label className="text-sm text-gray-700 dark:text-gray-300">401k (EE + ER)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={fundsTransfer.payroll401k}
                        onChange={(e) => setFundsTransfer({...fundsTransfer, payroll401k: e.target.value})}
                        placeholder="0.00"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 items-center">
                      <label className="text-sm text-gray-700 dark:text-gray-300">HSA (EE + ER)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={fundsTransfer.payrollHSA}
                        onChange={(e) => setFundsTransfer({...fundsTransfer, payrollHSA: e.target.value})}
                        placeholder="0.00"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 items-center">
                      <label className="text-sm text-gray-700 dark:text-gray-300">Garnishment (Trust Agency)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={fundsTransfer.payrollGarnishment}
                        onChange={(e) => setFundsTransfer({...fundsTransfer, payrollGarnishment: e.target.value})}
                        placeholder="0.00"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>

                    <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                      <div className="grid grid-cols-2 gap-3 items-center">
                        <span className="font-semibold text-gray-900 dark:text-white">Total:</span>
                        <span className="font-semibold text-lg text-blue-600 dark:text-blue-400">
                          ${formatCurrency((parseFloat(fundsTransfer.payrollDirectDeposits) || 0) +
                             (parseFloat(fundsTransfer.payrollTax) || 0) +
                             (parseFloat(fundsTransfer.payroll401k) || 0) +
                             (parseFloat(fundsTransfer.payrollHSA) || 0) +
                             (parseFloat(fundsTransfer.payrollGarnishment) || 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Insurance Account Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Summary of Total Cash to Transfer to Insurance Account
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">RF Final Paycheck</p>

                  <div className="space-y-2">
                    {/* Header Row */}
                    <div className="grid grid-cols-3 gap-3 pb-2 border-b border-gray-200 dark:border-gray-600">
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-400"></div>
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 text-center">
                        Employer Contributions<br/>(Earnings)
                      </div>
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 text-center">
                        Employee Contributions<br/>(Deductions)
                      </div>
                    </div>

                    {/* Employee */}
                    <div className="grid grid-cols-3 gap-3 items-center">
                      <label className="text-sm text-gray-700 dark:text-gray-300">Employee</label>
                      <input
                        type="number"
                        step="0.01"
                        value={fundsTransfer.insuranceEmployerEmployee}
                        onChange={(e) => setFundsTransfer({...fundsTransfer, insuranceEmployerEmployee: e.target.value})}
                        placeholder="0.00"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={fundsTransfer.insuranceEmployeeEmployee}
                        onChange={(e) => setFundsTransfer({...fundsTransfer, insuranceEmployeeEmployee: e.target.value})}
                        placeholder="0.00"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>

                    {/* Employee + Spouse */}
                    <div className="grid grid-cols-3 gap-3 items-center">
                      <label className="text-sm text-gray-700 dark:text-gray-300">Employee + Spouse</label>
                      <input
                        type="number"
                        step="0.01"
                        value={fundsTransfer.insuranceEmployerSpouse}
                        onChange={(e) => setFundsTransfer({...fundsTransfer, insuranceEmployerSpouse: e.target.value})}
                        placeholder="0.00"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={fundsTransfer.insuranceEmployeeSpouse}
                        onChange={(e) => setFundsTransfer({...fundsTransfer, insuranceEmployeeSpouse: e.target.value})}
                        placeholder="0.00"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>

                    {/* Employee + Child(ren) */}
                    <div className="grid grid-cols-3 gap-3 items-center">
                      <label className="text-sm text-gray-700 dark:text-gray-300">Employee + Child(ren)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={fundsTransfer.insuranceEmployerChildren}
                        onChange={(e) => setFundsTransfer({...fundsTransfer, insuranceEmployerChildren: e.target.value})}
                        placeholder="0.00"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={fundsTransfer.insuranceEmployeeChildren}
                        onChange={(e) => setFundsTransfer({...fundsTransfer, insuranceEmployeeChildren: e.target.value})}
                        placeholder="0.00"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>

                    {/* Family */}
                    <div className="grid grid-cols-3 gap-3 items-center">
                      <label className="text-sm text-gray-700 dark:text-gray-300">Family</label>
                      <input
                        type="number"
                        step="0.01"
                        value={fundsTransfer.insuranceEmployerFamily}
                        onChange={(e) => setFundsTransfer({...fundsTransfer, insuranceEmployerFamily: e.target.value})}
                        placeholder="0.00"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={fundsTransfer.insuranceEmployeeFamily}
                        onChange={(e) => setFundsTransfer({...fundsTransfer, insuranceEmployeeFamily: e.target.value})}
                        placeholder="0.00"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>

                    {/* Kaiser */}
                    <div className="grid grid-cols-3 gap-3 items-center">
                      <label className="text-sm text-gray-700 dark:text-gray-300">Kaiser</label>
                      <input
                        type="number"
                        step="0.01"
                        value={fundsTransfer.insuranceEmployerKaiser}
                        onChange={(e) => setFundsTransfer({...fundsTransfer, insuranceEmployerKaiser: e.target.value})}
                        placeholder="0.00"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={fundsTransfer.insuranceEmployeeKaiser}
                        onChange={(e) => setFundsTransfer({...fundsTransfer, insuranceEmployeeKaiser: e.target.value})}
                        placeholder="0.00"
                        disabled
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 text-sm cursor-not-allowed"
                      />
                    </div>

                    <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                      <div className="grid grid-cols-3 gap-3 items-center">
                        <span className="font-semibold text-gray-900 dark:text-white">Total:</span>
                        <span className="font-semibold text-sm text-green-600 dark:text-green-400 text-center">
                          ${formatCurrency((parseFloat(fundsTransfer.insuranceEmployerEmployee) || 0) +
                             (parseFloat(fundsTransfer.insuranceEmployerSpouse) || 0) +
                             (parseFloat(fundsTransfer.insuranceEmployerChildren) || 0) +
                             (parseFloat(fundsTransfer.insuranceEmployerFamily) || 0) +
                             (parseFloat(fundsTransfer.insuranceEmployerKaiser) || 0))}
                        </span>
                        <span className="font-semibold text-sm text-green-600 dark:text-green-400 text-center">
                          ${formatCurrency((parseFloat(fundsTransfer.insuranceEmployeeEmployee) || 0) +
                             (parseFloat(fundsTransfer.insuranceEmployeeSpouse) || 0) +
                             (parseFloat(fundsTransfer.insuranceEmployeeChildren) || 0) +
                             (parseFloat(fundsTransfer.insuranceEmployeeFamily) || 0) +
                             (parseFloat(fundsTransfer.insuranceEmployeeKaiser) || 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSendFundsTransferEmail}
                  disabled={isSendingFundsTransferEmail}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold"
                >
                  <Mail className="w-5 h-5" />
                  {isSendingFundsTransferEmail ? 'Sending...' : 'Send Funds Transfer Email to Shelli'}
                </button>

                <div className="px-4 py-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-200">
                    This email will be sent to Shelli with the breakdown of funds to transfer for both Payroll and Insurance accounts.
                  </p>
                </div>
              </div>
            )}

            {/* Exit Documents Section */}
            {isExitDocumentsTask && employee && (
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Important Information for Terminating Employee
                </h3>

                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Generate the exit information form for {employee.first_name} {employee.last_name}.
                  The form will auto-populate with employee data. You can override values below if needed.
                </p>

                {/* Employee Info Preview */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
                    Employee Information (Auto-filled)
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
                      <p className="font-medium text-gray-900 dark:text-white">{employee.first_name} {employee.last_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Termination Date</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {employee.termination_date ? new Date(employee.termination_date).toLocaleDateString() : 'Not set'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Current PTO Balance</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {((employee.pto_allotted || 0) - (employee.pto_used || 0)).toFixed(2)} hours
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Supervisor</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {employee.supervisor || 'Not assigned'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Override Fields (Optional) */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
                    Override Values (Optional)
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    Leave blank to use auto-calculated values
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        PTO Hours to Pay Out
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={exitDocForm.ptoHours}
                        onChange={(e) => setExitDocForm({...exitDocForm, ptoHours: e.target.value})}
                        placeholder="Auto-calculated"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Last Paycheck Date
                      </label>
                      <input
                        type="text"
                        value={exitDocForm.lastPayDate}
                        onChange={(e) => setExitDocForm({...exitDocForm, lastPayDate: e.target.value})}
                        placeholder="MM/DD/YYYY (auto)"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Last Coverage Date
                      </label>
                      <input
                        type="text"
                        value={exitDocForm.lastCoverageDate}
                        onChange={(e) => setExitDocForm({...exitDocForm, lastCoverageDate: e.target.value})}
                        placeholder="MM/DD/YYYY (auto)"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Supervisor Name
                      </label>
                      <input
                        type="text"
                        value={exitDocForm.supervisorName}
                        onChange={(e) => setExitDocForm({...exitDocForm, supervisorName: e.target.value})}
                        placeholder={employee.supervisor || "Enter name"}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Supervisor Email (for forwarding communications)
                      </label>
                      <input
                        type="email"
                        value={exitDocForm.supervisorEmail}
                        onChange={(e) => setExitDocForm({...exitDocForm, supervisorEmail: e.target.value})}
                        placeholder="supervisor@company.com"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleDownloadExitDocument}
                  disabled={isDownloadingExitDoc}
                  className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold"
                >
                  <Download className="w-5 h-5" />
                  {isDownloadingExitDoc ? 'Generating PDF...' : 'Download Exit Information Form'}
                </button>

                <div className="px-4 py-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <p className="text-sm text-purple-900 dark:text-purple-200">
                    This form will be pre-filled with the employee's name, address, phone, personal email,
                    last paycheck date, benefits coverage end date, PTO payout hours, and supervisor contact information.
                  </p>
                </div>
              </div>
            )}

            {/* Notes Section */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Notes History
              </h3>

              {/* Add New Note */}
              <div className="space-y-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a new note..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[80px]"
                />
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                >
                  Add Note
                </button>
              </div>

              {/* Notes History List */}
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {task.notes_history && task.notes_history.length > 0 ? (
                  [...task.notes_history].reverse().map((noteEntry, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                      <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                        {noteEntry.note}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{noteEntry.created_by}</span>
                        <span>•</span>
                        <span>
                          {new Date(noteEntry.timestamp).toLocaleDateString()} at{' '}
                          {new Date(noteEntry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No notes yet. Add your first note above.
                  </p>
                )}
              </div>
            </div>

            {/* Audit History */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Audit History
              </h3>

              <div className="space-y-2">
                {/* Task Creation */}
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-gray-400 mt-1.5" />
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-white">Task created</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(task.created_at).toLocaleDateString()} at {new Date(task.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* Task Completion */}
                {task.completed_date && (
                  <div className="flex items-start gap-3 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-gray-900 dark:text-white">Task completed</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(task.completed_date).toLocaleDateString()} at {new Date(task.completed_date).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Uncheck History */}
                {task.uncheck_history && task.uncheck_history.length > 0 && (
                  <>
                    {task.uncheck_history.map((event, index) => (
                      <div key={index} className="flex items-start gap-3 text-sm">
                        <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-gray-900 dark:text-white">Task unchecked</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                            Reason: {event.reason}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(event.timestamp).toLocaleDateString()} at {new Date(event.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Last Updated */}
                {task.updated_at && task.updated_at !== task.created_at && (
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5" />
                    <div className="flex-1">
                      <p className="text-gray-900 dark:text-white">Last updated</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(task.updated_at).toLocaleDateString()} at {new Date(task.updated_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-6">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
          </motion.div>

          {/* Uncheck Confirmation Modal */}
          {showUncheckModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowUncheckModal(false)} />
              <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Uncheck Task</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  You are about to uncheck "{task.task_name}". Please provide a reason for unchecking this task.
                </p>
                <textarea
                  value={uncheckReason}
                  onChange={(e) => setUncheckReason(e.target.value)}
                  placeholder="Enter reason for unchecking..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[100px]"
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => {
                      setShowUncheckModal(false);
                      setUncheckReason('');
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmUncheck}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Confirm Uncheck
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
