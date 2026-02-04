import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronUp,
  Home,
  Monitor,
  FileText,
  Download,
  HardDrive,
  RefreshCw,
  Check
} from 'lucide-react';

const API_URL = '';

interface Directory {
  name: string;
  path: string;
  is_dir: boolean;
}

interface CommonDirectory {
  name: string;
  path: string;
  icon: string;
}

interface FolderPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  currentPath?: string;
}

export default function FolderPickerModal({
  isOpen,
  onClose,
  onSelect,
  currentPath = ''
}: FolderPickerModalProps) {
  const [currentDirectory, setCurrentDirectory] = useState(currentPath || '');
  const [parentDirectory, setParentDirectory] = useState<string | null>(null);
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [commonDirectories, setCommonDirectories] = useState<CommonDirectory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load common directories on mount
  useEffect(() => {
    if (isOpen) {
      loadCommonDirectories();
      if (currentPath) {
        browseDirectory(currentPath);
      } else {
        browseDirectory(); // Load default directory
      }
    }
  }, [isOpen, currentPath]);

  const loadCommonDirectories = async () => {
    try {
      const response = await fetch(`${API_URL}/settings/common-directories`);
      if (response.ok) {
        const data = await response.json();
        setCommonDirectories(data.directories || []);
      }
    } catch (err) {
      console.error('Failed to load common directories:', err);
    }
  };

  const browseDirectory = async (path?: string) => {
    setLoading(true);
    setError(null);

    try {
      const url = path
        ? `${API_URL}/settings/browse-directories?path=${encodeURIComponent(path)}`
        : `${API_URL}/settings/browse-directories`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to browse directory');
      }

      const data = await response.json();
      setCurrentDirectory(data.current_path);
      setParentDirectory(data.parent_path);
      setDirectories(data.directories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to browse directory');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    onSelect(currentDirectory);
    onClose();
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'home': return <Home className="w-4 h-4" />;
      case 'monitor': return <Monitor className="w-4 h-4" />;
      case 'file-text': return <FileText className="w-4 h-4" />;
      case 'download': return <Download className="w-4 h-4" />;
      case 'hard-drive': return <HardDrive className="w-4 h-4" />;
      default: return <Folder className="w-4 h-4" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <FolderOpen className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Select Folder
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Quick Access */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">QUICK ACCESS</p>
              <div className="flex flex-wrap gap-2">
                {commonDirectories.map((dir) => (
                  <button
                    key={dir.path}
                    onClick={() => browseDirectory(dir.path)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      currentDirectory === dir.path
                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {getIcon(dir.icon)}
                    {dir.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Path */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Path:</span>
                <code className="flex-1 text-sm bg-gray-100 dark:bg-gray-900 px-3 py-1.5 rounded-lg text-gray-800 dark:text-gray-200 overflow-x-auto">
                  {currentDirectory || 'Loading...'}
                </code>
                <button
                  onClick={() => browseDirectory(currentDirectory)}
                  disabled={loading}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Directory Browser */}
            <div className="flex-1 overflow-y-auto p-4">
              {error ? (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Parent Directory */}
                  {parentDirectory && (
                    <button
                      onClick={() => browseDirectory(parentDirectory)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                    >
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400 font-medium">..</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">Parent folder</span>
                    </button>
                  )}

                  {/* Subdirectories */}
                  {directories.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No subfolders in this directory</p>
                    </div>
                  ) : (
                    directories.map((dir) => (
                      <button
                        key={dir.path}
                        onClick={() => browseDirectory(dir.path)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left group"
                      >
                        <Folder className="w-5 h-5 text-orange-500" />
                        <span className="flex-1 text-gray-900 dark:text-gray-100 font-medium truncate">
                          {dir.name}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Selected: <span className="font-medium text-gray-700 dark:text-gray-300">{currentDirectory}</span>
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSelect}
                    disabled={!currentDirectory}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4" />
                    Select This Folder
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
