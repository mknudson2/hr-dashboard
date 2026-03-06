import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost, apiGet } from '@/utils/api';
import { ArrowLeft, Send, CheckCircle, X, Search } from 'lucide-react';
import { motion } from 'framer-motion';


interface FormData {
  title: string;
  department: string;
  team: string;
  cost_center: string;
  location: string;
  remote_type: string;
  employment_type: string;
  position_type: string;
  position_supervisor: string;
  posting_channels: string[];
  requires_early_tech_screen: boolean;
  target_salary: string;
  salary_min: string;
  salary_max: string;
  wage_type: string;
  skills_tags: string[];
  target_start_date: string;
  urgency: string;
  visibility_user_ids: number[];
  description: string;
  requirements: string;
  notes: string;
}

interface TeamMember {
  employee_id: string;
  user_id: number | null;
  first_name: string;
  last_name: string;
  department: string;
  position: string;
}

const costCenterOptions = [
  { value: '01 - Operating', label: '01 - Operating' },
  { value: '02 - COBRA', label: '02 - COBRA' },
  { value: '03 - Cafeteria', label: '03 - Cafeteria' },
  { value: '04 - 401K', label: '04 - 401K' },
  { value: '05 - 403b', label: '05 - 403b' },
  { value: '06 - Data Services', label: '06 - Data Services' },
  { value: '07 - Fiduciary Services', label: '07 - Fiduciary Services' },
];

const urgencyOptions = [
  { value: 'Low', label: 'Low', color: 'bg-gray-100 text-gray-700' },
  { value: 'Normal', label: 'Normal', color: 'bg-blue-100 text-blue-700' },
  { value: 'High', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'Critical', label: 'Critical', color: 'bg-red-100 text-red-700' },
];

