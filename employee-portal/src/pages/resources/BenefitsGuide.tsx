import { useEffect, useState } from 'react';
import { apiGet } from '@/utils/api';
import { Heart, Shield, PiggyBank, Umbrella, AlertCircle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEmployeeFeatures } from '@/contexts/EmployeeFeaturesContext';
import AuroraPageHeader from '@/components/bifrost/AuroraPageHeader';

interface BenefitPlan {
  id: number;
  name: string;
  type: string;
  description: string;
  coverage_details: string;
  employee_cost: string;
  employer_contribution: string;
  enrollment_info: string;
}

interface BenefitCategory {
  id: number;
  name: string;
  icon: string;
  description: string;
  plans: BenefitPlan[];
}

interface BenefitsGuideData {
  categories: BenefitCategory[];
  enrollment_period: {
    open: boolean;
    start_date: string | null;
    end_date: string | null;
  };
  contact_info: {
    email: string;
    phone: string;
  };
}

const iconMap: Record<string, React.ElementType> = {
  heart: Heart,
  shield: Shield,
  piggybank: PiggyBank,
  umbrella: Umbrella,
};

export default function BenefitsGuide() {
  const { viewMode } = useEmployeeFeatures();
  const [data, setData] = useState<BenefitsGuideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<number | null>(null);

  useEffect(() => {
    const fetchBenefitsGuide = async () => {
      try {
        setLoading(true);
        const result = await apiGet<BenefitsGuideData>('/portal/resources/benefits-guide');
        setData(result);
        if (result.categories.length > 0) {
          setExpandedCategory(result.categories[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load benefits guide');
      } finally {
        setLoading(false);
      }
    };

    fetchBenefitsGuide();
  }, []);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      {viewMode === 'bifrost' ? (
        <AuroraPageHeader
          title="Benefits Guide"
          subtitle="Learn about your benefits options and enrollment information"
        />
      ) : (
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Benefits Guide</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Learn about your benefits options and enrollment information
          </p>
        </div>
      )}

      {/* Enrollment Period Notice */}
      {data?.enrollment_period.open && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-6"
        >
          <div className="flex items-start gap-3">
            <Heart className="text-green-600 dark:text-green-400 mt-0.5" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-300">
                Open Enrollment is Active!
              </h3>
              <p className="text-green-700 dark:text-green-400 mt-1">
                You can make changes to your benefits from{' '}
                {data.enrollment_period.start_date && formatDate(data.enrollment_period.start_date)} to{' '}
                {data.enrollment_period.end_date && formatDate(data.enrollment_period.end_date)}.
              </p>
              <a
                href="/my-hr/benefits"
                className="inline-flex items-center gap-1 mt-3 text-green-700 dark:text-green-400 font-medium hover:underline"
              >
                View Your Benefits <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </motion.div>
      )}

      {/* Categories */}
      <div className="space-y-4">
        {data?.categories.map((category, index) => {
          const Icon = iconMap[category.icon] || Shield;
          const isExpanded = expandedCategory === category.id;

          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden"
            >
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Icon className="text-blue-600 dark:text-blue-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{category.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{category.description}</p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="text-gray-400" size={20} />
                ) : (
                  <ChevronDown className="text-gray-400" size={20} />
                )}
              </button>

              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="border-t border-gray-300 dark:border-gray-700"
                >
                  <div className="p-6 space-y-4">
                    {category.plans.map((plan) => {
                      const isPlanExpanded = expandedPlan === plan.id;

                      return (
                        <div
                          key={plan.id}
                          className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden"
                        >
                          <button
                            onClick={() => setExpandedPlan(isPlanExpanded ? null : plan.id)}
                            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">{plan.name}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{plan.type}</p>
                            </div>
                            {isPlanExpanded ? (
                              <ChevronUp className="text-gray-400" size={18} />
                            ) : (
                              <ChevronDown className="text-gray-400" size={18} />
                            )}
                          </button>

                          {isPlanExpanded && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="px-4 pb-4 space-y-4"
                            >
                              <p className="text-gray-700 dark:text-gray-300">{plan.description}</p>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                    Coverage Details
                                  </h5>
                                  <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {plan.coverage_details}
                                  </p>
                                </div>
                                <div>
                                  <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                    Cost
                                  </h5>
                                  <p className="text-sm text-gray-700 dark:text-gray-300">
                                    <span className="font-medium">Employee:</span> {plan.employee_cost}
                                  </p>
                                  <p className="text-sm text-green-600 dark:text-green-400">
                                    <span className="font-medium">Employer Contribution:</span>{' '}
                                    {plan.employer_contribution}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                  Enrollment Information
                                </h5>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {plan.enrollment_info}
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Contact Info */}
      {data?.contact_info && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Questions About Benefits?
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Contact the HR Benefits team for assistance with enrollment, claims, or general questions.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href={`mailto:${data.contact_info.email}`}
              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
            >
              {data.contact_info.email}
            </a>
            <span className="text-gray-400">|</span>
            <a
              href={`tel:${data.contact_info.phone}`}
              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
            >
              {data.contact_info.phone}
            </a>
          </div>
        </motion.div>
      )}
    </div>
  );
}
