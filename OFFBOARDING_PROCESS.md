# Offboarding Process Documentation

## Overview
This document outlines the comprehensive 25-step offboarding process implemented in the HR Dashboard. The process ensures consistent, compliant, and thorough handling of all employee terminations.

## Accessing the Checklist

The default offboarding checklist is available via API:
```
GET /offboarding/checklist/default
```

This returns the complete 25-task checklist with all details, timing, and assignments.

## Complete Offboarding Process

### 1. Initial Setup (7 days before termination)
- **Schedule Exit Interview** - Schedule exit interview with departing employee (HR)
- **Send Exit Survey (If Voluntary)** - For voluntary terminations, send exit survey to employee (HR)

### 2. Documentation (5 days before termination)

#### For Full-Time Employees:
- Send Equitable Portability Form
- Send Equitable Conversion Form
- Send Important Information for Terminating Employee
- Send Non-Solicitation and Confidentiality Document

#### For Part-Time Employees:
- Send Important Information
- Send Non-Solicitation Document

### 3. Equipment Return (5-3 days before termination)
- **Check for Equipment to Return** - Determine if employee has any company equipment (IT/HR)
- **Send Equipment Return Label (If Applicable)** - If equipment exists, send return shipping label (IT)

### 4. Communication (3 days before termination)
- **Send Exit Document Email to Employee** - Email all completed exit documents to employee (HR)

### 5. Exit Interview (2 days before termination)
- **Conduct Exit Interview** - Hold scheduled exit interview with employee (HR Manager)

### 6. System Processing (Termination Day)
- **Submit Termination Ticket via Zoho Service Desk** - Create termination ticket in Zoho (HR)
- **Send NBS Term Emails** - Send termination notification emails to NBS (HR)

### 7. PTO & Payroll (Termination Day)
- **Calculate Final PTO and Shut Off PTO Accrual** - Calculate final PTO payout and disable accrual (Payroll)
- **Process Final Paycheck** - Process employee's final paycheck including PTO payout (Payroll)
- **Download Reports** - Download all necessary payroll and employee reports (Payroll)
- **Send Funds Transfer Email to Shelli** - Send funds transfer notification for final paycheck (Payroll)

### 8. Benefits & Contributions (1-2 days after termination)
- **Process Final Contribution Upload (If Applicable)** - Upload final HSA/FSA/401k contributions (Payroll/HR)
- **Notify Garnishment Agency (If Applicable)** - Notify garnishment agency of termination (Payroll)
- **Send COBRA Notice (If Applicable)** - Send COBRA continuation notice to eligible employees (HR)

### 9. System Termination (1 day after termination)
- **Terminate in Paylocity** - Process termination in Paylocity system (Payroll)

### 10. Final Documentation (2-3 days after termination)
- **Complete Term Checklist (Including I-9 Completion Date)** - Complete checklist and record I-9 date (HR)
- **Download and Save All Documents to Employee Folder** - Download all documents and save (HR)
- **Move Folder to Old Employees Folder** - Archive employee folder (HR)

## Task Categories

Tasks are organized into the following categories:
- **Initial Setup** - Scheduling and preparation
- **Documentation** - Exit documents and forms
- **Equipment** - Company asset return
- **Communication** - Employee correspondence
- **Interview** - Exit interview process
- **Systems** - IT and system access
- **Payroll** - Final pay and calculations
- **Benefits** - Insurance and retirement
- **Compliance** - Legal requirements
- **Records** - Documentation and archiving

## Task Priorities

- **Critical** - Must be completed on exact day (payroll processing, system access)
- **High** - Important compliance or communication tasks
- **Medium** - Supporting tasks with some flexibility
- **Low** - Nice-to-have or informational tasks

## Conditional Tasks

Some tasks are conditional based on employee status:
- **voluntary** - Only for voluntary terminations
- **full_time** - Only for full-time employees
- **part_time** - Only for part-time employees
- **has_equipment** - Only if employee has company equipment
- **has_benefits** - Only if employee has active benefits
- **has_garnishment** - Only if employee has active garnishments
- **cobra_eligible** - Only for COBRA-eligible employees

## Timeline

The standard offboarding process spans **10 days**:
- **Days -7 to -2**: Pre-termination preparation
- **Day 0**: Termination date (final day of work)
- **Days +1 to +3**: Post-termination wrap-up

## Using the Checklist

When an employee termination is processed:

1. The system automatically creates tasks based on the default checklist
2. Tasks are assigned to appropriate roles (HR, Payroll, IT, etc.)
3. Due dates are calculated based on the termination date
4. Conditional tasks are included/excluded based on employee status
5. Tasks can be tracked, updated, and marked complete in the Offboarding page

## API Integration

The offboarding system provides REST API endpoints for:
- Creating offboarding tasks for an employee
- Retrieving tasks by employee
- Updating task status
- Generating offboarding reports

See `/offboarding` API documentation for complete endpoint details.

## Customization

The default checklist can be customized by:
1. Editing the JSON file at: `backend/app/config/default_offboarding_checklist.json`
2. Creating custom templates via the API
3. Adding/removing tasks per employee as needed

## Compliance Notes

This checklist ensures compliance with:
- ✅ Federal I-9 retention requirements
- ✅ COBRA notification deadlines (within 14 days)
- ✅ State final paycheck laws
- ✅ Benefits portability requirements (Equitable)
- ✅ Garnishment termination notifications
- ✅ Document retention policies

## Summary

The comprehensive 25-step offboarding process ensures:
- ✅ No steps are missed
- ✅ Legal compliance is maintained
- ✅ Smooth transition for departing employees
- ✅ Complete documentation
- ✅ Proper system access termination
- ✅ Accurate final payroll processing
- ✅ Benefit continuation offered when required

For questions or issues with the offboarding process, contact the HR team or refer to the HR Dashboard documentation.
