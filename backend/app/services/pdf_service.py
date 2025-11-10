"""PDF generation service for garnishment documents."""
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import io


class GarnishmentPDFService:
    """Service for generating garnishment-related PDF documents."""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Set up custom paragraph styles."""
        # Company header style
        self.styles.add(ParagraphStyle(
            name='CompanyHeader',
            parent=self.styles['Normal'],
            fontSize=10,
            leading=12,
            alignment=TA_LEFT,
            fontName='Helvetica'
        ))

        # Section title style
        self.styles.add(ParagraphStyle(
            name='SectionTitle',
            parent=self.styles['Normal'],
            fontSize=11,
            leading=13,
            fontName='Helvetica-Bold',
            spaceAfter=6,
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
            fontSize=8,
            leading=10,
        ))

        # Table text style with word wrapping
        self.styles.add(ParagraphStyle(
            name='TableText',
            parent=self.styles['Normal'],
            fontSize=9,
            leading=11,
            fontName='Helvetica',
        ))

        # Table text bold style
        self.styles.add(ParagraphStyle(
            name='TableTextBold',
            parent=self.styles['Normal'],
            fontSize=9,
            leading=11,
            fontName='Helvetica-Bold',
        ))

        # Calculation text style (smaller for detailed calc table)
        self.styles.add(ParagraphStyle(
            name='CalcText',
            parent=self.styles['Normal'],
            fontSize=8,
            leading=9,
            fontName='Helvetica-Bold',
        ))

        # Calculation value style
        self.styles.add(ParagraphStyle(
            name='CalcValue',
            parent=self.styles['Normal'],
            fontSize=8,
            leading=9,
            fontName='Helvetica',
        ))

    def generate_calculation_pdf(
        self,
        garnishment_data: dict,
        calculation_data: dict,
        company_info: dict = None
    ) -> io.BytesIO:
        """Generate a PDF for garnishment wage calculation matching court format.

        Args:
            garnishment_data: Dict with garnishment case information
            calculation_data: Dict with wage calculation details
            company_info: Optional dict with company information

        Returns:
            BytesIO object containing the PDF
        """
        # Create a BytesIO buffer
        buffer = io.BytesIO()

        # Create the PDF document with narrower margins
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.5*inch,
            leftMargin=0.5*inch,
            topMargin=0.5*inch,
            bottomMargin=0.5*inch
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

        # Company Header (A1:A2)
        company_header = f"{company_info['name']}<br/>{company_info['location']}<br/>{company_info['phone']}"
        elements.append(Paragraph(company_header, self.styles['CompanyHeader']))
        elements.append(Spacer(1, 0.1*inch))

        # Court Information (B2)
        court_info = garnishment_data.get('court_info', 'In the County Magistrate Court<br/>State Address<br/>City, State ZIP')
        elements.append(Paragraph(court_info, self.styles['CompanyHeader']))
        elements.append(Spacer(1, 0.15*inch))

        # Title
        elements.append(Paragraph("<b>GARNISHMENT CALCULATIONS FOR:</b>", self.styles['SectionTitle']))
        elements.append(Spacer(1, 0.1*inch))

        # Case Information Table
        case_info_data = [
            [Paragraph("<b>Plaintiff/Petitioner:</b>", self.styles['TableText']),
             Paragraph(garnishment_data.get("agency_name", ""), self.styles['TableText'])],
            ["", ""],
            [Paragraph("<b>Defendant/Respondent:</b>", self.styles['TableText']),
             Paragraph(garnishment_data.get("employee_name", ""), self.styles['TableText'])],
            [Paragraph("<b>Garnishee's Answers to Interrogatories for Earnings</b>", self.styles['TableText']), ""],
            [Paragraph("<b>Case Number:</b>", self.styles['TableText']),
             Paragraph(garnishment_data.get("case_reference", "N/A"), self.styles['TableText'])],
            [Paragraph("<b>Judge:</b>", self.styles['TableText']),
             Paragraph(garnishment_data.get("judge", ""), self.styles['TableText'])],
            [Paragraph("<b>Commissioner:</b>", self.styles['TableText']),
             Paragraph(garnishment_data.get("commissioner", ""), self.styles['TableText'])],
        ]

        case_table = Table(case_info_data, colWidths=[2.5*inch, 4.5*inch])
        case_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(case_table)
        elements.append(Spacer(1, 0.15*inch))

        # Questions Section
        questions_data = [
            [Paragraph("<b>(1) Do you employ the judgment debtor?</b>", self.styles['TableText']),
             Paragraph("Yes", self.styles['TableText'])],
            [Paragraph("<b>(2)(a) Are there other Writs of Continuing Garnishment in effect?</b>", self.styles['TableText']),
             Paragraph("No", self.styles['TableText'])],
            [Paragraph("<b>(2)(b) If yes, when will they expire?</b>", self.styles['TableText']),
             Paragraph("n/a", self.styles['TableText'])],
            [Paragraph("<b>(3)(a) What is the judgment debtor's pay period?</b>", self.styles['TableText']),
             Paragraph("Biweekly", self.styles['TableText'])],
            [Paragraph("<b>(3)(b) What is the pay period to which these answers relate?</b>", self.styles['TableText']),
             Paragraph(f"{calculation_data.get('pay_period_start', '')} through {calculation_data.get('pay_period_end', '')}", self.styles['TableText'])],
        ]

        questions_table = Table(questions_data, colWidths=[4.5*inch, 2.5*inch])
        questions_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(questions_table)
        elements.append(Spacer(1, 0.15*inch))

        # Calculation Instructions Header
        calc_header = "(4) Calculate the amount to be withheld from the judgment debtor (Defendant). " \
                     "Assume you are calculating this on the last day of the pay period for which these answers apply."
        elements.append(Paragraph(f"<b>{calc_header}</b>", self.styles['CustomBody']))
        elements.append(Spacer(1, 0.1*inch))

        # Get calculation values
        gross_wages = calculation_data.get("gross_wages", 0)
        federal_tax = calculation_data.get("federal_tax", 0)
        state_tax = calculation_data.get("state_tax", 0)
        fica_tax = calculation_data.get("fica_tax", 0)
        medicare_tax = calculation_data.get("medicare_tax", 0)
        total_deductions = calculation_data.get("taxes_withheld", 0)
        disposable_earnings = calculation_data.get("disposable_income", 0)
        twenty_five_percent = disposable_earnings * 0.25
        federal_min_calc = disposable_earnings - 435
        ccpa_limit = min(twenty_five_percent, federal_min_calc)
        other_garnishments = 0
        after_other = ccpa_limit - other_garnishments
        undisputed_debt = 0
        maximum_withholding = after_other - undisputed_debt
        balance_owed = calculation_data.get("balance_owed", 0)
        amount_to_withhold = calculation_data.get("deduction_amount", 0)

        # Detailed Calculation Table
        calc_data = [
            [Paragraph("<b>(4)(a) Gross earnings from all sources payable to the judgment debtor including wages, "
             "salaries, commissions, bonuses, or earnings from a pension or retirement program. "
             "Tips are generally not considered earnings for the purposes of the wage garnishment law.</b>", self.styles['CalcText']),
             Paragraph(f"${gross_wages:,.2f}", self.styles['CalcValue'])],
            [Paragraph("<b>(4)(b) Calculate deductions required by law</b>", self.styles['CalcText']),
             Paragraph("", self.styles['CalcValue'])],
            [Paragraph("<b>(4)(b)(i) Federal Income Tax (FITW)</b>", self.styles['CalcText']),
             Paragraph(f"${federal_tax:,.2f}", self.styles['CalcValue'])],
            [Paragraph("<b>(4)(b)(ii) State Income tax (SITW)</b>", self.styles['CalcText']),
             Paragraph(f"${state_tax:,.2f}", self.styles['CalcValue'])],
            [Paragraph("<b>(4)(b)(iii) Social Security Tax (FICA)</b>", self.styles['CalcText']),
             Paragraph(f"${fica_tax:,.2f}", self.styles['CalcValue'])],
            [Paragraph("<b>(4)(b)(iv) Medicare Tax (FICA)</b>", self.styles['CalcText']),
             Paragraph(f"${medicare_tax:,.2f}", self.styles['CalcValue'])],
            [Paragraph("<b>(4)(b)(v) Other amounts required by law to be deducted (describe the deduction)</b>", self.styles['CalcText']),
             Paragraph("$0.00", self.styles['CalcValue'])],
            [Paragraph("<b>(4)(c) Total Deductions (Calculate and record the sum of (4)(b)(i) through (4)(b)(v).)</b>", self.styles['CalcText']),
             Paragraph(f"${total_deductions:,.2f}", self.styles['CalcValue'])],
            [Paragraph("<b>(4)(d) Disposable earnings (Calculate and record Line (4)(a) minus Line (4)(c).)</b>", self.styles['CalcText']),
             Paragraph(f"${disposable_earnings:,.2f}", self.styles['CalcValue'])],
            [Paragraph("<b>(4)(e) Calculate:</b>", self.styles['CalcText']),
             Paragraph("", self.styles['CalcValue'])],
            [Paragraph("<b>(4)(e)(i) 25% of the amount in Line (4)(d)</b>", self.styles['CalcText']),
             Paragraph(f"${twenty_five_percent:,.2f}", self.styles['CalcValue'])],
            [Paragraph("<b>(4)(e)(ii) The difference between Line (4)(d) and the federal minimum hourly wage ($7.25) "
             "times 30 times the number of weeks in this pay period. For example: Biweekly payroll: "
             "Line (4)(d) minus $7.25 x 30 x 2 weeks) ($435)</b>", self.styles['CalcText']),
             Paragraph(f"${federal_min_calc:,.2f}", self.styles['CalcValue'])],
            [Paragraph("<b>(4)(f) Record the lesser amount from Line (4)(e)(i) and Line (4)(e)(ii).</b>", self.styles['CalcText']),
             Paragraph(f"${ccpa_limit:,.2f}", self.styles['CalcValue'])],
            [Paragraph("<b>(4)(g) Amount of any other garnishment or income withholding order</b>", self.styles['CalcText']),
             Paragraph(f"${other_garnishments:,.2f}", self.styles['CalcValue'])],
            [Paragraph("<b>(4)(h) Calculate and record Line (4)(f) minus Line (4)(g)</b>", self.styles['CalcText']),
             Paragraph(f"${after_other:,.2f}", self.styles['CalcValue'])],
            [Paragraph("<b>(4)(i) Amount deducted for an undisputed debt owed to you by the ___ Judgment creditor "
             "____ Judgment debtor (check all that apply)</b>", self.styles['CalcText']),
             Paragraph(f"${undisputed_debt:,.2f}", self.styles['CalcValue'])],
            [Paragraph("<b>(4)(j) Calculate and record Line (4)(h) minus Line (4)(i)</b>", self.styles['CalcText']),
             Paragraph(f"${maximum_withholding:,.2f}", self.styles['CalcValue'])],
            [Paragraph("<b>(4)(k) What is the balance owed on the judgment?</b>", self.styles['CalcText']),
             Paragraph(f"${balance_owed:,.2f}", self.styles['CalcValue'])],
            [Paragraph("<b>(4)(l) Record the lesser amount from Line (4)(j) and Line (4)(k). This is the amount to be withheld.</b>", self.styles['CalcText']),
             Paragraph(f"${amount_to_withhold:,.2f}", self.styles['CalcValue'])],
        ]

        calc_table = Table(calc_data, colWidths=[5.0*inch, 2.0*inch])
        calc_table.setStyle(TableStyle([
            # General styling
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),

            # Highlight key rows
            # 4(d) Disposable earnings
            ('BACKGROUND', (0, 8), (-1, 8), colors.HexColor('#e0e0e0')),
            # 4(f) CCPA limit
            ('BACKGROUND', (0, 12), (-1, 12), colors.HexColor('#f0f0f0')),
            # 4(k) Balance owed
            ('BACKGROUND', (0, 17), (-1, 17), colors.HexColor('#ffffcc')),
            # 4(l) Amount to withhold
            ('BACKGROUND', (0, 18), (-1, 18), colors.HexColor('#ccffcc')),
        ]))
        elements.append(calc_table)
        elements.append(Spacer(1, 0.2*inch))

        # Declaration
        declaration = ("I declare under criminal penalty of Utah Code Section 78B-5-705 that "
                      "Interrogatories for Earnings and Garnishee's Answers is true and correct.")
        elements.append(Paragraph(declaration, self.styles['CustomBody']))
        elements.append(Spacer(1, 0.2*inch))

        # Signature block (A41:B47 from template)
        signature_data = [
            [Paragraph("<b>Signature</b>", self.styles['TableText']), ""],
            [Paragraph("<b>Printed Name</b>", self.styles['TableText']),
             Paragraph(company_info.get("contact_name", "Michael Knudson"), self.styles['TableText'])],
            [Paragraph("<b>Title:</b>", self.styles['TableText']),
             Paragraph(company_info.get("contact_title", "Manager, Payroll & Benefits"), self.styles['TableText'])],
            [Paragraph("<b>Direct Phone No.</b>", self.styles['TableText']),
             Paragraph(company_info.get("contact_phone", "801-532-4000"), self.styles['TableText'])],
            [Paragraph("<b>Fax Number</b>", self.styles['TableText']),
             Paragraph(company_info.get("contact_fax", "801-303-2628"), self.styles['TableText'])],
            [Paragraph("<b>Email Address</b>", self.styles['TableText']),
             Paragraph(company_info.get("contact_email", "mknudson@nbsbenefits.com"), self.styles['TableText'])],
        ]

        signature_table = Table(signature_data, colWidths=[2.0*inch, 5.0*inch])
        signature_table.setStyle(TableStyle([
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('LINEABOVE', (1, 0), (1, 0), 1, colors.black),  # Signature line
        ]))
        elements.append(signature_table)
        elements.append(Spacer(1, 0.2*inch))

        # Certificate of Service
        elements.append(Paragraph("<b>Certificate of Service</b>", self.styles['SectionTitle']))
        elements.append(Spacer(1, 0.05*inch))

        cert_text = ("I certify that I served a copy of this Garnishee's Answers to Interrogatories "
                    "for Earnings on the following people:")
        elements.append(Paragraph(cert_text, self.styles['CustomBody']))
        elements.append(Spacer(1, 0.1*inch))

        # Agency service info (A55:B63 from template)
        agency_service_data = [
            [Paragraph("<b>Name and Address</b>", self.styles['TableText']),
             Paragraph("<b>Method of Service</b>", self.styles['TableText'])],
            ["", ""],
            [Paragraph(garnishment_data.get("agency_name", ""), self.styles['TableText']),
             Paragraph("☐  Email", self.styles['TableText'])],
        ]

        # Add agency address lines if available
        agency_address = garnishment_data.get("agency_address", "")
        if agency_address:
            for line in agency_address.split('\n')[:3]:
                agency_service_data.append([Paragraph(line, self.styles['TableText']), ""])

        agency_phone = garnishment_data.get("agency_phone", "")
        agency_email = garnishment_data.get("agency_email", "")
        if agency_phone:
            agency_service_data.append([Paragraph(agency_phone, self.styles['TableText']), ""])
        if agency_email:
            agency_service_data.append([Paragraph(agency_email, self.styles['TableText']), ""])

        agency_table = Table(agency_service_data, colWidths=[4.0*inch, 3.0*inch])
        agency_table.setStyle(TableStyle([
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
        ]))
        elements.append(agency_table)
        elements.append(Spacer(1, 0.15*inch))

        # Employee service info (A65:B71 from template)
        employee_service_data = [
            [Paragraph("<b>Name and Address</b>", self.styles['TableText']),
             Paragraph("<b>Method of Service</b>", self.styles['TableText'])],
            ["", ""],
            [Paragraph(garnishment_data.get("employee_name", ""), self.styles['TableText']),
             Paragraph("☐  Email", self.styles['TableText'])],
        ]

        # Add employee address if available
        employee_address = garnishment_data.get("employee_address", "")
        if employee_address:
            for line in employee_address.split('\n')[:3]:
                employee_service_data.append([Paragraph(line, self.styles['TableText']), ""])

        employee_table = Table(employee_service_data, colWidths=[4.0*inch, 3.0*inch])
        employee_table.setStyle(TableStyle([
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
        ]))
        elements.append(employee_table)

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
pdf_service = GarnishmentPDFService()
