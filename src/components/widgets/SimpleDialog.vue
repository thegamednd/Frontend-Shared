<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click="$emit('close')">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button @click="$emit('close')" class="close-btn">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <p>{{ message }}</p>
        </div>
        <div class="modal-footer">
          <button @click="$emit('close')" class="btn-ok">OK</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  message: {
    type: String,
    default: '',
  },
});

defineEmits(['close']);
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--theme-bg-overlay, rgba(0, 0, 0, 0.7));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
}

.modal-content {
  background: linear-gradient(135deg, var(--theme-bg-surface, #1a1f2e) 0%, #2a3a5a 100%);
  border: 1px solid var(--theme-accent, #c9a84c);
  border-radius: 1rem;
  padding: 0;
  width: 90%;
  max-width: 420px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #444;
}

.modal-header h3 {
  margin: 0;
  color: var(--theme-accent, #c9a84c);
  font-size: 1.25rem;
  font-family: 'Pirata One', 'Cinzel', cursive;
}

.close-btn {
  background: transparent;
  border: none;
  color: #aaa;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: color 0.2s ease;
}

.close-btn:hover {
  color: #fff;
}

.modal-body {
  padding: 1.5rem;
}

.modal-body p {
  margin: 0;
  color: #fff;
  font-size: 1rem;
  line-height: 1.5;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 1rem 1.5rem;
  border-top: 1px solid #444;
}

.btn-ok {
  padding: 0.5rem 1.5rem;
  background: linear-gradient(135deg, var(--theme-accent, #c9a84c) 0%, #e6b373 100%);
  color: var(--theme-bg-surface, #1a1f2e);
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.2s ease;
}

.btn-ok:hover {
  background: linear-gradient(135deg, #e6b373 0%, #d4a566 100%);
  transform: translateY(-1px);
}
</style>
