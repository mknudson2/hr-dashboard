import { useState, useEffect, useRef } from 'react';
import { Mail, Send, Eye, Settings, CheckCircle, XCircle, Loader, Search, X } from 'lucide-react';

const BASE_URL = '';

interface EmailTemplate {
  category: string;
  templates: string[];
}

interface Employee {
  id: number;
  employee_id: string;
  name: string;
  supervisor: string;
  department: string;
  role: string;
  position: string;
}

export default function EmailManagementPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('onboarding');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templates, setTemplates] = useState<Record<string, string[]>>({});
  const [emailConfig, setEmailConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sendStatus, setSendStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: ''
  });

  // Employee autocomplete states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form states for different email types
  const [formData, setFormData] = useState<any>({
    to_email: '',
    employee_name: '',
    employee_id: '',
    role: '',
    department: '',
    supervisor: '',
    start_date: '',
    termination_date: '',
    manager_name: '',
    manager_email: ''
  });

  useEffect(() => {
    fetchTemplates();
    fetchEmailConfig();
    fetchEmployees();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowEmployeeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${BASE_URL}/emails/templates`, { credentials: 'include' });
      const data = await response.json();
      setTemplates(data);
      if (data.onboarding && data.onboarding.length > 0) {
        setSelectedTemplate(data.onboarding[0]);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchEmailConfig = async () => {
    try {
      const response = await fetch(`${BASE_URL}/emails/config`, { credentials: 'include' });
      const data = await response.json();
      setEmailConfig(data);
    } catch (error) {
      console.error('Error fetching email config:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${BASE_URL}/employees/`, { credentials: 'include' });
      const data = await response.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEmployeeSearch(employee.name);
    setShowEmployeeDropdown(false);

    // Auto-fill form fields with employee data
    setFormData({
      ...formData,
      employee_name: employee.name,
      employee_id: employee.employee_id,
      role: employee.position || employee.role,
      department: employee.department,
      supervisor: employee.supervisor
    });
  };

  const handleEmployeeSearchChange = (value: string) => {
    setEmployeeSearch(value);
    setShowEmployeeDropdown(true);

    // If search is cleared, clear the selected employee and form fields
    if (!value) {
      setSelectedEmployee(null);
      setFormData({
        ...formData,
        employee_name: '',
        employee_id: '',
        role: '',
        department: '',
        supervisor: ''
      });
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.employee_id.toLowerCase().includes(employeeSearch.toLowerCase())
  ).slice(0, 10); // Limit to 10 results

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    if (templates[category] && templates[category].length > 0) {
      setSelectedTemplate(templates[category][0]);
    }
    setSendStatus({ type: null, message: '' });
  };

  const handleSendTestEmail = async () => {
    if (!formData.to_email) {
      setSendStatus({ type: 'error', message: 'Please enter a recipient email address' });
      return;
    }

    setLoading(true);
    setSendStatus({ type: null, message: '' });

    try {
      let endpoint = '';
      let payload: any = {};

      // Determine endpoint and payload based on category and template
      if (selectedCategory === 'onboarding') {
        if (selectedTemplate === 'welcome') {
          endpoint = '/emails/onboarding/welcome';
          payload = {
            to_email: formData.to_email,
            employee_name: formData.employee_name || 'Test Employee',
            role: formData.role || 'Test Role',
            start_date: formData.start_date || '2025-01-15',
            department: formData.department || 'Test Department',
            manager_name: formData.manager_name,
            manager_email: formData.manager_email
          };
        } else if (selectedTemplate === 'first_day_info') {
          endpoint = '/emails/onboarding/first-day-info';
          payload = {
            to_email: formData.to_email,
            employee_name: formData.employee_name || 'Test Employee',
            start_date: formData.start_date || '2025-01-15',
            start_time: '9:00 AM',
            office_location: 'Main Office',
            manager_name: formData.manager_name
          };
        }
      } else if (selectedCategory === 'offboarding') {
        const emailType = selectedTemplate.replace('nbs_term_', '');
        endpoint = '/emails/offboarding/nbs-term';
        payload = {
          email_type: emailType,
          to_emails: [formData.to_email],
          employee_name: formData.employee_name || 'Test Employee',
          employee_id: formData.employee_id || 'TEST123',
          termination_date: formData.termination_date || '2025-01-31',
          verb: 'has',
          pronoun: 'their',
          pronoun2: 'them',
          department: formData.department || 'Test Department',
          role: formData.role
        };
      } else if (selectedCategory === 'fmla') {
        if (selectedTemplate === 'fmla_approval') {
          endpoint = '/emails/fmla/approval';
          payload = {
            to_email: formData.to_email,
            employee_name: formData.employee_name || 'Test Employee',
            leave_type: 'Medical Leave',
            start_date: formData.start_date || '2025-02-01',
            return_date: '2025-04-01',
            duration: 8
          };
        } else if (selectedTemplate === 'fmla_reminder') {
          endpoint = '/emails/fmla/reminder';
          payload = {
            to_email: formData.to_email,
            employee_name: formData.employee_name || 'Test Employee',
            start_date: formData.start_date || '2025-02-01',
            return_date: '2025-04-01',
            days_until_return: 7
          };
        } else if (selectedTemplate === 'fmla_return') {
          endpoint = '/emails/fmla/return';
          payload = {
            to_email: formData.to_email,
            employee_name: formData.employee_name || 'Test Employee',
            return_date: '2025-04-01',
            manager_name: formData.manager_name
          };
        }
      } else if (selectedCategory === 'events') {
        if (selectedTemplate === 'birthday') {
          endpoint = '/emails/events/birthday';
          payload = {
            to_email: formData.to_email,
            employee_name: formData.employee_name || 'Test Employee',
            birthday_message: 'Have a wonderful birthday!'
          };
        } else if (selectedTemplate === 'anniversary') {
          endpoint = '/emails/events/anniversary';
          payload = {
            to_email: formData.to_email,
            employee_name: formData.employee_name || 'Test Employee',
            years: 5,
            start_date: '2020-01-15',
            current_role: formData.role || 'Test Role',
            department: formData.department
          };
        }
      }

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to send email');
      }

      const result = await response.json();
      setSendStatus({ type: 'success', message: `Email sent successfully to ${formData.to_email}` });

      // Reset form after success
      setTimeout(() => {
        setSendStatus({ type: null, message: '' });
      }, 5000);
    } catch (error: any) {
      setSendStatus({ type: 'error', message: error.message || 'Failed to send email' });
    } finally {
      setLoading(false);
    }
  };

  const getTemplateDisplayName = (template: string): string => {
    return template
      .replace('nbs_term_', '')
      .replace('fmla_', 'FMLA ')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'onboarding': return '👋';
      case 'offboarding': return '👋';
      case 'fmla': return '🏥';
      case 'events': return '🎉';
      default: return '📧';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Mail className="w-7 h-7 text-blue-600" />
          Email Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Send and test email templates</p>
      </div>

      {/* Email Configuration Status */}
      {emailConfig && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Email Configuration</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Provider: <span className="font-medium">{emailConfig.provider}</span> |
                  Status: <span className={`font-medium ${emailConfig.enabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {emailConfig.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  {emailConfig.from_email && ` | From: ${emailConfig.from_email}`}
                </p>
              </div>
            </div>
            {emailConfig.enabled ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600" />
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar - Template Selection */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">Email Templates</h2>
            </div>

            <div className="p-2">
              {Object.keys(templates).map((category) => (
                <div key={category} className="mb-4">
                  <button
                    onClick={() => handleCategoryChange(category)}
                    className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${
                      selectedCategory === category
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="mr-2">{getCategoryIcon(category)}</span>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      ({templates[category]?.length || 0})
                    </span>
                  </button>

                  {selectedCategory === category && (
                    <div className="ml-4 mt-2 space-y-1">
                      {templates[category]?.map((template) => (
                        <button
                          key={template}
                          onClick={() => setSelectedTemplate(template)}
                          className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                            selectedTemplate === template
                              ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          {getTemplateDisplayName(template)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Content - Email Form */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {getTemplateDisplayName(selectedTemplate)}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Category: {selectedCategory} | Template: {selectedTemplate}
              </p>
            </div>

            {/* Send Status */}
            {sendStatus.type && (
              <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                sendStatus.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {sendStatus.type === 'success' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                <p>{sendStatus.message}</p>
              </div>
            )}

            {/* Email Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Recipient Email Address *
                </label>
                <input
                  type="email"
                  value={formData.to_email}
                  onChange={(e) => setFormData({ ...formData, to_email: e.target.value })}
                  placeholder="test@example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Employee Name
                </label>
                <div className="relative" ref={dropdownRef}>
                  <div className="relative">
                    <input
                      type="text"
                      value={employeeSearch}
                      onChange={(e) => handleEmployeeSearchChange(e.target.value)}
                      onFocus={() => setShowEmployeeDropdown(true)}
                      placeholder="Search employees..."
                      className="w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    {employeeSearch && (
                      <button
                        onClick={() => handleEmployeeSearchChange('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown */}
                  {showEmployeeDropdown && filteredEmployees.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredEmployees.map((employee) => (
                        <button
                          key={employee.id}
                          onClick={() => handleEmployeeSelect(employee)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900 dark:text-white">
                            {employee.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {employee.employee_id} • {employee.department} • {employee.position || employee.role}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {(selectedCategory === 'onboarding' || selectedCategory === 'events') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Role / Position
                    </label>
                    <input
                      type="text"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      placeholder="Software Engineer"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="Engineering"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Supervisor
                    </label>
                    <input
                      type="text"
                      value={formData.supervisor}
                      onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                      placeholder="Jane Smith"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Manager Name
                    </label>
                    <input
                      type="text"
                      value={formData.manager_name}
                      onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                      placeholder="Jane Smith"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Manager Email
                    </label>
                    <input
                      type="email"
                      value={formData.manager_email}
                      onChange={(e) => setFormData({ ...formData, manager_email: e.target.value })}
                      placeholder="manager@nbsbenefits.com"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </>
              )}

              {selectedCategory === 'offboarding' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      value={formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                      placeholder="EMP12345"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Termination Date
                    </label>
                    <input
                      type="date"
                      value={formData.termination_date}
                      onChange={(e) => setFormData({ ...formData, termination_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="Engineering"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Role
                    </label>
                    <input
                      type="text"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      placeholder="Software Engineer"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Supervisor
                    </label>
                    <input
                      type="text"
                      value={formData.supervisor}
                      onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                      placeholder="Jane Smith"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </>
              )}

              {selectedCategory === 'fmla' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Manager Name
                    </label>
                    <input
                      type="text"
                      value={formData.manager_name}
                      onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                      placeholder="Jane Smith"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSendTestEmail}
                  disabled={loading || !formData.to_email}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Test Email
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Test emails will be sent using the configured email provider
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
