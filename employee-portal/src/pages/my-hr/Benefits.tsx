import { useEffect, useState } from 'react';
import { apiGet } from '@/utils/api';
import { Heart, Shield, Stethoscope, Eye, Umbrella, DollarSign, AlertCircle, PiggyBank } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEmployeeFeatures } from '@/contexts/EmployeeFeaturesContext';
import MimirCTA from '@/components/bifrost/MimirCTA';

interface BenefitPlan {
  plan_name: string | null;
  tier: string | null;
  employee_cost: number | null;
  employer_cost: number | null;
}

interface RetirementInfo {
  plan_type: string | null;
  employee_contribution_pct: number | null;
  employee_contribution_amount: number | null;
  employer_match_pct: number | null;
  employer_match_amount: number | null;
  vesting_schedule: string | null;
  vested_pct: number | null;
}

interface FlexibleSpending {
  hsa_employee: number | null;
  hsa_employer: number | null;
  fsa: number | null;
  lfsa: number | null;
  dependent_care_fsa: number | null;
}

interface Insurance {
  life_coverage: number | null;
  life_employee_cost: number | null;
  life_employer_cost: number | null;
  std_enrolled: boolean;
  std_cost: number | null;
  ltd_enrolled: boolean;
  ltd_cost: number | null;
}

interface BenefitsData {
  medical: BenefitPlan;
  dental: BenefitPlan;
  vision: BenefitPlan;
  retirement: RetirementInfo;
  flexible_spending: FlexibleSpending;
  insurance: Insurance;
  other_benefits: string[];
  total_monthly_employee_cost: number;
  total_monthly_employer_cost: number;
}

