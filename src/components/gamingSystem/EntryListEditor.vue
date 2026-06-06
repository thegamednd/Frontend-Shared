<template>
  <div class="entry-editor" :class="{ 'is-readonly': readonly }">
    <ul v-if="items.length" class="entry-list">
      <li v-for="(entry, i) in items" :key="i" class="entry-card">
        <span class="entry-index">{{ i + 1 }}</span>

        <div class="entry-fields">
          <input
            :value="entry.name"
            @input="patch(i, 'name', $event.target.value)"
            type="text"
            class="entry-name-input"
            :placeholder="namePlaceholder"
            :readonly="readonly"
          />

          <div v-if="showLevel || showUses" class="entry-meta">
            <label v-if="showLevel" class="entry-meta-field">
              <span class="entry-meta-label">Level</span>
              <input
                :value="entry.level ?? ''"
                @input="patch(i, 'level', $event.target.value === '' ? undefined : Number($event.target.value))"
                type="number"
                min="1"
                max="20"
                class="entry-meta-input entry-level-input"
                placeholder="—"
                :readonly="readonly"
              />
            </label>
            <label v-if="showUses" class="entry-meta-field">
              <span class="entry-meta-label">Uses</span>
              <input
                :value="entry.uses || ''"
                @input="patch(i, 'uses', $event.target.value)"
                type="text"
                class="entry-meta-input entry-uses-input"
                placeholder="e.g. 1/long rest"
                :readonly="readonly"
              />
            </label>
          </div>

          <textarea
            :value="entry.description"
            @input="patch(i, 'description', $event.target.value)"
            class="entry-desc-input"
            rows="2"
            :placeholder="descPlaceholder"
            :readonly="readonly"
          ></textarea>
        </div>

        <button
          v-if="!readonly"
          type="button"
          class="entry-remove"
          title="Remove"
          @click="removeEntry(i)"
        >
          <span class="material-symbols-outlined">close</span>
        </button>
      </li>
    </ul>

    <p v-else-if="readonly" class="entry-empty">None.</p>

    <button v-if="!readonly" type="button" class="entry-add" @click="addEntry">
      <span class="material-symbols-outlined">add</span>
      {{ addLabel }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  readonly: { type: Boolean, default: false },
  showLevel: { type: Boolean, default: false },
  showUses: { type: Boolean, default: false },
  namePlaceholder: { type: String, default: 'Name' },
  descPlaceholder: { type: String, default: 'Description' },
  addLabel: { type: String, default: 'Add entry' },
});

const emit = defineEmits(['update:modelValue']);

// Tolerate legacy string entries as well as the canonical object shape; preserve
// any extra fields (e.g. level/uses) so they round-trip even when not shown.
const items = computed(() =>
  (props.modelValue || []).map((t) =>
    typeof t === 'string'
      ? { name: t, description: '' }
      : { ...t, name: t?.name || '', description: t?.description || '' }
  )
);

function commit(list) {
  emit('update:modelValue', list);
}
function addEntry() {
  commit([...items.value, { name: '', description: '' }]);
}
function removeEntry(i) {
  commit(items.value.filter((_, idx) => idx !== i));
}
function patch(i, key, value) {
  commit(items.value.map((t, idx) => (idx === i ? { ...t, [key]: value } : t)));
}
</script>

<style scoped>
.entry-editor {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.entry-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.entry-card {
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

.entry-card:focus-within {
  border-color: color-mix(in srgb, var(--theme-accent) 45%, transparent);
  border-left-color: var(--theme-accent);
  background: rgba(255, 255, 255, 0.05);
}

.entry-index {
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

.entry-fields {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.entry-name-input,
.entry-desc-input,
.entry-meta-input {
  width: 100%;
  padding: 0.5rem 0.65rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.4rem;
  color: #ffffff;
  font-family: inherit;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.entry-name-input {
  font-weight: 600;
  font-size: 0.95rem;
}

.entry-desc-input {
  font-size: 0.9rem;
  line-height: 1.4;
  resize: vertical;
  min-height: 2.6rem;
  color: #d6d6d6;
}

.entry-meta {
  display: flex;
  gap: 0.6rem;
}

.entry-meta-field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.entry-meta-field:last-child {
  flex: 1 1 auto;
}

.entry-meta-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.45);
}

.entry-level-input {
  width: 4.5rem;
}

.entry-name-input:focus,
.entry-desc-input:focus,
.entry-meta-input:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--theme-accent) 50%, transparent);
  background: rgba(255, 255, 255, 0.08);
}

.entry-name-input::placeholder,
.entry-desc-input::placeholder,
.entry-meta-input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.entry-remove {
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

.entry-remove:hover {
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.12);
}

.entry-remove .material-symbols-outlined {
  font-size: 1.15rem;
}

.entry-add {
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

.entry-add:hover {
  border-color: var(--theme-accent);
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
}

.entry-add .material-symbols-outlined {
  font-size: 1.2rem;
}

.entry-empty {
  margin: 0;
  padding: 0.6rem 0.2rem;
  color: rgba(255, 255, 255, 0.4);
  font-style: italic;
  font-size: 0.9rem;
}

/* Read-only rendering: flatten inputs into plain text. */
.is-readonly .entry-name-input,
.is-readonly .entry-desc-input,
.is-readonly .entry-meta-input {
  background: transparent;
  border-color: transparent;
  padding-left: 0;
  padding-right: 0;
  resize: none;
}

@media (max-width: 600px) {
  .entry-card {
    flex-wrap: wrap;
  }
  .entry-remove {
    order: 3;
  }
}
</style>
