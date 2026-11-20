<template>
    <div class="current-to">
        <p v-if="!editing" class="line">
            <template v-if="shown != null">Trees are current to <strong>{{ fmt(shown) }}</strong>.</template>
            <template v-if="gameYear != null"> The game year is <strong>{{ fmt(gameYear) }}</strong>.</template>
            <template v-else> The realm has no game year set, so the trees can't advance yet.</template>
            <button v-if="canEdit && gameYear != null" type="button" class="change" @click="start">Change</button>
        </p>

        <form v-else class="year-form" novalidate @submit.prevent="submit">
            <label :for="inputId">Trees are current to</label>
            <span class="year-input">
                <input
                    :id="inputId"
                    v-model="draft"
                    type="text"
                    inputmode="numeric"
                    autocomplete="off"
                    :aria-describedby="error ? errorId : hintId"
                />
                <span class="abbr">{{ abbr }}</span>
            </span>
            <span class="actions">
                <button type="submit" class="tool-btn primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
                <button type="button" class="tool-btn" :disabled="saving" @click="editing = false">Cancel</button>
            </span>
            <p :id="hintId" class="hint">Use a negative number for years before the era. It can't pass the game year.</p>
            <p v-if="error" :id="errorId" class="field-error" role="alert">{{ error }}</p>
        </form>
    </div>
</template>

<script setup>
// The "current to" year, shown inline. Before the realm's first commit the DM
// can set it to any year up to the game year; after that only the advance
// moves it. `save` is async and receives the year; a rejection keeps the form
// open with its message.
import { computed, ref } from 'vue';
import { formatYear, toSignedYear } from '@shared/utils/dynastyYears';

const props = defineProps({
    currentTo: { type: Number, default: null },
    gameYear: { type: Number, default: null },
    canEdit: { type: Boolean, default: false },
    abbr: { type: String, default: 'SF' },
    save: { type: Function, required: true },
});

const uid = Math.random().toString(36).slice(2, 8);
const inputId = `current-to-${uid}`;
const hintId = `current-to-hint-${uid}`;
const errorId = `current-to-error-${uid}`;

const editing = ref(false);
const saving = ref(false);
const draft = ref('');
const error = ref('');

// The server treats an unset year as the game year.
const shown = computed(() => props.currentTo ?? props.gameYear);
const fmt = (y) => formatYear(y, { abbr: props.abbr });

function start() {
    draft.value = shown.value != null ? String(shown.value) : '';
    error.value = '';
    editing.value = true;
}

async function submit() {
    let year;
    try {
        year = toSignedYear(draft.value);
    } catch (e) {
        error.value = `${e.message}.`;
        return;
    }
    if (year == null) {
        error.value = 'Enter a year.';
        return;
    }
    if (props.gameYear != null && year > props.gameYear) {
        error.value = `The year can't pass the game year, ${fmt(props.gameYear)}.`;
        return;
    }
    saving.value = true;
    error.value = '';
    try {
        await props.save(year);
        editing.value = false;
    } catch (e) {
        error.value = e?.message || 'The year was not saved.';
    } finally {
        saving.value = false;
    }
}
</script>

<style scoped src="../../views/dynasties/dynastyView.css"></style>
<style scoped>
.current-to { font-size: 0.95rem; line-height: 1.55; }
.line { margin: 0; }
.line strong { font-family: var(--theme-font-display, inherit); font-weight: 700; white-space: nowrap; }
.change {
    margin-left: 0.4em;
    padding: 0.2em 0;
    min-height: 2.75em;
    background: none;
    border: none;
    color: var(--theme-accent);
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
}
.change:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: 2px; }

.year-form { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5em 0.75em; }
.year-form label { flex-basis: 100%; font-size: 0.85rem; color: color-mix(in srgb, var(--theme-text) 70%, transparent); }
.year-input { display: inline-flex; align-items: center; gap: 0.5em; }
.year-input input {
    width: 7em;
    box-sizing: border-box;
    padding: 0.55em 0.6em;
    font: inherit;
    font-size: 16px;
    color: var(--theme-text);
    background: color-mix(in srgb, var(--theme-bg-primary, #000) 55%, transparent);
    border: 1px solid color-mix(in srgb, var(--theme-text) 22%, transparent);
    border-radius: 8px;
}
.year-input input:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: 2px; }
.abbr { color: color-mix(in srgb, var(--theme-text) 65%, transparent); }
.actions { display: inline-flex; gap: 0.5em; }
.hint { flex-basis: 100%; margin: 0; font-size: 0.82rem; color: color-mix(in srgb, var(--theme-text) 60%, transparent); }
.field-error { flex-basis: 100%; margin: 0; font-size: 0.85rem; color: var(--theme-danger, #e06c75); }
</style>
