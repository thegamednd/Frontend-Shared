<template>
  <div class="trait-editor" :class="{ 'is-readonly': readonly }">
    <ul v-if="items.length" class="trait-list">
      <li v-for="(trait, i) in items" :key="i" class="trait-card">
        <span class="trait-index">{{ i + 1 }}</span>

        <div class="trait-fields">
          <input
            :value="trait.name"
            @input="setName(i, $event.target.value)"
            type="text"
            class="trait-name-input"
            placeholder="Trait name (e.g. Darkvision)"
            :readonly="readonly"
          />
          <textarea
            :value="trait.description"
            @input="setDescription(i, $event.target.value)"
            class="trait-desc-input"
            rows="2"
            placeholder="What does this trait do?"
            :readonly="readonly"
          ></textarea>
        </div>

        <button
          v-if="!readonly"
          type="button"
          class="trait-remove"
          title="Remove trait"
          @click="removeTrait(i)"
        >
          <span class="material-symbols-outlined">close</span>
        </button>
      </li>
    </ul>

    <p v-else-if="readonly" class="trait-empty">No traits.</p>

    <button v-if="!readonly" type="button" class="trait-add" @click="addTrait">
      <span class="material-symbols-outlined">add</span>
      Add trait
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  readonly: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);

// Tolerate legacy string traits as well as the canonical { name, description } shape.
const items = computed(() =>
  (props.modelValue || []).map((t) =>
    typeof t === 'string'
      ? { name: t, description: '' }
      : { name: t?.name || '', description: t?.description || '' }
  )
);

function commit(list) {
  emit('update:modelValue', list);
}
function addTrait() {
  commit([...items.value, { name: '', description: '' }]);
}
function removeTrait(i) {
  commit(items.value.filter((_, idx) => idx !== i));
}
function setName(i, value) {
  commit(items.value.map((t, idx) => (idx === i ? { ...t, name: value } : t)));
}
function setDescription(i, value) {
  commit(items.value.map((t, idx) => (idx === i ? { ...t, description: value } : t)));
}
</script>

<style scoped>
.trait-editor {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.trait-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.trait-card {
  position: relative;
  display: flex;
  gap: 0.75rem;
  padding: 0.85rem 0.85rem 0.85rem 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-left: 2px solid color-mix(in srgb, var(--theme-accent) 55%, transparent);
  border-radius: 0.6rem;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.trait-card:focus-within {
  border-color: color-mix(in srgb, var(--theme-accent) 45%, transparent);
  border-left-color: var(--theme-accent);
  background: rgba(255, 255, 255, 0.05);
}

.trait-index {
  flex: 0 0 auto;
  width: 1.6rem;
  height: 1.6rem;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1;
}

.trait-fields {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.trait-name-input,
.trait-desc-input {
  width: 100%;
  padding: 0.5rem 0.65rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.4rem;
  color: #ffffff;
  font-family: inherit;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.trait-name-input {
  font-weight: 600;
  font-size: 0.95rem;
}

.trait-desc-input {
  font-size: 0.9rem;
  line-height: 1.4;
  resize: vertical;
  min-height: 2.6rem;
  color: #d6d6d6;
}

.trait-name-input:focus,
.trait-desc-input:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--theme-accent) 50%, transparent);
  background: rgba(255, 255, 255, 0.08);
}

.trait-name-input::placeholder,
.trait-desc-input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.trait-remove {
  flex: 0 0 auto;
  align-self: flex-start;
  width: 1.75rem;
  height: 1.75rem;
  display: grid;
  place-items: center;
  background: transparent;
  border: none;
  border-radius: 0.4rem;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease;
}

.trait-remove:hover {
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.12);
}

.trait-remove .material-symbols-outlined {
  font-size: 1.15rem;
}

.trait-add {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  align-self: flex-start;
  padding: 0.5rem 0.9rem;
  background: transparent;
  color: var(--theme-accent);
  border: 1px dashed color-mix(in srgb, var(--theme-accent) 45%, transparent);
  border-radius: 0.5rem;
  font-family: inherit;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.trait-add:hover {
  border-color: var(--theme-accent);
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
}

.trait-add .material-symbols-outlined {
  font-size: 1.2rem;
}

.trait-empty {
  margin: 0;
  padding: 0.6rem 0.2rem;
  color: rgba(255, 255, 255, 0.4);
  font-style: italic;
  font-size: 0.9rem;
}

/* Read-only rendering: flatten inputs into plain text. */
.is-readonly .trait-name-input,
.is-readonly .trait-desc-input {
  background: transparent;
  border-color: transparent;
  padding-left: 0;
  padding-right: 0;
  resize: none;
}

@media (max-width: 600px) {
  .trait-card {
    flex-wrap: wrap;
  }
  .trait-remove {
    order: 3;
  }
}
</style>
