<template>
  <div class="form-field" :class="{ 'has-error': hasError, 'is-focused': isFocused }">
    <label v-if="label" :for="fieldId" class="field-label">
      {{ label }}
      <span v-if="required" class="required-indicator">*</span>
    </label>
    
    <div class="field-wrapper">
      <!-- Text Input -->
      <input
        v-if="type === 'text' || type === 'email' || type === 'password' || type === 'url'"
        :id="fieldId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :maxlength="maxLength"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
        class="field-input"
        ref="inputRef"
      />
      
      <!-- Number Input -->
      <input
        v-else-if="type === 'number'"
        :id="fieldId"
        type="number"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :min="min"
        :max="max"
        :step="step"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
        class="field-input"
        ref="inputRef"
      />
      
      <!-- Textarea -->
      <textarea
        v-else-if="type === 'textarea'"
        :id="fieldId"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :maxlength="maxLength"
        :rows="rows"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
        class="field-input field-textarea"
        ref="inputRef"
      ></textarea>
      
      <!-- Select -->
      <select
        v-else-if="type === 'select'"
        :id="fieldId"
        :value="modelValue"
        :disabled="disabled"
        @change="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
        class="field-input field-select"
        ref="inputRef"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option 
          v-for="option in options" 
          :key="getOptionValue(option)"
          :value="getOptionValue(option)"
        >
          {{ getOptionLabel(option) }}
        </option>
      </select>
      
      <!-- Checkbox -->
      <label
        v-else-if="type === 'checkbox'"
        :for="fieldId"
        class="checkbox-wrapper"
      >
        <input
          :id="fieldId"
          type="checkbox"
          :checked="modelValue"
          :disabled="disabled"
          @change="handleCheckboxChange"
          @blur="handleBlur"
          @focus="handleFocus"
          class="field-checkbox"
          ref="inputRef"
        />
        <span class="checkbox-indicator"></span>
        <span v-if="checkboxLabel" class="checkbox-label">{{ checkboxLabel }}</span>
      </label>
      
      <!-- Character count for text inputs -->
      <div v-if="showCharCount && maxLength" class="char-count">
        {{ (modelValue?.toString() || '').length }} / {{ maxLength }}
      </div>
    </div>
    
    <!-- Field hint -->
    <div v-if="hint && !hasError" class="field-hint">
      {{ hint }}
    </div>
    
    <!-- Field errors -->
    <div v-if="hasError" class="field-errors">
      <div v-for="error in fieldErrors" :key="error" class="field-error">
        <span class="material-symbols-outlined">error</span>
        {{ error }}
      </div>
    </div>
    
    <!-- Field icon -->
    <div v-if="icon" class="field-icon">
      <span class="material-symbols-outlined">{{ icon }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, watch } from 'vue';

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  label: String,
  type: {
    type: String,
    default: 'text',
    validator: (value) => [
      'text', 'email', 'password', 'number', 'textarea', 
      'select', 'checkbox', 'url'
    ].includes(value)
  },
  modelValue: {
    type: [String, Number, Boolean],
    default: ''
  },
  placeholder: String,
  hint: String,
  required: Boolean,
  disabled: Boolean,
  readonly: Boolean,
  maxLength: Number,
  min: Number,
  max: Number,
  step: Number,
  rows: {
    type: Number,
    default: 4
  },
  options: Array, // For select fields
  optionValue: {
    type: String,
    default: 'value'
  },
  optionLabel: {
    type: String,
    default: 'label'
  },
  checkboxLabel: String, // For checkbox fields
  showCharCount: Boolean,
  icon: String,
  validationRules: Array
});

const emit = defineEmits(['update:modelValue', 'blur', 'focus']);

// Form context from parent form
const formContext = inject('formContext', null);

const inputRef = ref(null);
const isFocused = ref(false);
const fieldId = `field-${Math.random().toString(36).substr(2, 9)}`;

// Error state
const fieldErrors = computed(() => {
  if (formContext && formContext.fieldErrors.value[props.name]) {
    return formContext.fieldErrors.value[props.name];
  }
  return [];
});

const hasError = computed(() => fieldErrors.value.length > 0);

// Event handlers
const handleInput = (event) => {
  let value = event.target.value;
  
  // Type conversion for number inputs
  if (props.type === 'number' && value !== '') {
    value = parseFloat(value);
    if (isNaN(value)) value = '';
  }
  
  emit('update:modelValue', value);
  
  // Update form context if available
  if (formContext) {
    formContext.updateField(props.name, value);
  }
};

const handleCheckboxChange = (event) => {
  const value = event.target.checked;
  emit('update:modelValue', value);
  
  if (formContext) {
    formContext.updateField(props.name, value);
  }
};

const handleBlur = (event) => {
  isFocused.value = false;
  emit('blur', event);
  
  // Mark field as touched in form context
  if (formContext) {
    formContext.touchField(props.name);
  }
};

const handleFocus = (event) => {
  isFocused.value = true;
  emit('focus', event);
};

// Option helpers for select fields
const getOptionValue = (option) => {
  if (typeof option === 'object') {
    return option[props.optionValue];
  }
  return option;
};

const getOptionLabel = (option) => {
  if (typeof option === 'object') {
    return option[props.optionLabel];
  }
  return option;
};

// Methods
const focus = () => {
  inputRef.value?.focus();
};

const blur = () => {
  inputRef.value?.blur();
};

// Watch for external validation
watch(() => props.validationRules, (newRules) => {
  if (newRules && formContext) {
    formContext.validateField(props.name, props.modelValue);
  }
}, { immediate: true });

// Initialize form data
onMounted(() => {
  if (formContext && props.modelValue !== undefined) {
    formContext.updateField(props.name, props.modelValue);
  }
});

// Expose methods
defineExpose({
  focus,
  blur,
  inputRef
});
</script>

<style scoped>
.form-field {
  margin-bottom: 1.5rem;
  position: relative;
}

.field-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--font-color);
}

.required-indicator {
  color: #dc3545;
  margin-left: 0.25rem;
}

.field-wrapper {
  position: relative;
}

.field-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--input-border);
  border-radius: 0.5rem;
  background: var(--input-bg);
  color: var(--input-color);
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.field-input:focus {
  outline: none;
  border-color: var(--secondary-color);
  box-shadow: 0 0 0 2px rgba(46, 204, 113, 0.2);
}

.field-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.field-textarea {
  resize: vertical;
  min-height: 100px;
}

.field-select {
  cursor: pointer;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  user-select: none;
}

.field-checkbox {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.checkbox-indicator {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid var(--input-border);
  border-radius: 0.25rem;
  background: var(--input-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  position: relative;
}

.field-checkbox:checked + .checkbox-indicator {
  background: var(--secondary-color);
  border-color: var(--secondary-color);
}

.field-checkbox:checked + .checkbox-indicator::after {
  content: '✓';
  color: white;
  font-weight: bold;
  font-size: 0.875rem;
}

.checkbox-label {
  flex: 1;
}

.char-count {
  position: absolute;
  right: 0.75rem;
  bottom: 0.75rem;
  font-size: 0.75rem;
  color: #888;
  background: var(--input-bg);
  padding: 0.25rem;
  border-radius: 0.25rem;
}

.field-hint {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #888;
}

.field-errors {
  margin-top: 0.5rem;
}

.field-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #dc3545;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.field-error .material-symbols-outlined {
  font-size: 1rem;
}

.field-icon {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #888;
  pointer-events: none;
}

.has-error .field-input {
  border-color: #dc3545;
}

.has-error .field-input:focus {
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.2);
}

.is-focused .field-label {
  color: var(--secondary-color);
}
</style>
