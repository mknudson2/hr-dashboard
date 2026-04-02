import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiPost, apiGet } from '@/utils/api';
import { ArrowLeft, Send, CheckCircle, X, Search, Plus, UserPlus, Check } from 'lucide-react';
import { motion } from 'framer-motion';


interface JDOption {
  id: number;
  position_title: string;
  description: string | null;
  requirements: string | null;
  preferred_qualifications: string | null;
  responsibilities: string | null;
  skills_tags: string[] | null;
}

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
  openings: number;
  posting_channels: string[];
  requires_early_tech_screen: boolean;
  target_salary: string;
  salary_min: string;
  salary_max: string;
  wage_type: string;
  skills_tags: string[];
  target_start_date: string;
  target_fill_date: string;
  urgency: string;
  visibility_user_ids: number[];
  visibility_employee_ids: string[];
  description: string;
  requirements: string;
  notes: string;
  job_description_id: number | null;
}

interface TeamMember {
  employee_id: string;
  user_id: number | null;
  first_name: string;
  last_name: string;
  department: string;
  position: string;
  is_hiring_manager?: boolean;
  role?: string;
}

const STAKEHOLDER_ROLES = [
  { value: 'vp_svp', label: 'VP / SVP' },
  { value: 'interviewer', label: 'Interviewer' },
  { value: 'observer', label: 'Observer' },
] as const;

const urgencyOptions = [
  { value: 'Low', label: 'Low', color: 'bg-gray-100 text-gray-700' },
  { value: 'Normal', label: 'Normal', color: 'bg-blue-100 text-blue-700' },
  { value: 'High', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'Critical', label: 'Critical', color: 'bg-red-100 text-red-700' },
];

