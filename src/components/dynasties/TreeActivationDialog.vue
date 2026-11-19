<template>
    <dialog ref="dialogRef" class="dyn-dialog activation-dialog" aria-labelledby="activation-title" @cancel.prevent="close">
        <div class="dyn-layout">
            <div class="dyn-header">
                <h3 id="activation-title">Choose active trees</h3>
                <button type="button" class="dyn-close" aria-label="Close" :disabled="saving" @click="close">&times;</button>
            </div>

            <div class="dyn-body">
                <form id="activation-form" novalidate @submit.prevent="save">
                    <p class="hint lead">
                        Your plan allows {{ maxTrees }} active {{ maxTrees === 1 ? 'tree' : 'trees' }}. You can edit active trees.
                        Everyone can still browse frozen trees, but no one can change them.
                    </p>

                    <fieldset class="tree-list">
                        <legend class="sr-only">Active trees</legend>
                        <label v-for="h in sorted" :key="h.id" class="tree-row" :class="{ on: chosen.has(h.id) }">
                            <input type="checkbox" :value="h.id" :checked="chosen.has(h.id)" @change="toggle(h.id, $event.target.checked)" />
                            <span class="tree-name">{{ h.name }}</span>
                            <span v-if="!chosen.has(h.id)" class="state">Frozen</span>
                        </label>
                    </fieldset>

                    <p class="count" :class="{ over }" aria-live="polite">
                        {{ chosen.size }} of {{ maxTrees }} selected<template v-if="over">. Untick {{ chosen.size - maxTrees }} to save.</template><template v-else-if="!chosen.size">. Choose at least one tree.</template>
                    </p>

                    <p v-if="error" class="save-error" role="alert">{{ error }}</p>
                </form>
            </div>

            <div class="dyn-footer">
                <span class="spacer"></span>
                <button type="button" class="btn" :disabled="saving" @click="close">Cancel</button>
                <button type="submit" form="activation-form" class="btn btn-primary" :disabled="!valid || saving">
                    {{ saving ? 'Saving…' : 'Save' }}
                </button>
            </div>
        </div>
    </dialog>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';

const props = defineProps({
    houses: { type: Array, default: () => [] },
    maxTrees: { type: Number, required: true },
    open: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
    error: { type: String, default: '' },
});
const emit = defineEmits(['save', 'close']);

const dialogRef = ref(null);
const chosen = ref(new Set());

const sorted = computed(() => [...props.houses].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
const over = computed(() => chosen.value.size > props.maxTrees);
const valid = computed(() => chosen.value.size > 0 && !over.value);

// Starts from the trees that are active now, so the DM only unticks the extras.
function reset() {
    chosen.value = new Set(props.houses.filter((h) => !h.frozen).map((h) => h.id));
}

function toggle(id, on) {
    const next = new Set(chosen.value);
    if (on) next.add(id);
    else next.delete(id);
    chosen.value = next;
}

function sync(open) {
    const el = dialogRef.value;
    if (!el) return;
    if (open && !el.open) {
        reset();
        el.showModal();
    } else if (!open && el.open) {
        el.close();
    }
}

watch(() => props.open, (v) => nextTick(() => sync(v)));
onMounted(() => sync(props.open));

function close() {
    if (props.saving) return;
    emit('close');
}

function save() {
    if (!valid.value || props.saving) return;
    emit('save', [...chosen.value]);
}
</script>

<style scoped src="./dynastyDialog.css"></style>
<style scoped>
.lead { margin-bottom: 1em; font-size: 0.9rem; line-height: 1.5; }
.tree-list { margin: 0; padding: 0; border: none; display: flex; flex-direction: column; gap: 0.4em; }
.tree-row {
    display: flex;
    align-items: center;
    gap: 0.7em;
    min-height: 2.75em;
    padding: 0.4em 0.8em;
    border: 1px solid color-mix(in srgb, var(--theme-text) 18%, transparent);
    border-radius: 10px;
    cursor: pointer;
}
.tree-row.on { border-color: var(--theme-accent); }
.tree-row input { width: 1.15em; height: 1.15em; flex: none; accent-color: var(--theme-accent); }
.tree-row input:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: 2px; }
.tree-name { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.state { font-size: 0.78rem; color: color-mix(in srgb, var(--theme-text) 60%, transparent); }
.count { margin: 0.9em 0 0; font-size: 0.9rem; }
.count.over { color: var(--theme-danger, #e06c75); }
.sr-only {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
</style>