export default function Benefits() {
  const { viewMode } = useEmployeeFeatures();
  const [data, setData] = useState<BenefitsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBenefits = async () => {
      try {
        setLoading(true);
        const result = await apiGet<BenefitsData>('/portal/my-hr/benefits');
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load benefits data');
      } finally {
        setLoading(false);
      }
    };

    fetchBenefits();
  }, []);

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-500" size={48} />
          <p className="text-gray-600 dark:text-gray-400 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  const BenefitCard = ({
    title,
    icon: Icon,
    plan,
    iconColor,
  }: {
    title: string;
    icon: React.ElementType;
    plan: BenefitPlan;
    iconColor: string;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${iconColor}`}>
          <Icon size={20} className="text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      {plan.plan_name ? (
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Plan</p>
            <p className="text-gray-900 dark:text-white font-medium">{plan.plan_name}</p>
          </div>
          {plan.tier && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Coverage</p>
              <p className="text-gray-900 dark:text-white">{plan.tier}</p>
            </div>
          )}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Your Cost</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {formatCurrency(plan.employee_cost)}/mo
              </span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-500 dark:text-gray-400">Employer Contribution</span>
              <span className="text-green-600 dark:text-green-400 font-medium">
                {formatCurrency(plan.employer_cost)}/mo
              </span>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400 text-sm">Not enrolled</p>
      )}
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Benefits</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          View your current benefits enrollment and coverage details
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white"
        >
          <div className="flex items-center gap-3">
            <DollarSign size={24} />
            <div>
              <p className="text-sm text-blue-100">Your Monthly Premium</p>
              <p className="text-3xl font-bold">{formatCurrency(data?.total_monthly_employee_cost || 0)}</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-sm p-6 text-white"
        >
          <div className="flex items-center gap-3">
            <Heart size={24} />
            <div>
              <p className="text-sm text-green-100">Employer Contribution</p>
              <p className="text-3xl font-bold">{formatCurrency(data?.total_monthly_employer_cost || 0)}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Mímir CTA */}
      {viewMode === 'bifrost' && (
        <MimirCTA
          title="Need help understanding your benefits?"
          description="Ask Mímir about plan comparisons, coverage details, enrollment deadlines, and more."
          buttonText="Ask Mímir about Benefits"
        />
      )}

      {/* Health Benefits */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Health Benefits</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BenefitCard
            title="Medical"
            icon={Stethoscope}
            plan={data?.medical || { plan_name: null, tier: null, employee_cost: null, employer_cost: null }}
            iconColor="bg-red-500"
          />
          <BenefitCard
            title="Dental"
            icon={Heart}
            plan={data?.dental || { plan_name: null, tier: null, employee_cost: null, employer_cost: null }}
            iconColor="bg-blue-500"
          />
          <BenefitCard
            title="Vision"
            icon={Eye}
            plan={data?.vision || { plan_name: null, tier: null, employee_cost: null, employer_cost: null }}
            iconColor="bg-purple-500"
          />
        </div>
      </div>

      {/* Retirement */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-yellow-500">
            <PiggyBank size={20} className="text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Retirement</h3>
        </div>
        {data?.retirement.plan_type ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Plan Type</p>
              <p className="text-gray-900 dark:text-white font-medium">{data.retirement.plan_type}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Your Contribution</p>
              <p className="text-gray-900 dark:text-white font-medium">
                {data.retirement.employee_contribution_pct
                  ? `${data.retirement.employee_contribution_pct}%`
                  : formatCurrency(data.retirement.employee_contribution_amount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employer Match</p>
              <p className="text-green-600 dark:text-green-400 font-medium">
                {data.retirement.employer_match_pct
                  ? `${data.retirement.employer_match_pct}%`
                  : formatCurrency(data.retirement.employer_match_amount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vesting Schedule</p>
              <p className="text-gray-900 dark:text-white">{data.retirement.vesting_schedule || 'Immediate'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Currently Vested</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${data.retirement.vested_pct || 0}%` }}
                  />
                </div>
                <span className="text-gray-900 dark:text-white font-medium">
                  {data.retirement.vested_pct || 0}%
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">Not enrolled in retirement plan</p>
        )}
      </motion.div>

      {/* Insurance & Other */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Insurance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-indigo-500">
              <Umbrella size={20} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Insurance</h3>
          </div>
          <div className="space-y-4">
            {data?.insurance.life_coverage && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <p className="text-gray-900 dark:text-white font-medium">Life Insurance</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Coverage: {formatCurrency(data.insurance.life_coverage)}
                  </p>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  {formatCurrency(data.insurance.life_employee_cost)}/mo
                </p>
              </div>
            )}
            {data?.insurance.std_enrolled && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <p className="text-gray-900 dark:text-white font-medium">Short-Term Disability</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Enrolled</p>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  {formatCurrency(data.insurance.std_cost)}/mo
                </p>
              </div>
            )}
            {data?.insurance.ltd_enrolled && (
              <div className="flex justify-between items-center py-2">
                <div>
                  <p className="text-gray-900 dark:text-white font-medium">Long-Term Disability</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Enrolled</p>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  {formatCurrency(data.insurance.ltd_cost)}/mo
                </p>
              </div>
            )}
            {!data?.insurance.life_coverage && !data?.insurance.std_enrolled && !data?.insurance.ltd_enrolled && (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No insurance coverage on file</p>
            )}
          </div>
        </motion.div>

        {/* Flexible Spending */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-teal-500">
              <Shield size={20} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Flexible Spending</h3>
          </div>
          <div className="space-y-4">
            {(data?.flexible_spending.hsa_employee || data?.flexible_spending.hsa_employer) && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <p className="text-gray-900 dark:text-white font-medium">HSA</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Health Savings Account</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-900 dark:text-white">
                    {formatCurrency(data.flexible_spending.hsa_employee)}/mo
                  </p>
                  {data.flexible_spending.hsa_employer && (
                    <p className="text-sm text-green-600 dark:text-green-400">
                      +{formatCurrency(data.flexible_spending.hsa_employer)} employer
                    </p>
                  )}
                </div>
              </div>
            )}
            {data?.flexible_spending.fsa && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <p className="text-gray-900 dark:text-white font-medium">FSA</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Flexible Spending Account</p>
                </div>
                <p className="text-gray-900 dark:text-white">{formatCurrency(data.flexible_spending.fsa)}/mo</p>
              </div>
            )}
            {data?.flexible_spending.dependent_care_fsa && (
              <div className="flex justify-between items-center py-2">
                <div>
                  <p className="text-gray-900 dark:text-white font-medium">Dependent Care FSA</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Child/Elder Care</p>
                </div>
                <p className="text-gray-900 dark:text-white">
                  {formatCurrency(data.flexible_spending.dependent_care_fsa)}/mo
                </p>
              </div>
            )}
            {!data?.flexible_spending.hsa_employee &&
              !data?.flexible_spending.hsa_employer &&
              !data?.flexible_spending.fsa &&
              !data?.flexible_spending.dependent_care_fsa && (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No flexible spending accounts on file
                </p>
              )}
          </div>
        </motion.div>
      </div>

      {/* Other Benefits */}
      {data?.other_benefits && data.other_benefits.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Other Benefits</h3>
          <div className="flex flex-wrap gap-2">
            {data.other_benefits.map((benefit, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
              >
                {benefit}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
