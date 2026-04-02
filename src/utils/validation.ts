/**
 * Validation utilities for form data and user inputs
 */

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => boolean;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate a single field
 */
export const validateField = (value: unknown, rules: ValidationRule): string | null => {
  // Required check
  if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return rules.message || 'This field is required';
  }

  // Skip other validations if value is empty and not required
  if (!value && !rules.required) {
    return null;
  }

  // String length validations
  if (typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      return `Must be at least ${rules.minLength} characters`;
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      return `Must be at most ${rules.maxLength} characters`;
    }
  }

  // Number validations
  if (typeof value === 'number') {
    if (rules.min !== undefined && value < rules.min) {
      return `Must be at least ${rules.min}`;
    }
    if (rules.max !== undefined && value > rules.max) {
      return `Must be at most ${rules.max}`;
    }
  }

  // Pattern validation
  if (rules.pattern && !rules.pattern.test(String(value))) {
    return rules.message || 'Invalid format';
  }

  // Custom validation
  if (rules.custom && !rules.custom(value)) {
    return rules.message || 'Validation failed';
  }

  return null;
};

/**
 * Validate multiple fields
 */
export const validateFields = (
  data: Record<string, unknown>,
  rules: Record<string, ValidationRule>
): ValidationResult => {
  const errors: Record<string, string> = {};

  Object.keys(rules).forEach(field => {
    const error = validateField(data[field], rules[field]);
    if (error) {
      errors[field] = error;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Common validation patterns
 */
export const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s-()]+$/,
  url: /^https?:\/\/.+/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alphabetic: /^[a-zA-Z]+$/,
  numeric: /^[0-9]+$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
};

/**
 * Sanitize string input
 */
export const sanitizeString = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets to prevent XSS
    .replace(/\s+/g, ' '); // Normalize whitespace
};

/**
 * Validate email
 */
export const isValidEmail = (email: string): boolean => {
  return patterns.email.test(email);
};

/**
 * Validate date
 */
export const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && patterns.date.test(dateString);
};

/**
 * Validate date range
 */
export const isValidDateRange = (startDate: string, endDate: string): boolean => {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return false;
  }
  return new Date(startDate) <= new Date(endDate);
};

/**
 * Validate future date
 */
export const isFutureDate = (dateString: string): boolean => {
  if (!isValidDate(dateString)) {
    return false;
  }
  return new Date(dateString) > new Date();
};

/**
 * Validate past date
 */
export const isPastDate = (dateString: string): boolean => {
  if (!isValidDate(dateString)) {
    return false;
  }
  return new Date(dateString) < new Date();
};

/**
 * Event-specific validation
 */
export const validateEvent = (eventData: Record<string, unknown>): ValidationResult => {
  const rules: Record<string, ValidationRule> = {
    title: {
      required: true,
      minLength: 3,
      maxLength: 100,
      message: 'Title must be between 3 and 100 characters',
    },
    event_type: {
      required: true,
      message: 'Event type is required',
    },
    start_date: {
      required: true,
      custom: (value) => isValidDate(value),
      message: 'Valid start date is required',
    },
    end_date: {
      custom: (value) => {
        if (!value) return true; // Optional
        if (!isValidDate(value)) return false;
        return isValidDateRange(eventData.start_date, value);
      },
      message: 'End date must be after start date',
    },
    priority: {
      required: true,
      custom: (value) => ['low', 'medium', 'high', 'critical'].includes(value),
      message: 'Invalid priority',
    },
    status: {
      required: true,
      custom: (value) =>
        ['scheduled', 'in_progress', 'completed', 'cancelled'].includes(value),
      message: 'Invalid status',
    },
  };

  // Add recurring event validation
  if (eventData.is_recurring) {
    rules.recurrence_pattern = {
      required: true,
      custom: (value) => ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'].includes(value),
      message: 'Valid recurrence pattern is required for recurring events',
    };
  }

  return validateFields(eventData, rules);
};

/**
 * Employee-specific validation
 */
export const validateEmployee = (employeeData: Record<string, unknown>): ValidationResult => {
  const rules: Record<string, ValidationRule> = {
    first_name: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: patterns.alphabetic,
      message: 'Valid first name is required (letters only)',
    },
    last_name: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: patterns.alphabetic,
      message: 'Valid last name is required (letters only)',
    },
    employee_id: {
      required: true,
      minLength: 2,
      maxLength: 20,
      message: 'Employee ID must be between 2 and 20 characters',
    },
    hire_date: {
      required: true,
      custom: (value) => isValidDate(value) && isPastDate(value),
      message: 'Hire date must be a valid past date',
    },
  };

  return validateFields(employeeData, rules);
};

export default {
  validateField,
  validateFields,
  validateEvent,
  validateEmployee,
  patterns,
  sanitizeString,
  isValidEmail,
  isValidDate,
  isValidDateRange,
  isFutureDate,
  isPastDate,
};
