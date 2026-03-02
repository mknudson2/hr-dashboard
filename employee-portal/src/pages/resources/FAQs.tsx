import { useEffect, useState } from 'react';
import { apiGet } from '@/utils/api';
import { HelpCircle, Search, ChevronDown, ChevronUp, AlertCircle, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';
import { useEmployeeFeatures } from '@/contexts/EmployeeFeaturesContext';
import MimirCTA from '@/components/bifrost/MimirCTA';
import AuroraPageHeader from '@/components/bifrost/AuroraPageHeader';

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  tags: string[];
}

interface FAQsData {
  faqs: FAQ[];
  categories: string[];
}

export default function FAQs() {
  const { viewMode } = useEmployeeFeatures();
  const [data, setData] = useState<FAQsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        setLoading(true);
        const result = await apiGet<FAQsData>('/portal/resources/faqs');
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load FAQs');
      } finally {
        setLoading(false);
      }
    };

    fetchFAQs();
  }, []);

  const filteredFAQs = data?.faqs.filter((faq) => {
    const matchesSearch =
      !searchQuery ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
          title="Frequently Asked Questions"
          subtitle="Find answers to common HR questions"
        />
      ) : (
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Frequently Asked Questions</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Find answers to common HR questions
          </p>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All
          </button>
          {data?.categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredFAQs && filteredFAQs.length > 0 ? (
            filteredFAQs.map((faq, index) => {
              const isExpanded = expandedFaq === faq.id;

              return (
                <motion.div
                  key={faq.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFaq(isExpanded ? null : faq.id)}
                    className="w-full flex items-start justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <HelpCircle
                        className={`mt-0.5 ${
                          isExpanded
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-400'
                        }`}
                        size={20}
                      />
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white pr-4">{faq.question}</h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 inline-block">
                          {faq.category}
                        </span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="text-gray-400 flex-shrink-0" size={20} />
                    ) : (
                      <ChevronDown className="text-gray-400 flex-shrink-0" size={20} />
                    )}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-gray-300 dark:border-gray-700"
                      >
                        <div className="p-4 pl-12">
                          <div
                            className="text-gray-700 dark:text-gray-300 prose dark:prose-invert max-w-none text-sm"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(faq.answer) }}
                          />
                          {faq.tags.length > 0 && (
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                              <Tag className="text-gray-400" size={14} />
                              <div className="flex flex-wrap gap-1">
                                {faq.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-12 text-center"
            >
              <HelpCircle className="mx-auto text-gray-400" size={48} />
              <p className="text-gray-600 dark:text-gray-400 mt-4">
                No FAQs match your search criteria.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mímir CTA */}
      {viewMode === 'bifrost' && (
        <MimirCTA
          title="Have a question not listed here?"
          description="Mímir can answer HR questions instantly — from leave policies to benefits enrollment and everything in between."
          buttonText="Ask Mímir a Question"
        />
      )}

      {/* Contact Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
          Can't find what you're looking for?
        </h3>
        <p className="text-blue-700 dark:text-blue-400">
          Contact HR at{' '}
          <a href="mailto:hr@company.com" className="underline font-medium">
            hr@company.com
          </a>{' '}
          and we'll be happy to help.
        </p>
      </motion.div>
    </div>
  );
}
