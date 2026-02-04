import { useEffect, useState } from 'react';
import { apiGet } from '@/utils/api';
import { FileText, Download, Calendar, Search, Filter, AlertCircle, FolderOpen } from 'lucide-react';
import { motion } from 'framer-motion';

interface Document {
  id: number;
  name: string;
  type: string; // pay_stub, w2, offer_letter, benefits_summary, tax_form, other
  category: string;
  date: string;
  size: string;
  downloadUrl: string;
}

interface DocumentsData {
  documents: Document[];
  categories: string[];
}

export default function Documents() {
  const [data, setData] = useState<DocumentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [downloading, setDownloading] = useState<number | null>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const result = await apiGet<DocumentsData>('/portal/my-hr/documents');
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load documents');
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const handleDownload = async (doc: Document) => {
    try {
      setDownloading(doc.id);
      // In a real implementation, this would fetch and download the file
      window.open(doc.downloadUrl, '_blank');
    } finally {
      setDownloading(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'pay_stub':
        return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
      case 'w2':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
      case 'offer_letter':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
      case 'benefits_summary':
        return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
      case 'tax_form':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    }
  };

  const filteredDocuments = data?.documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documents</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Access your pay stubs, tax forms, and other HR documents
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Filter
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
          >
            <option value="all">All Categories</option>
            {data?.categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Document List */}
      {filteredDocuments && filteredDocuments.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden"
        >
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredDocuments.map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${getDocumentIcon(doc.type)}`}>
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{doc.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(doc.date)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{doc.size}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                        {doc.category}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(doc)}
                  disabled={downloading === doc.id}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Download size={18} />
                  {downloading === doc.id ? 'Downloading...' : 'Download'}
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-12 text-center"
        >
          <FolderOpen className="mx-auto text-gray-400" size={48} />
          <p className="text-gray-600 dark:text-gray-400 mt-4">
            {searchQuery || selectedCategory !== 'all'
              ? 'No documents match your search criteria.'
              : 'No documents available.'}
          </p>
        </motion.div>
      )}

      {/* Document Categories Legend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4"
      >
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Document Types</p>
        <div className="flex flex-wrap gap-3">
          <span className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            Pay Stubs
          </span>
          <span className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            W-2 Forms
          </span>
          <span className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full bg-purple-500"></span>
            Offer Letters
          </span>
          <span className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            Benefits
          </span>
          <span className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            Tax Forms
          </span>
        </div>
      </motion.div>
    </div>
  );
}