export default function NewRequisitionRequestPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const cloneData = location.state?.cloneFrom as Record<string, unknown> | undefined;

  const formatNum = (v: unknown): string => {
    if (v == null) return '';
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    if (isNaN(n)) return '';
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submittedReqId, setSubmittedReqId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Range method
  const [rangeMethod, setRangeMethod] = useState<'auto' | 'manual'>(() => {
    if (cloneData?.salary_min != null || cloneData?.salary_max != null) return 'manual';
    return 'auto';
  });

  // Skills tag input
  const [skillInput, setSkillInput] = useState('');
  const [skillSuggestions, setSkillSuggestions] = useState<string[]>([]);

  // Supervisor search
  const [supervisorSearch, setSupervisorSearch] = useState('');
  const [supervisorResults, setSupervisorResults] = useState<TeamMember[]>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState<TeamMember | null>(() => {
    if (cloneData?.position_supervisor) {
      const parts = String(cloneData.position_supervisor).split(' ');
      return { employee_id: '', user_id: null, first_name: parts[0] || '', last_name: parts.slice(1).join(' ') || '', department: '', position: '' };
    }
    return null;
  });

  // Job description search
  const [jdSearch, setJdSearch] = useState('');
  const [jdResults, setJdResults] = useState<JDOption[]>([]);
  const [jdOpen, setJdOpen] = useState(false);
  const [selectedJD, setSelectedJD] = useState<JDOption | null>(null);
  const [jdHighlight, setJdHighlight] = useState(0);
  const jdRef = useRef<HTMLDivElement>(null);

  // Supervisor chain of command
  const [supervisorChain, setSupervisorChain] = useState<TeamMember[]>([]);

  // Field options from API
  const [fieldOptions, setFieldOptions] = useState<{ departments: string[]; costCenters: string[]; teams: string[] }>({ departments: [], costCenters: [], teams: [] });

  // Department dropdown
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [deptHighlight, setDeptHighlight] = useState(0);
  const filteredDepartments = fieldOptions.departments.filter(d =>
    d.toLowerCase().includes(departmentFilter.toLowerCase())
  );

  // Cost center dropdown
  const [costCenterOpen, setCostCenterOpen] = useState(false);
  const [costCenterFilter, setCostCenterFilter] = useState('');
  const [ccHighlight, setCcHighlight] = useState(0);
  const filteredCostCenters = fieldOptions.costCenters.filter(cc =>
    cc.toLowerCase().includes(costCenterFilter.toLowerCase())
  );

  // Team dropdown
  const [teamOpen, setTeamOpen] = useState(false);
  const [teamFilter, setTeamFilter] = useState('');
  const [teamRequestSent, setTeamRequestSent] = useState(false);
  const [teamHighlight, setTeamHighlight] = useState(0);
  const filteredTeams = fieldOptions.teams.filter(t =>
    t.toLowerCase().includes(teamFilter.toLowerCase())
  );
  const teamFilterExactMatch = fieldOptions.teams.some(t => t.toLowerCase() === teamFilter.toLowerCase().trim());

  // Keyboard highlight indices for async search dropdowns
  const [supHighlight, setSupHighlight] = useState(0);
  const [skillHighlight, setSkillHighlight] = useState(0);
  const [memberHighlight, setMemberHighlight] = useState(0);

  // Click-outside refs to close dropdowns
  const departmentRef = useRef<HTMLDivElement>(null);
  const costCenterRef = useRef<HTMLDivElement>(null);
  const teamRef = useRef<HTMLDivElement>(null);
  const supervisorRef = useRef<HTMLDivElement>(null);
  const visibilityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (departmentRef.current && !departmentRef.current.contains(e.target as Node)) {
        setDepartmentOpen(false);
      }
      if (costCenterRef.current && !costCenterRef.current.contains(e.target as Node)) {
        setCostCenterOpen(false);
      }
      if (teamRef.current && !teamRef.current.contains(e.target as Node)) {
        setTeamOpen(false);
      }
      if (supervisorRef.current && !supervisorRef.current.contains(e.target as Node)) {
        setSupervisorResults([]);
      }
      if (visibilityRef.current && !visibilityRef.current.contains(e.target as Node)) {
        setMemberResults([]);
      }
      if (jdRef.current && !jdRef.current.contains(e.target as Node)) {
        setJdOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlight indices when filtered lists change
  useEffect(() => { setDeptHighlight(0); }, [departmentFilter]);
  useEffect(() => { setCcHighlight(0); }, [costCenterFilter]);
  useEffect(() => { setTeamHighlight(0); }, [teamFilter]);
  useEffect(() => { setJdHighlight(0); }, [jdResults]);

  // JD search
  useEffect(() => {
    if (jdSearch.length < 1) { setJdResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const data = await apiGet<{ job_descriptions: JDOption[] }>(
          `/portal/hiring-manager/job-descriptions?search=${encodeURIComponent(jdSearch)}&limit=10`
        );
        setJdResults(data.job_descriptions || []);
      } catch { setJdResults([]); }
    }, 250);
    return () => clearTimeout(timer);
  }, [jdSearch]);

  const selectJD = (jd: JDOption) => {
    setSelectedJD(jd);
    handleChange('title', jd.position_title);
    handleChange('job_description_id', jd.id as unknown as string);
    // Description & requirements come from the JD read-only display;
    // clear editable fields so requester can add supplemental info
    handleChange('description', jd.description || '');
    handleChange('requirements', '');
    if (jd.skills_tags && jd.skills_tags.length > 0) handleChange('skills_tags', jd.skills_tags);
    setJdOpen(false);
    setJdSearch('');
  };

  const clearJD = () => {
    setSelectedJD(null);
    handleChange('title', '');
    handleChange('job_description_id', null as unknown as string);
    handleChange('description', '');
    handleChange('requirements', '');
    setJdSearch('');
  };

  /** Shared arrow-key / enter handler for dropdown inputs */
  const makeKeyHandler = (
    listLen: number,
    highlight: number,
    setHighlight: React.Dispatch<React.SetStateAction<number>>,
    onSelect: (idx: number) => void,
  ) => (e: React.KeyboardEvent) => {
    if (listLen === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, listLen - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onSelect(highlight);
    }
  };

  // Team member search
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<TeamMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<TeamMember[]>([]);

  // Warning modal for non-hiring-manager visibility adds
  const [pendingMember, setPendingMember] = useState<TeamMember | null>(null);
  const [showHmWarning, setShowHmWarning] = useState(false);

  // Reset highlight indices for async search results
  useEffect(() => { setSupHighlight(0); }, [supervisorResults]);
  useEffect(() => { setSkillHighlight(0); }, [skillSuggestions]);
  useEffect(() => { setMemberHighlight(0); }, [memberResults]);

  const [formData, setFormData] = useState<FormData>(() => {
    if (cloneData) {
      return {
        title: String(cloneData.title || ''),
        department: String(cloneData.department || ''),
        team: String(cloneData.team || ''),
        cost_center: String(cloneData.cost_center || ''),
        location: String(cloneData.location || ''),
        remote_type: String(cloneData.remote_type || 'On-site'),
        employment_type: String(cloneData.employment_type || 'Full Time'),
        position_type: 'New',
        position_supervisor: String(cloneData.position_supervisor || ''),
        openings: Number(cloneData.openings) || 1,
        posting_channels: Array.isArray(cloneData.posting_channels) ? cloneData.posting_channels as string[] : [],
        requires_early_tech_screen: Boolean(cloneData.requires_early_tech_screen),
        target_salary: formatNum(cloneData.target_salary),
        salary_min: formatNum(cloneData.salary_min),
        salary_max: formatNum(cloneData.salary_max),
        wage_type: String(cloneData.wage_type || 'Salary'),
        skills_tags: Array.isArray(cloneData.skills_tags) ? cloneData.skills_tags as string[] : [],
        target_start_date: '',
        target_fill_date: '',
        urgency: String(cloneData.urgency || 'Normal'),
        visibility_user_ids: [],
        visibility_employee_ids: [],
        description: String(cloneData.description || ''),
        requirements: String(cloneData.requirements || ''),
        notes: '',
        job_description_id: null,
      };
    }
    return {
      title: '',
      department: '',
      team: '',
      cost_center: '',
      location: '',
      remote_type: 'On-site',
      employment_type: 'Full Time',
      position_type: 'New',
      position_supervisor: '',
      openings: 1,
      posting_channels: [],
      requires_early_tech_screen: false,
      target_salary: '',
      salary_min: '',
      salary_max: '',
      wage_type: 'Salary',
      skills_tags: [],
      target_start_date: '',
      target_fill_date: '',
      urgency: 'Normal',
      visibility_user_ids: [],
      visibility_employee_ids: [],
      description: '',
      requirements: '',
      notes: '',
      job_description_id: null,
    };
  });

  const handleChange = (field: keyof FormData, value: string | boolean | number | string[] | number[]) => {
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

  // Fetch field options on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet<{ departments: string[]; cost_centers: string[]; teams: string[] }>(
          '/portal/hiring-manager/field-options'
        );
        setFieldOptions({ departments: data.departments, costCenters: data.cost_centers, teams: data.teams });
      } catch {
        // silently fail — fields will just have empty dropdowns
      }
    })();
  }, []);

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

  const selectSupervisor = async (member: TeamMember) => {
    const fullName = `${member.first_name} ${member.last_name}`;
    handleChange('position_supervisor', fullName);
    setSelectedSupervisor(member);
    setSupervisorSearch('');
    setSupervisorResults([]);

    // Fetch chain of command for visibility suggestions
    if (member.employee_id) {
      try {
        const data = await apiGet<{ chain: TeamMember[] }>(
          `/portal/hiring-manager/supervisor-chain?employee_id=${encodeURIComponent(member.employee_id)}`
        );
        setSupervisorChain(data.chain);
      } catch {
        setSupervisorChain([]);
      }
    }
  };

  const clearSupervisor = () => {
    handleChange('position_supervisor', '');
    setSelectedSupervisor(null);
    setSupervisorChain([]);
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
            e => !selectedMembers.some(s => s.employee_id === e.employee_id)
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
    // Check hiring-manager eligibility — warn if not
    if (!member.is_hiring_manager) {
      setPendingMember(member);
      setShowHmWarning(true);
      return;
    }
    confirmAddMember(member);
  };

  const confirmAddMember = (member: TeamMember) => {
    if (!selectedMembers.some(s => s.employee_id === member.employee_id)) {
      if (member.user_id) {
        handleChange('visibility_user_ids', [...formData.visibility_user_ids, member.user_id]);
      }
      setFormData(prev => ({
        ...prev,
        visibility_employee_ids: [...prev.visibility_employee_ids, member.employee_id],
      }));
      setSelectedMembers(prev => [...prev, { ...member, role: member.role || 'observer' }]);
    }
    setMemberSearch('');
    setMemberResults([]);
    setPendingMember(null);
    setShowHmWarning(false);
  };

  const updateMemberRole = (employeeId: string, role: string) => {
    setSelectedMembers(prev => prev.map(m =>
      m.employee_id === employeeId ? { ...m, role } : m
    ));
  };

  const removeMember = (employeeId: string) => {
    const member = selectedMembers.find(m => m.employee_id === employeeId);
    if (member?.user_id) {
      handleChange('visibility_user_ids', formData.visibility_user_ids.filter(id => id !== member.user_id));
    }
    setFormData(prev => ({
      ...prev,
      visibility_employee_ids: prev.visibility_employee_ids.filter(id => id !== employeeId),
    }));
    setSelectedMembers(prev => prev.filter(m => m.employee_id !== employeeId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate all required fields (everything except notes)
    // When a JD is selected, description & requirements come from the JD — not required from the form
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
      ...(!selectedJD ? [
        { field: 'description' as keyof FormData, label: 'Job Description' },
        { field: 'requirements' as keyof FormData, label: 'Requirements' },
      ] : []),
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
        target_fill_date: formData.target_fill_date || null,
        openings: formData.openings || 1,
        job_description_id: formData.job_description_id || null,
        stakeholders: selectedMembers.map(m => ({
          employee_id: m.employee_id,
          user_id: m.user_id,
          role: m.role || 'observer',
        })),
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

          <div className="relative" ref={jdRef}>
            <label className={labelClass}>Position Title *</label>
            {selectedJD ? (
              <div className={`${inputClass} flex items-center justify-between`}>
                <span>{selectedJD.position_title}</span>
                <button type="button" onClick={clearJD}>
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={jdOpen ? jdSearch : formData.title}
                  onChange={e => {
                    if (jdOpen) {
                      setJdSearch(e.target.value);
                    } else {
                      handleChange('title', e.target.value);
                    }
                  }}
                  onFocus={() => { setJdOpen(true); setJdSearch(formData.title); }}
                  onKeyDown={makeKeyHandler(jdResults.length + 1, jdHighlight, setJdHighlight, idx => {
                    if (idx < jdResults.length) {
                      selectJD(jdResults[idx]);
                    }
                    // Last option = "Create new position" — just close dropdown and keep typed text
                    if (idx === jdResults.length) {
                      handleChange('title', jdSearch);
                      setJdOpen(false);
                    }
                  })}
                  className={inputClass}
                  placeholder="Search existing positions or type a new title..."
                  required
                />
                {jdOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {jdResults.map((jd, i) => (
                      <button
                        key={jd.id}
                        type="button"
                        onClick={() => selectJD(jd)}
                        className={`w-full text-left px-3 py-2 text-sm ${
                          i === jdHighlight
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="font-medium">{jd.position_title}</div>
                        {jd.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{jd.description}</div>
                        )}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => { handleChange('title', jdSearch); setJdOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-sm border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 ${
                        jdHighlight === jdResults.length
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      {jdSearch ? `Create new position "${jdSearch}"` : 'Create new position'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative" ref={departmentRef}>
              <label className={labelClass}>Department *</label>
              {formData.department ? (
                <span className={`${inputClass} flex items-center justify-between`}>
                  {formData.department}
                  <button type="button" onClick={() => { handleChange('department', ''); setDepartmentFilter(''); }}>
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                </span>
              ) : (
                <>
                  <input
                    type="text"
                    value={departmentFilter}
                    onChange={e => { setDepartmentFilter(e.target.value); setDepartmentOpen(true); }}
                    onFocus={() => setDepartmentOpen(true)}
                    onKeyDown={makeKeyHandler(filteredDepartments.length, deptHighlight, setDeptHighlight, idx => {
                      const d = filteredDepartments[idx];
                      if (d) { handleChange('department', d); setDepartmentOpen(false); setDepartmentFilter(''); }
                    })}
                    className={inputClass}
                    placeholder="Search departments..."
                  />
                  {departmentOpen && filteredDepartments.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredDepartments.map((d, i) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => { handleChange('department', d); setDepartmentOpen(false); setDepartmentFilter(''); }}
                          className={`w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 ${i === deptHighlight ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="relative" ref={teamRef}>
              <label className={labelClass}>Team *</label>
              {formData.team ? (
                <div>
                  <span className={`${inputClass} flex items-center justify-between`}>
                    {formData.team}
                    <button type="button" onClick={() => { handleChange('team', ''); setTeamFilter(''); setTeamRequestSent(false); }}>
                      <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  </span>
                  {teamRequestSent && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">New team request sent to HR for approval.</p>
                  )}
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={teamFilter}
                    onChange={e => { setTeamFilter(e.target.value); setTeamOpen(true); }}
                    onFocus={() => setTeamOpen(true)}
                    onKeyDown={e => {
                      // Include the "Create new team" option in the navigable count
                      const hasCreate = teamFilter.trim() && !teamFilterExactMatch;
                      const totalItems = filteredTeams.length + (hasCreate ? 1 : 0);
                      const handler = makeKeyHandler(totalItems, teamHighlight, setTeamHighlight, idx => {
                        if (idx < filteredTeams.length) {
                          // Select existing team
                          handleChange('team', filteredTeams[idx]);
                          setTeamOpen(false);
                          setTeamFilter('');
                        } else if (hasCreate) {
                          // Create new team
                          const newTeam = teamFilter.trim();
                          handleChange('team', newTeam);
                          setTeamOpen(false);
                          setTeamFilter('');
                          apiPost('/portal/hiring-manager/custom-team-request', {
                            team_name: newTeam,
                            position_title: formData.title || 'Untitled Position',
                          }).then(() => setTeamRequestSent(true)).catch(() => {});
                        }
                      });
                      handler(e);
                    }}
                    className={inputClass}
                    placeholder="Search teams..."
                  />
                  {teamOpen && (filteredTeams.length > 0 || (teamFilter.trim() && !teamFilterExactMatch)) && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredTeams.map((t, i) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => { handleChange('team', t); setTeamOpen(false); setTeamFilter(''); }}
                          className={`w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 ${i === teamHighlight ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                        >
                          {t}
                        </button>
                      ))}
                      {teamFilter.trim() && !teamFilterExactMatch && (
                        <button
                          type="button"
                          onClick={async () => {
                            const newTeam = teamFilter.trim();
                            handleChange('team', newTeam);
                            setTeamOpen(false);
                            setTeamFilter('');
                            try {
                              await apiPost('/portal/hiring-manager/custom-team-request', {
                                team_name: newTeam,
                                position_title: formData.title || 'Untitled Position',
                              });
                              setTeamRequestSent(true);
                            } catch {
                              // still keep the value, just skip notification
                            }
                          }}
                          className={`w-full text-left px-3 py-2 text-sm text-blue-600 dark:text-blue-400 font-medium border-t border-gray-200 dark:border-gray-600 flex items-center gap-1 ${teamHighlight === filteredTeams.length ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Create new team "{teamFilter.trim()}"
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative" ref={costCenterRef}>
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
                    onKeyDown={makeKeyHandler(filteredCostCenters.length, ccHighlight, setCcHighlight, idx => {
                      const cc = filteredCostCenters[idx];
                      if (cc) { handleChange('cost_center', cc); setCostCenterOpen(false); setCostCenterFilter(''); }
                    })}
                    className={inputClass}
                    placeholder="Search cost centers..."
                  />
                  {costCenterOpen && filteredCostCenters.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredCostCenters.map((cc, i) => (
                        <button
                          key={cc}
                          type="button"
                          onClick={() => { handleChange('cost_center', cc); setCostCenterOpen(false); setCostCenterFilter(''); }}
                          className={`w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 ${i === ccHighlight ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                        >
                          {cc}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Location *</label>
              <div className="flex gap-4 mt-2">
                {['Hawaii', 'Remote'].map(loc => (
                  <label key={loc} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="location_choice"
                      value={loc}
                      checked={formData.location === loc}
                      onChange={() => {
                        handleChange('location', loc);
                        handleChange('remote_type', loc === 'Remote' ? 'Remote' : 'On-site');
                      }}
                      className="text-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{loc}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Number of Openings</label>
              <input
                type="number"
                min={1}
                max={99}
                value={formData.openings}
                onChange={e => handleChange('openings', Math.max(1, parseInt(e.target.value) || 1))}
                className={inputClass}
              />
            </div>
          </div>

          <div ref={supervisorRef}>
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
                    onKeyDown={makeKeyHandler(supervisorResults.length, supHighlight, setSupHighlight, idx => {
                      const m = supervisorResults[idx];
                      if (m) selectSupervisor(m);
                    })}
                    className={`${inputClass} pl-9`}
                    placeholder="Search employees..."
                  />
                </div>
                {supervisorResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {supervisorResults.map((m, i) => (
                      <button
                        key={m.employee_id}
                        type="button"
                        onClick={() => selectSupervisor(m)}
                        className={`w-full text-left px-3 py-2 ${i === supHighlight ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-600'}`}
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
                  if (skillSuggestions.length > 0) {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setSkillHighlight(h => Math.min(h + 1, skillSuggestions.length - 1)); return; }
                    if (e.key === 'ArrowUp') { e.preventDefault(); setSkillHighlight(h => Math.max(h - 1, 0)); return; }
                    if (e.key === 'Enter') { e.preventDefault(); addSkill(skillSuggestions[skillHighlight]); return; }
                  }
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
                  {skillSuggestions.map((s, i) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addSkill(s)}
                      className={`w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 ${i === skillHighlight ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-600'}`}
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
          <div className="grid grid-cols-3 gap-4">
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
              <label className={labelClass}>Target Fill Date</label>
              <input
                type="date"
                value={formData.target_fill_date}
                onChange={e => handleChange('target_fill_date', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Urgency *</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
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

            {/* Chain of command suggestions */}
            {supervisorChain.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Suggested — Chain of Command
                </p>
                <div className="border-l-2 border-purple-200 dark:border-purple-700 pl-3 space-y-1">
                  {supervisorChain.map(m => {
                    const alreadyAdded = selectedMembers.some(s => s.employee_id === m.employee_id);
                    return (
                      <div
                        key={m.employee_id}
                        className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {m.first_name} {m.last_name}
                          </span>
                          {m.position && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1.5">
                              {m.position}
                            </span>
                          )}
                        </div>
                        {alreadyAdded ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 shrink-0">
                            <Check className="w-3.5 h-3.5" />
                            Added
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addMember(m)}
                            className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium shrink-0"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-2">
              {selectedMembers.map(m => (
                <div
                  key={m.employee_id}
                  className="flex items-center gap-2 px-2.5 py-1.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg text-sm"
                >
                  <span className="text-purple-700 dark:text-purple-300 font-medium">
                    {m.first_name} {m.last_name}
                  </span>
                  <select
                    value={m.role || 'observer'}
                    onChange={e => updateMemberRole(m.employee_id, e.target.value)}
                    className="text-xs border border-purple-200 dark:border-purple-600 rounded px-1.5 py-0.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    {STAKEHOLDER_ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => removeMember(m.employee_id)} className="text-purple-400 hover:text-purple-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="relative" ref={visibilityRef}>
              <div className="flex items-center">
                <Search className="w-4 h-4 text-gray-400 absolute left-3" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  onKeyDown={makeKeyHandler(memberResults.length, memberHighlight, setMemberHighlight, idx => {
                    const m = memberResults[idx];
                    if (m) addMember(m);
                  })}
                  className={`${inputClass} pl-9`}
                  placeholder="Search by name..."
                />
              </div>
              {memberResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {memberResults.map((m, i) => (
                    <button
                      key={m.employee_id}
                      type="button"
                      onClick={() => addMember(m)}
                      className={`w-full text-left px-3 py-2 ${i === memberHighlight ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {m.first_name} {m.last_name}
                          </span>
                        </div>
                        {!m.is_hiring_manager && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                            Non-HM
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{m.position} · {m.department}</div>
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

          {/* Show JD-sourced description & requirements as read-only when a JD is selected */}
          {selectedJD && (
            <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">From Job Description: {selectedJD.position_title}</p>
              {selectedJD.description ? (
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedJD.description}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">No description on file — HR can add one in the Job Descriptions library.</p>
              )}
              {selectedJD.requirements && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Requirements</label>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedJD.requirements}</p>
                </div>
              )}
              {selectedJD.responsibilities && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Responsibilities</label>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedJD.responsibilities}</p>
                </div>
              )}
              {selectedJD.preferred_qualifications && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Preferred Qualifications</label>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedJD.preferred_qualifications}</p>
                </div>
              )}
            </div>
          )}

          {/* Editable fields only when no JD is selected */}
          {!selectedJD && (
            <>
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
            </>
          )}

          {selectedJD && (
            <div>
              <label className={labelClass}>Additional Requirements</label>
              <textarea
                value={formData.requirements}
                onChange={e => handleChange('requirements', e.target.value)}
                className={`${inputClass} h-20`}
                placeholder="Any additional requirements beyond the job description..."
              />
            </div>
          )}

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

      {/* Non-hiring-manager warning modal */}
      {showHmWarning && pendingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full shrink-0">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Not a Hiring Manager
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  <span className="font-medium">{pendingMember.first_name} {pendingMember.last_name}</span>
                  {pendingMember.position && <> ({pendingMember.position})</>}
                  {' '}does not currently have hiring manager access. They will be able to view this requisition but may not be able to take actions on it.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowHmWarning(false); setPendingMember(null); }}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmAddMember(pendingMember)}
                className="px-4 py-2 text-sm text-white bg-amber-600 rounded-lg hover:bg-amber-700"
              >
                Add Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
