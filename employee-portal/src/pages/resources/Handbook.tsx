import { useEffect, useState } from 'react';
import { apiGet } from '@/utils/api';
import { BookOpen, ChevronRight, Search, AlertCircle, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import DOMPurify from 'dompurify';

interface HandbookSection {
  id: number;
  title: string;
  content: string;
  order: number;
}

interface HandbookChapter {
  id: number;
  title: string;
  order: number;
  sections: HandbookSection[];
}

interface HandbookData {
  title: string;
  version: string;
  last_updated: string;
  chapters: HandbookChapter[];
  download_url: string | null;
}

export default function Handbook() {
  const [data, setData] = useState<HandbookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);

  useEffect(() => {
    const fetchHandbook = async () => {
      try {
        setLoading(true);
        const result = await apiGet<HandbookData>('/portal/resources/handbook');
        setData(result);
        if (result.chapters.length > 0) {
          setSelectedChapter(result.chapters[0].id);
          if (result.chapters[0].sections.length > 0) {
            setSelectedSection(result.chapters[0].sections[0].id);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load handbook');
      } finally {
        setLoading(false);
      }
    };

    fetchHandbook();
  }, []);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getCurrentSection = () => {
    if (!data || !selectedChapter || !selectedSection) return null;
    const chapter = data.chapters.find((c) => c.id === selectedChapter);
    if (!chapter) return null;
    return chapter.sections.find((s) => s.id === selectedSection);
  };

  const filteredChapters = data?.chapters.filter((chapter) => {
    if (!searchQuery) return true;
    const matchesChapter = chapter.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSection = chapter.sections.some(
      (section) =>
        section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchesChapter || matchesSection;
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

  const currentSection = getCurrentSection();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Handbook</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Version {data?.version} • Last updated {data?.last_updated && formatDate(data.last_updated)}
          </p>
        </div>
        {data?.download_url && (
          <a
            href={data.download_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download size={18} />
            Download PDF
          </a>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          size={20}
        />
        <input
          type="text"
          placeholder="Search the handbook..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Table of Contents */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4 h-fit lg:sticky lg:top-4"
        >
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            Contents
          </h3>
          <nav className="space-y-2">
            {filteredChapters?.map((chapter) => (
              <div key={chapter.id}>
                <button
                  onClick={() => {
                    setSelectedChapter(chapter.id);
                    if (chapter.sections.length > 0) {
                      setSelectedSection(chapter.sections[0].id);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    selectedChapter === chapter.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="font-medium text-sm">{chapter.title}</span>
                  <ChevronRight
                    size={16}
                    className={`transition-transform ${selectedChapter === chapter.id ? 'rotate-90' : ''}`}
                  />
                </button>
                {selectedChapter === chapter.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="ml-4 mt-1 space-y-1"
                  >
                    {chapter.sections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => setSelectedSection(section.id)}
                        className={`w-full px-3 py-1.5 rounded text-left text-sm transition-colors ${
                          selectedSection === section.id
                            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        {section.title}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
            ))}
          </nav>
        </motion.div>

        {/* Content Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-8"
        >
          {currentSection ? (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <BookOpen className="text-blue-600 dark:text-blue-400" size={24} />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{currentSection.title}</h2>
              </div>
              <div
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentSection.content) }}
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="mx-auto text-gray-400" size={48} />
              <p className="text-gray-500 dark:text-gray-400 mt-4">
                Select a section from the table of contents to view its content.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
