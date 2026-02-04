import { useState, useEffect, useMemo } from 'react';
import { X, Search, Users, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGet } from '@/utils/api';

interface Employee {
  employee_id: string;
  first_name: string;
  last_name: string;
  position?: string;
  department?: string;
}

interface Supervisor {
  employee_id: string;
  full_name: string;
  position?: string;
  department?: string;
  direct_reports_count: number;
}

interface MassSupervisorChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    employee_ids: string[];
    from_supervisor: string;
    to_supervisor: string;
    effective_date: string;
    justification: string;
  }) => Promise<void>;
}

export default function MassSupervisorChangeModal({
  isOpen,
  onClose,
  onSubmit,
}: MassSupervisorChangeModalProps) {
  // Supervisor selection
  const [fromSupervisorSearch, setFromSupervisorSearch] = useState('');
  const [toSupervisorSearch, setToSupervisorSearch] = useState('');
  const [selectedFromSupervisor, setSelectedFromSupervisor] = useState<Supervisor | null>(null);
  const [selectedToSupervisor, setSelectedToSupervisor] = useState<Supervisor | null>(null);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);

  // Employee selection
  const [directReports, setDirectReports] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [loadingReports, setLoadingReports] = useState(false);

  // Form data
  const [effectiveDate, setEffectiveDate] = useState('');
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // All supervisors list
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);

  // Fetch supervisors on mount
  useEffect(() => {
    if (isOpen) {
      fetchSupervisors();
    }
  }, [isOpen]);

  // Fetch direct reports when from supervisor changes
  useEffect(() => {
    if (selectedFromSupervisor) {
      fetchDirectReports(selectedFromSupervisor.employee_id);
    } else {
      setDirectReports([]);
      setSelectedEmployees(new Set());
    }
  }, [selectedFromSupervisor]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFromSupervisorSearch('');
      setToSupervisorSearch('');
      setSelectedFromSupervisor(null);
      setSelectedToSupervisor(null);
      setDirectReports([]);
      setSelectedEmployees(new Set());
      setEffectiveDate('');
      setJustification('');
      setError(null);
    }
  }, [isOpen]);

  const fetchSupervisors = async () => {
    try {
      setLoadingSupervisors(true);
      // Fetch employees who are supervisors (have direct reports)
      const response = await apiGet<{ supervisors: Supervisor[] }>('/portal/team/supervisors');
      setSupervisors(response.supervisors || []);
    } catch (err) {
      // Fallback: fetch from team reports endpoint
      try {
        const reportsResponse = await apiGet<{ reports: Employee[] }>('/portal/team/reports');
        // For now, treat all employees as potential supervisors
        const supervisorList: Supervisor[] = (reportsResponse.reports || []).map(emp => ({
          employee_id: emp.employee_id,
          full_name: `${emp.first_name} ${emp.last_name}`,
          position: emp.position,
          department: emp.department,
          direct_reports_count: 0,
        }));
        setSupervisors(supervisorList);
      } catch {
        setError('Failed to load supervisors');
      }
    } finally {
      setLoadingSupervisors(false);
    }
  };

  const fetchDirectReports = async (supervisorId: string) => {
    try {
      setLoadingReports(true);
      const response = await apiGet<{ reports: Employee[] }>('/portal/team/reports');
      setDirectReports(response.reports || []);
      setSelectedEmployees(new Set());
    } catch (err) {
      setError('Failed to load direct reports');
    } finally {
      setLoadingReports(false);
    }
  };

  // Filter supervisors based on search
  const filteredFromSupervisors = useMemo(() => {
    if (!fromSupervisorSearch.trim()) return supervisors;
    const search = fromSupervisorSearch.toLowerCase();
    return supervisors.filter(
      s => s.full_name.toLowerCase().includes(search) ||
           s.employee_id.toLowerCase().includes(search)
    );
  }, [supervisors, fromSupervisorSearch]);

  const filteredToSupervisors = useMemo(() => {
    if (!toSupervisorSearch.trim()) return supervisors;
    const search = toSupervisorSearch.toLowerCase();
    return supervisors.filter(
      s => s.full_name.toLowerCase().includes(search) ||
           s.employee_id.toLowerCase().includes(search)
    ).filter(s => s.employee_id !== selectedFromSupervisor?.employee_id);
  }, [supervisors, toSupervisorSearch, selectedFromSupervisor]);

  const handleSelectAll = () => {
    if (selectedEmployees.size === directReports.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(directReports.map(e => e.employee_id)));
    }
  };

  const handleToggleEmployee = (employeeId: string) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
    } else {
      newSelected.add(employeeId);
    }
    setSelectedEmployees(newSelected);
  };

  const handleSubmit = async () => {
    if (!selectedFromSupervisor || !selectedToSupervisor) {
      setError('Please select both supervisors');
      return;
    }
    if (selectedEmployees.size === 0) {
      setError('Please select at least one employee to transfer');
      return;
    }
    if (!effectiveDate) {
      setError('Please select an effective date');
      return;
    }
    if (!justification.trim()) {
      setError('Please provide a justification');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({
        employee_ids: Array.from(selectedEmployees),
        from_supervisor: selectedFromSupervisor.full_name,
        to_supervisor: selectedToSupervisor.full_name,
        effective_date: effectiveDate,
        justification: justification,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    selectedFromSupervisor &&
    selectedToSupervisor &&
    selectedEmployees.size > 0 &&
    effectiveDate &&
    justification.trim();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Users className="text-indigo-600 dark:text-indigo-400" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Mass Supervisor Change
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Transfer multiple employees to a new supervisor
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Two Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* From Supervisor Column */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  From: Current Supervisor
                </label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={selectedFromSupervisor ? selectedFromSupervisor.full_name : fromSupervisorSearch}
                      onChange={(e) => {
                        setFromSupervisorSearch(e.target.value);
                        setSelectedFromSupervisor(null);
                        setShowFromDropdown(true);
                      }}
                      onFocus={() => setShowFromDropdown(true)}
                      placeholder="Search supervisor..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Dropdown */}
                  {showFromDropdown && !selectedFromSupervisor && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {loadingSupervisors ? (
                        <div className="p-4 text-center text-gray-500">
                          <Loader2 className="animate-spin mx-auto" size={20} />
                        </div>
                      ) : filteredFromSupervisors.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                          No supervisors found
                        </div>
                      ) : (
                        filteredFromSupervisors.map((supervisor) => (
                          <button
                            key={supervisor.employee_id}
                            onClick={() => {
                              setSelectedFromSupervisor(supervisor);
                              setFromSupervisorSearch('');
                              setShowFromDropdown(false);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                          >
                            <div className="font-medium">{supervisor.full_name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {supervisor.position || supervisor.department || supervisor.employee_id}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Direct Reports List */}
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={directReports.length > 0 && selectedEmployees.size === directReports.length}
                        onChange={handleSelectAll}
                        disabled={directReports.length === 0}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Select All ({directReports.length})
                      </span>
                    </label>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {loadingReports ? (
                      <div className="p-4 text-center">
                        <Loader2 className="animate-spin mx-auto text-gray-400" size={24} />
                      </div>
                    ) : !selectedFromSupervisor ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                        Select a supervisor to see their direct reports
                      </div>
                    ) : directReports.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                        No direct reports found
                      </div>
                    ) : (
                      directReports.map((employee) => (
                        <label
                          key={employee.employee_id}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedEmployees.has(employee.employee_id)}
                            onChange={() => handleToggleEmployee(employee.employee_id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {employee.first_name} {employee.last_name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {employee.position || employee.employee_id}
                            </div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* To Supervisor Column */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  To: New Supervisor
                </label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={selectedToSupervisor ? selectedToSupervisor.full_name : toSupervisorSearch}
                      onChange={(e) => {
                        setToSupervisorSearch(e.target.value);
                        setSelectedToSupervisor(null);
                        setShowToDropdown(true);
                      }}
                      onFocus={() => setShowToDropdown(true)}
                      placeholder="Search supervisor..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Dropdown */}
                  {showToDropdown && !selectedToSupervisor && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {loadingSupervisors ? (
                        <div className="p-4 text-center text-gray-500">
                          <Loader2 className="animate-spin mx-auto" size={20} />
                        </div>
                      ) : filteredToSupervisors.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                          No supervisors found
                        </div>
                      ) : (
                        filteredToSupervisors.map((supervisor) => (
                          <button
                            key={supervisor.employee_id}
                            onClick={() => {
                              setSelectedToSupervisor(supervisor);
                              setToSupervisorSearch('');
                              setShowToDropdown(false);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                          >
                            <div className="font-medium">{supervisor.full_name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {supervisor.position || supervisor.department || supervisor.employee_id}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Team Info */}
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/30">
                  {selectedToSupervisor ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="text-green-500" size={18} />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedToSupervisor.full_name}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p>Current team: {selectedToSupervisor.direct_reports_count || 0} employees</p>
                        <p className="text-blue-600 dark:text-blue-400">
                          After change: {(selectedToSupervisor.direct_reports_count || 0) + selectedEmployees.size} employees
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">
                      Select a new supervisor to see team impact
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Justification
                </label>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  rows={3}
                  placeholder="Provide justification for this supervisor change..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Summary */}
            {selectedFromSupervisor && selectedToSupervisor && selectedEmployees.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
              >
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <ArrowRight size={18} />
                  <span className="font-medium">
                    Moving {selectedEmployees.size} employee{selectedEmployees.size !== 1 ? 's' : ''} from{' '}
                    <span className="font-semibold">{selectedFromSupervisor.full_name}</span> to{' '}
                    <span className="font-semibold">{selectedToSupervisor.full_name}</span>
                  </span>
                </div>
              </motion.div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
