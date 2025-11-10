"""PDF generation service for birthdays and tenure anniversaries."""
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import io


class CelebrationsPDFService:
    """Service for generating birthday and tenure anniversary PDFs."""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Set up custom paragraph styles."""
        # Title style
        self.styles.add(ParagraphStyle(
            name='CelebrationTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            leading=22,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold',
            textColor=colors.HexColor('#1e40af'),  # Blue
            spaceAfter=12,
        ))

        # Subtitle style
        self.styles.add(ParagraphStyle(
            name='CelebrationSubtitle',
            parent=self.styles['Normal'],
            fontSize=12,
            leading=14,
            alignment=TA_CENTER,
            fontName='Helvetica',
            textColor=colors.HexColor('#6b7280'),  # Gray
            spaceAfter=20,
        ))

        # Table text style
        self.styles.add(ParagraphStyle(
            name='TableText',
            parent=self.styles['Normal'],
            fontSize=10,
            leading=12,
            fontName='Helvetica',
        ))

        # Table header style
        self.styles.add(ParagraphStyle(
            name='TableHeader',
            parent=self.styles['Normal'],
            fontSize=11,
            leading=13,
            fontName='Helvetica-Bold',
            textColor=colors.white,
        ))

    def generate_birthdays_pdf(self, birthdays_data: dict) -> io.BytesIO:
        """Generate a PDF for monthly birthdays.

        Args:
            birthdays_data: Dictionary containing month, year, count, and birthdays list

        Returns:
            BytesIO buffer containing the PDF
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.75 * inch,
            leftMargin=0.75 * inch,
            topMargin=0.75 * inch,
            bottomMargin=0.75 * inch,
        )

        story = []

        # Title
        title = Paragraph(
            f"{birthdays_data['month']} {birthdays_data['year']} Birthdays",
            self.styles['CelebrationTitle']
        )
        story.append(title)

        # Subtitle
        subtitle = Paragraph(
            f"{birthdays_data['count']} {'birthday' if birthdays_data['count'] == 1 else 'birthdays'} this month",
            self.styles['CelebrationSubtitle']
        )
        story.append(subtitle)
        story.append(Spacer(1, 0.3 * inch))

        # Check if there are birthdays
        if birthdays_data['count'] == 0:
            no_birthdays = Paragraph(
                "No birthdays this month",
                self.styles['Normal']
            )
            story.append(no_birthdays)
        else:
            # Create table data
            table_data = [
                [
                    Paragraph('<b>Name</b>', self.styles['TableHeader']),
                    Paragraph('<b>Department</b>', self.styles['TableHeader']),
                    Paragraph('<b>Birthday</b>', self.styles['TableHeader']),
                    Paragraph('<b>Age</b>', self.styles['TableHeader']),
                ]
            ]

            for birthday in birthdays_data['birthdays']:
                # Format birthday display based on privacy settings
                if birthday['show_exact_dates'] and birthday['birth_day']:
                    birthday_display = f"{birthdays_data['month']} {birthday['birth_day']}"
                else:
                    birthday_display = f"{birthdays_data['month']}"

                table_data.append([
                    Paragraph(birthday['full_name'], self.styles['TableText']),
                    Paragraph(birthday['department'] or 'N/A', self.styles['TableText']),
                    Paragraph(birthday_display, self.styles['TableText']),
                    Paragraph(str(birthday['age']), self.styles['TableText']),
                ])

            # Create table
            table = Table(table_data, colWidths=[2.5 * inch, 2 * inch, 1.5 * inch, 0.75 * inch])
            table.setStyle(TableStyle([
                # Header row styling
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ec4899')),  # Pink
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('TOPPADDING', (0, 0), (-1, 0), 12),

                # Data rows styling
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
                ('ALIGN', (0, 1), (-1, -1), 'LEFT'),
                ('ALIGN', (3, 1), (3, -1), 'CENTER'),  # Center age column
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 10),
                ('TOPPADDING', (0, 1), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 8),

                # Grid
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),

                # Alternating row colors
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fdf2f8')]),
            ]))

            story.append(table)

        # Footer
        story.append(Spacer(1, 0.5 * inch))
        footer_text = f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}"
        footer = Paragraph(footer_text, self.styles['CelebrationSubtitle'])
        story.append(footer)

        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer

    def generate_anniversaries_pdf(self, anniversaries_data: dict) -> io.BytesIO:
        """Generate a PDF for monthly tenure anniversaries.

        Args:
            anniversaries_data: Dictionary containing month, year, count, and anniversaries list

        Returns:
            BytesIO buffer containing the PDF
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.75 * inch,
            leftMargin=0.75 * inch,
            topMargin=0.75 * inch,
            bottomMargin=0.75 * inch,
        )

        story = []

        # Title
        title = Paragraph(
            f"{anniversaries_data['month']} {anniversaries_data['year']} Work Anniversaries",
            self.styles['CelebrationTitle']
        )
        story.append(title)

        # Subtitle
        subtitle = Paragraph(
            f"{anniversaries_data['count']} work {'anniversary' if anniversaries_data['count'] == 1 else 'anniversaries'} this month",
            self.styles['CelebrationSubtitle']
        )
        story.append(subtitle)
        story.append(Spacer(1, 0.3 * inch))

        # Check if there are anniversaries
        if anniversaries_data['count'] == 0:
            no_anniversaries = Paragraph(
                "No work anniversaries this month",
                self.styles['Normal']
            )
            story.append(no_anniversaries)
        else:
            # Create table data
            table_data = [
                [
                    Paragraph('<b>Name</b>', self.styles['TableHeader']),
                    Paragraph('<b>Department</b>', self.styles['TableHeader']),
                    Paragraph('<b>Anniversary Date</b>', self.styles['TableHeader']),
                    Paragraph('<b>Years</b>', self.styles['TableHeader']),
                ]
            ]

            for anniversary in anniversaries_data['anniversaries']:
                # Format anniversary display based on privacy settings
                if anniversary['show_exact_dates'] and anniversary['hire_day']:
                    anniversary_display = f"{anniversaries_data['month']} {anniversary['hire_day']}"
                else:
                    anniversary_display = f"{anniversaries_data['month']}"

                table_data.append([
                    Paragraph(anniversary['full_name'], self.styles['TableText']),
                    Paragraph(anniversary['department'] or 'N/A', self.styles['TableText']),
                    Paragraph(anniversary_display, self.styles['TableText']),
                    Paragraph(str(anniversary['years_of_service']), self.styles['TableText']),
                ])

            # Create table
            table = Table(table_data, colWidths=[2.5 * inch, 2 * inch, 1.5 * inch, 0.75 * inch])
            table.setStyle(TableStyle([
                # Header row styling
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563eb')),  # Blue
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('TOPPADDING', (0, 0), (-1, 0), 12),

                # Data rows styling
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
                ('ALIGN', (0, 1), (-1, -1), 'LEFT'),
                ('ALIGN', (3, 1), (3, -1), 'CENTER'),  # Center years column
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 10),
                ('TOPPADDING', (0, 1), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 8),

                # Grid
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),

                # Alternating row colors
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#eff6ff')]),
            ]))

            story.append(table)

        # Footer
        story.append(Spacer(1, 0.5 * inch))
        footer_text = f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}"
        footer = Paragraph(footer_text, self.styles['CelebrationSubtitle'])
        story.append(footer)

        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer
