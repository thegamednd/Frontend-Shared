<template>
  <div v-if="hasError" class="error-boundary">
    <div class="error-content">
      <div class="error-icon">
        <span class="material-symbols-outlined">error</span>
      </div>
      <h2>Something went wrong</h2>
      <p>{{ errorMessage }}</p>
      <div class="error-actions">
        <button @click="retry" class="btn btn-primary">
          <span class="material-symbols-outlined">refresh</span>
          Try Again
        </button>
        <button @click="reportError" class="btn btn-secondary">
          <span class="material-symbols-outlined">bug_report</span>
          Report Issue
        </button>
      </div>
      <details v-if="showDetails" class="error-details">
        <summary>Technical Details</summary>
        <pre>{{ errorDetails }}</pre>
      </details>
    </div>
  </div>
  <slot v-else />
</template>

<script setup>
import { ref, onErrorCaptured } from 'vue';
import { useNotifications } from '@shared/composables/useNotifications';

const { notifyError } = useNotifications();

const hasError = ref(false);
const errorMessage = ref('');
const errorDetails = ref('');
const showDetails = ref(false);

const props = defineProps({
  fallback: {
    type: String,
    default: 'An unexpected error occurred. Please try again.'
  }
});

const emit = defineEmits(['error']);

onErrorCaptured((error, instance, info) => {
  hasError.value = true;
  errorMessage.value = error.message || props.fallback;
  errorDetails.value = `Error: ${error.message}\nComponent: ${instance?.$options.name || 'Unknown'}\nInfo: ${info}`;
  
  // Log error for debugging
  console.error('Error caught by boundary:', error, instance, info);
  
  // Emit error event
  emit('error', { error, instance, info });
  
  // Show notification
  notifyError(`Error: ${error.message}`);
  
  return false; // Prevent error from propagating
});

const retry = () => {
  hasError.value = false;
  errorMessage.value = '';
  errorDetails.value = '';
  showDetails.value = false;
};

const reportError = () => {
  // In a real app, this would send error report to monitoring service
  console.log('Error report:', errorDetails.value);
  notifyError('Error reporting is not yet implemented');
};
</script>

<style scoped>
.error-boundary {
  padding: 2rem;
  text-align: center;
  background: var(--background-color);
  border-radius: 8px;
  border: 1px solid #dc3545;
}

.error-content {
  max-width: 600px;
  margin: 0 auto;
}

.error-icon {
  font-size: 4rem;
  color: #dc3545;
  margin-bottom: 1rem;
}

.error-icon .material-symbols-outlined {
  font-size: 4rem;
}

.error-boundary h2 {
  color: #dc3545;
  margin-bottom: 1rem;
}

.error-boundary p {
  color: var(--font-color);
  margin-bottom: 2rem;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
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
}

.btn-primary {
  background: var(--secondary-color);
  color: white;
}

.btn-primary:hover {
  background: #27ae60;
}

.btn-secondary {
  background: transparent;
  color: var(--font-color);
  border: 1px solid var(--font-color);
}

.btn-secondary:hover {
  background: var(--font-color);
  color: var(--background-color);
}

.error-details {
  margin-top: 2rem;
  text-align: left;
}

.error-details summary {
  cursor: pointer;
  padding: 0.5rem;
  background: var(--fieldBg);
  border-radius: 4px;
  margin-bottom: 1rem;
}

.error-details pre {
  background: var(--fieldBg);
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.8rem;
  color: var(--font-color);
}
</style>
