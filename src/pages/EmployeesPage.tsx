import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Filter, X, LayoutGrid, Table, Download } from "lucide-react";
import EmployeeBenefitsDrawer from "@/components/EmployeeBenefitsDrawer";
import StatusChangeModal from "@/components/StatusChangeModal";


// Status change data type
type StatusChangeData = {
    newStatus: string;
    reason?: 'mistakenly_terminated' | 'rehired' | 'termination_cancelled';
    rehireDate?: string;
    cancellationReason?: string;
    notes?: string;
    terminationType?: string;
    terminationReason?: string;
};

interface Employee {
    employee_id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    status: string;
    department: string;
    cost_center?: string;
    team?: string;
    position?: string;
    supervisor?: string;
    hire_date: string;
    termination_date?: string | null;
    location?: string;
    type?: string;
    wage?: number;
    wage_type?: string;
    wage_effective_date?: string;
    annual_wage?: number;
    hourly_wage?: number;
    benefits_cost_annual?: number;
    employer_taxes_annual?: number;
    total_compensation?: number;
}

interface Filters {
    department: string;
    status: string;
    location: string;
    type: string;
    hireDateFrom: string;
    hireDateTo: string;
}

export default function EmployeesPage() {
    const [query, setQuery] = useState("");
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState<"standard" | "compensation">("standard");
    const [statusToggle, setStatusToggle] = useState<"all" | "active" | "terminated">("active");
    const [dateColumnToggle, setDateColumnToggle] = useState<"hire" | "termination">("termination");
    const [orgToggle, setOrgToggle] = useState<"department" | "team" | "cost_center">("department");
    const [wageTypeFilter, setWageTypeFilter] = useState<"all" | "hourly" | "salary">("all");
    const [orgFilter, setOrgFilter] = useState("");
    const [sortBy, setSortBy] = useState<"name" | "employee_id" | "base_rate" | "annual_rate">("employee_id");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
    // Status change modal state
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusChangeEmployee, setStatusChangeEmployee] = useState<Employee | null>(null);
    const [statusChangeType, setStatusChangeType] = useState<'to_terminated' | 'to_active'>('to_terminated');
    const [filters, setFilters] = useState<Filters>({
        department: "",
        status: "",
        location: "",
        type: "",
        hireDateFrom: "",
        hireDateTo: "",
    });
    const navigate = useNavigate();

    useEffect(() => {
        async function fetchEmployees() {
            try {
                // Fetch all employees from the backend
                const res = await fetch("/analytics/employees", { credentials: 'include' });
                const data = await res.json();

                // Extract employees array from response
                const employeesArray = data.employees || [];

                // Transform data to include full_name and ensure all fields
                const transformedData = employeesArray.map((emp: any) => ({
                    employee_id: emp.employee_id,
                    first_name: emp.first_name,
                    last_name: emp.last_name,
                    full_name: `${emp.first_name} ${emp.last_name}`,
                    status: emp.status || "Active",
                    department: emp.department,
                    cost_center: emp.cost_center,
                    team: emp.team,
                    position: emp.position,
                    supervisor: emp.supervisor,
                    hire_date: emp.hire_date,
                    termination_date: emp.termination_date,
                    location: emp.location,
                    type: emp.type,
                    wage: emp.wage,
                    wage_type: emp.wage_type,
                    wage_effective_date: emp.wage_effective_date,
                    annual_wage: emp.annual_wage,
                    hourly_wage: emp.hourly_wage,
                    benefits_cost_annual: emp.benefits_cost_annual,
                    employer_taxes_annual: emp.employer_taxes_annual,
                    total_compensation: emp.total_compensation,
                }));

                setEmployees(transformedData);
            } catch (err) {
                console.error("Error fetching employees:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchEmployees();
    }, []);

    // Handle employee status update - shows confirmation modal
    const handleStatusUpdate = (employeeId: string, newStatus: string) => {
        const employee = employees.find(e => e.employee_id === employeeId);
        if (!employee) return;

        // Determine the type of change
        if (employee.status === "Terminated" && newStatus === "Active") {
            setStatusChangeType('to_active');
        } else if (employee.status !== "Terminated" && newStatus === "Terminated") {
            setStatusChangeType('to_terminated');
        } else {
            // Same status or other transitions - just update directly
            performDirectStatusUpdate(employeeId, newStatus);
            return;
        }

        setStatusChangeEmployee({
            ...employee,
            full_name: employee.full_name || `${employee.first_name} ${employee.last_name}`
        });
        setShowStatusModal(true);
    };

    // Perform direct status update (for non-termination related changes)
    const performDirectStatusUpdate = async (employeeId: string, newStatus: string) => {
        setUpdatingStatus(employeeId);
        try {
            const response = await fetch(`/employees/${employeeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) throw new Error('Failed to update employee status');

            setEmployees(prev => prev.map(emp =>
                emp.employee_id === employeeId ? { ...emp, status: newStatus } : emp
            ));
        } catch (error) {
            console.error('Error updating employee status:', error);
            alert('Failed to update employee status. Please try again.');
        } finally {
            setUpdatingStatus(null);
        }
    };

    // Handle confirmed status change from modal
    const handleConfirmedStatusChange = async (data: StatusChangeData) => {
        if (!statusChangeEmployee) return;

        setUpdatingStatus(statusChangeEmployee.employee_id);

        try {
            const response = await fetch(
                `/employees/${statusChangeEmployee.employee_id}/status-change`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        new_status: data.newStatus,
                        reason: data.reason,
                        rehire_date: data.rehireDate,
                        cancellation_reason: data.cancellationReason,
                        notes: data.notes,
                        termination_type: data.terminationType,
                        termination_reason: data.terminationReason
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to update employee status');
            }

            // Update local state
            setEmployees(prev => prev.map(emp =>
                emp.employee_id === statusChangeEmployee.employee_id
                    ? { ...emp, status: data.newStatus }
                    : emp
            ));
        } catch (error) {
            console.error('Error updating employee status:', error);
            throw error; // Re-throw to let modal handle the error
        } finally {
            setUpdatingStatus(null);
        }
    };

    // Get unique values for filter dropdowns
    const uniqueDepartments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)));
    const uniqueLocations = Array.from(new Set(employees.map(e => e.location).filter(Boolean)));
    const uniqueTypes = Array.from(new Set(employees.map(e => e.type).filter(Boolean)));
    const uniqueCostCenters = Array.from(new Set(employees.map(e => e.cost_center).filter(Boolean)));
    const uniqueTeams = Array.from(new Set(employees.map(e => e.team).filter(Boolean)));

    // Get organization-specific options based on toggle
    const getOrgOptions = () => {
        if (orgToggle === "department") return uniqueDepartments;
        if (orgToggle === "team") return uniqueTeams;
        return uniqueCostCenters;
    };

    // Apply all filters
    let filtered = employees.filter((e) => {
        // Search query filter (name or employee ID)
        if (query) {
            const q = query.toLowerCase();
            const matchesName = e.full_name.toLowerCase().includes(q);
            const matchesId = e.employee_id?.toString().toLowerCase().includes(q);
            if (!matchesName && !matchesId) return false;
        }

        // Status toggle filter (takes precedence over filters.status)
        if (statusToggle === "active" && e.status !== "Active") {
            return false;
        }
        if (statusToggle === "terminated" && e.status !== "Terminated") {
            return false;
        }

        // Department filter
        if (filters.department && e.department !== filters.department) {
            return false;
        }

        // Status filter (from filter panel - only applies if statusToggle is "all")
        if (statusToggle === "all" && filters.status && e.status !== filters.status) {
            return false;
        }

        // Location filter
        if (filters.location && e.location !== filters.location) {
            return false;
        }

        // Type filter
        if (filters.type && e.type !== filters.type) {
            return false;
        }

        // Hire date range filter
        if (filters.hireDateFrom && e.hire_date) {
            const hireDate = new Date(e.hire_date);
            const fromDate = new Date(filters.hireDateFrom);
            if (hireDate < fromDate) {
                return false;
            }
        }

        if (filters.hireDateTo && e.hire_date) {
            const hireDate = new Date(e.hire_date);
            const toDate = new Date(filters.hireDateTo);
            if (hireDate > toDate) {
                return false;
            }
        }

        // Wage type filter (for compensation view)
        if (viewMode === "compensation" && wageTypeFilter !== "all") {
            if (wageTypeFilter === "hourly" && e.wage_type !== "Hourly") {
                return false;
            }
            if (wageTypeFilter === "salary" && e.wage_type !== "Salary") {
                return false;
            }
        }

        // Organization filter (for compensation view)
        if (viewMode === "compensation" && orgFilter) {
            const orgValue = orgToggle === "department"
                ? e.department
                : orgToggle === "team"
                ? e.team
                : e.cost_center;

            if (orgValue !== orgFilter) {
                return false;
            }
        }

        return true;
    });

    // Apply sorting (for compensation view)
    if (viewMode === "compensation") {
        filtered = [...filtered].sort((a, b) => {
            let compareA: any;
            let compareB: any;

            switch (sortBy) {
                case "name":
                    compareA = a.full_name.toLowerCase();
                    compareB = b.full_name.toLowerCase();
                    break;
                case "employee_id": {
                    const numA = parseInt(a.employee_id, 10);
                    const numB = parseInt(b.employee_id, 10);
                    const aIsNum = !isNaN(numA);
                    const bIsNum = !isNaN(numB);
                    // Numeric IDs first, then non-numeric alphabetically
                    if (aIsNum && bIsNum) {
                        compareA = numA;
                        compareB = numB;
                    } else if (aIsNum) {
                        return sortOrder === "asc" ? -1 : 1;
                    } else if (bIsNum) {
                        return sortOrder === "asc" ? 1 : -1;
                    } else {
                        compareA = a.employee_id || '';
                        compareB = b.employee_id || '';
                    }
                    break;
                }
                case "base_rate":
                    compareA = a.wage ? (a.wage / 2080) : 0;
                    compareB = b.wage ? (b.wage / 2080) : 0;
                    break;
                case "annual_rate":
                    compareA = a.wage || 0;
                    compareB = b.wage || 0;
                    break;
                default:
                    return 0;
            }

            if (compareA < compareB) return sortOrder === "asc" ? -1 : 1;
            if (compareA > compareB) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });
    }

    // Count active filters
    const activeFilterCount = Object.values(filters).filter(v => v !== "").length;

    // Clear all filters
    const clearFilters = () => {
        setFilters({
            department: "",
            status: "",
            location: "",
            type: "",
            hireDateFrom: "",
            hireDateTo: "",
        });
    };

    // Export functions
    const handleExport = async (format: "excel" | "pdf") => {
        try {
            // Get employee IDs from filtered results
            const employeeIds = filtered.map(emp => emp.employee_id).join(",");

            // Build URL with query parameters
            const url = `/analytics/employees/export/${format}?view_mode=${viewMode}&employee_ids=${employeeIds}`;

            // Trigger download
            const link = document.createElement("a");
            link.href = url;
            link.download = `employees_export.${format === "excel" ? "xlsx" : "pdf"}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error(`Error exporting to ${format}:`, error);
        }
    };

    return (
        <div className="p-6 relative min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    Employees
                </h2>
                <div className="flex items-center gap-3">
                    {/* Status Toggle */}
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
                        <button
                            onClick={() => setStatusToggle("all")}
                            className={`px-3 py-1.5 rounded transition-colors ${
                                statusToggle === "all"
                                    ? "bg-blue-600 text-white"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setStatusToggle("active")}
                            className={`px-3 py-1.5 rounded transition-colors ${
                                statusToggle === "active"
                                    ? "bg-green-600 text-white"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setStatusToggle("terminated")}
                            className={`px-3 py-1.5 rounded transition-colors ${
                                statusToggle === "terminated"
                                    ? "bg-red-600 text-white"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                        >
                            Terminated
                        </button>
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode("standard")}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded transition-colors ${
                                viewMode === "standard"
                                    ? "bg-blue-600 text-white"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                        >
                            <Table className="w-4 h-4" />
                            Standard
                        </button>
                        <button
                            onClick={() => setViewMode("compensation")}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded transition-colors ${
                                viewMode === "compensation"
                                    ? "bg-blue-600 text-white"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            Compensation
                        </button>
                    </div>

                    {/* Export Button with Dropdown */}
                    <div className="relative group">
                        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors">
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <button
                                onClick={() => handleExport("excel")}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors rounded-t-lg"
                            >
                                Export to Excel
                            </button>
                            <button
                                onClick={() => handleExport("pdf")}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors rounded-b-lg"
                            >
                                Export to PDF
                            </button>
                        </div>
                    </div>

                    {/* Filters Button */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="bg-white text-blue-600 rounded-full px-2 py-0.5 text-xs font-semibold">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Search Input */}
            <input
                type="text"
                placeholder="Search by name or employee ID..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="border dark:border-gray-700 rounded-lg px-4 py-2 mb-5 w-full max-w-md
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                   placeholder:text-gray-400 dark:placeholder:text-gray-500
                   focus:ring-2 focus:ring-blue-500 outline-none"
            />

            {/* Filter Panel */}
            {showFilters && (
                <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Filter Options
                        </h3>
                        {activeFilterCount > 0 && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400 hover:underline"
                            >
                                <X className="w-4 h-4" />
                                Clear All
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Department Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Department
                            </label>
                            <select
                                value={filters.department}
                                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                                className="w-full border dark:border-gray-700 rounded-lg px-3 py-2
                                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                    focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">All Departments</option>
                                {uniqueDepartments.sort().map((dept) => (
                                    <option key={dept} value={dept}>
                                        {dept}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Status
                            </label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className="w-full border dark:border-gray-700 rounded-lg px-3 py-2
                                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                    focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">All Statuses</option>
                                <option value="Active">Active</option>
                                <option value="On Leave">On Leave</option>
                                <option value="Terminated">Terminated</option>
                            </select>
                        </div>

                        {/* Location Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Location
                            </label>
                            <select
                                value={filters.location}
                                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                                className="w-full border dark:border-gray-700 rounded-lg px-3 py-2
                                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                    focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">All Locations</option>
                                {uniqueLocations.sort().map((loc) => (
                                    <option key={loc} value={loc}>
                                        {loc}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Type Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Employee Type
                            </label>
                            <select
                                value={filters.type}
                                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                                className="w-full border dark:border-gray-700 rounded-lg px-3 py-2
                                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                    focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">All Types</option>
                                {uniqueTypes.sort().map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Hire Date From */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Hired From
                            </label>
                            <input
                                type="date"
                                value={filters.hireDateFrom}
                                onChange={(e) => setFilters({ ...filters, hireDateFrom: e.target.value })}
                                className="w-full border dark:border-gray-700 rounded-lg px-3 py-2
                                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                    focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        {/* Hire Date To */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Hired To
                            </label>
                            <input
                                type="date"
                                value={filters.hireDateTo}
                                onChange={(e) => setFilters({ ...filters, hireDateTo: e.target.value })}
                                className="w-full border dark:border-gray-700 rounded-lg px-3 py-2
                                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                    focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-gray-500 dark:text-gray-400">Loading employees...</div>
            ) : (
                <>
                    {/* Employee Count */}
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Showing {filtered.length} of {employees.length} employees
                    </p>

                    {/* Standard View Table */}
                    {viewMode === "standard" && (
                        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <table className="w-full bg-white dark:bg-gray-800">
                                <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-sm font-semibold">Employee ID</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold">Department</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold">Supervisor</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold">
                                            {statusToggle === "terminated" ? (
                                                <button
                                                    onClick={() => setDateColumnToggle(prev => prev === "hire" ? "termination" : "hire")}
                                                    className="flex items-center gap-1 hover:text-blue-500 transition-colors"
                                                    title="Click to toggle between Hire Date and Termination Date"
                                                >
                                                    {dateColumnToggle === "termination" ? "Term Date" : "Hire Date"}
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                                    </svg>
                                                </button>
                                            ) : (
                                                "Hire Date"
                                            )}
                                        </th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((emp) => (
                                        <tr
                                            key={emp.employee_id}
                                            className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition"
                                            onClick={() => navigate(`/employees/${emp.employee_id}`)}
                                        >
                                            <td className="px-6 py-3 text-gray-600 dark:text-gray-300">
                                                {emp.employee_id}
                                            </td>
                                            <td className="px-6 py-3 text-gray-900 dark:text-gray-100 font-medium">
                                                {emp.full_name}
                                            </td>
                                            <td className="px-6 py-3 text-gray-600 dark:text-gray-300">
                                                {emp.department || "N/A"}
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                    (emp.type || "").toLowerCase().includes("part time") || (emp.type || "").toLowerCase().includes("part-time")
                                                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/70 dark:text-amber-200"
                                                        : "bg-green-100 text-green-700 dark:bg-green-900/70 dark:text-green-200"
                                                }`}>
                                                    {emp.type || "N/A"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-gray-600 dark:text-gray-300">
                                                {emp.supervisor || "N/A"}
                                            </td>
                                            <td className="px-6 py-3 text-gray-600 dark:text-gray-300">
                                                {statusToggle === "terminated" && dateColumnToggle === "termination"
                                                    ? (emp.termination_date ? new Date(emp.termination_date).toLocaleDateString() : "N/A")
                                                    : (emp.hire_date ? new Date(emp.hire_date).toLocaleDateString() : "N/A")
                                                }
                                            </td>
                                            <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                                                <select
                                                    value={emp.status}
                                                    onChange={(e) => handleStatusUpdate(emp.employee_id, e.target.value)}
                                                    disabled={updatingStatus === emp.employee_id}
                                                    className={`px-3 py-1 rounded-full text-sm font-medium border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none ${
                                                        emp.status === "Active"
                                                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                                            : emp.status === "On Leave"
                                                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                                                            : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                                    }`}
                                                >
                                                    <option value="Active">Active</option>
                                                    <option value="On Leave">On Leave</option>
                                                    <option value="Terminated">Terminated</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Compensation View Table */}
                    {viewMode === "compensation" && (
                        <div className="space-y-4">
                            {/* Filter and Control Bar */}
                            <div className="flex flex-wrap items-center gap-4">
                                {/* Organization Toggle */}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View:</span>
                                    <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
                                        <button
                                            onClick={() => { setOrgToggle("department"); setOrgFilter(""); }}
                                            className={`px-3 py-1 text-sm rounded transition-colors ${
                                                orgToggle === "department"
                                                    ? "bg-blue-600 text-white"
                                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            }`}
                                        >
                                            Department
                                        </button>
                                        <button
                                            onClick={() => { setOrgToggle("team"); setOrgFilter(""); }}
                                            className={`px-3 py-1 text-sm rounded transition-colors ${
                                                orgToggle === "team"
                                                    ? "bg-blue-600 text-white"
                                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            }`}
                                        >
                                            Team
                                        </button>
                                        <button
                                            onClick={() => { setOrgToggle("cost_center"); setOrgFilter(""); }}
                                            className={`px-3 py-1 text-sm rounded transition-colors ${
                                                orgToggle === "cost_center"
                                                    ? "bg-blue-600 text-white"
                                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            }`}
                                        >
                                            Cost Center
                                        </button>
                                    </div>
                                </div>

                                {/* Organization Filter Dropdown */}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
                                    <select
                                        value={orgFilter}
                                        onChange={(e) => setOrgFilter(e.target.value)}
                                        className="border dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm
                                            bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                                            focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">All {orgToggle === "department" ? "Departments" : orgToggle === "team" ? "Teams" : "Cost Centers"}</option>
                                        {getOrgOptions().sort().map((opt) => (
                                            <option key={opt} value={opt}>
                                                {opt}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Wage Type Filter */}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Type:</span>
                                    <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
                                        <button
                                            onClick={() => setWageTypeFilter("all")}
                                            className={`px-3 py-1 text-sm rounded transition-colors ${
                                                wageTypeFilter === "all"
                                                    ? "bg-blue-600 text-white"
                                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            }`}
                                        >
                                            All
                                        </button>
                                        <button
                                            onClick={() => setWageTypeFilter("hourly")}
                                            className={`px-3 py-1 text-sm rounded transition-colors ${
                                                wageTypeFilter === "hourly"
                                                    ? "bg-blue-600 text-white"
                                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            }`}
                                        >
                                            Hourly
                                        </button>
                                        <button
                                            onClick={() => setWageTypeFilter("salary")}
                                            className={`px-3 py-1 text-sm rounded transition-colors ${
                                                wageTypeFilter === "salary"
                                                    ? "bg-blue-600 text-white"
                                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            }`}
                                        >
                                            Salary
                                        </button>
                                    </div>
                                </div>

                                {/* Sort By */}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort:</span>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        className="border dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm
                                            bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                                            focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="name">Name</option>
                                        <option value="employee_id">Employee ID</option>
                                        <option value="base_rate">Base/Hourly Rate</option>
                                        <option value="annual_rate">Annual/Salary Rate</option>
                                    </select>
                                    <button
                                        onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                                        className="px-2 py-1.5 text-sm border dark:border-gray-700 rounded-lg
                                            bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                                            hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        {sortOrder === "asc" ? "↑" : "↓"}
                                    </button>
                                </div>
                            </div>

                            {/* Compensation Table */}
                            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                <table className="w-full bg-white dark:bg-gray-800">
                                    <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-sm font-semibold">Employee ID</th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold">Position</th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold">Supervisor</th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold">
                                                {orgToggle === "department" ? "Department" : orgToggle === "team" ? "Team" : "Cost Center"}
                                            </th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold">Hourly Rate</th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold">Annual Wage</th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold">Benefits (Annual)</th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold">Employer Taxes</th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold">Total Compensation</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((emp) => {
                                            return (
                                                <tr
                                                    key={emp.employee_id}
                                                    className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition"
                                                    onClick={() => setSelectedEmployeeId(emp.employee_id)}
                                                >
                                                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300">
                                                        {emp.employee_id}
                                                    </td>
                                                    <td className="px-6 py-3 text-gray-900 dark:text-gray-100 font-medium">
                                                        {emp.full_name}
                                                    </td>
                                                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300">
                                                        {emp.position || "N/A"}
                                                    </td>
                                                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300">
                                                        {emp.supervisor || "N/A"}
                                                    </td>
                                                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300">
                                                        {orgToggle === "department"
                                                            ? emp.department || "N/A"
                                                            : orgToggle === "team"
                                                            ? emp.team || "N/A"
                                                            : emp.cost_center || "N/A"}
                                                    </td>

                                                    {/* Hourly Rate Column */}
                                                    <td className="px-6 py-3 text-gray-900 dark:text-gray-100 font-medium">
                                                        {emp.hourly_wage ? (
                                                            `$${emp.hourly_wage.toFixed(2)}`
                                                        ) : emp.wage ? (
                                                            `$${emp.wage.toFixed(2)}`
                                                        ) : (
                                                            "N/A"
                                                        )}
                                                    </td>

                                                    {/* Annual Wage Column */}
                                                    <td className="px-6 py-3 text-gray-900 dark:text-gray-100 font-medium">
                                                        {emp.annual_wage ? (
                                                            `$${emp.annual_wage.toLocaleString()}`
                                                        ) : emp.wage ? (
                                                            `$${emp.wage.toLocaleString()}`
                                                        ) : (
                                                            "N/A"
                                                        )}
                                                    </td>

                                                    {/* Benefits Cost Column */}
                                                    <td className="px-6 py-3 text-gray-900 dark:text-gray-100 font-medium">
                                                        {emp.benefits_cost_annual ? (
                                                            `$${emp.benefits_cost_annual.toLocaleString()}`
                                                        ) : (
                                                            "$0"
                                                        )}
                                                    </td>

                                                    {/* Employer Taxes Column */}
                                                    <td className="px-6 py-3 text-gray-900 dark:text-gray-100 font-medium">
                                                        {emp.employer_taxes_annual ? (
                                                            `$${emp.employer_taxes_annual.toLocaleString()}`
                                                        ) : (
                                                            "$0"
                                                        )}
                                                    </td>

                                                    {/* Total Compensation Column */}
                                                    <td className="px-6 py-3 text-gray-900 dark:text-gray-100 font-bold bg-blue-50 dark:bg-blue-900/20">
                                                        {(() => {
                                                            const total = emp.total_compensation || (
                                                                (emp.annual_wage || 0) +
                                                                (emp.benefits_cost_annual || 0) +
                                                                (emp.employer_taxes_annual || 0)
                                                            );
                                                            return total ? `$${total.toLocaleString()}` : "$0";
                                                        })()}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Benefits Drawer */}
            <EmployeeBenefitsDrawer
                employeeId={selectedEmployeeId}
                onClose={() => setSelectedEmployeeId(null)}
            />

            {/* Status Change Confirmation Modal */}
            <StatusChangeModal
                isOpen={showStatusModal}
                onClose={() => {
                    setShowStatusModal(false);
                    setStatusChangeEmployee(null);
                }}
                employee={statusChangeEmployee}
                changeType={statusChangeType}
                onConfirm={handleConfirmedStatusChange}
            />
        </div>
    );
}
