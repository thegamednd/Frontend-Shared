import { ref, computed, watch } from 'vue';

export function useValidation() {
  const errors = ref({});
  const touched = ref({});
  
  // Validation rules
  const rules = {
    required: (value, message = 'This field is required') => {
      return value !== null && value !== undefined && value.toString().trim() !== '' ? null : message;
    },
    
    email: (value, message = 'Please enter a valid email address') => {
      if (!value) return null; // Let required rule handle empty values
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value) ? null : message;
    },
    
    minLength: (min, message) => (value) => {
      if (!value) return null;
      return value.length >= min ? null : message || `Minimum ${min} characters required`;
    },
    
    maxLength: (max, message) => (value) => {
      if (!value) return null;
      return value.length <= max ? null : message || `Maximum ${max} characters allowed`;
    },
    
    pattern: (regex, message = 'Invalid format') => (value) => {
      if (!value) return null;
      return regex.test(value) ? null : message;
    },
    
    numeric: (value, message = 'Please enter a valid number') => {
      if (!value) return null;
      return !isNaN(value) && !isNaN(parseFloat(value)) ? null : message;
    },
    
    min: (min, message) => (value) => {
      if (!value) return null;
      const num = parseFloat(value);
      return num >= min ? null : message || `Value must be at least ${min}`;
    },
    
    max: (max, message) => (value) => {
      if (!value) return null;
      const num = parseFloat(value);
      return num <= max ? null : message || `Value must be at most ${max}`;
    },
    
    url: (value, message = 'Please enter a valid URL') => {
      if (!value) return null;
      try {
        new URL(value);
        return null;
      } catch {
        return message;
      }
    },
    
    match: (otherValue, message = 'Values do not match') => (value) => {
      return value === otherValue ? null : message;
    },
    
    custom: (validator, message = 'Validation failed') => (value) => {
      try {
        return validator(value) ? null : message;
      } catch {
        return message;
      }
    }
  };
  
  // Create a field validator
  const createField = (initialValue = '', validationRules = []) => {
    const value = ref(initialValue);
    const fieldErrors = computed(() => {
      if (!touched.value[fieldId]) return [];
      
      const allErrors = [];
      for (const rule of validationRules) {
        const error = rule(value.value);
        if (error) allErrors.push(error);
      }
      return allErrors;
    });
    
    const fieldId = Math.random().toString(36).substr(2, 9);
    const isValid = computed(() => fieldErrors.value.length === 0);
    const firstError = computed(() => fieldErrors.value[0] || null);
    
    const touch = () => {
      touched.value[fieldId] = true;
    };
    
    const reset = () => {
      value.value = initialValue;
      touched.value[fieldId] = false;
    };
    
    // Auto-touch on blur or when value changes after initial interaction
    watch(value, () => {
      if (touched.value[fieldId]) {
        // Re-validate immediately if already touched
      }
    });
    
    return {
      value,
      errors: fieldErrors,
      isValid,
      firstError,
      touch,
      reset,
      fieldId
    };
  };
  
  // Form validation
  const createForm = (fields) => {
    const isValid = computed(() => {
      return Object.values(fields).every(field => field.isValid.value);
    });
    
    const allErrors = computed(() => {
      const formErrors = {};
      Object.keys(fields).forEach(key => {
        if (fields[key].errors.value.length > 0) {
          formErrors[key] = fields[key].errors.value;
        }
      });
      return formErrors;
    });
    
    const hasErrors = computed(() => {
      return Object.keys(allErrors.value).length > 0;
    });
    
    const touchAll = () => {
      Object.values(fields).forEach(field => field.touch());
    };
    
    const resetAll = () => {
      Object.values(fields).forEach(field => field.reset());
    };
    
    const validate = () => {
      touchAll();
      return isValid.value;
    };
    
    const getFormData = () => {
      const data = {};
      Object.keys(fields).forEach(key => {
        data[key] = fields[key].value.value;
      });
      return data;
    };
    
    return {
      fields,
      isValid,
      allErrors,
      hasErrors,
      touchAll,
      resetAll,
      validate,
      getFormData
    };
  };
  
  // Async validation
  const createAsyncValidator = (asyncFn, debounceMs = 500) => {
    const isValidating = ref(false);
    const error = ref(null);
    let timeoutId = null;
    
    const validate = async (value) => {
      if (timeoutId) clearTimeout(timeoutId);
      
      return new Promise((resolve) => {
        timeoutId = setTimeout(async () => {
          isValidating.value = true;
          error.value = null;
          
          try {
            const result = await asyncFn(value);
            error.value = result;
            resolve(result);
          } catch (err) {
            error.value = 'Validation error occurred';
            resolve('Validation error occurred');
          } finally {
            isValidating.value = false;
          }
        }, debounceMs);
      });
    };
    
    return {
      validate,
      isValidating,
      error
    };
  };
  
  // Common validation patterns
  const commonValidations = {
    username: [
      rules.required(),
      rules.minLength(3, 'Username must be at least 3 characters'),
      rules.maxLength(20, 'Username must be no more than 20 characters'),
      rules.pattern(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
    ],
    
    password: [
      rules.required(),
      rules.minLength(8, 'Password must be at least 8 characters'),
      rules.pattern(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter'),
      rules.pattern(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter'),
      rules.pattern(/(?=.*\d)/, 'Password must contain at least one number'),
      rules.pattern(/(?=.*[!@#$%^&*])/, 'Password must contain at least one special character')
    ],
    
    realmName: [
      rules.required(),
      rules.minLength(3, 'Realm name must be at least 3 characters'),
      rules.maxLength(50, 'Realm name must be no more than 50 characters')
    ],
    
    description: [
      rules.maxLength(500, 'Description must be no more than 500 characters')
    ]
  };
  
  return {
    rules,
    createField,
    createForm,
    createAsyncValidator,
    commonValidations
  };
}

// Utility functions for common validation scenarios
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password) {
  const minLength = password.length >= 8;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  return {
    isValid: minLength && hasLower && hasUpper && hasNumber && hasSpecial,
    requirements: {
      minLength,
      hasLower,
      hasUpper,
      hasNumber,
      hasSpecial
    }
  };
}

export function sanitizeInput(input, allowHtml = false) {
  if (typeof input !== 'string') return input;
  
  if (allowHtml) {
    // Basic HTML sanitization - in production, use a library like DOMPurify
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+="[^"]*"/gi, '');
  }
  
  // Escape HTML entities
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
