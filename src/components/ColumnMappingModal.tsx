import { useState, useEffect, useMemo } from "react";
import {
  X,
  ArrowRight,
  Check,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Download,
  RefreshCw,
} from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface FieldDefinition {
  db_field: string;
  display_name: string;
  description: string;
  category: string;
  data_type: string;
  required: boolean;
  example: string;
}

interface ColumnMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: number;
  fileName: string;
  onImportComplete: () => void;
}

interface DetectedMappingData {
  file_id: number;
  file_category: string | null;
  detected_columns: string[];
  row_count: number;
  sample_data: Record<string, unknown>[];
  suggested_mappings: Record<string, string>;
  unmapped_columns: string[];
  is_valid: boolean;
  validation_warnings: string[];
  available_fields: Record<string, FieldDefinition[]>;
}

const CATEGORY_LABELS: Record<string, string> = {
  required: "Required",
  identity: "Identity",
  employment: "Employment",
  compensation: "Compensation",
  benefits_health: "Health Benefits",
  benefits_retirement: "Retirement Benefits",
  benefits_other: "Other Benefits",
  personal: "Personal Info",
  eeo: "EEO Data",
};

const CATEGORY_COLORS: Record<string, string> = {
  required: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  identity: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  employment: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  compensation: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  benefits_health: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  benefits_retirement: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  benefits_other: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  personal: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  eeo: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function ColumnMappingModal({
  isOpen,
  onClose,
  fileId,
  fileName,
  onImportComplete,
}: ColumnMappingModalProps) {
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DetectedMappingData | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["required", "identity", "employment"])
  );
  const [showPreview, setShowPreview] = useState(true);
  const [importResult, setImportResult] = useState<{
    status: string;
    imported: number;
    updated: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  // Load mapping data when modal opens
  useEffect(() => {
    if (isOpen && fileId) {
      loadMappingData();
    }
  }, [isOpen, fileId]);

  const loadMappingData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BASE_URL}/file-uploads/${fileId}/detect-mappings`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to detect column mappings");
      }

      const result = await response.json();
      setData(result);
      setMappings(result.suggested_mappings || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load mapping data");
    } finally {
      setLoading(false);
    }
  };

  // Get all available fields as a flat list
  const allFields = useMemo(() => {
    if (!data?.available_fields) return [];

    const fields: FieldDefinition[] = [];
    Object.values(data.available_fields).forEach((categoryFields) => {
      fields.push(...categoryFields);
    });
    return fields;
  }, [data]);

  // Get mapped and unmapped info
  const mappingStats = useMemo(() => {
    if (!data) return { mapped: 0, unmapped: 0, required_missing: false };

    const mappedColumns = Object.keys(mappings).filter((k) => mappings[k]);
    const mappedFields = new Set(Object.values(mappings).filter(Boolean));

    // Check if employee_id is mapped
    const requiredMissing = !mappedFields.has("employee_id");

    return {
      mapped: mappedColumns.length,
      unmapped: data.detected_columns.length - mappedColumns.length,
      required_missing: requiredMissing,
    };
  }, [data, mappings]);

  const handleMappingChange = (sourceColumn: string, targetField: string) => {
    setMappings((prev) => ({
      ...prev,
      [sourceColumn]: targetField,
    }));
  };

  const handleClearMapping = (sourceColumn: string) => {
    setMappings((prev) => {
      const updated = { ...prev };
      delete updated[sourceColumn];
      return updated;
    });
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const updated = new Set(prev);
      if (updated.has(category)) {
        updated.delete(category);
      } else {
        updated.add(category);
      }
      return updated;
    });
  };

  const handleImport = async (dryRun: boolean = false) => {
    setImporting(true);
    setError(null);
    setImportResult(null);

    try {
      const response = await fetch(`${BASE_URL}/file-uploads/${fileId}/import-with-mappings`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          column_mappings: mappings,
          file_category: data?.file_category || null,
          dry_run: dryRun,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Import failed");
      }

      const result = await response.json();
      setImportResult(result);

      if (!dryRun && result.status === "success") {
        // Wait a moment then close and refresh
        setTimeout(() => {
          onImportComplete();
          onClose();
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const getFieldForColumn = (column: string): FieldDefinition | undefined => {
    const targetField = mappings[column];
    if (!targetField) return undefined;
    return allFields.find((f) => f.db_field === targetField);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Column Mapping
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Map columns from <span className="font-medium">{fileName}</span> to database fields
            </p>
            {data?.file_category && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                data.file_category === "compensation_history"
                  ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              }`}>
                {data.file_category === "compensation_history" ? "Compensation History Import" :
                 data.file_category === "employment_list" ? "Employee Data Import" :
                 data.file_category.replace(/_/g, " ")}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600 dark:text-gray-300">Analyzing file...</span>
            </div>
          ) : error && !data ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <button
                  onClick={loadMappingData}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : data ? (
            <>
              {/* Left Panel - Source Columns */}
              <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      File Columns ({data.detected_columns.length})
                    </h3>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-600 dark:text-green-400">
                        {mappingStats.mapped} mapped
                      </span>
                      <span className="text-gray-400">|</span>
                      <span className="text-gray-500">
                        {mappingStats.unmapped} unmapped
                      </span>
                    </div>
                  </div>

                  {/* Mapping status alert */}
                  {mappingStats.required_missing && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Required field "Employee ID" is not mapped
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Column list */}
                  <div className="space-y-2">
                    {data.detected_columns.map((column) => {
                      const mappedField = getFieldForColumn(column);
                      const isMapped = !!mappings[column];

                      return (
                        <div
                          key={column}
                          className={`p-3 rounded-lg border ${
                            isMapped
                              ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                              : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Source column name */}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 dark:text-white truncate">
                                {column}
                              </div>
                              {data.sample_data[0] && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                  e.g., "{String(data.sample_data[0][column] || "")}"
                                </div>
                              )}
                            </div>

                            {/* Arrow */}
                            <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />

                            {/* Target field selector */}
                            <div className="flex-1 min-w-0">
                              <select
                                value={mappings[column] || ""}
                                onChange={(e) => handleMappingChange(column, e.target.value)}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="">-- Skip this column --</option>
                                {Object.entries(data.available_fields).map(
                                  ([category, fields]) => (
                                    <optgroup key={category} label={CATEGORY_LABELS[category] || category}>
                                      {fields.map((field) => (
                                        <option key={field.db_field} value={field.db_field}>
                                          {field.display_name}
                                          {field.required ? " *" : ""}
                                        </option>
                                      ))}
                                    </optgroup>
                                  )
                                )}
                              </select>
                            </div>

                            {/* Status indicator */}
                            <div className="flex-shrink-0">
                              {isMapped ? (
                                <Check className="w-5 h-5 text-green-500" />
                              ) : (
                                <div className="w-5 h-5" />
                              )}
                            </div>
                          </div>

                          {/* Mapped field info */}
                          {mappedField && (
                            <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 text-xs font-medium rounded ${
                                    CATEGORY_COLORS[mappedField.category] || "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {CATEGORY_LABELS[mappedField.category] || mappedField.category}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {mappedField.data_type}
                                </span>
                                {mappedField.required && (
                                  <span className="text-xs text-red-500 font-medium">Required</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {mappedField.description}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Panel - Preview & Actions */}
              <div className="w-1/2 flex flex-col overflow-hidden">
                {/* Preview toggle */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    {showPreview ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    Data Preview ({data.row_count} rows)
                  </button>
                </div>

                {/* Preview table */}
                {showPreview && (
                  <div className="flex-1 overflow-auto p-4">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-900">
                            {data.detected_columns.slice(0, 6).map((col) => (
                              <th
                                key={col}
                                className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {data.sample_data.slice(0, 5).map((row, idx) => (
                            <tr key={idx}>
                              {data.detected_columns.slice(0, 6).map((col) => (
                                <td
                                  key={col}
                                  className="px-3 py-2 text-gray-700 dark:text-gray-300 truncate max-w-[150px]"
                                >
                                  {String(row[col] || "")}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Import result */}
                {importResult && (
                  <div
                    className={`mx-4 mb-4 p-4 rounded-lg ${
                      importResult.status === "success"
                        ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                        : importResult.status === "dry_run"
                        ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                        : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {importResult.status === "success" ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : importResult.status === "dry_run" ? (
                        <HelpCircle className="w-5 h-5 text-blue-500" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      )}
                      <span
                        className={`font-medium ${
                          importResult.status === "success"
                            ? "text-green-700 dark:text-green-400"
                            : importResult.status === "dry_run"
                            ? "text-blue-700 dark:text-blue-400"
                            : "text-red-700 dark:text-red-400"
                        }`}
                      >
                        {importResult.status === "success"
                          ? "Import Successful!"
                          : importResult.status === "dry_run"
                          ? "Validation Complete"
                          : "Import Failed"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">New:</span>{" "}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {importResult.imported}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Updated:</span>{" "}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {importResult.updated}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Skipped:</span>{" "}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {importResult.skipped}
                        </span>
                      </div>
                    </div>
                    {importResult.errors.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          Errors ({importResult.errors.length}):
                        </p>
                        <div className="max-h-24 overflow-y-auto text-xs text-red-600 dark:text-red-400 space-y-1">
                          {importResult.errors.slice(0, 5).map((err, idx) => (
                            <div key={idx}>{err}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <div className="mx-4 mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm">{error}</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={loadMappingData}
                        disabled={importing}
                        className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Reset
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={onClose}
                        disabled={importing}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleImport(true)}
                        disabled={importing || mappingStats.required_missing}
                        className="px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Validate
                      </button>
                      <button
                        onClick={() => handleImport(false)}
                        disabled={importing || mappingStats.required_missing}
                        className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {importing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            Import
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