export default function NewRequisitionRequestPage() {
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submittedReqId, setSubmittedReqId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Range method
  const [rangeMethod, setRangeMethod] = useState<'auto' | 'manual'>('auto');

  // Skills tag input
  const [skillInput, setSkillInput] = useState('');
  const [skillSuggestions, setSkillSuggestions] = useState<string[]>([]);

  // Supervisor search
  const [supervisorSearch, setSupervisorSearch] = useState('');
  const [supervisorResults, setSupervisorResults] = useState<TeamMember[]>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState<TeamMember | null>(null);

  // Cost center dropdown
  const [costCenterOpen, setCostCenterOpen] = useState(false);
  const [costCenterFilter, setCostCenterFilter] = useState('');
  const filteredCostCenters = costCenterOptions.filter(cc =>
    cc.label.toLowerCase().includes(costCenterFilter.toLowerCase())
  );

  // Team member search
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<TeamMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<TeamMember[]>([]);

  const [formData, setFormData] = useState<FormData>({
    title: '',
    department: '',
    team: '',
    cost_center: '',
    location: '',
    remote_type: 'On-site',
    employment_type: 'Full Time',
    position_type: 'New',
    position_supervisor: '',
    posting_channels: [],
    requires_early_tech_screen: false,
    target_salary: '',
    salary_min: '',
    salary_max: '',
    wage_type: 'Salary',
    skills_tags: [],
    target_start_date: '',
    urgency: 'Normal',
    visibility_user_ids: [],
    description: '',
    requirements: '',
    notes: '',
  });

  const handleChange = (field: keyof FormData, value: string | boolean | string[] | number[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const convertCompValue = (val: string, from: string, to: string, empType: string): string => {
    const num = parseFloat(val.replace(/,/g, ''));
    if (isNaN(num) || num === 0) return '';
    const hrsPerWeek = empType === 'Full Time' ? 40 : 20;
    const annualHrs = hrsPerWeek * 52;
    if (from === 'Salary' && to === 'Hourly') {
      // salary → hourly: divide by annual hours
      const hourly = num / annualHrs;
      return hourly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
      // hourly → salary: multiply by annual hours
      const salary = num * annualHrs;
      return salary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  };

  const handleWageTypeChange = (newWageType: string) => {
    const oldWageType = formData.wage_type;
    if (newWageType === oldWageType) return;
    const newTarget = convertCompValue(formData.target_salary, oldWageType, newWageType, formData.employment_type);
    if (rangeMethod === 'auto') {
      const num = parseFloat(newTarget.replace(/,/g, ''));
      const min = !isNaN(num) && num > 0 ? (num * 0.85).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
      const max = !isNaN(num) && num > 0 ? (num * 1.15).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
      setFormData(prev => ({ ...prev, wage_type: newWageType, target_salary: newTarget, salary_min: min, salary_max: max }));
    } else {
      setFormData(prev => ({
        ...prev,
        wage_type: newWageType,
        target_salary: newTarget,
        salary_min: convertCompValue(prev.salary_min, oldWageType, newWageType, prev.employment_type),
        salary_max: convertCompValue(prev.salary_max, oldWageType, newWageType, prev.employment_type),
      }));
    }
  };

  const handleEmploymentTypeChange = (newEmpType: string) => {
    const oldEmpType = formData.employment_type;
    if (newEmpType === oldEmpType) return;

    // Part Time forces Hourly — convert salary values to hourly if needed
    if (newEmpType === 'Part Time' && formData.wage_type === 'Salary') {
      const oldHrs = oldEmpType === 'Full Time' ? 40 : 20;
      const annualHrs = oldHrs * 52;
      const toHourly = (val: string): string => {
        const num = parseFloat(val.replace(/,/g, ''));
        if (isNaN(num) || num === 0) return '';
        return (num / annualHrs).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };
      const newTarget = toHourly(formData.target_salary);
      if (rangeMethod === 'auto') {
        const num = parseFloat(newTarget.replace(/,/g, ''));
        const min = !isNaN(num) && num > 0 ? (num * 0.85).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
        const max = !isNaN(num) && num > 0 ? (num * 1.15).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
        setFormData(prev => ({ ...prev, employment_type: newEmpType, wage_type: 'Hourly', target_salary: newTarget, salary_min: min, salary_max: max }));
      } else {
        setFormData(prev => ({
          ...prev,
          employment_type: newEmpType,
          wage_type: 'Hourly',
          target_salary: newTarget,
          salary_min: toHourly(prev.salary_min),
          salary_max: toHourly(prev.salary_max),
        }));
      }
      return;
    }

    if (formData.wage_type === 'Hourly') {
      // Hourly values stay the same — they're a per-hour rate regardless of hours/week
      setFormData(prev => ({ ...prev, employment_type: newEmpType }));
    } else {
      // Salary: convert based on the new hours/week ratio
      const oldHrs = oldEmpType === 'Full Time' ? 40 : 20;
      const newHrs = newEmpType === 'Full Time' ? 40 : 20;
      const ratio = newHrs / oldHrs;
      const convert = (val: string): string => {
        const num = parseFloat(val.replace(/,/g, ''));
        if (isNaN(num) || num === 0) return '';
        const converted = num * ratio;
        return converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };
      setFormData(prev => ({
        ...prev,
        employment_type: newEmpType,
        target_salary: convert(prev.target_salary),
        salary_min: convert(prev.salary_min),
        salary_max: convert(prev.salary_max),
      }));
    }
  };

  const togglePostingChannel = (channel: string) => {
    const current = formData.posting_channels;
    const updated = current.includes(channel)
      ? current.filter(c => c !== channel)
      : [...current, channel];
    handleChange('posting_channels', updated);

    // Auto-check early tech screen when Bloom is selected
    if (channel === 'bloom' && !current.includes('bloom')) {
      handleChange('requires_early_tech_screen', true);
    }
  };

  // Skills suggestions
  useEffect(() => {
    if (skillInput.length > 0) {
      const timer = setTimeout(async () => {
        try {
          const data = await apiGet<{ suggestions: string[] }>(
            `/portal/hiring-manager/skills-suggestions?search=${encodeURIComponent(skillInput)}`
          );
          setSkillSuggestions(data.suggestions.filter(s => !formData.skills_tags.includes(s)));
        } catch {
          setSkillSuggestions([]);
        }
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setSkillSuggestions([]);
    }
  }, [skillInput, formData.skills_tags]);

  const addSkill = (skill: string) => {
    if (!formData.skills_tags.includes(skill)) {
      handleChange('skills_tags', [...formData.skills_tags, skill]);
    }
    setSkillInput('');
    setSkillSuggestions([]);
  };

  const removeSkill = (skill: string) => {
    handleChange('skills_tags', formData.skills_tags.filter(s => s !== skill));
  };

  // Supervisor search
  useEffect(() => {
    if (supervisorSearch.length >= 1) {
      const timer = setTimeout(async () => {
        try {
          const data = await apiGet<{ employees: TeamMember[] }>(
            `/portal/hiring-manager/team-members?search=${encodeURIComponent(supervisorSearch)}`
          );
          setSupervisorResults(data.employees);
        } catch {
          setSupervisorResults([]);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSupervisorResults([]);
    }
  }, [supervisorSearch]);

  const selectSupervisor = (member: TeamMember) => {
    const fullName = `${member.first_name} ${member.last_name}`;
    handleChange('position_supervisor', fullName);
    setSelectedSupervisor(member);
    setSupervisorSearch('');
    setSupervisorResults([]);
  };

  const clearSupervisor = () => {
    handleChange('position_supervisor', '');
    setSelectedSupervisor(null);
  };

  // Team member search
  useEffect(() => {
    if (memberSearch.length >= 1) {
      const timer = setTimeout(async () => {
        try {
          const data = await apiGet<{ employees: TeamMember[] }>(
            `/portal/hiring-manager/team-members?search=${encodeURIComponent(memberSearch)}`
          );
          setMemberResults(data.employees.filter(
            e => e.user_id && !formData.visibility_user_ids.includes(e.user_id)
          ));
        } catch {
          setMemberResults([]);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setMemberResults([]);
    }
  }, [memberSearch, formData.visibility_user_ids]);

  const addMember = (member: TeamMember) => {
    if (member.user_id && !formData.visibility_user_ids.includes(member.user_id)) {
      handleChange('visibility_user_ids', [...formData.visibility_user_ids, member.user_id]);
      setSelectedMembers(prev => [...prev, member]);
    }
    setMemberSearch('');
    setMemberResults([]);
  };

  const removeMember = (userId: number) => {
    handleChange('visibility_user_ids', formData.visibility_user_ids.filter(id => id !== userId));
    setSelectedMembers(prev => prev.filter(m => m.user_id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate all required fields (everything except notes)
    const requiredFields: { field: keyof FormData; label: string }[] = [
      { field: 'title', label: 'Position Title' },
      { field: 'department', label: 'Department' },
      { field: 'team', label: 'Team' },
      { field: 'cost_center', label: 'Cost Center' },
      { field: 'employment_type', label: 'Employment Type' },
      { field: 'position_supervisor', label: 'Intended Supervisor' },
      { field: 'wage_type', label: 'Wage Type' },
      { field: 'target_salary', label: 'Target Salary' },
      { field: 'salary_min', label: 'Salary Range Min' },
      { field: 'salary_max', label: 'Salary Range Max' },
      { field: 'target_start_date', label: 'Target Start Date' },
      { field: 'urgency', label: 'Urgency' },
      { field: 'description', label: 'Job Description' },
      { field: 'requirements', label: 'Requirements' },
    ];
    const missing = requiredFields.filter(({ field }) => {
      const val = formData[field];
      if (Array.isArray(val)) return val.length === 0;
      return !val;
    });
    if (formData.posting_channels.length === 0) {
      missing.push({ field: 'posting_channels', label: 'Posting Channels' });
    }
    if (formData.skills_tags.length === 0) {
      missing.push({ field: 'skills_tags', label: 'Required Skills' });
    }
    if (missing.length > 0) {
      setError(`Please fill in the following required fields: ${missing.map(m => m.label).join(', ')}`);
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      const payload = {
        ...formData,
        target_salary: formData.target_salary ? parseFloat(formData.target_salary.replace(/,/g, '')) : null,
        salary_min: formData.salary_min ? parseFloat(formData.salary_min.replace(/,/g, '')) : null,
        salary_max: formData.salary_max ? parseFloat(formData.salary_max.replace(/,/g, '')) : null,
        target_start_date: formData.target_start_date || null,
      };
      const result = await apiPost<{ id: number; requisition_id: string }>(
        '/portal/hiring-manager/requisitions',
        payload
      );
      setSubmittedId(result.requisition_id);
      setSubmittedReqId(result.id);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-8 text-center"
        >
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Request Submitted
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Your requisition request has been submitted for review.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Requisition ID: <span className="font-mono font-semibold">{submittedId}</span>
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate(`/hiring/requisitions/${submittedReqId}`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              View Status
            </button>
            <button
              onClick={() => navigate('/hiring/my-requisitions')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              My Requisitions
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Currency formatting helpers
  const formatCurrency = (value: string): string => {
    const num = parseFloat(value.replace(/,/g, ''));
    if (isNaN(num)) return '';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrencyInput = (value: string): string => {
    // Strip everything except digits and decimal point
    return value.replace(/[^0-9.]/g, '');
  };

  const handleCurrencyChange = (field: keyof FormData, rawValue: string) => {
    const cleaned = parseCurrencyInput(rawValue);
    if (field === 'target_salary' && rangeMethod === 'auto') {
      const num = parseFloat(cleaned);
      if (!isNaN(num) && num > 0) {
        const min = (num * 0.85).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const max = (num * 1.15).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        setFormData(prev => ({ ...prev, target_salary: cleaned, salary_min: min, salary_max: max }));
        return;
      } else {
        setFormData(prev => ({ ...prev, target_salary: cleaned, salary_min: '', salary_max: '' }));
        return;
      }
    }
    handleChange(field, cleaned);
  };

  const handleCurrencyBlur = (field: keyof FormData) => {
    const val = formData[field] as string;
    if (val) {
      const formatted = formatCurrency(val);
      if (formatted) {
        if (field === 'target_salary' && rangeMethod === 'auto') {
          const num = parseFloat(val.replace(/,/g, ''));
          const min = (num * 0.85).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const max = (num * 1.15).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          setFormData(prev => ({ ...prev, target_salary: formatted, salary_min: min, salary_max: max }));
        } else {
          handleChange(field, formatted);
        }
      }
    }
  };

  const handleCurrencyFocus = (field: keyof FormData) => {
    const val = formData[field] as string;
    if (val) {
      // Strip formatting for editing
      handleChange(field, val.replace(/,/g, ''));
    }
  };

  const getNumericValue = (val: string): number => {
    const num = parseFloat(val.replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
  };

  const hoursPerWeek = formData.employment_type === 'Full Time' ? 40 : 20;
  const annualHours = hoursPerWeek * 52;

  const getConversionText = (val: string): string | null => {
    const num = getNumericValue(val);
    if (!num) return null;
    if (formData.wage_type === 'Hourly') {
      const annual = num * annualHours;
      return `≈ $${annual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/yr`;
    } else {
      const hourly = num / 2080;
      return `≈ $${hourly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/hr`;
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
  const sectionClass = "bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Request New Position
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Submit a request to open a new position for your team
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Position Details */}
        <div className={sectionClass}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Position Details</h2>

          <div>
            <label className={labelClass}>Position Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => handleChange('title', e.target.value)}
              className={inputClass}
              placeholder="e.g., Senior Software Engineer"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Department *</label>
              <input
                type="text"
                value={formData.department}
                onChange={e => handleChange('department', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Team *</label>
              <input
                type="text"
                value={formData.team}
                onChange={e => handleChange('team', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className={labelClass}>Cost Center *</label>
              {formData.cost_center ? (
                <div className="flex items-center gap-2">
                  <span className={`${inputClass} flex items-center justify-between`}>
                    {formData.cost_center}
                    <button type="button" onClick={() => { handleChange('cost_center', ''); setCostCenterFilter(''); }}>
                      <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  </span>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={costCenterFilter}
                    onChange={e => { setCostCenterFilter(e.target.value); setCostCenterOpen(true); }}
                    onFocus={() => setCostCenterOpen(true)}
                    className={inputClass}
                    placeholder="Search cost centers..."
                  />
                  {costCenterOpen && filteredCostCenters.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredCostCenters.map(cc => (
                        <button
                          key={cc.value}
                          type="button"
                          onClick={() => { handleChange('cost_center', cc.value); setCostCenterOpen(false); setCostCenterFilter(''); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                        >
                          {cc.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div>
              <label className={labelClass}>Employment Type *</label>
              <div className="flex gap-4 mt-2">
                {['Full Time', 'Part Time'].map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="employment_type"
                      value={type}
                      checked={formData.employment_type === type}
                      onChange={e => handleEmploymentTypeChange(e.target.value)}
                      className="text-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{type}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>Intended Supervisor *</label>
            {selectedSupervisor ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full text-sm">
                  {selectedSupervisor.first_name} {selectedSupervisor.last_name}
                  <span className="text-green-500 dark:text-green-400 text-xs ml-1">
                    {selectedSupervisor.position && `· ${selectedSupervisor.position}`}
                  </span>
                  <button type="button" onClick={clearSupervisor}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3" />
                  <input
                    type="text"
                    value={supervisorSearch}
                    onChange={e => setSupervisorSearch(e.target.value)}
                    className={`${inputClass} pl-9`}
                    placeholder="Search employees..."
                  />
                </div>
                {supervisorResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {supervisorResults.map(m => (
                      <button
                        key={m.employee_id}
                        type="button"
                        onClick={() => selectSupervisor(m)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {m.first_name} {m.last_name}
                        </div>
                        <div className="text-xs text-gray-500">{m.position} · {m.department}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Posting Preferences */}
        <div className={sectionClass}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Posting Preferences</h2>
          <div>
            <label className={labelClass}>Posting Channels *</label>
            <div className="flex gap-3 mt-1">
              {[
                { value: 'internal', label: 'Internal' },
                { value: 'external', label: 'External' },
                { value: 'bloom', label: 'Bloom' },
              ].map(ch => (
                <label
                  key={ch.value}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    formData.posting_channels.includes(ch.value)
                      ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-600'
                      : 'bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.posting_channels.includes(ch.value)}
                    onChange={() => togglePostingChannel(ch.value)}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{ch.label}</span>
                </label>
              ))}
            </div>
            {formData.posting_channels.includes('bloom') && (
              <p className="text-xs text-blue-600 mt-1">
                HR can trigger the Tech Screen early in the pipeline for Bloom candidates.
              </p>
            )}
          </div>
        </div>

        {/* Section 3: Compensation */}
        <div className={sectionClass}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Compensation</h2>
          <div>
            <label className={labelClass}>Wage Type *</label>
            <div className="flex gap-4 mt-1">
              {['Salary', 'Hourly'].map(type => {
                const isDisabled = type === 'Salary' && formData.employment_type === 'Part Time';
                return (
                  <label key={type} className={`flex items-center gap-2 ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                    <input
                      type="radio"
                      name="wage_type"
                      value={type}
                      checked={formData.wage_type === type}
                      onChange={e => handleWageTypeChange(e.target.value)}
                      disabled={isDisabled}
                      className="text-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{type}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <label className={labelClass}>
              {formData.wage_type === 'Hourly' ? 'Target Rate' : 'Target Salary'} *
            </label>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={formData.target_salary}
                onChange={e => handleCurrencyChange('target_salary', e.target.value)}
                onBlur={() => handleCurrencyBlur('target_salary')}
                onFocus={() => handleCurrencyFocus('target_salary')}
                className={`${inputClass} pl-7`}
                placeholder="0.00"
              />
            </div>
            {getConversionText(formData.target_salary) && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{getConversionText(formData.target_salary)}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Range Method *</label>
            <div className="flex gap-3 mt-1">
              {[
                { value: 'auto', label: 'Auto (±15%)' },
                { value: 'manual', label: 'Manual' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setRangeMethod(opt.value as 'auto' | 'manual');
                    if (opt.value === 'auto') {
                      const target = getNumericValue(formData.target_salary);
                      if (target) {
                        const min = (target * 0.85).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        const max = (target * 1.15).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        setFormData(prev => ({ ...prev, salary_min: min, salary_max: max }));
                      }
                    }
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    rangeMethod === opt.value
                      ? 'bg-blue-100 text-blue-700 ring-2 ring-offset-1 ring-blue-500 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                {formData.wage_type === 'Hourly' ? 'Rate Range Min' : 'Salary Range Min'} *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.salary_min}
                  onChange={e => handleCurrencyChange('salary_min', e.target.value)}
                  onBlur={() => handleCurrencyBlur('salary_min')}
                  onFocus={() => handleCurrencyFocus('salary_min')}
                  className={`${inputClass} pl-7`}
                  placeholder="0.00"
                  readOnly={rangeMethod === 'auto'}
                />
              </div>
              {getConversionText(formData.salary_min) && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{getConversionText(formData.salary_min)}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>
                {formData.wage_type === 'Hourly' ? 'Rate Range Max' : 'Salary Range Max'} *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.salary_max}
                  onChange={e => handleCurrencyChange('salary_max', e.target.value)}
                  onBlur={() => handleCurrencyBlur('salary_max')}
                  onFocus={() => handleCurrencyFocus('salary_max')}
                  className={`${inputClass} pl-7`}
                  placeholder="0.00"
                  readOnly={rangeMethod === 'auto'}
                />
              </div>
              {getConversionText(formData.salary_max) && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{getConversionText(formData.salary_max)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Skills & Requirements */}
        <div className={sectionClass}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Skills & Requirements</h2>
          <div>
            <label className={labelClass}>Required Skills *</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.skills_tags.map(skill => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-sm"
                >
                  {skill}
                  <button type="button" onClick={() => removeSkill(skill)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="relative">
              <input
                type="text"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && skillInput.trim()) {
                    e.preventDefault();
                    addSkill(skillInput.trim());
                  }
                }}
                className={inputClass}
                placeholder="Type a skill and press Enter"
              />
              {skillSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {skillSuggestions.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addSkill(s)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 5: Timeline & Urgency */}
        <div className={sectionClass}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Timeline & Urgency</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Target Start Date *</label>
              <input
                type="date"
                value={formData.target_start_date}
                onChange={e => handleChange('target_start_date', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Urgency *</label>
              <div className="flex gap-2 mt-1">
                {urgencyOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleChange('urgency', opt.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      formData.urgency === opt.value
                        ? opt.color + ' ring-2 ring-offset-1 ring-blue-500'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Visibility & Collaboration */}
        <div className={sectionClass}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Visibility & Collaboration</h2>
          <div>
            <label className={labelClass}>Who should be in the loop?</label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              These people will be able to follow the hiring process and receive updates.
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedMembers.map(m => (
                <span
                  key={m.user_id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-full text-sm"
                >
                  {m.first_name} {m.last_name}
                  <button type="button" onClick={() => removeMember(m.user_id!)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="relative">
              <div className="flex items-center">
                <Search className="w-4 h-4 text-gray-400 absolute left-3" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  className={`${inputClass} pl-9`}
                  placeholder="Search by name..."
                />
              </div>
              {memberResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {memberResults.map(m => (
                    <button
                      key={m.employee_id}
                      type="button"
                      onClick={() => addMember(m)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {m.first_name} {m.last_name}
                      </div>
                      <div className="text-xs text-gray-500">{m.position} - {m.department}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 7: Additional Notes */}
        <div className={sectionClass}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Additional Information</h2>
          <div>
            <label className={labelClass}>Job Description *</label>
            <textarea
              value={formData.description}
              onChange={e => handleChange('description', e.target.value)}
              className={`${inputClass} h-24`}
              placeholder="Describe the role and responsibilities..."
            />
          </div>
          <div>
            <label className={labelClass}>Requirements *</label>
            <textarea
              value={formData.requirements}
              onChange={e => handleChange('requirements', e.target.value)}
              className={`${inputClass} h-20`}
              placeholder="Required qualifications and experience..."
            />
          </div>
          <div>
            <label className={labelClass}>Additional Notes</label>
            <textarea
              value={formData.notes}
              onChange={e => handleChange('notes', e.target.value)}
              className={`${inputClass} h-20`}
              placeholder="Any other information for the recruiting team..."
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
