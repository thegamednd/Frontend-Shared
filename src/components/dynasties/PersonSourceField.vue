<template>
    <div class="source-field">
        <span class="field-label">{{ label }}</span>

        <div v-if="modelValue" class="chosen">
            <span class="chosen-name">{{ modelLabel || 'Selected person' }}</span>
            <button type="button" class="change-btn" @click="clear">Change</button>
        </div>

        <template v-else>
            <div v-if="partners.length" class="partners">
                <button v-for="p in partners" :key="p.id" type="button" class="partner" @click="pick(p)">
                    {{ p.name }}
                </button>
            </div>
            <div class="sources">
                <button type="button" class="source-btn" @click="emit('new-person')">New person</button>
                <button type="button" class="source-btn" @click="emit('from-character')">From a character</button>
                <button type="button" class="source-btn" :aria-expanded="lookupOpen" @click="lookupOpen = !lookupOpen">
                    Already in a tree
                </button>
            </div>
            <PersonPicker v-if="lookupOpen" :exclude-ids="excludeIds" @picked="pick" @cancel="lookupOpen = false" />
            <p v-if="emptyHint" class="hint">{{ emptyHint }}</p>
        </template>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import PersonPicker from './PersonPicker.vue';

// A relationship slot: shows the chosen person, or the ways to add one.
defineProps({
    modelValue: { type: String, default: null },
    modelLabel: { type: String, default: '' },
    label: { type: String, required: true },
    // Existing people offered as one-click choices, e.g. the anchor's spouses.
    partners: { type: Array, default: () => [] },
    emptyHint: { type: String, default: '' },
    // People who may not fill this slot, e.g. the person being edited.
    excludeIds: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:modelValue', 'picked', 'new-person', 'from-character']);

const lookupOpen = ref(false);

function pick(p) {
    emit('picked', p);
    emit('update:modelValue', p.id);
    lookupOpen.value = false;
}

function clear() {
    emit('update:modelValue', null);
}
</script>

<style scoped>
.source-field { display: flex; flex-direction: column; gap: 0.45em; min-width: 0; }
.field-label { font-size: 0.82rem; color: color-mix(in srgb, var(--theme-text) 70%, transparent); }
/* A chosen person reads as settled: a name with an accent rule, not an input. */
.chosen {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8em;
    padding: 0.5em 0.75em;
    border-left: 3px solid var(--theme-accent);
    border-radius: 0 8px 8px 0;
    background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
}
.chosen-name { min-width: 0; overflow-wrap: anywhere; font-weight: 600; }
.change-btn {
    flex: none;
    min-height: 2em;
    padding: 0 0.25em;
    border: none;
    background: none;
    color: var(--theme-accent);
    font: inherit;
    font-size: 0.85rem;
    text-decoration: underline;
    cursor: pointer;
}
.partners, .sources { display: flex; flex-wrap: wrap; gap: 0.45em; }
.partner {
    min-height: 2.25em;
    padding: 0.3em 0.85em;
    border: 1px solid var(--theme-accent);
    border-radius: 999px;
    background: none;
    color: var(--theme-text);
    font: inherit;
    font-size: 0.85rem;
    cursor: pointer;
}
.partner:hover { background: color-mix(in srgb, var(--theme-accent) 12%, transparent); }
.source-btn {
    min-height: 2.5em;
    padding: 0.4em 0.95em;
    border: 1px solid color-mix(in srgb, var(--theme-text) 22%, transparent);
    border-radius: 8px;
    background: transparent;
    color: var(--theme-text);
    font: inherit;
    font-size: 0.85rem;
    cursor: pointer;
}
.source-btn:hover,
.source-btn[aria-expanded='true'] { border-color: var(--theme-accent); color: var(--theme-accent); }
.change-btn:focus-visible,
.partner:focus-visible,
.source-btn:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: 2px; }
.hint { margin: 0; font-size: 0.82rem; color: color-mix(in srgb, var(--theme-text) 60%, transparent); }
</style>
