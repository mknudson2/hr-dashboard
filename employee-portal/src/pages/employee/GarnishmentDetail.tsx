import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet, apiFetch } from '@/utils/api';
import {
  ArrowLeft,
  AlertCircle,
  Banknote,
  Download,
  FileText,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GarnishmentResponse {
  id: number;
  case_number: string;
  employee_id: string;
  employee_name: string;
  status: string;
  garnishment_type: string;
  agency_name: string;
  case_reference: string | null;
  received_date: string | null;
  start_date: string | null;
  end_date: string | null;
  total_amount: number;
  amount_paid: number;
  amount_remaining: number;
  deduction_type: string | null;
  deduction_amount: number | null;
  deduction_percentage: number | null;
  priority_order: number;
}

interface PaymentResponse {
  id: number;
  garnishment_id: number;
  payment_date: string | null;
  pay_period_start: string | null;
  pay_period_end: string | null;
  amount: number;
  check_number: string | null;
  gross_wages: number | null;
  pretax_deductions: number | null;
  taxes_withheld: number | null;
  disposable_income: number | null;
  notes: string | null;
  running_balance: number | null;
}

interface DocumentResponse {
  id: number;
  garnishment_id: number;
  document_type: string;
  document_name: string;
  uploaded_date: string | null;
  notes: string | null;
}

interface NoteResponse {
  id: number;
  garnishment_id: number;
  note_text: string;
  created_at: string | null;
}

interface GarnishmentDetailData {
  garnishment: GarnishmentResponse;
  recent_payments: PaymentResponse[];
  recent_documents: DocumentResponse[];
  recent_notes: NoteResponse[];
  payment_count: number;
  document_count: number;
  note_count: number;
}

interface PaymentListData {
  payments: PaymentResponse[];
  total_payments: number;
  total_paid: number;
}

interface CalculationBreakdown {
  payment_id: number;
  payment_date: string | null;
  pay_period_start: string | null;
  pay_period_end: string | null;
  gross_wages: number;
  pretax_deductions: number;
  taxes_withheld: number;
  disposable_income: number;
  ccpa_25_percent: number;
  ccpa_minimum_wage_calc: number;
  ccpa_limit: number;
  deduction_amount: number;
  balance_before: number;
  balance_after: number;
}

export default function GarnishmentDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<GarnishmentDetailData | null>(null);
  const [allPayments, setAllPayments] = useState<PaymentListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'payments' | 'documents' | 'notes'>('payments');
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<number | null>(null);
  const [calculation, setCalculation] = useState<CalculationBreakdown | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await apiGet<GarnishmentDetailData>(`/portal/garnishment/garnishment/${id}`);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load garnishment details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchAllPayments = async () => {
    if (allPayments) {
      setShowAllPayments(true);
      return;
    }
    try {
      const result = await apiGet<PaymentListData>(`/portal/garnishment/garnishment/${id}/payments`);
      setAllPayments(result);
      setShowAllPayments(true);
    } catch (err) {
      console.error('Failed to load all payments:', err);
    }
  };

  const fetchCalculation = async (paymentId: number) => {
    if (selectedPayment === paymentId) {
      setSelectedPayment(null);
      setCalculation(null);
      return;
    }
    try {
      setCalcLoading(true);
      setSelectedPayment(paymentId);
      const result = await apiGet<CalculationBreakdown>(
        `/portal/garnishment/garnishment/${id}/calculation/${paymentId}`
      );
      setCalculation(result);
    } catch (err) {
      console.error('Failed to load calculation:', err);
    } finally {
      setCalcLoading(false);
    }
  };

  const downloadCalculationPdf = async (paymentId: number) => {
    try {
      const response = await apiFetch(
        `/portal/garnishment/garnishment/${id}/download-calculation/${paymentId}`
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `calculation_${data?.garnishment.case_number}_${paymentId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to download calculation:', err);
    }
  };

  const downloadSummaryPdf = async () => {
    try {
      const response = await apiFetch(`/portal/garnishment/garnishment/${id}/download-summary`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `garnishment_summary_${data?.garnishment.case_number}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to download summary:', err);
    }
  };

  const downloadDocument = async (docId: number, docName: string) => {
    try {
      const response = await apiFetch(
        `/portal/garnishment/garnishment/${id}/document/${docId}/download`
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = docName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to download document:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400';
      case 'satisfied':
      case 'released':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
      case 'closed':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-500 mb-2" size={48} />
          <p className="text-gray-600 dark:text-gray-400">{error || 'Failed to load garnishment'}</p>
          <Link to="/my-garnishments" className="text-blue-600 hover:underline mt-2 inline-block">
            Back to My Garnishments
          </Link>
        </div>
      </div>
    );
  }

  const { garnishment } = data;
  const percentComplete = garnishment.total_amount > 0
    ? (garnishment.amount_paid / garnishment.total_amount) * 100
    : 0;

  const payments = showAllPayments && allPayments ? allPayments.payments : data.recent_payments;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/my-garnishments"
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="text-gray-600 dark:text-gray-400" size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{garnishment.case_number}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(garnishment.status)}`}>
              {garnishment.status}
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {garnishment.garnishment_type} - {garnishment.agency_name}
          </p>
        </div>
        <button
          onClick={downloadSummaryPdf}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download size={18} />
          Download Summary
        </button>
      </div>

      {/* Progress Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Progress</h3>
            <div className="mb-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">
                  {formatCurrency(garnishment.amount_paid)} paid
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {formatCurrency(garnishment.total_amount)} total
                </span>
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, percentComplete)}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={`h-full rounded-full ${percentComplete >= 100 ? 'bg-green-500' : 'bg-blue-600'}`}
                />
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {percentComplete.toFixed(1)}% complete - {formatCurrency(garnishment.amount_remaining)} remaining
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Amount</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(garnishment.total_amount)}</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Amount Paid</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(garnishment.amount_paid)}</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Remaining</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(garnishment.amount_remaining)}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Payments</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{data.payment_count}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Case Details */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Case Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Garnishment Type</p>
            <p className="font-medium text-gray-900 dark:text-white">{garnishment.garnishment_type}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Creditor/Agency</p>
            <p className="font-medium text-gray-900 dark:text-white">{garnishment.agency_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Case Reference</p>
            <p className="font-medium text-gray-900 dark:text-white">{garnishment.case_reference || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Start Date</p>
            <p className="font-medium text-gray-900 dark:text-white">{formatDate(garnishment.start_date)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">End Date</p>
            <p className="font-medium text-gray-900 dark:text-white">{formatDate(garnishment.end_date)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Deduction Method</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {garnishment.deduction_type}
              {garnishment.deduction_amount && ` - ${formatCurrency(garnishment.deduction_amount)}`}
              {garnishment.deduction_percentage && ` - ${garnishment.deduction_percentage}%`}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-300 dark:border-gray-700">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('payments')}
            className={`pb-4 px-1 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'payments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Banknote size={18} />
            Payments ({data.payment_count})
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`pb-4 px-1 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'documents'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <FileText size={18} />
            Documents ({data.document_count})
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`pb-4 px-1 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'notes'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <MessageSquare size={18} />
            Notes ({data.note_count})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <motion.div
            key="payments"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden"
          >
            {payments.length === 0 ? (
              <div className="p-12 text-center">
                <Banknote className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Payments Yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Payments will appear here once they are recorded.
                </p>
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Pay Period
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Balance
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {payments.map((payment) => (
                      <>
                        <tr
                          key={payment.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatDate(payment.payment_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(payment.pay_period_start)} - {formatDate(payment.pay_period_end)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                            {payment.running_balance !== null ? formatCurrency(payment.running_balance) : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => fetchCalculation(payment.id)}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                title="View calculation"
                              >
                                {selectedPayment === payment.id ? (
                                  <ChevronUp size={18} />
                                ) : (
                                  <ChevronDown size={18} />
                                )}
                              </button>
                              <button
                                onClick={() => downloadCalculationPdf(payment.id)}
                                className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                title="Download calculation PDF"
                              >
                                <Download size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {/* Expanded calculation view */}
                        {selectedPayment === payment.id && (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30">
                              {calcLoading ? (
                                <div className="flex items-center justify-center py-4">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                </div>
                              ) : calculation ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Gross Wages</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {formatCurrency(calculation.gross_wages)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Taxes Withheld</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {formatCurrency(calculation.taxes_withheld)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Disposable Income</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {formatCurrency(calculation.disposable_income)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">CCPA Limit (25%)</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {formatCurrency(calculation.ccpa_25_percent)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">CCPA Min Wage Calc</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {formatCurrency(calculation.ccpa_minimum_wage_calc)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Effective Limit</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {formatCurrency(calculation.ccpa_limit)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Deduction Amount</p>
                                    <p className="font-medium text-green-600">
                                      {formatCurrency(calculation.deduction_amount)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Balance After</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {formatCurrency(calculation.balance_after)}
                                    </p>
                                  </div>
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
                {!showAllPayments && data.payment_count > 5 && (
                  <div className="p-4 text-center border-t border-gray-300 dark:border-gray-700">
                    <button
                      onClick={fetchAllPayments}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    >
                      View all {data.payment_count} payments
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <motion.div
            key="documents"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
          >
            {data.recent_documents.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Documents</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Documents will appear here once they are uploaded by HR.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recent_documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <FileText className="text-blue-600 dark:text-blue-400" size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{doc.document_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {doc.document_type} - {formatDate(doc.uploaded_date)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => downloadDocument(doc.id, doc.document_name)}
                      className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                    >
                      <Download size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <motion.div
            key="notes"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
          >
            {data.recent_notes.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Notes</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Communication and notes from HR will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.recent_notes.map((note) => (
                  <div key={note.id} className="relative pl-6 pb-6 border-l-2 border-gray-300 dark:border-gray-700 last:pb-0">
                    <div className="absolute -left-2 top-0 w-4 h-4 bg-blue-600 rounded-full"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      {formatDate(note.created_at)}
                    </p>
                    <p className="text-gray-900 dark:text-white">{note.note_text}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
