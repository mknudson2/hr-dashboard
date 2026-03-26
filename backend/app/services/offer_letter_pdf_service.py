"""Offer Letter PDF generation service.

Generates professional offer letter PDFs from rendered template content
using ReportLab. Includes company letterhead, body content, and
candidate signature block.
"""
import io
import re
import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


class OfferLetterPDFService:
    """Service for generating offer letter PDFs from rendered template content."""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Set up custom paragraph styles for offer letters."""
        self.styles.add(ParagraphStyle(
            name='CompanyName',
            parent=self.styles['Normal'],
            fontSize=16,
            leading=20,
            fontName='Helvetica-Bold',
            alignment=TA_LEFT,
            spaceAfter=2,
        ))

        self.styles.add(ParagraphStyle(
            name='CompanyAddress',
            parent=self.styles['Normal'],
            fontSize=9,
            leading=12,
            fontName='Helvetica',
            textColor=colors.HexColor('#555555'),
            spaceAfter=4,
        ))

        self.styles.add(ParagraphStyle(
            name='LetterDate',
            parent=self.styles['Normal'],
            fontSize=10,
            leading=14,
            fontName='Helvetica',
            spaceAfter=16,
        ))

        self.styles.add(ParagraphStyle(
            name='Greeting',
            parent=self.styles['Normal'],
            fontSize=11,
            leading=16,
            fontName='Helvetica',
            spaceAfter=12,
        ))

        self.styles.add(ParagraphStyle(
            name='LetterBody',
            parent=self.styles['Normal'],
            fontSize=11,
            leading=16,
            fontName='Helvetica',
            spaceAfter=10,
        ))

        self.styles.add(ParagraphStyle(
            name='LetterBodyBold',
            parent=self.styles['Normal'],
            fontSize=11,
            leading=16,
            fontName='Helvetica-Bold',
            spaceAfter=10,
        ))

        self.styles.add(ParagraphStyle(
            name='LetterHeading',
            parent=self.styles['Normal'],
            fontSize=12,
            leading=16,
            fontName='Helvetica-Bold',
            spaceBefore=8,
            spaceAfter=6,
        ))

        self.styles.add(ParagraphStyle(
            name='LetterListItem',
            parent=self.styles['Normal'],
            fontSize=11,
            leading=16,
            fontName='Helvetica',
            leftIndent=24,
            spaceAfter=4,
            bulletIndent=12,
        ))

        self.styles.add(ParagraphStyle(
            name='Closing',
            parent=self.styles['Normal'],
            fontSize=11,
            leading=16,
            fontName='Helvetica',
            spaceBefore=20,
            spaceAfter=4,
        ))

        self.styles.add(ParagraphStyle(
            name='SignatureName',
            parent=self.styles['Normal'],
            fontSize=11,
            leading=16,
            fontName='Helvetica-Bold',
        ))

        self.styles.add(ParagraphStyle(
            name='SignatureTitle',
            parent=self.styles['Normal'],
            fontSize=10,
            leading=14,
            fontName='Helvetica',
            textColor=colors.HexColor('#555555'),
        ))

        self.styles.add(ParagraphStyle(
            name='AcceptanceHeader',
            parent=self.styles['Normal'],
            fontSize=11,
            leading=16,
            fontName='Helvetica-Bold',
            spaceBefore=12,
            spaceAfter=8,
        ))

        self.styles.add(ParagraphStyle(
            name='AcceptanceText',
            parent=self.styles['Normal'],
            fontSize=10,
            leading=14,
            fontName='Helvetica',
            spaceAfter=16,
        ))

    def generate_offer_letter_pdf(
        self,
        rendered_content: str,
        candidate_name: str,
        position_title: str,
        offer_date: str = None,
        company_info: dict = None,
    ) -> io.BytesIO:
        """Generate a professional offer letter PDF.

        Args:
            rendered_content: HTML content with all placeholders already resolved
            candidate_name: Full name of the candidate
            position_title: Job title for the offer
            offer_date: Date string for the letter (defaults to today)
            company_info: Dict with company name, address, etc.

        Returns:
            BytesIO buffer containing the PDF
        """
        if company_info is None:
            company_info = {
                "name": os.environ.get("COMPANY_NAME", "NBS"),
                "address": os.environ.get("COMPANY_ADDRESS", ""),
                "city_state_zip": os.environ.get("COMPANY_CITY_STATE", ""),
            }

        if offer_date is None:
            offer_date = datetime.now().strftime("%B %d, %Y")

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            topMargin=0.75 * inch,
            bottomMargin=0.75 * inch,
            leftMargin=0.75 * inch,
            rightMargin=0.75 * inch,
        )

        story = []

        # --- Company Letterhead ---
        story.append(Paragraph(company_info["name"], self.styles['CompanyName']))
        if company_info.get("address"):
            story.append(Paragraph(company_info["address"], self.styles['CompanyAddress']))
        if company_info.get("city_state_zip"):
            story.append(Paragraph(company_info["city_state_zip"], self.styles['CompanyAddress']))

        # Divider line
        story.append(Spacer(1, 8))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CCCCCC')))
        story.append(Spacer(1, 16))

        # --- Date ---
        story.append(Paragraph(offer_date, self.styles['LetterDate']))

        # --- Greeting ---
        story.append(Paragraph(f"Dear {candidate_name},", self.styles['Greeting']))

        # --- Body Content ---
        body_elements = self._parse_html_to_flowables(rendered_content)
        story.extend(body_elements)

        # --- Closing & HR Signature ---
        story.append(Paragraph("Sincerely,", self.styles['Closing']))
        story.append(Spacer(1, 30))
        story.append(Paragraph("Human Resources", self.styles['SignatureName']))
        story.append(Paragraph(company_info["name"], self.styles['SignatureTitle']))

        # --- Candidate Acceptance Section ---
        story.append(Spacer(1, 30))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CCCCCC')))
        story.append(Spacer(1, 8))

        story.append(Paragraph("CANDIDATE ACCEPTANCE", self.styles['AcceptanceHeader']))
        story.append(Paragraph(
            f"I, the undersigned, accept the offer for the position of <b>{position_title}</b> "
            f"as outlined in this letter.",
            self.styles['AcceptanceText'],
        ))

        # Signature lines using a table
        sig_data = [
            [
                Paragraph("Candidate Signature:", self.styles['AcceptanceText']),
                "",
                Paragraph("Date:", self.styles['AcceptanceText']),
                "",
            ],
            [
                "",
                "______________________________",
                "",
                "____________________",
            ],
            [Spacer(1, 16), "", "", ""],
            [
                Paragraph("Printed Name:", self.styles['AcceptanceText']),
                "",
                "",
                "",
            ],
            [
                "",
                "______________________________",
                "",
                "",
            ],
        ]

        sig_table = Table(sig_data, colWidths=[1.3 * inch, 2.5 * inch, 0.8 * inch, 1.8 * inch])
        sig_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        story.append(sig_table)

        doc.build(story)
        buffer.seek(0)
        return buffer

    def _parse_html_to_flowables(self, html_content: str) -> list:
        """Parse simple HTML content into ReportLab flowable objects.

        Handles: <p>, <h2>, <h3>, <ul>/<li>, <strong>, <em>, <br>
        ReportLab Paragraph natively supports <b>, <i>, <br/> inside text.
        """
        flowables = []

        if not html_content:
            return flowables

        # Normalize line breaks
        content = html_content.replace('\r\n', '\n').replace('\r', '\n')

        # Split into block-level elements
        # Match <p>, <h2>, <h3>, <ul>, <li> tags
        block_pattern = re.compile(
            r'<(p|h[23]|li)(?:\s[^>]*)?>(.*?)</\1>|<ul>(.*?)</ul>',
            re.DOTALL | re.IGNORECASE
        )

        matches = list(block_pattern.finditer(content))

        if not matches:
            # No HTML tags — treat as plain text, split by newlines
            for line in content.split('\n'):
                line = line.strip()
                if line:
                    flowables.append(Paragraph(self._clean_inline_html(line), self.styles['LetterBody']))
            return flowables

        for match in matches:
            tag = (match.group(1) or "").lower()
            text = match.group(2) or match.group(3) or ""
            text = text.strip()

            if not text:
                continue

            cleaned = self._clean_inline_html(text)

            if tag in ('h2', 'h3'):
                flowables.append(Paragraph(cleaned, self.styles['LetterHeading']))
            elif tag == 'li':
                flowables.append(Paragraph(f"\u2022 {cleaned}", self.styles['LetterListItem']))
            else:
                flowables.append(Paragraph(cleaned, self.styles['LetterBody']))

        return flowables

    def _clean_inline_html(self, text: str) -> str:
        """Convert inline HTML to ReportLab-compatible markup.

        ReportLab Paragraph supports <b>, <i>, <br/>, <u> natively.
        Convert <strong> → <b>, <em> → <i>, strip other tags.
        """
        text = re.sub(r'<strong>(.*?)</strong>', r'<b>\1</b>', text, flags=re.DOTALL)
        text = re.sub(r'<em>(.*?)</em>', r'<i>\1</i>', text, flags=re.DOTALL)
        text = re.sub(r'<br\s*/?>', '<br/>', text)
        # Strip any remaining HTML tags except b, i, br, u
        text = re.sub(r'<(?!/?(?:b|i|br|u)\b)[^>]+>', '', text)
        return text.strip()


# Singleton instance
offer_letter_pdf_service = OfferLetterPDFService()
