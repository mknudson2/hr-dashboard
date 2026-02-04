import { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Briefcase, Calendar, DollarSign, Heart, Building, FileText } from 'lucide-react';

const PREDEFINED_PLACEHOLDERS = [
  {
    category: 'Personal',
    icon: User,
    items: [
      { key: 'employee.first_name', label: 'First Name' },
      { key: 'employee.last_name', label: 'Last Name' },
      { key: 'employee.full_name', label: 'Full Name' },
      { key: 'employee.email', label: 'Personal Email' },
      { key: 'employee.personal_phone', label: 'Personal Phone' },
    ],
  },
  {
    category: 'Employment',
    icon: Briefcase,
    items: [
      { key: 'employee.employee_id', label: 'Employee ID' },
      { key: 'employee.department', label: 'Department' },
      { key: 'employee.position', label: 'Position/Title' },
      { key: 'employee.supervisor', label: 'Supervisor' },
      { key: 'employee.team', label: 'Team' },
      { key: 'employee.location', label: 'Location' },
      { key: 'employee.employment_type', label: 'Employment Type' },
      { key: 'employee.status', label: 'Status' },
    ],
  },
  {
    category: 'Dates',
    icon: Calendar,
    items: [
      { key: 'employee.hire_date', label: 'Hire Date' },
      { key: 'employee.termination_date', label: 'Termination Date' },
      { key: 'employee.birth_date', label: 'Birth Date' },
      { key: 'employee.tenure_years', label: 'Tenure (Years)' },
    ],
  },
  {
    category: 'Compensation',
    icon: DollarSign,
    items: [
      { key: 'employee.annual_wage', label: 'Annual Salary' },
      { key: 'employee.hourly_wage', label: 'Hourly Rate' },
      { key: 'employee.wage_type', label: 'Wage Type' },
      { key: 'employee.total_compensation', label: 'Total Compensation' },
    ],
  },
  {
    category: 'Benefits',
    icon: Heart,
    items: [
      { key: 'employee.medical_plan', label: 'Medical Plan' },
      { key: 'employee.medical_tier', label: 'Medical Tier' },
      { key: 'employee.dental_plan', label: 'Dental Plan' },
      { key: 'employee.vision_plan', label: 'Vision Plan' },
      { key: 'employee.pto_allotted', label: 'PTO Allotted' },
      { key: 'employee.pto_used', label: 'PTO Used' },
    ],
  },
  {
    category: 'Company',
    icon: Building,
    items: [
      { key: 'company.name', label: 'Company Name' },
      { key: 'company.current_date', label: 'Current Date' },
      { key: 'company.current_year', label: 'Current Year' },
    ],
  },
];

interface PlaceholderDropdownProps {
  onInsert: (placeholder: string) => void;
  customPlaceholders?: Array<{ key: string; label: string }>;
}

export default function PlaceholderDropdown({
  onInsert,
  customPlaceholders = [],
}: PlaceholderDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInsert = (key: string) => {
    onInsert(key);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-sm font-medium"
      >
        <FileText className="w-4 h-4" />
        Insert Placeholder
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-[400px] overflow-y-auto">
          {/* Predefined Placeholders */}
          {PREDEFINED_PLACEHOLDERS.map((category) => {
            const Icon = category.icon;
            const isExpanded = expandedCategory === category.category;

            return (
              <div key={category.category} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                <button
                  type="button"
                  onClick={() => setExpandedCategory(isExpanded ? null : category.category)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {category.category}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({category.items.length})
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>

                {isExpanded && (
                  <div className="bg-gray-50 dark:bg-gray-900/50 py-1">
                    {category.items.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleInsert(item.key)}
                        className="w-full text-left px-6 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors group"
                      >
                        <span className="text-sm text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300">
                          {item.label}
                        </span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                          {`{{${item.key}}}`}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Custom Placeholders */}
          {customPlaceholders.length > 0 && (
            <div className="border-t-2 border-green-200 dark:border-green-800">
              <div className="px-4 py-2 bg-green-50 dark:bg-green-900/30">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-900 dark:text-green-100">
                    Custom Fields
                  </span>
                  <span className="text-xs text-green-600 dark:text-green-400">
                    ({customPlaceholders.length})
                  </span>
                </div>
              </div>
              <div className="py-1">
                {customPlaceholders.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleInsert(`custom.${item.key}`)}
                    className="w-full text-left px-6 py-2 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors group"
                  >
                    <span className="text-sm text-gray-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-300">
                      {item.label}
                    </span>
                    <span className="block text-xs text-green-600 dark:text-green-400 font-mono mt-0.5">
                      {`{{custom.${item.key}}}`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {customPlaceholders.length === 0 && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Add custom fields in the Placeholders tab
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
