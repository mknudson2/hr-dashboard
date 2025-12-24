import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, UserMinus, AlertCircle } from 'lucide-react';

const BASE_URL = 'http://localhost:8000';

interface Employee {
  employee_id: string;
  first_name: string;
  last_name: string;
  department: string;
  position?: string;
  hire_date?: string;
  termination_date?: string;
}

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onSuccess: () => void;
}

interface OffboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onSuccess: () => void;
}

export function OnboardingModal({ isOpen, onClose, employees, onSuccess }: OnboardingModalProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    department: '',
    position: '',
    hire_date: '',
    location: '',
    wage: '',
    wage_type: 'Salary'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewDepartment, setShowNewDepartment] = useState(false);
  const [showNewPosition, setShowNewPosition] = useState(false);
  const [newDepartmentValue, setNewDepartmentValue] = useState('');
  const [newPositionValue, setNewPositionValue] = useState('');
  const [locationType, setLocationType] = useState<'US' | 'International'>('US');
  const [locationData, setLocationData] = useState({
    city: '',
    state: '',
    zip: '',
    locality: '',
    administrativeRegion: '',
    country: '',
    intlZip: ''
  });

  // Get unique departments and positions from existing employees
  const uniqueDepartments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)));
  const uniquePositions = Array.from(new Set(employees.map(e => e.position).filter(Boolean)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!formData.first_name || !formData.last_name || !formData.department || !formData.hire_date) {
      setError('Please fill in all required fields');
      return;
    }

    // Build location string from location data
    let locationString = '';
    if (locationType === 'US') {
      const parts = [locationData.city, locationData.state];
      if (locationData.zip) parts.push(locationData.zip);
      locationString = parts.filter(Boolean).join(', ');
      if (locationString) locationString += ', USA';
    } else {
      const parts = [locationData.locality, locationData.administrativeRegion, locationData.country];
      if (locationData.intlZip) parts.push(locationData.intlZip);
      locationString = parts.filter(Boolean).join(', ');
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${BASE_URL}/onboarding/tasks/bulk-create?template_id=1`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            location: locationString
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create onboarding');
      }

      onSuccess();
      onClose();
      // Reset form
      setFormData({
        first_name: '',
        last_name: '',
        department: '',
        position: '',
        hire_date: '',
        location: '',
        wage: '',
        wage_type: 'Salary'
      });
      setLocationData({
        city: '',
        state: '',
        zip: '',
        locality: '',
        administrativeRegion: '',
        country: '',
        intlZip: ''
      });
      setLocationType('US');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        first_name: '',
        last_name: '',
        department: '',
        position: '',
        hire_date: '',
        location: '',
        wage: '',
        wage_type: 'Salary'
      });
      setLocationData({
        city: '',
        state: '',
        zip: '',
        locality: '',
        administrativeRegion: '',
        country: '',
        intlZip: ''
      });
      setLocationType('US');
      setError(null);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <UserPlus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Add New Employee
                </h2>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Department *
                </label>
                {!showNewDepartment ? (
                  <select
                    value={formData.department}
                    onChange={(e) => {
                      if (e.target.value === '__ADD_NEW__') {
                        setShowNewDepartment(true);
                        setFormData({...formData, department: ''});
                      } else {
                        setFormData({...formData, department: e.target.value});
                      }
                    }}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                    required
                  >
                    <option value="">Select a department...</option>
                    {uniqueDepartments.sort().map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                    <option value="__ADD_NEW__">+ Add New Department</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newDepartmentValue}
                      onChange={(e) => setNewDepartmentValue(e.target.value)}
                      onBlur={() => {
                        if (newDepartmentValue.trim()) {
                          setFormData({...formData, department: newDepartmentValue.trim()});
                        }
                      }}
                      placeholder="Enter new department"
                      disabled={loading}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                      autoFocus
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewDepartment(false);
                        setNewDepartmentValue('');
                        setFormData({...formData, department: ''});
                      }}
                      className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Position
                </label>
                {!showNewPosition ? (
                  <select
                    value={formData.position}
                    onChange={(e) => {
                      if (e.target.value === '__ADD_NEW__') {
                        setShowNewPosition(true);
                        setFormData({...formData, position: ''});
                      } else {
                        setFormData({...formData, position: e.target.value});
                      }
                    }}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  >
                    <option value="">Select a position...</option>
                    {uniquePositions.sort().map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                    <option value="__ADD_NEW__">+ Add New Position</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPositionValue}
                      onChange={(e) => setNewPositionValue(e.target.value)}
                      onBlur={() => {
                        if (newPositionValue.trim()) {
                          setFormData({...formData, position: newPositionValue.trim()});
                        }
                      }}
                      placeholder="Enter new position"
                      disabled={loading}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewPosition(false);
                        setNewPositionValue('');
                        setFormData({...formData, position: ''});
                      }}
                      className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Hire Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Hire Date *
                </label>
                <input
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({...formData, hire_date: e.target.value})}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  required
                />
              </div>

              {/* Location - US/International Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location
                </label>

                {/* Toggle */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setLocationType('US')}
                    disabled={loading}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      locationType === 'US'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    } disabled:opacity-50`}
                  >
                    US
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationType('International')}
                    disabled={loading}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      locationType === 'International'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    } disabled:opacity-50`}
                  >
                    International
                  </button>
                </div>

                {/* US Fields */}
                {locationType === 'US' ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={locationData.city}
                      onChange={(e) => setLocationData({...locationData, city: e.target.value})}
                      disabled={loading}
                      placeholder="City"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                    />
                    <input
                      type="text"
                      value={locationData.state}
                      onChange={(e) => setLocationData({...locationData, state: e.target.value})}
                      disabled={loading}
                      placeholder="State"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                    />
                    <input
                      type="text"
                      value={locationData.zip}
                      onChange={(e) => setLocationData({...locationData, zip: e.target.value})}
                      disabled={loading}
                      placeholder="Zip Code (optional)"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                    />
                  </div>
                ) : (
                  /* International Fields */
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={locationData.locality}
                      onChange={(e) => setLocationData({...locationData, locality: e.target.value})}
                      disabled={loading}
                      placeholder="Locality/City"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                    />
                    <input
                      type="text"
                      value={locationData.administrativeRegion}
                      onChange={(e) => setLocationData({...locationData, administrativeRegion: e.target.value})}
                      disabled={loading}
                      placeholder="Administrative Region/State/Province"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                    />
                    <input
                      type="text"
                      value={locationData.country}
                      onChange={(e) => setLocationData({...locationData, country: e.target.value})}
                      disabled={loading}
                      placeholder="Country"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                    />
                    <input
                      type="text"
                      value={locationData.intlZip}
                      onChange={(e) => setLocationData({...locationData, intlZip: e.target.value})}
                      disabled={loading}
                      placeholder="Postal Code (optional)"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                    />
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                This will create a new employee and a standard onboarding checklist with 11 tasks
              </p>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.first_name || !formData.last_name || !formData.department || !formData.hire_date}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function OffboardingModal({ isOpen, onClose, employees, onSuccess }: OffboardingModalProps) {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [terminationDate, setTerminationDate] = useState('');
  const [employmentType, setEmploymentType] = useState<'Full Time' | 'Part Time' | 'International'>('Full Time');
  const [terminationType, setTerminationType] = useState<'Voluntary' | 'Involuntary'>('Voluntary');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show all employees (offboarding will set their termination date)
  const availableEmployees = employees;

  // Auto-detect employment type when employee is selected
  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployee(employeeId);

    if (employeeId) {
      const employee = employees.find(emp => emp.employee_id === employeeId);

      if (employee) {
        // Check if international employee (ID starts with AM, BH, or C)
        const isInternational = /^(AM|BH|C)/.test(employee.employee_id);

        if (isInternational) {
          setEmploymentType('International');
        } else {
          // Use employment_type or employee_type_category from the employee record
          const empType = (employee as any).employment_type || (employee as any).employee_type_category || (employee as any).type;

          if (empType === 'Full Time' || empType === 'Full-Time' || empType === 'FT') {
            setEmploymentType('Full Time');
          } else if (empType === 'Part Time' || empType === 'Part-Time' || empType === 'PT') {
            setEmploymentType('Part Time');
          } else {
            // Default to Full Time if not specified
            setEmploymentType('Full Time');
          }
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedEmployee) {
      setError('Please select an employee');
      return;
    }

    if (!terminationDate) {
      setError('Please select a termination date');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${BASE_URL}/offboarding/tasks/bulk-create?employee_id=${selectedEmployee}&template_id=1&termination_date=${terminationDate}&employment_type=${encodeURIComponent(employmentType)}&termination_type=${terminationType}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create offboarding tasks');
      }

      onSuccess();
      onClose();
      setSelectedEmployee('');
      setTerminationDate('');
      setEmploymentType('Full Time');
      setTerminationType('Voluntary');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedEmployee('');
      setTerminationDate('');
      setEmploymentType('Full Time');
      setTerminationType('Voluntary');
      setError(null);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <UserMinus className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Create Offboarding
                </h2>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Employee Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Employee
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => handleEmployeeChange(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
                  required
                >
                  <option value="">Choose an employee...</option>
                  {availableEmployees.map((emp) => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.first_name} {emp.last_name} - {emp.department}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Employment Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEmploymentType('Full Time')}
                    disabled={loading}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
                      employmentType === 'Full Time'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Full Time
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmploymentType('Part Time')}
                    disabled={loading}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
                      employmentType === 'Part Time'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Part Time
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmploymentType('International')}
                    disabled={loading}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
                      employmentType === 'International'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    International
                  </button>
                </div>
                {employmentType === 'International' && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    International employees follow a unified offboarding process
                  </p>
                )}
              </div>

              {/* Termination Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Termination Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTerminationType('Voluntary')}
                    disabled={loading}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
                      terminationType === 'Voluntary'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Voluntary
                  </button>
                  <button
                    type="button"
                    onClick={() => setTerminationType('Involuntary')}
                    disabled={loading}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
                      terminationType === 'Involuntary'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Involuntary
                  </button>
                </div>
              </div>

              {/* Termination Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Termination Date (Last Day of Work)
                </label>
                <input
                  type="date"
                  value={terminationDate}
                  onChange={(e) => setTerminationDate(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  This will create offboarding tasks and set employee status to Terminated
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !selectedEmployee || !terminationDate}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Offboarding'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
