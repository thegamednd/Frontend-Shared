<template>
  <dialog ref="dialog" class="delete-dialog">
    <div class="dialog-content">
      <div class="modal-header">
        <span class="material-symbols-outlined warning-icon">delete_forever</span>
        <h2>Permanently Delete Race</h2>
        <button type="button" @click="handleCancel" class="close-btn">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <p class="warning-message">
          You are about to permanently delete the race <strong>{{ raceName }}</strong>.
        </p>

        <div class="delete-warning">
          <span class="material-symbols-outlined">warning</span>
          <div class="warning-text">
            <p>
              <strong>This action cannot be undone.</strong> The race will be permanently removed from the database and cannot be recovered.
            </p>
          </div>
        </div>

        <div class="acknowledgment-section">
          <label class="checkbox-label">
            <input
              type="checkbox"
              v-model="acknowledged"
              class="acknowledgment-checkbox"
            />
            <span>I understand this will permanently delete <strong>{{ raceName }}</strong></span>
          </label>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" @click="handleCancel" class="btn-cancel">
          <span class="material-symbols-outlined">close</span>
          Cancel
        </button>
        <button
          type="button"
          @click="handleConfirm"
          class="btn-confirm"
          :disabled="!acknowledged"
        >
          <span class="material-symbols-outlined">delete_forever</span>
          Delete Permanently
        </button>
      </div>
    </div>
  </dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  raceName: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['confirm', 'cancel']);

const dialog = ref(null);
const acknowledged = ref(false);

function handleConfirm() {
  if (acknowledged.value) {
    emit('confirm');
  }
}

function handleCancel() {
  acknowledged.value = false;
  emit('cancel');
}

function show() {
  acknowledged.value = false;
  dialog.value?.showModal();
}

function close() {
  acknowledged.value = false;
  dialog.value?.close();
}

defineExpose({
  show,
  close
});
</script>

<style scoped>
.delete-dialog {
  border: none;
  border-radius: 1rem;
  padding: 0;
  max-width: 600px;
  width: 90%;
  background: transparent;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.delete-dialog::backdrop {
  background: rgba(0, 0, 0, 0.8);
}

.dialog-content {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 2px solid rgba(239, 68, 68, 0.3);
  border-radius: 1rem;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem 2rem;
  background: rgba(239, 68, 68, 0.1);
  border-bottom: 1px solid rgba(239, 68, 68, 0.2);
}

.modal-header .warning-icon {
  font-size: 2.5rem;
  color: #ef4444;
}

.modal-header h2 {
  margin: 0;
  color: #ef4444;
  font-size: 1.5rem;
  font-weight: 700;
  flex: 1;
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.close-btn .material-symbols-outlined {
  font-size: 1.5rem;
}

.modal-body {
  padding: 2rem;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.warning-message {
  margin: 0;
  font-size: 1.1rem;
  line-height: 1.6;
}

.warning-message strong {
  color: var(--theme-accent);
}

.delete-warning {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 0.75rem;
}

.delete-warning .material-symbols-outlined {
  font-size: 2rem;
  color: #f59e0b;
  flex-shrink: 0;
}

.warning-text {
  flex: 1;
}

.warning-text p {
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
}

.warning-text strong {
  color: #ef4444;
}

.acknowledgment-section {
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1.5;
}

.checkbox-label strong {
  color: var(--theme-accent);
}

.acknowledgment-checkbox {
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
  flex-shrink: 0;
}

.modal-footer {
  display: flex;
  gap: 1rem;
  padding: 1.5rem 2rem;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(239, 68, 68, 0.2);
}

.modal-footer button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.btn-confirm {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: #ffffff;
}

.btn-confirm:hover:not(:disabled) {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.modal-footer button .material-symbols-outlined {
  font-size: 1.25rem;
}

/* Responsive */
@media (max-width: 640px) {
  .modal-content {
    margin: 1rem;
  }

  .modal-header {
    padding: 1rem 1.5rem;
  }

  .modal-header h2 {
    font-size: 1.25rem;
  }

  .modal-body {
    padding: 1.5rem;
  }

  .modal-footer {
    flex-direction: column;
    padding: 1rem 1.5rem;
  }

  .modal-footer button {
    width: 100%;
  }
}
</style>
