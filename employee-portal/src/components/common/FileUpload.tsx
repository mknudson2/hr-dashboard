import { useState, useCallback, useRef } from 'react';
import { Upload, X, FileText, Image, Table, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  files: File[];
}

const ACCEPTED_TYPES = {
  'application/pdf': { icon: FileText, label: 'PDF' },
  'application/msword': { icon: FileText, label: 'DOC' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: FileText, label: 'DOCX' },
  'application/vnd.ms-excel': { icon: Table, label: 'XLS' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: Table, label: 'XLSX' },
  'text/csv': { icon: Table, label: 'CSV' },
  'image/png': { icon: Image, label: 'PNG' },
  'image/jpeg': { icon: Image, label: 'JPG' },
};

export default function FileUpload({
  onFilesChange,
  maxFiles = 5,
  maxSizeMB = 10,
  acceptedTypes = Object.keys(ACCEPTED_TYPES),
  files,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `File type ${file.type || 'unknown'} is not supported`;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File ${file.name} exceeds ${maxSizeMB}MB limit`;
    }
    return null;
  }, [acceptedTypes, maxSizeMB]);

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    setError(null);

    const fileArray = Array.from(newFiles);

    if (files.length + fileArray.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const validFiles: File[] = [];
    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      validFiles.push(file);
    }

    onFilesChange([...files, ...validFiles]);
  }, [files, maxFiles, onFilesChange, validateFile]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFiles]);

  const removeFile = useCallback((index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    onFilesChange(newFiles);
  }, [files, onFilesChange]);

  const getFileIcon = (file: File) => {
    const config = ACCEPTED_TYPES[file.type as keyof typeof ACCEPTED_TYPES];
    if (config) {
      const Icon = config.icon;
      return <Icon size={16} />;
    }
    return <FileText size={16} />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all
          ${isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleInputChange}
          className="hidden"
        />
        <Upload className={`mx-auto mb-2 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} size={24} />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium text-blue-600 dark:text-blue-400">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          PDF, Word, Excel, CSV, PNG, JPG (max {maxSizeMB}MB each, up to {maxFiles} files)
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {files.map((file, index) => (
              <motion.div
                key={`${file.name}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="flex-shrink-0 text-gray-500 dark:text-gray-400">
                    {getFileIcon(file)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                >
                  <X size={16} />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
