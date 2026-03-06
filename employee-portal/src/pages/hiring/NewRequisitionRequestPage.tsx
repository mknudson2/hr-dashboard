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
  preferred_salary: string;
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

  // Skills tag input
  const [skillInput, setSkillInput] = useState('');
  const [skillSuggestions, setSkillSuggestions] = useState<string[]>([]);

  // Supervisor search
  const [supervisorSearch, setSupervisorSearch] = useState('');
  const [supervisorResults, setSupervisorResults] = useState<TeamMember[]>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState<TeamMember | null>(null);

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
    preferred_salary: '',
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
    if (!formData.title) {
      setError('Position title is required');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      const payload = {
        ...formData,
        preferred_salary: formData.preferred_salary ? parseFloat(formData.preferred_salary) : null,
        salary_min: formData.salary_min ? parseFloat(formData.salary_min) : null,
        salary_max: formData.salary_max ? parseFloat(formData.salary_max) : null,
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
              <label className={labelClass}>Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={e => handleChange('department', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Team</label>
              <input
                type="text"
                value={formData.team}
                onChange={e => handleChange('team', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Cost Center</label>
              <input
                type="text"
                value={formData.cost_center}
                onChange={e => handleChange('cost_center', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Employment Type</label>
              <div className="flex gap-4 mt-2">
                {['Full Time', 'Part Time'].map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="employment_type"
                      value={type}
                      checked={formData.employment_type === type}
                      onChange={e => handleChange('employment_type', e.target.value)}
                      className="text-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{type}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>Intended Supervisor</label>
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
            <label className={labelClass}>Posting Channels</label>
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
            <label className={labelClass}>Wage Type</label>
            <div className="flex gap-4 mt-1">
              {['Salary', 'Hourly'].map(type => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="wage_type"
                    value={type}
                    checked={formData.wage_type === type}
                    onChange={e => handleChange('wage_type', e.target.value)}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{type}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>
                {formData.wage_type === 'Hourly' ? 'Preferred Rate' : 'Preferred Salary'}
              </label>
              <input
                type="number"
                value={formData.preferred_salary}
                onChange={e => handleChange('preferred_salary', e.target.value)}
                className={inputClass}
                placeholder="$"
              />
            </div>
            <div>
              <label className={labelClass}>
                {formData.wage_type === 'Hourly' ? 'Rate Range Min' : 'Salary Range Min'}
              </label>
              <input
                type="number"
                value={formData.salary_min}
                onChange={e => handleChange('salary_min', e.target.value)}
                className={inputClass}
                placeholder="$"
              />
            </div>
            <div>
              <label className={labelClass}>
                {formData.wage_type === 'Hourly' ? 'Rate Range Max' : 'Salary Range Max'}
              </label>
              <input
                type="number"
                value={formData.salary_max}
                onChange={e => handleChange('salary_max', e.target.value)}
                className={inputClass}
                placeholder="$"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Skills & Requirements */}
        <div className={sectionClass}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Skills & Requirements</h2>
          <div>
            <label className={labelClass}>Required Skills</label>
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
              <label className={labelClass}>Target Start Date</label>
              <input
                type="date"
                value={formData.target_start_date}
                onChange={e => handleChange('target_start_date', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Urgency</label>
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
            <label className={labelClass}>Job Description</label>
            <textarea
              value={formData.description}
              onChange={e => handleChange('description', e.target.value)}
              className={`${inputClass} h-24`}
              placeholder="Describe the role and responsibilities..."
            />
          </div>
          <div>
            <label className={labelClass}>Requirements</label>
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
            disabled={submitting || !formData.title}
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
