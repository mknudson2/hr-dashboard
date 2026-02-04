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
  const canvas = await html2canvas(containerRef, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  // A4 dimensions in mm
  const imgWidth = 210;
  const pageHeight = 297;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const pdf = new jsPDF('p', 'mm', 'a4');
  let heightLeft = imgHeight;
  let position = 0;

  const imgData = canvas.toDataURL('image/png');

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `Payroll_Period_${data.periodNumber}_${data.year}_${timestamp}.pdf`;

  pdf.save(filename);
}
