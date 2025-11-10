"""PDF generation service for offboarding documents."""
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import io
from typing import List, Dict


class OffboardingPDFService:
    """Service for generating offboarding-related PDF documents."""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Set up custom paragraph styles."""
        # Document title style
        self.styles.add(ParagraphStyle(
            name='DocTitle',
            parent=self.styles['Normal'],
            fontSize=24,
            leading=28,
            fontName='Helvetica-Bold',
            alignment=TA_CENTER,
            spaceAfter=12,
            textColor=colors.HexColor('#1e40af')
        ))

        # Document subtitle style
        self.styles.add(ParagraphStyle(
            name='DocSubtitle',
            parent=self.styles['Normal'],
            fontSize=14,
            leading=16,
            fontName='Helvetica',
            alignment=TA_CENTER,
            spaceAfter=20,
            textColor=colors.HexColor('#6b7280')
        ))

        # Section title style
        self.styles.add(ParagraphStyle(
            name='SectionTitle',
            parent=self.styles['Normal'],
            fontSize=16,
            leading=19,
            fontName='Helvetica-Bold',
            spaceAfter=10,
            spaceBefore=15,
            textColor=colors.HexColor('#1f2937')
        ))

        # Subsection title style
        self.styles.add(ParagraphStyle(
            name='SubsectionTitle',
            parent=self.styles['Normal'],
            fontSize=12,
            leading=14,
            fontName='Helvetica-Bold',
            spaceAfter=8,
            spaceBefore=10,
        ))

        # Body style
        self.styles.add(ParagraphStyle(
            name='CustomBody',
            parent=self.styles['Normal'],
            fontSize=10,
            leading=12,
        ))

        # Small text style
        self.styles.add(ParagraphStyle(
            name='SmallText',
            parent=self.styles['Normal'],
            fontSize=9,
            leading=11,
            textColor=colors.HexColor('#6b7280')
        ))

        # Table header style
        self.styles.add(ParagraphStyle(
            name='TableHeader',
            parent=self.styles['Normal'],
            fontSize=10,
            leading=12,
            fontName='Helvetica-Bold',
        ))

        # Table text style
        self.styles.add(ParagraphStyle(
            name='TableText',
            parent=self.styles['Normal'],
            fontSize=9,
            leading=11,
        ))

    def generate_offboarding_package(
        self,
        employee_data: Dict,
        tasks: List[Dict],
        company_info: Dict = None
    ) -> io.BytesIO:
        """Generate a comprehensive offboarding package PDF.

        Args:
            employee_data: Dict with employee information
            tasks: List of offboarding tasks
            company_info: Optional dict with company information

        Returns:
            BytesIO object containing the PDF
        """
        # Create a BytesIO buffer
        buffer = io.BytesIO()

        # Create the PDF document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=0.75*inch,
            bottomMargin=0.75*inch
        )

        # Container for the 'Flowable' objects
        elements = []

        # Default company info if not provided
        if not company_info:
            company_info = {
                "name": "Actual Factual, LLC",
                "location": "Bagend, SH",
                "phone": "226-556-668"
            }

        # === COVER PAGE ===
        elements.append(Spacer(1, 1.5*inch))
        elements.append(Paragraph("OFFBOARDING PACKAGE", self.styles['DocTitle']))
        elements.append(Spacer(1, 0.3*inch))

        employee_name = f"{employee_data.get('first_name', '')} {employee_data.get('last_name', '')}"
        elements.append(Paragraph(employee_name, self.styles['DocSubtitle']))
        elements.append(Paragraph(f"Employee ID: {employee_data.get('employee_id', 'N/A')}", self.styles['DocSubtitle']))
        elements.append(Spacer(1, 0.5*inch))

        # Document info box
        doc_info_data = [
            [Paragraph("<b>Department:</b>", self.styles['CustomBody']),
             Paragraph(employee_data.get('department', 'N/A'), self.styles['CustomBody'])],
            [Paragraph("<b>Position:</b>", self.styles['CustomBody']),
             Paragraph(employee_data.get('position', 'N/A'), self.styles['CustomBody'])],
            [Paragraph("<b>Last Working Day:</b>", self.styles['CustomBody']),
             Paragraph(employee_data.get('termination_date', 'N/A'), self.styles['CustomBody'])],
            [Paragraph("<b>Reason for Departure:</b>", self.styles['CustomBody']),
             Paragraph(employee_data.get('termination_reason', 'N/A'), self.styles['CustomBody'])],
            [Paragraph("<b>Document Generated:</b>", self.styles['CustomBody']),
             Paragraph(datetime.now().strftime('%B %d, %Y'), self.styles['CustomBody'])],
        ]

        doc_info_table = Table(doc_info_data, colWidths=[2.5*inch, 4*inch])
        doc_info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f3f4f6')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(doc_info_table)
        elements.append(Spacer(1, 0.5*inch))

        # Company footer on cover
        elements.append(Paragraph(f"<b>{company_info['name']}</b>", self.styles['SmallText']))
        elements.append(Paragraph(f"{company_info['location']} • {company_info['phone']}", self.styles['SmallText']))

        elements.append(PageBreak())

        # === EMPLOYEE INFORMATION PAGE ===
        elements.append(Paragraph("Employee Information", self.styles['SectionTitle']))
        elements.append(Spacer(1, 0.1*inch))

        emp_info_data = [
            [Paragraph("<b>Field</b>", self.styles['TableHeader']),
             Paragraph("<b>Value</b>", self.styles['TableHeader'])],
            [Paragraph("Full Name", self.styles['TableText']),
             Paragraph(employee_name, self.styles['TableText'])],
            [Paragraph("Employee ID", self.styles['TableText']),
             Paragraph(employee_data.get('employee_id', 'N/A'), self.styles['TableText'])],
            [Paragraph("Email", self.styles['TableText']),
             Paragraph(employee_data.get('email', 'N/A'), self.styles['TableText'])],
            [Paragraph("Department", self.styles['TableText']),
             Paragraph(employee_data.get('department', 'N/A'), self.styles['TableText'])],
            [Paragraph("Position", self.styles['TableText']),
             Paragraph(employee_data.get('position', 'N/A'), self.styles['TableText'])],
            [Paragraph("Location", self.styles['TableText']),
             Paragraph(employee_data.get('location', 'N/A'), self.styles['TableText'])],
            [Paragraph("Hire Date", self.styles['TableText']),
             Paragraph(employee_data.get('hire_date', 'N/A'), self.styles['TableText'])],
            [Paragraph("Last Working Day", self.styles['TableText']),
             Paragraph(employee_data.get('termination_date', 'N/A'), self.styles['TableText'])],
            [Paragraph("Reason for Departure", self.styles['TableText']),
             Paragraph(employee_data.get('termination_reason', 'N/A'), self.styles['TableText'])],
        ]

        emp_info_table = Table(emp_info_data, colWidths=[2.5*inch, 4*inch])
        emp_info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ]))
        elements.append(emp_info_table)
        elements.append(PageBreak())

        # === OFFBOARDING TASKS PAGE ===
        elements.append(Paragraph("Offboarding Tasks Checklist", self.styles['SectionTitle']))
        elements.append(Spacer(1, 0.1*inch))

        # Calculate statistics
        total_tasks = len(tasks)
        completed_tasks = sum(1 for t in tasks if t.get('status') == 'Completed')
        in_progress_tasks = sum(1 for t in tasks if t.get('status') == 'In Progress')
        not_started_tasks = sum(1 for t in tasks if t.get('status') == 'Not Started')
        completion_percentage = int((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0)

        # Summary box
        summary_text = (f"<b>Task Summary:</b> {completed_tasks} of {total_tasks} tasks completed "
                       f"({completion_percentage}% complete)<br/>"
                       f"<b>In Progress:</b> {in_progress_tasks} | "
                       f"<b>Not Started:</b> {not_started_tasks}")
        elements.append(Paragraph(summary_text, self.styles['CustomBody']))
        elements.append(Spacer(1, 0.2*inch))

        # Group tasks by category
        tasks_by_category = {}
        for task in tasks:
            category = task.get('category', 'Other')
            if category not in tasks_by_category:
                tasks_by_category[category] = []
            tasks_by_category[category].append(task)

        # Create a table for each category
        for category, category_tasks in sorted(tasks_by_category.items()):
            elements.append(Paragraph(f"{category}", self.styles['SubsectionTitle']))

            task_data = [
                [Paragraph("<b>Task</b>", self.styles['TableHeader']),
                 Paragraph("<b>Assigned To</b>", self.styles['TableHeader']),
                 Paragraph("<b>Due Date</b>", self.styles['TableHeader']),
                 Paragraph("<b>Status</b>", self.styles['TableHeader']),
                 Paragraph("<b>Priority</b>", self.styles['TableHeader'])]
            ]

            for task in sorted(category_tasks, key=lambda t: (
                0 if t.get('status') == 'Not Started' else 1 if t.get('status') == 'In Progress' else 2,
                t.get('priority') if t.get('priority') in ['Critical', 'High', 'Medium', 'Low'] else 'ZZZ'
            )):
                status_symbol = "✓" if task.get('status') == 'Completed' else "○"
                task_name = f"{status_symbol} {task.get('task_name', 'N/A')}"

                task_data.append([
                    Paragraph(task_name, self.styles['TableText']),
                    Paragraph(task.get('assigned_to_role', 'N/A'), self.styles['TableText']),
                    Paragraph(task.get('due_date', 'N/A'), self.styles['TableText']),
                    Paragraph(task.get('status', 'N/A'), self.styles['TableText']),
                    Paragraph(task.get('priority', 'N/A'), self.styles['TableText']),
                ])

            task_table = Table(task_data, colWidths=[2.5*inch, 1.2*inch, 1*inch, 1*inch, 0.8*inch])
            task_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 1), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
                # Alternate row colors
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
            ]))
            elements.append(task_table)
            elements.append(Spacer(1, 0.15*inch))

        elements.append(PageBreak())

        # === EXIT CHECKLIST PAGE ===
        elements.append(Paragraph("Exit Checklist", self.styles['SectionTitle']))
        elements.append(Spacer(1, 0.1*inch))

        elements.append(Paragraph("The following items must be completed before the employee's last day:",
                                 self.styles['CustomBody']))
        elements.append(Spacer(1, 0.15*inch))

        checklist_items = [
            ["Item", "Status", "Notes"],
            ["Return company laptop and equipment", "☐", ""],
            ["Return access badges and keys", "☐", ""],
            ["Return company credit cards", "☐", ""],
            ["Return company phone/devices", "☐", ""],
            ["Remove access to all systems", "☐", "See IT checklist"],
            ["Transfer knowledge to team", "☐", ""],
            ["Complete exit interview", "☐", ""],
            ["Submit final expense reports", "☐", ""],
            ["Return company vehicles (if applicable)", "☐", ""],
            ["Update email auto-responder", "☐", ""],
            ["Sign final documents", "☐", ""],
            ["Confirm final pay date", "☐", ""],
        ]

        checklist_table = Table(checklist_items, colWidths=[3.5*inch, 0.75*inch, 2.25*inch])
        checklist_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('ALIGN', (1, 1), (1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
        ]))
        elements.append(checklist_table)
        elements.append(Spacer(1, 0.3*inch))

        # Important notes section
        elements.append(Paragraph("Important Notes", self.styles['SubsectionTitle']))
        important_notes = [
            "Final paycheck will be processed according to company policy and state law.",
            "COBRA benefits information will be sent separately within 14 days.",
            "Employee must return all company property before receiving final compensation.",
            "All confidentiality and non-compete agreements remain in effect.",
            "Questions should be directed to the HR department.",
        ]

        for note in important_notes:
            elements.append(Paragraph(f"• {note}", self.styles['CustomBody']))
            elements.append(Spacer(1, 0.05*inch))

        elements.append(Spacer(1, 0.3*inch))

        # Signature section
        elements.append(Paragraph("Acknowledgment", self.styles['SubsectionTitle']))
        elements.append(Spacer(1, 0.1*inch))

        signature_data = [
            ["", ""],
            ["HR Representative Signature", "Date"],
            ["", ""],
            ["", ""],
            ["Manager Signature", "Date"],
        ]

        signature_table = Table(signature_data, colWidths=[4.5*inch, 2*inch])
        signature_table.setStyle(TableStyle([
            ('LINEABOVE', (0, 1), (0, 1), 1, colors.black),
            ('LINEABOVE', (1, 1), (1, 1), 1, colors.black),
            ('LINEABOVE', (0, 4), (0, 4), 1, colors.black),
            ('LINEABOVE', (1, 4), (1, 4), 1, colors.black),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
        ]))
        elements.append(signature_table)

        # Footer with generation info
        elements.append(Spacer(1, 0.5*inch))
        footer_text = f"<i>This document was generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')} by {company_info['name']}</i>"
        elements.append(Paragraph(footer_text, self.styles['SmallText']))

        # Build the PDF
        doc.build(elements)

        # Get the value from the BytesIO buffer
        pdf_bytes = buffer.getvalue()
        buffer.close()

        # Return a new BytesIO with the PDF data
        result_buffer = io.BytesIO(pdf_bytes)
        result_buffer.seek(0)

        return result_buffer


# Create a singleton instance
offboarding_pdf_service = OffboardingPDFService()
