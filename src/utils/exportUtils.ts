/**
 * Comprehensive export utilities for reports
 * Supports CSV, Excel-compatible formats, and print-friendly layouts
 */

export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: any) => string;
}

export interface ExportOptions {
  filename: string;
  columns: ExportColumn[];
  data: any[];
  title?: string;
  includeTimestamp?: boolean;
  includeStats?: boolean;
}

/**
 * Export data to CSV format
 */
export const exportToCSV = (options: ExportOptions): void => {
  const { filename, columns, data, includeTimestamp = true } = options;

  // Build CSV content
  const headers = columns.map((col) => `"${col.label}"`).join(',');
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        const formatted = col.format ? col.format(value) : value;
        // Escape quotes and wrap in quotes
        return `"${String(formatted || '').replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  const csvContent = [headers, ...rows].join('\n');

  // Add BOM for UTF-8
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // Generate filename with timestamp
  const timestamp = includeTimestamp
    ? `_${new Date().toISOString().split('T')[0]}`
    : '';
  const finalFilename = `${filename}${timestamp}.csv`;

  // Trigger download
  downloadBlob(blob, finalFilename);
};

/**
 * Export data to Excel-compatible CSV (TSV)
 * Tab-separated values work better with Excel in some cases
 */
export const exportToExcelCSV = (options: ExportOptions): void => {
  const { filename, columns, data, title, includeTimestamp = true } = options;

  let content = '';

  // Add title if provided
  if (title) {
    content += `${title}\n`;
    content += `Generated: ${new Date().toLocaleString()}\n\n`;
  }

  // Build TSV content
  const headers = columns.map((col) => col.label).join('\t');
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        return col.format ? col.format(value) : value;
      })
      .join('\t')
  );

  content += [headers, ...rows].join('\n');

  const blob = new Blob([content], { type: 'text/tab-separated-values;charset=utf-8;' });

  const timestamp = includeTimestamp
    ? `_${new Date().toISOString().split('T')[0]}`
    : '';
  const finalFilename = `${filename}${timestamp}.xls`;

  downloadBlob(blob, finalFilename);
};

/**
 * Export data to JSON format
 */
export const exportToJSON = (options: ExportOptions): void => {
  const { filename, data, title, includeTimestamp = true } = options;

  const exportData = {
    ...(title && { title }),
    exportedAt: new Date().toISOString(),
    recordCount: data.length,
    data: data,
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });

  const timestamp = includeTimestamp
    ? `_${new Date().toISOString().split('T')[0]}`
    : '';
  const finalFilename = `${filename}${timestamp}.json`;

  downloadBlob(blob, finalFilename);
};

/**
 * Generate and download a print-friendly HTML report
 */
export const exportToPrintableHTML = (options: ExportOptions): void => {
  const { filename, columns, data, title, includeStats = false } = options;

  // Calculate stats if requested
  let statsHTML = '';
  if (includeStats) {
    const stats = calculateStats(data, columns);
    statsHTML = `
      <div class="stats">
        <h3>Summary Statistics</h3>
        <table>
          <tr>
            <td><strong>Total Records:</strong></td>
            <td>${data.length.toLocaleString()}</td>
          </tr>
          ${stats
            .map(
              (stat) => `
            <tr>
              <td><strong>${stat.label}:</strong></td>
              <td>${stat.value}</td>
            </tr>
          `
            )
            .join('')}
        </table>
      </div>
    `;
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Report'}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      padding: 40px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1f2937;
      margin-bottom: 10px;
      font-size: 28px;
    }
    .meta {
      color: #6b7280;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .stats {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .stats h3 {
      color: #374151;
      margin-bottom: 15px;
      font-size: 18px;
    }
    .stats table {
      width: 100%;
    }
    .stats td {
      padding: 8px 0;
      color: #4b5563;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    thead {
      background: #3b82f6;
      color: white;
    }
    th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 14px;
    }
    tbody tr {
      border-bottom: 1px solid #e5e7eb;
    }
    tbody tr:nth-child(even) {
      background: #f9fafb;
    }
    tbody tr:hover {
      background: #eff6ff;
    }
    td {
      padding: 12px;
      font-size: 13px;
      color: #374151;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 12px;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
        padding: 20px;
      }
      @page {
        margin: 1cm;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    ${title ? `<h1>${title}</h1>` : ''}
    <div class="meta">
      Generated: ${new Date().toLocaleString()} | Total Records: ${data.length.toLocaleString()}
    </div>

    ${statsHTML}

    <table>
      <thead>
        <tr>
          ${columns.map((col) => `<th>${col.label}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${data
          .map(
            (row) => `
          <tr>
            ${columns
              .map((col) => {
                const value = row[col.key];
                const formatted = col.format ? col.format(value) : value;
                return `<td>${formatted || '-'}</td>`;
              })
              .join('')}
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <div class="footer">
      <p>This report was generated automatically by the HR Dashboard system.</p>
    </div>
  </div>

  <script>
    // Auto-print on load (optional)
    // window.onload = () => window.print();
  </script>
</body>
</html>
  `;

  // Open in new window for printing
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();

    // Optionally save as HTML file
    const blob = new Blob([html], { type: 'text/html' });
    const timestamp = `_${new Date().toISOString().split('T')[0]}`;
    downloadBlob(blob, `${filename}${timestamp}.html`);
  }
};

/**
 * Helper function to trigger blob download
 */
const downloadBlob = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Calculate basic statistics for numeric columns
 */
const calculateStats = (data: any[], columns: ExportColumn[]): { label: string; value: string }[] => {
  const stats: { label: string; value: string }[] = [];

  columns.forEach((col) => {
    const values = data.map((row) => row[col.key]).filter((v) => typeof v === 'number');

    if (values.length > 0) {
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      stats.push({
        label: `${col.label} Average`,
        value: avg.toFixed(2),
      });
      stats.push({
        label: `${col.label} Range`,
        value: `${min.toFixed(2)} - ${max.toFixed(2)}`,
      });
    }
  });

  return stats;
};

/**
 * Copy data to clipboard as formatted table
 */
export const copyToClipboard = (options: ExportOptions): Promise<void> => {
  const { columns, data } = options;

  // Create tab-separated values for easy paste into spreadsheets
  const headers = columns.map((col) => col.label).join('\t');
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        return col.format ? col.format(value) : value;
      })
      .join('\t')
  );

  const content = [headers, ...rows].join('\n');

  return navigator.clipboard.writeText(content);
};

/**
 * Export chart as image
 */
export const exportChartAsImage = (
  chartElement: HTMLCanvasElement,
  filename: string,
  format: 'png' | 'jpeg' = 'png'
): void => {
  chartElement.toBlob((blob) => {
    if (blob) {
      const timestamp = `_${new Date().toISOString().split('T')[0]}`;
      downloadBlob(blob, `${filename}${timestamp}.${format}`);
    }
  }, `image/${format}`);
};

/**
 * Batch export multiple reports
 */
export const batchExport = async (
  exports: ExportOptions[],
  format: 'csv' | 'json'
): Promise<void> => {
  for (const exportOption of exports) {
    if (format === 'csv') {
      exportToCSV(exportOption);
    } else {
      exportToJSON(exportOption);
    }
    // Small delay between downloads to prevent browser blocking
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
};

export default {
  exportToCSV,
  exportToExcelCSV,
  exportToJSON,
  exportToPrintableHTML,
  copyToClipboard,
  exportChartAsImage,
  batchExport,
};
