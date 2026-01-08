import { X, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface Employee {
  employee_id: string;
  first_name: string;
  last_name: string;
  department: string;
  team: string;
}

interface NewGarnishmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewGarnishmentModal({ isOpen, onClose, onSuccess }: NewGarnishmentModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  const [formData, setFormData] = useState({
    garnishment_type: "Child Support",
    agency_name: "",
    agency_address: "",
    agency_phone: "",
    agency_fax: "",
    agency_email: "",
    case_reference: "",
    received_date: "",
    start_date: "",
    end_date: "",
    total_amount: 0,
    deduction_type: "Fixed Amount",
    deduction_amount: 0,
    deduction_percentage: 0,
    priority_order: 1,
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
    }
  }, [isOpen]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/analytics/employees");
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const filteredEmployees = employees.filter((emp) =>
    `${emp.first_name} ${emp.last_name} ${emp.employee_id}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedEmployee) {
      setError("Please select an employee");
      return;
    }

    if (!formData.agency_name) {
      setError("Agency name is required");
      return;
    }

    if (!formData.received_date || !formData.start_date) {
      setError("Received date and start date are required");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/garnishments/cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee_id: selectedEmployee.employee_id,
          garnishment_type: formData.garnishment_type,
          agency_name: formData.agency_name,
          agency_address: formData.agency_address || null,
          agency_phone: formData.agency_phone || null,
          agency_fax: formData.agency_fax || null,
          agency_email: formData.agency_email || null,
          case_reference: formData.case_reference || null,
          received_date: formData.received_date,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          total_amount: formData.total_amount,
          deduction_type: formData.deduction_type,
          deduction_amount: formData.deduction_type === "Fixed Amount" ? formData.deduction_amount : null,
          deduction_percentage: formData.deduction_type === "Percentage" ? formData.deduction_percentage : null,
          priority_order: formData.priority_order,
          notes: formData.notes || null,
        }),
      });

      if (response.ok) {
        // Reset form
        setFormData({
          garnishment_type: "Child Support",
          agency_name: "",
          agency_address: "",
          agency_phone: "",
          agency_fax: "",
          agency_email: "",
          case_reference: "",
          received_date: "",
          start_date: "",
          end_date: "",
          total_amount: 0,
          deduction_type: "Fixed Amount",
          deduction_amount: 0,
          deduction_percentage: 0,
          priority_order: 1,
          notes: "",
        });
        setSelectedEmployee(null);
        setSearchQuery("");
        onSuccess();
        onClose();
      } else {
        const data = await response.json();
        setError(data.detail || "Failed to create garnishment");
      }
    } catch (error) {
      setError("An error occurred while creating the garnishment");
      console.error("Error creating garnishment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    setSearchQuery(`${emp.first_name} ${emp.last_name} (${emp.employee_id})`);
    setShowEmployeeDropdown(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                New Garnishment Case
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Employee Search */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Employee <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowEmployeeDropdown(true);
                        if (!e.target.value) setSelectedEmployee(null);
                      }}
                      onFocus={() => setShowEmployeeDropdown(true)}
                      placeholder="Search by name or employee ID..."
                      className="w-full pl-10 pr-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  {/* Employee Dropdown */}
                  {showEmployeeDropdown && searchQuery && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredEmployees.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                          No employees found
                        </div>
                      ) : (
                        filteredEmployees.map((emp) => (
                          <button
                            key={emp.employee_id}
                            type="button"
                            onClick={() => handleSelectEmployee(emp)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b dark:border-gray-700 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900 dark:text-white">
                              {emp.first_name} {emp.last_name}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {emp.employee_id} • {emp.department} • {emp.team}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Garnishment Type and Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Garnishment Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.garnishment_type}
                    onChange={(e) => setFormData({ ...formData, garnishment_type: e.target.value })}
                    className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  >
                    <option value="Child Support">Child Support</option>
                    <option value="Tax Levy">Tax Levy</option>
                    <option value="Creditor">Creditor Garnishment</option>
                    <option value="Student Loan">Student Loan</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Priority Order
                  </label>
                  <input
                    type="number"
                    value={formData.priority_order}
                    onChange={(e) => setFormData({ ...formData, priority_order: parseInt(e.target.value) })}
                    min="1"
                    className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Lower numbers = higher priority
                  </p>
                </div>
              </div>

              {/* Agency Information */}
              <div className="border-t dark:border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Agency Information</h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Agency Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.agency_name}
                      onChange={(e) => setFormData({ ...formData, agency_name: e.target.value })}
                      placeholder="e.g., County Child Support Services"
                      className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Address
                    </label>
                    <textarea
                      value={formData.agency_address}
                      onChange={(e) => setFormData({ ...formData, agency_address: e.target.value })}
                      placeholder="Agency mailing address"
                      rows={2}
                      className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.agency_phone}
                        onChange={(e) => setFormData({ ...formData, agency_phone: e.target.value })}
                        placeholder="(555) 555-5555"
                        className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Fax
                      </label>
                      <input
                        type="tel"
                        value={formData.agency_fax}
                        onChange={(e) => setFormData({ ...formData, agency_fax: e.target.value })}
                        placeholder="(555) 555-5555"
                        className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.agency_email}
                        onChange={(e) => setFormData({ ...formData, agency_email: e.target.value })}
                        placeholder="agency@example.com"
                        className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Case/Reference Number
                      </label>
                      <input
                        type="text"
                        value={formData.case_reference}
                        onChange={(e) => setFormData({ ...formData, case_reference: e.target.value })}
                        placeholder="Agency's case number"
                        className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="border-t dark:border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Important Dates</h3>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Received Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.received_date}
                      onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
                      className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      End Date (if known)
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div className="border-t dark:border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Financial Details</h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Total Amount
                    </label>
                    <input
                      type="number"
                      value={formData.total_amount}
                      onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) })}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Total amount of garnishment (if known). Can be 0 for ongoing garnishments.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Deduction Type
                    </label>
                    <select
                      value={formData.deduction_type}
                      onChange={(e) => setFormData({ ...formData, deduction_type: e.target.value })}
                      className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="Fixed Amount">Fixed Amount</option>
                      <option value="Percentage">Percentage of Disposable Income</option>
                      <option value="CCPA Calculation">CCPA Calculation</option>
                    </select>
                  </div>

                  {formData.deduction_type === "Fixed Amount" && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Deduction Amount (per pay period)
                      </label>
                      <input
                        type="number"
                        value={formData.deduction_amount}
                        onChange={(e) => setFormData({ ...formData, deduction_amount: parseFloat(e.target.value) })}
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  )}

                  {formData.deduction_type === "Percentage" && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Deduction Percentage
                      </label>
                      <input
                        type="number"
                        value={formData.deduction_percentage}
                        onChange={(e) => setFormData({ ...formData, deduction_percentage: parseFloat(e.target.value) })}
                        min="0"
                        max="100"
                        step="0.1"
                        className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Percentage of disposable income to withhold
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Initial Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any initial notes about this garnishment..."
                  rows={4}
                  className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedEmployee}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
                >
                  {submitting ? "Creating..." : "Create Garnishment"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
