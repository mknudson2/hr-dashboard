import { useEffect, useState, useRef } from "react";
import { BarChart3, Users, AlertCircle, FileText, CheckCircle, Edit, Wand2, X, Download, UserCog, Upload } from "lucide-react";

const API_URL = "";

interface DashboardData {
  total_employees: number;
  completion_percentage: number;
  employees_with_eeo_data: number;
  job_category_counts: { [key: string]: number };
  race_ethnicity_counts: { [key: string]: number };
  gender_counts: { [key: string]: number };
  veteran_counts: { [key: string]: number };
  disability_counts: { [key: string]: number };
}

interface EmployeeEEOData {
  employee_id: string;
  name: string;
  department: string;
  position: string;
  eeo_job_category: string | null;
  eeo_race_ethnicity: string | null;
  eeo_gender: string | null;
  eeo_veteran_status: string | null;
  eeo_disability_status: string | null;
}

interface IncompleteEmployee {
  employee_id: string;
  name: string;
  department: string;
  position: string;
  missing_fields: string[];
}

interface IncompleteData {
  total_incomplete: number;
  employees: IncompleteEmployee[];
}

interface EEOCategories {
  job_categories: string[];
  race_ethnicity_categories: string[];
  gender_categories: string[];
  veteran_status_categories: string[];
  disability_status_categories: string[];
}

interface CategoryData {
  male: number;
  female: number;
  total: number;
}

interface EEOMatrix {
  [jobCategory: string]: {
    [raceEthnicity: string]: CategoryData;
    _total: CategoryData;
  };
}

interface ReportData {
  report_year: number;
  total_employees: number;
  include_terminated: boolean;
  eeo_matrix: EEOMatrix;
  grand_totals: {
    [raceEthnicity: string]: CategoryData;
    _total: CategoryData;
  };
}

type TabType = 'dashboard' | 'report' | 'incomplete' | 'employees';

