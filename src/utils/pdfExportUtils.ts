import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface PayrollPDFData {
  periodNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  payday: string;
  status: string;
  progress: number;
  employerFunding: boolean;
  processedAt: string | null;
  tasks: Array<{
    id: number;
    title: string;
    completed: boolean;
    completedAt: string | null;
    completedBy: string | null;
    description: string | null;
    instructions: string | null;
    pathReference: string | null;
    notes: string | null;
    hasToggle: boolean;
    toggleValue: boolean | null;
    toggleLabel: string | null;
    subtasks: Array<{
      id: number;
      title: string;
      completed: boolean;
      completedAt: string | null;
      completedBy: string | null;
      instructions: string | null;
      pathReference: string | null;
      notes: string | null;
      hasToggle: boolean;
      toggleValue: boolean | null;
      toggleLabel: string | null;
    }>;
  }>;
  notesHistory: Array<{
    title: string;
    content: string;
    timestamp: string;
    user: string;
    type: 'period' | 'task';
  }>;
}

export function formatDateForPDF(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatTimestampForPDF(timestamp: string): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export async function exportPayrollToPDF(
  data: PayrollPDFData,
  containerRef: HTMLDivElement
): Promise<void> {
  console.log('Starting PDF export...', { containerRef, data });

  // Capture the element with html2canvas
  console.log('Capturing with html2canvas...');
  const canvas = await html2canvas(containerRef, {
    scale: 2, // Higher resolution for better PDF quality
    useCORS: true,
    logging: true, // Enable logging for debugging
    backgroundColor: '#ffffff',
  });

  console.log('Canvas created:', { width: canvas.width, height: canvas.height });

  // A4 dimensions in mm
  const imgWidth = 210;
  const pageHeight = 297;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Create PDF document
  console.log('Creating PDF document...');
  const pdf = new jsPDF('p', 'mm', 'a4');
  let heightLeft = imgHeight;
  let position = 0;

  // Get image data
  const imgData = canvas.toDataURL('image/png');
  console.log('Image data created, length:', imgData.length);

  // Add first page
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;
  console.log('First page added');

  // Add additional pages if content overflows
  let pageCount = 1;
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    pageCount++;
  }
  console.log('Total pages:', pageCount);

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `Payroll_Period_${data.periodNumber}_${data.year}_${timestamp}.pdf`;

  // Trigger download
  console.log('Saving PDF as:', filename);
  pdf.save(filename);
  console.log('PDF saved successfully');
}
