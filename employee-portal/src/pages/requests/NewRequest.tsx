import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Calendar, Shield, FileText, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface RequestType {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  path: string;
}

const requestTypes: RequestType[] = [
  {
    id: 'fmla',
    title: 'FMLA Leave',
    description: 'Request leave under the Family and Medical Leave Act for qualifying medical or family reasons.',
    icon: Briefcase,
    color: 'bg-blue-500',
    path: '/requests/fmla/new',
  },
  {
    id: 'pto',
    title: 'PTO / Time Off',
    description: 'Request vacation, sick leave, or personal time off.',
    icon: Calendar,
    color: 'bg-green-500',
    path: '/requests/pto',
  },
  {
    id: 'accommodation',
    title: 'Workplace Accommodation',
    description: 'Request a workplace accommodation under the ADA or for other qualifying needs.',
    icon: Shield,
    color: 'bg-purple-500',
    path: '/requests/accommodation',
  },
  {
    id: 'other',
    title: 'Other HR Request',
    description: 'Submit a general HR request or question that doesn\'t fit other categories.',
    icon: FileText,
    color: 'bg-gray-500',
    path: '/requests/other',
  },
];

export default function NewRequest() {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const handleSelectType = (type: RequestType) => {
    if (type.path !== '#') {
      navigate(type.path);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Request</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Select the type of request you'd like to submit
        </p>
      </div>

      {/* Request Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {requestTypes.map((type, index) => {
          const Icon = type.icon;
          const isDisabled = type.path === '#';

          return (
            <motion.button
              key={type.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleSelectType(type)}
              onMouseEnter={() => setHoveredCard(type.id)}
              onMouseLeave={() => setHoveredCard(null)}
              disabled={isDisabled}
              className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6 text-left transition-all duration-200 ${
                isDisabled
                  ? 'opacity-60 cursor-not-allowed'
                  : 'hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer'
              }`}
            >
              {isDisabled && (
                <span className="absolute top-4 right-4 text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">
                  Coming Soon
                </span>
              )}
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${type.color}`}>
                  <Icon className="text-white" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{type.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{type.description}</p>
                </div>
                {!isDisabled && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{
                      opacity: hoveredCard === type.id ? 1 : 0,
                      x: hoveredCard === type.id ? 0 : -10,
                    }}
                    className="self-center"
                  >
                    <ArrowRight className="text-blue-600 dark:text-blue-400" size={20} />
                  </motion.div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Help Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">Need Help?</h3>
        <p className="text-blue-700 dark:text-blue-400 text-sm">
          If you're not sure which type of request to submit, or if you have questions about your benefits
          and leave options, please contact HR at{' '}
          <a href="mailto:hr@company.com" className="underline font-medium">
            hr@company.com
          </a>{' '}
          or visit the{' '}
          <a href="/resources/faqs" className="underline font-medium">
            FAQs
          </a>{' '}
          section.
        </p>
      </motion.div>
    </div>
  );
}
