<template>
  <form @submit.prevent="handleSubmit" class="enhanced-form" :class="{ disabled: isSubmitting }">
    <div v-if="title" class="form-header">
      <h2>{{ title }}</h2>
      <p v-if="description" class="form-description">{{ description }}</p>
    </div>
    
    <div class="form-body">
      <slot :isSubmitting="isSubmitting" :errors="allErrors" />
    </div>
    
    <div v-if="$slots.actions || showDefaultActions" class="form-actions">
      <slot name="actions" :isSubmitting="isSubmitting" :isValid="isValid">
        <div class="default-actions">
          <button 
            type="button" 
            @click="handleCancel"
            class="btn btn-secondary"
            :disabled="isSubmitting"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            class="btn btn-primary"
            :disabled="!isValid || isSubmitting"
          >
            <LoadingState v-if="isSubmitting" type="spinner" inline />
            <span v-else>{{ submitText }}</span>
          </button>
        </div>
      </slot>
    </div>
    
    <!-- Global form errors -->
    <div v-if="hasGlobalErrors" class="form-errors">
      <div v-for="error in globalErrors" :key="error" class="error-message">
        <span class="material-symbols-outlined">error</span>
        {{ error }}
      </div>
    </div>
  </form>
</template>

<script setup>
import { ref, computed, watch, provide } from 'vue';
import LoadingState from '@shared/components/LoadingState.vue';
import { useNotifications } from '@shared/composables/useNotifications';

const { notifySuccess, notifyError } = useNotifications();

const props = defineProps({
  title: String,
  description: String,
  submitText: {
    type: String,
    default: 'Submit'
  },
  showDefaultActions: {
    type: Boolean,
    default: true
  },
  validationSchema: Object,
  modelValue: Object,
  onSubmit: Function,
  onCancel: Function
});

const emit = defineEmits(['submit', 'cancel', 'update:modelValue']);

const isSubmitting = ref(false);
const globalErrors = ref([]);
const formData = ref(props.modelValue || {});

// Validation state
const fieldErrors = ref({});
const touchedFields = ref({});

const isValid = computed(() => {
  return Object.keys(fieldErrors.value).length === 0 && globalErrors.value.length === 0;
});

const allErrors = computed(() => ({
  ...fieldErrors.value,
  global: globalErrors.value
}));

const hasGlobalErrors = computed(() => globalErrors.value.length > 0);

// Watch for external updates to modelValue
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    formData.value = { ...newValue };
  }
}, { deep: true });

// Emit updates to parent
watch(formData, (newValue) => {
  emit('update:modelValue', newValue);
}, { deep: true });

// Validation logic
const validateField = (fieldName, value) => {
  if (!props.validationSchema || !props.validationSchema[fieldName]) {
    return [];
  }
  
  const rules = props.validationSchema[fieldName];
  const errors = [];
  
  for (const rule of rules) {
    const error = rule(value);
    if (error) {
      errors.push(error);
    }
  }
  
  if (errors.length > 0) {
    fieldErrors.value[fieldName] = errors;
  } else {
    delete fieldErrors.value[fieldName];
  }
  
  return errors;
};

const validateAllFields = () => {
  Object.keys(formData.value).forEach(fieldName => {
    touchedFields.value[fieldName] = true;
    validateField(fieldName, formData.value[fieldName]);
  });
};

const handleSubmit = async () => {
  globalErrors.value = [];
  validateAllFields();
  
  if (!isValid.value) {
    notifyError('Please fix the form errors before submitting');
    return;
  }
  
  isSubmitting.value = true;
  
  try {
    if (props.onSubmit) {
      await props.onSubmit(formData.value);
    } else {
      emit('submit', formData.value);
    }
    notifySuccess('Form submitted successfully');
  } catch (error) {
    if (typeof error === 'string') {
      globalErrors.value.push(error);
    } else if (error.message) {
      globalErrors.value.push(error.message);
    } else if (error.errors) {
      // Handle validation errors from API
      Object.keys(error.errors).forEach(field => {
        fieldErrors.value[field] = Array.isArray(error.errors[field]) 
          ? error.errors[field] 
          : [error.errors[field]];
      });
    } else {
      globalErrors.value.push('An unexpected error occurred');
    }
    notifyError('Failed to submit form');
  } finally {
    isSubmitting.value = false;
  }
};

const handleCancel = () => {
  if (props.onCancel) {
    props.onCancel();
  } else {
    emit('cancel');
  }
};

// Provide methods to child components
const updateField = (fieldName, value) => {
  formData.value[fieldName] = value;
  
  // Validate immediately if field was already touched
  if (touchedFields.value[fieldName]) {
    validateField(fieldName, value);
  }
};

const touchField = (fieldName) => {
  touchedFields.value[fieldName] = true;
  validateField(fieldName, formData.value[fieldName]);
};

const clearErrors = () => {
  fieldErrors.value = {};
  globalErrors.value = [];
};

// Expose methods to parent
defineExpose({
  validate: validateAllFields,
  clearErrors,
  setErrors: (errors) => {
    fieldErrors.value = { ...fieldErrors.value, ...errors };
  },
  setGlobalError: (error) => {
    globalErrors.value.push(error);
  }
});

// Provide context to child components
provide('formContext', {
  formData,
  fieldErrors,
  touchedFields,
  isSubmitting,
  updateField,
  touchField,
  validateField
});
</script>

<style scoped>
.enhanced-form {
  background: var(--fieldBg);
  border-radius: 0.5rem;
  border: 1px solid var(--input-border);
  padding: 2rem;
  max-width: 600px;
  margin: 0 auto;
}

.enhanced-form.disabled {
  opacity: 0.7;
  pointer-events: none;
}

.form-header {
  margin-bottom: 2rem;
  text-align: center;
}

.form-header h2 {
  margin-bottom: 0.5rem;
}

.form-description {
  color: #888;
  margin: 0;
}

.form-body {
  margin-bottom: 2rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--input-border);
}

.default-actions {
  display: flex;
  gap: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  min-width: 100px;
  justify-content: center;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--secondary-color);
  color: white;
}

.btn-primary:not(:disabled):hover {
  background: #27ae60;
}

.btn-secondary {
  background: transparent;
  color: var(--font-color);
  border: 1px solid var(--font-color);
}

.btn-secondary:not(:disabled):hover {
  background: var(--font-color);
  color: var(--background-color);
}

.form-errors {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--input-border);
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #dc3545;
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  background: rgba(220, 53, 69, 0.1);
  border-radius: 0.25rem;
}

.error-message .material-symbols-outlined {
  font-size: 1.2rem;
}
</style>