export default function EEOPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [incompleteData, setIncompleteData] = useState<IncompleteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<IncompleteEmployee | null>(null);
  const [categories, setCategories] = useState<EEOCategories | null>(null);
  const [autoClassifying, setAutoClassifying] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear());
  const [includeTerminated, setIncludeTerminated] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [allEmployees, setAllEmployees] = useState<EmployeeEEOData[]>([]);
  const [editingFullEmployee, setEditingFullEmployee] = useState<EmployeeEEOData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
    loadCategories();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);

    try {
      if (activeTab === 'dashboard') {
        const response = await fetch(`${API_URL}/eeo/dashboard`, {
          credentials: 'include'
        });
        const data = await response.json();
        setDashboardData(data);
      } else if (activeTab === 'incomplete') {
        const response = await fetch(`${API_URL}/eeo/employees/incomplete`, {
          credentials: 'include'
        });
        const data = await response.json();
        setIncompleteData(data);
      } else if (activeTab === 'employees') {
        const response = await fetch(`${API_URL}/eeo/employees`, {
          credentials: 'include'
        });
        const data = await response.json();
        setAllEmployees(data.employees);
      }
    } catch (error) {
      console.error('Error loading EEO data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/eeo/categories`, {
        credentials: 'include'
      });
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleAutoClassify = async () => {
    if (!confirm('This will automatically assign EEO job categories to all employees based on their position titles. Continue?')) {
      return;
    }

    setAutoClassifying(true);
    try {
      const response = await fetch(`${API_URL}/eeo/classify/auto-assign?dry_run=false&overwrite_existing=false`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();

      alert(`Successfully classified ${data.classified} employees!\n${data.no_match} employees could not be auto-classified and need manual review.`);

      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error auto-classifying:', error);
      alert('Failed to auto-classify employees. Please try again.');
    } finally {
      setAutoClassifying(false);
    }
  };

  const handleUpdateEmployee = async (employeeId: string, jobCategory: string) => {
    try {
      const response = await fetch(`${API_URL}/eeo/employees/${employeeId}/eeo?eeo_job_category=${encodeURIComponent(jobCategory)}`, {
        method: 'PUT',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to update employee');
      }

      // Reload data
      await loadData();
      setEditingEmployee(null);

    } catch (error) {
      console.error('Error updating employee:', error);
      alert('Failed to update employee. Please try again.');
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const response = await fetch(`${API_URL}/eeo/report?year=${reportYear}&include_terminated=${includeTerminated}`, {
        credentials: 'include'
      });
      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleUpdateFullEmployee = async (
    employeeId: string,
    jobCategory: string | null,
    raceEthnicity: string | null,
    gender: string | null,
    veteranStatus: string | null,
    disabilityStatus: string | null
  ) => {
    try {
      const params = new URLSearchParams();
      if (jobCategory) params.append('eeo_job_category', jobCategory);
      if (raceEthnicity) params.append('eeo_race_ethnicity', raceEthnicity);
      if (gender) params.append('eeo_gender', gender);
      if (veteranStatus) params.append('eeo_veteran_status', veteranStatus);
      if (disabilityStatus) params.append('eeo_disability_status', disabilityStatus);

      const response = await fetch(`${API_URL}/eeo/employees/${employeeId}/eeo?${params.toString()}`, {
        method: 'PUT',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to update employee');
      }

      await loadData();
      setEditingFullEmployee(null);

    } catch (error) {
      console.error('Error updating employee:', error);
      alert('Failed to update employee. Please try again.');
    }
  };

  const handleDownloadTemplate = () => {
    if (!categories) return;

    // Create CSV template with headers and example data
    const headers = [
      'employee_id',
      'eeo_job_category',
      'eeo_race_ethnicity',
      'eeo_gender',
      'eeo_veteran_status',
      'eeo_disability_status'
    ];

    const exampleRow = [
      'EMP001',
      categories.job_categories[0],
      categories.race_ethnicity_categories[0],
      'Male',
      categories.veteran_status_categories[0],
      categories.disability_status_categories[0]
    ];

    const csv = [
      headers.join(','),
      exampleRow.map(cell => `"${cell}"`).join(',')
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eeo_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingCSV(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/eeo/employees/import`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        let message = `✓ Successfully imported data for ${result.updated} employees\n`;
        message += `✓ Total rows processed: ${result.total_rows}\n`;
        message += `✓ Skipped: ${result.skipped}\n`;

        if (result.errors && result.errors.length > 0) {
          message += `\n⚠ Errors:\n${result.errors.slice(0, 10).join('\n')}`;
          if (result.errors.length > 10) {
            message += `\n... and ${result.errors.length - 10} more errors`;
          }
        }

        alert(message);
        await loadData();
      } else {
        throw new Error(result.detail || 'Failed to import CSV');
      }
    } catch (error) {
      console.error('Error uploading CSV:', error);
      alert('Failed to import CSV. Please check the file format and try again.');
    } finally {
      setUploadingCSV(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExportCSV = () => {
    if (!reportData || !categories) return;

    const rows: string[][] = [];

    // Header row
    const headerRow = ['Job Category', 'Total'];
    categories.race_ethnicity_categories.forEach(race => {
      headerRow.push(`${race} - Male`, `${race} - Female`, `${race} - Total`);
    });
    rows.push(headerRow);

    // Data rows
    categories.job_categories.forEach(jobCategory => {
      if (reportData.eeo_matrix[jobCategory]) {
        const row = [jobCategory, reportData.eeo_matrix[jobCategory]._total.total.toString()];

        categories.race_ethnicity_categories.forEach(race => {
          const data = reportData.eeo_matrix[jobCategory][race];
          if (data) {
            row.push(data.male.toString(), data.female.toString(), data.total.toString());
          } else {
            row.push('0', '0', '0');
          }
        });

        rows.push(row);
      }
    });

    // Grand totals row
    const grandTotalRow = ['GRAND TOTAL', reportData.grand_totals._total.total.toString()];
    categories.race_ethnicity_categories.forEach(race => {
      const data = reportData.grand_totals[race];
      if (data) {
        grandTotalRow.push(data.male.toString(), data.female.toString(), data.total.toString());
      } else {
        grandTotalRow.push('0', '0', '0');
      }
    });
    rows.push(grandTotalRow);

    // Convert to CSV
    const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EEO-1_Report_${reportYear}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderDashboard = () => {
    if (!dashboardData) return null;

    return (
      <div className="space-y-6">
        {/* Auto-Classify Button */}
        <div className="flex justify-end">
          <button
            onClick={handleAutoClassify}
            disabled={autoClassifying}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Wand2 className="w-5 h-5" />
            {autoClassifying ? 'Auto-Classifying...' : 'Auto-Classify All Employees'}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Employees</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {dashboardData.total_employees}
                </p>
              </div>
              <Users className="w-12 h-12 text-blue-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Data Completion</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {dashboardData.completion_percentage}%
                </p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">With EEO Data</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {dashboardData.employees_with_eeo_data}
                </p>
              </div>
              <BarChart3 className="w-12 h-12 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Gender Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Gender Distribution
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(dashboardData.gender_counts).map(([gender, count]) => (
              <div key={gender} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-gray-700 dark:text-gray-300">{gender}</span>
                <span className="font-bold text-gray-900 dark:text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Race/Ethnicity Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Race/Ethnicity Distribution
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(dashboardData.race_ethnicity_counts).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-gray-700 dark:text-gray-300 text-sm">{category}</span>
                <span className="font-bold text-gray-900 dark:text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Job Category Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            EEO-1 Job Categories
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(dashboardData.job_category_counts).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-gray-700 dark:text-gray-300 text-sm">{category}</span>
                <span className="font-bold text-gray-900 dark:text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Veteran Status */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Veteran Status
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(dashboardData.veteran_counts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-gray-700 dark:text-gray-300 text-sm">{status}</span>
                <span className="font-bold text-gray-900 dark:text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Disability Status */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Disability Status
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(dashboardData.disability_counts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-gray-700 dark:text-gray-300 text-sm">{status}</span>
                <span className="font-bold text-gray-900 dark:text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderIncomplete = () => {
    if (!incompleteData) return null;

    // Filter to show only employees missing job category (which HR can fix)
    const missingJobCategory = incompleteData.employees.filter(emp =>
      emp.missing_fields.includes('job_category')
    );

    return (
      <div className="space-y-6">
        {/* Info Alert */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-semibold mb-1">About EEO Data Completion</p>
              <p>
                <strong>Job Category:</strong> Can be auto-classified or manually assigned by HR ({missingJobCategory.length} employees need this)<br/>
                <strong>Race/Ethnicity, Gender, Veteran, Disability:</strong> Must be self-reported by employees ({incompleteData.total_incomplete} total with missing fields)
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Employees Missing Job Category (HR Action Required)
            </h3>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {missingJobCategory.length} employees
            </span>
          </div>

          {missingJobCategory.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                All employees have job categories assigned!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Employee ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {missingJobCategory.map((emp) => (
                    <tr key={emp.employee_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {emp.employee_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {emp.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {emp.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {emp.position}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setEditingEmployee(emp)}
                          className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderEmployees = () => {
    if (!categories) return null;

    // Filter employees based on search term
    const filteredEmployees = allEmployees.filter(emp =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.position?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-6">
        {/* Search and Import Bar */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Search by name, ID, department, or position..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                Download Template
              </button>
              <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer whitespace-nowrap">
                <Upload className="w-4 h-4" />
                {uploadingCSV ? 'Uploading...' : 'Import CSV'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  disabled={uploadingCSV}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Employee List */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Employee EEO Data
            </h3>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {filteredEmployees.length} employees
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Job Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Race/Ethnicity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Gender
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Veteran
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Disability
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.employee_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {emp.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {emp.employee_id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {emp.position}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {emp.department}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {emp.eeo_job_category || <span className="text-gray-400 italic">Not set</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {emp.eeo_race_ethnicity || <span className="text-gray-400 italic">Not set</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {emp.eeo_gender || <span className="text-gray-400 italic">Not set</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {emp.eeo_veteran_status || <span className="text-gray-400 italic">Not set</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {emp.eeo_disability_status || <span className="text-gray-400 italic">Not set</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setEditingFullEmployee(emp)}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderReport = () => {
    if (!categories) return null;

    return (
      <div className="space-y-6">
        {/* Report Configuration */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Report Configuration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Report Year
              </label>
              <select
                value={reportYear}
                onChange={(e) => setReportYear(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTerminated}
                  onChange={(e) => setIncludeTerminated(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Include Terminated Employees
                </span>
              </label>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleGenerateReport}
                disabled={generatingReport}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generatingReport ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>

          {reportData && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Report for {reportData.report_year} • {reportData.total_employees} employees
              </div>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          )}
        </div>

        {/* Report Display */}
        {reportData ? (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow overflow-x-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              EEO-1 Report Matrix
            </h3>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th rowSpan={2} className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Job Category
                    </th>
                    <th rowSpan={2} className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white">
                      Total
                    </th>
                    {categories.race_ethnicity_categories.map((race) => (
                      <th key={race} colSpan={3} className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white">
                        {race}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    {categories.race_ethnicity_categories.map((race) => (
                      <>
                        <th key={`${race}-m`} className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center text-xs font-medium text-gray-700 dark:text-gray-300">
                          M
                        </th>
                        <th key={`${race}-f`} className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center text-xs font-medium text-gray-700 dark:text-gray-300">
                          F
                        </th>
                        <th key={`${race}-t`} className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center text-xs font-medium text-gray-700 dark:text-gray-300">
                          T
                        </th>
                      </>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categories.job_categories.map((jobCategory) => {
                    const rowData = reportData.eeo_matrix[jobCategory];
                    if (!rowData) return null;

                    return (
                      <tr key={jobCategory} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-900 dark:text-white">
                          {jobCategory}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white">
                          {rowData._total.total}
                        </td>
                        {categories.race_ethnicity_categories.map((race) => {
                          const data = rowData[race] || { male: 0, female: 0, total: 0 };
                          return (
                            <>
                              <td key={`${jobCategory}-${race}-m`} className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center text-sm text-gray-700 dark:text-gray-300">
                                {data.male}
                              </td>
                              <td key={`${jobCategory}-${race}-f`} className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center text-sm text-gray-700 dark:text-gray-300">
                                {data.female}
                              </td>
                              <td key={`${jobCategory}-${race}-t`} className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center text-sm font-medium text-gray-900 dark:text-white">
                                {data.total}
                              </td>
                            </>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* Grand Total Row */}
                  <tr className="bg-blue-50 dark:bg-blue-900/20 font-semibold">
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-900 dark:text-white">
                      GRAND TOTAL
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center text-sm font-bold text-gray-900 dark:text-white">
                      {reportData.grand_totals._total.total}
                    </td>
                    {categories.race_ethnicity_categories.map((race) => {
                      const data = reportData.grand_totals[race] || { male: 0, female: 0, total: 0 };
                      return (
                        <>
                          <td key={`total-${race}-m`} className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center text-sm text-gray-900 dark:text-white">
                            {data.male}
                          </td>
                          <td key={`total-${race}-f`} className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center text-sm text-gray-900 dark:text-white">
                            {data.female}
                          </td>
                          <td key={`total-${race}-t`} className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center text-sm font-bold text-gray-900 dark:text-white">
                            {data.total}
                          </td>
                        </>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              M = Male, F = Female, T = Total
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                EEO-1 Report Generation
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Configure report options above and click "Generate Report"
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          EEO Reporting
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Equal Employment Opportunity compliance and workforce composition reporting
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'dashboard'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Dashboard
            </div>
          </button>

          <button
            onClick={() => setActiveTab('employees')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'employees'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              Employee Data
            </div>
          </button>

          <button
            onClick={() => setActiveTab('incomplete')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'incomplete'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Incomplete Data
            </div>
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'report'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Generate Report
            </div>
          </button>
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'employees' && renderEmployees()}
          {activeTab === 'incomplete' && renderIncomplete()}
          {activeTab === 'report' && renderReport()}
        </>
      )}

      {/* Edit Modal */}
      {editingEmployee && categories && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Edit EEO Classification
              </h3>
              <button
                onClick={() => setEditingEmployee(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Employee</p>
                <p className="font-medium text-gray-900 dark:text-white">{editingEmployee.name}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Position</p>
                <p className="font-medium text-gray-900 dark:text-white">{editingEmployee.position}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  EEO Job Category
                </label>
                <select
                  id="jobCategory"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  defaultValue=""
                >
                  <option value="">Select a category...</option>
                  {categories.job_categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    const select = document.getElementById('jobCategory') as HTMLSelectElement;
                    if (select && select.value) {
                      handleUpdateEmployee(editingEmployee.employee_id, select.value);
                    } else {
                      alert('Please select a job category');
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingEmployee(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Edit Modal for All EEO Fields */}
      {editingFullEmployee && categories && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Edit EEO Data
              </h3>
              <button
                onClick={() => setEditingFullEmployee(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Employee Info */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Employee</p>
                    <p className="font-medium text-gray-900 dark:text-white">{editingFullEmployee.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">ID</p>
                    <p className="font-medium text-gray-900 dark:text-white">{editingFullEmployee.employee_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Position</p>
                    <p className="font-medium text-gray-900 dark:text-white">{editingFullEmployee.position}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Department</p>
                    <p className="font-medium text-gray-900 dark:text-white">{editingFullEmployee.department}</p>
                  </div>
                </div>
              </div>

              {/* EEO Fields */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    EEO Job Category
                  </label>
                  <select
                    id="fullJobCategory"
                    defaultValue={editingFullEmployee.eeo_job_category || ''}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Not specified</option>
                    {categories.job_categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Race/Ethnicity
                  </label>
                  <select
                    id="fullRaceEthnicity"
                    defaultValue={editingFullEmployee.eeo_race_ethnicity || ''}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Not specified</option>
                    {categories.race_ethnicity_categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Gender
                  </label>
                  <select
                    id="fullGender"
                    defaultValue={editingFullEmployee.eeo_gender || ''}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Not specified</option>
                    {categories.gender_categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Veteran Status
                  </label>
                  <select
                    id="fullVeteranStatus"
                    defaultValue={editingFullEmployee.eeo_veteran_status || ''}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Not specified</option>
                    {categories.veteran_status_categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Disability Status
                  </label>
                  <select
                    id="fullDisabilityStatus"
                    defaultValue={editingFullEmployee.eeo_disability_status || ''}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Not specified</option>
                    {categories.disability_status_categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    const jobCategory = (document.getElementById('fullJobCategory') as HTMLSelectElement)?.value || null;
                    const raceEthnicity = (document.getElementById('fullRaceEthnicity') as HTMLSelectElement)?.value || null;
                    const gender = (document.getElementById('fullGender') as HTMLSelectElement)?.value || null;
                    const veteranStatus = (document.getElementById('fullVeteranStatus') as HTMLSelectElement)?.value || null;
                    const disabilityStatus = (document.getElementById('fullDisabilityStatus') as HTMLSelectElement)?.value || null;

                    handleUpdateFullEmployee(
                      editingFullEmployee.employee_id,
                      jobCategory,
                      raceEthnicity,
                      gender,
                      veteranStatus,
                      disabilityStatus
                    );
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingFullEmployee(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
