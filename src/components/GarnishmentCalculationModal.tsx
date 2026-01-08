import { X, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface GarnishmentCalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  garnishmentId: number | null;
  garnishmentType: string;
  employeeName: string;
  currentBalance: number;
  onSuccess?: () => void;
}

export default function GarnishmentCalculationModal({
  isOpen,
  onClose,
  garnishmentId,
  garnishmentType,
  employeeName,
  currentBalance,
  onSuccess
}: GarnishmentCalculationModalProps) {
  const [formData, setFormData] = useState({
    pay_period_start: "",
    pay_period_end: "",
    payment_date: "",
    gross_wages: 0,
    pretax_deductions: 0,
    federal_tax: 0,
    state_tax: 0,
    fica_tax: 0,
    medicare_tax: 0,
    check_number: "",
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  // Calculate taxes withheld
  const taxes_withheld =
    formData.federal_tax +
    formData.state_tax +
    formData.fica_tax +
    formData.medicare_tax;

  // Calculate disposable income (wages after taxes and pre-tax deductions)
  const disposable_income =
    formData.gross_wages -
    formData.pretax_deductions -
    taxes_withheld;

  // Line 4(c): Total Deductions
  const total_deductions = taxes_withheld;

  // Line 4(d): Disposable earnings = Gross - Total Deductions
  const disposable_earnings = formData.gross_wages - total_deductions;

  // Line 4(e)(i): 25% of disposable earnings
  const twenty_five_percent = disposable_earnings * 0.25;

  // Line 4(e)(ii): Disposable earnings minus (federal minimum wage $7.25 x 30 x weeks in pay period)
  // For biweekly: disposable - ($7.25 x 30 x 2) = disposable - $435
  const federal_minimum_calculation = disposable_earnings - 435;

  // Line 4(f): Lesser of 4(e)(i) and 4(e)(ii)
  const ccpa_limit = Math.min(twenty_five_percent, federal_minimum_calculation);

  // Line 4(g): Amount of any other garnishment (assume 0 for now)
  const other_garnishments = 0;

  // Line 4(h): Line 4(f) minus Line 4(g)
  const after_other_garnishments = ccpa_limit - other_garnishments;

  // Line 4(i): Amount deducted for undisputed debt (assume 0)
  const undisputed_debt = 0;

  // Line 4(j): Line 4(h) minus Line 4(i)
  const maximum_withholding = after_other_garnishments - undisputed_debt;

  // Line 4(k): Balance owed on judgment (current balance)
  const balance_owed = currentBalance;

  // Line 4(l): Lesser of Line 4(j) and Line 4(k) - THIS IS THE AMOUNT TO WITHHOLD
  const recommended_deduction = Math.min(maximum_withholding, balance_owed);

  const [deduction_amount, setDeductionAmount] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!garnishmentId) {
      setError("Garnishment ID is required");
      return;
    }

    if (!formData.pay_period_start || !formData.pay_period_end || !formData.payment_date) {
      setError("All dates are required");
      return;
    }

    if (deduction_amount <= 0) {
      setError("Deduction amount must be greater than 0");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/garnishments/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          garnishment_id: garnishmentId,
          payment_date: formData.payment_date,
          pay_period_start: formData.pay_period_start,
          pay_period_end: formData.pay_period_end,
          amount: deduction_amount,
          check_number: formData.check_number || null,
          gross_wages: formData.gross_wages,
          pretax_deductions: formData.pretax_deductions,
          taxes_withheld: taxes_withheld,
          disposable_income: disposable_income,
          notes: formData.notes || null,
        }),
      });

      if (response.ok) {
        // Reset form
        setFormData({
          pay_period_start: "",
          pay_period_end: "",
          payment_date: "",
          gross_wages: 0,
          pretax_deductions: 0,
          federal_tax: 0,
          state_tax: 0,
          fica_tax: 0,
          medicare_tax: 0,
          check_number: "",
          notes: "",
        });
        setDeductionAmount(0);
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      } else {
        const data = await response.json();
        setError(data.detail || "Failed to add payment");
      }
    } catch (error) {
      setError("An error occurred while adding the payment");
      console.error("Error adding payment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleUseRecommended = () => {
    setDeductionAmount(Math.round(recommended_deduction * 100) / 100);
  };

  const handleExportPDF = async () => {
    if (!garnishmentId) {
      setError("Garnishment ID is required");
      return;
    }

    if (!formData.pay_period_start || !formData.pay_period_end || !formData.payment_date) {
      setError("All dates are required to export PDF");
      return;
    }

    if (deduction_amount <= 0) {
      setError("Deduction amount must be greater than 0");
      return;
    }

    setExporting(true);
    setError("");

    try {
      const response = await fetch("/garnishments/export-calculation-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          garnishment_id: garnishmentId,
          pay_period_start: formData.pay_period_start,
          pay_period_end: formData.pay_period_end,
          payment_date: formData.payment_date,
          gross_wages: formData.gross_wages,
          pretax_deductions: formData.pretax_deductions,
          federal_tax: formData.federal_tax,
          state_tax: formData.state_tax,
          fica_tax: formData.fica_tax,
          medicare_tax: formData.medicare_tax,
          deduction_amount: deduction_amount,
          check_number: formData.check_number || null,
          notes: formData.notes || null,
        }),
      });

      if (response.ok) {
        // Download the PDF
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Garnishment_Calculation_${formData.payment_date}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        setError(data.detail || "Failed to export PDF");
      }
    } catch (error) {
      setError("An error occurred while exporting the PDF");
      console.error("Error exporting PDF:", error);
    } finally {
      setExporting(false);
    }
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
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Garnishment Calculation
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {employeeName} • {garnishmentType}
                </p>
              </div>
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

              {/* Pay Period Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pay Period Information</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Pay Period Start <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.pay_period_start}
                      onChange={(e) => setFormData({ ...formData, pay_period_start: e.target.value })}
                      className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Pay Period End <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.pay_period_end}
                      onChange={(e) => setFormData({ ...formData, pay_period_end: e.target.value })}
                      className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Payment Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.payment_date}
                      onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                      className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Check Number
                  </label>
                  <input
                    type="text"
                    value={formData.check_number}
                    onChange={(e) => setFormData({ ...formData, check_number: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Wage Information */}
              <div className="space-y-4 border-t dark:border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Wage Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Gross Wages <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.gross_wages}
                      onChange={(e) => setFormData({ ...formData, gross_wages: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Pre-Tax Deductions
                    </label>
                    <input
                      type="number"
                      value={formData.pretax_deductions}
                      onChange={(e) => setFormData({ ...formData, pretax_deductions: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      401k, HSA, health insurance, etc.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tax Withholdings */}
              <div className="space-y-4 border-t dark:border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tax Withholdings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Federal Tax
                    </label>
                    <input
                      type="number"
                      value={formData.federal_tax}
                      onChange={(e) => setFormData({ ...formData, federal_tax: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      State Tax
                    </label>
                    <input
                      type="number"
                      value={formData.state_tax}
                      onChange={(e) => setFormData({ ...formData, state_tax: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Social Security (FICA)
                    </label>
                    <input
                      type="number"
                      value={formData.fica_tax}
                      onChange={(e) => setFormData({ ...formData, fica_tax: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Medicare
                    </label>
                    <input
                      type="number"
                      value={formData.medicare_tax}
                      onChange={(e) => setFormData({ ...formData, medicare_tax: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Calculation Summary - Following Excel Template */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 space-y-2">
                <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-300 mb-3">Garnishment Calculation (Following Court Format)</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300 text-xs">(4)(a) Gross earnings from all sources:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(formData.gross_wages)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300 text-xs">(4)(b)(i) Federal Income Tax (FITW):</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(formData.federal_tax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300 text-xs">(4)(b)(ii) State Income Tax (SITW):</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(formData.state_tax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300 text-xs">(4)(b)(iii) Social Security Tax (FICA):</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(formData.fica_tax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300 text-xs">(4)(b)(iv) Medicare Tax (FICA):</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(formData.medicare_tax)}</span>
                  </div>
                  <div className="flex justify-between border-t border-indigo-300 dark:border-indigo-700 pt-1">
                    <span className="text-gray-700 dark:text-gray-300 text-xs">(4)(c) Total Deductions:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(total_deductions)}</span>
                  </div>

                  <div className="flex justify-between bg-indigo-100 dark:bg-indigo-800 p-1 rounded">
                    <span className="text-indigo-900 dark:text-indigo-300 text-xs font-bold">(4)(d) Disposable Earnings (Line 4a minus Line 4c):</span>
                    <span className="font-bold text-indigo-900 dark:text-indigo-300">{formatCurrency(disposable_earnings)}</span>
                  </div>

                  <div className="flex justify-between pt-1">
                    <span className="text-gray-700 dark:text-gray-300 text-xs">(4)(e)(i) 25% of disposable earnings:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(twenty_five_percent)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300 text-xs">(4)(e)(ii) Disposable minus $435 (min wage calc):</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(federal_minimum_calculation)}</span>
                  </div>
                  <div className="flex justify-between border-t border-indigo-300 dark:border-indigo-700 pt-1">
                    <span className="text-gray-700 dark:text-gray-300 text-xs">(4)(f) Lesser of 4(e)(i) and 4(e)(ii):</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(ccpa_limit)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300 text-xs">(4)(g) Other garnishments:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(other_garnishments)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300 text-xs">(4)(h) Line 4(f) minus Line 4(g):</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(after_other_garnishments)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300 text-xs">(4)(i) Undisputed debt deduction:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(undisputed_debt)}</span>
                  </div>
                  <div className="flex justify-between border-t border-indigo-300 dark:border-indigo-700 pt-1">
                    <span className="text-gray-700 dark:text-gray-300 text-xs">(4)(j) Line 4(h) minus Line 4(i):</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(maximum_withholding)}</span>
                  </div>

                  <div className="flex justify-between bg-yellow-100 dark:bg-yellow-900 p-1 rounded">
                    <span className="text-yellow-900 dark:text-yellow-300 text-xs font-bold">(4)(k) Balance owed on judgment:</span>
                    <span className="font-bold text-yellow-900 dark:text-yellow-300">{formatCurrency(balance_owed)}</span>
                  </div>

                  <div className="flex justify-between bg-green-100 dark:bg-green-900 p-2 rounded mt-2">
                    <span className="text-green-900 dark:text-green-300 text-sm font-bold">(4)(l) Amount to be withheld (Lesser of 4j and 4k):</span>
                    <span className="font-bold text-green-900 dark:text-green-300 text-lg">{formatCurrency(recommended_deduction)}</span>
                  </div>
                </div>
              </div>

              {/* Deduction Amount */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Deduction Amount <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={deduction_amount}
                    onChange={(e) => setDeductionAmount(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="flex-1 px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleUseRecommended}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    Use Recommended
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Enter the actual amount to withhold for this pay period
                </p>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes about this payment..."
                  rows={3}
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
                  type="button"
                  onClick={handleExportPDF}
                  disabled={exporting}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
                >
                  <Download className="w-4 h-4" />
                  {exporting ? "Exporting..." : "Export PDF"}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
                >
                  {submitting ? "Adding Payment..." : "Add Payment"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
