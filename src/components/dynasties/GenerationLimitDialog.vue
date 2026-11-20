<template>
    <dialog ref="dialogRef" class="dyn-dialog generation-dialog" :aria-labelledby="titleId" @cancel.prevent="close">
        <div class="dyn-layout">
            <div class="dyn-header">
                <h3 :id="titleId">{{ houseName || 'This tree' }} is out of generations</h3>
                <button type="button" class="dyn-close" aria-label="Close" :disabled="dropping" @click="close">&times;</button>
            </div>

            <div class="dyn-body">
                <p class="lead">
                    Someone in the youngest generation is about to have a child, and the tree is at its generation limit.
                    Drop the oldest generation or upgrade your plan, then run the advance again.
                </p>
                <p class="lead">
                    Dropping removes everyone in the oldest generation of {{ houseName || 'this tree' }}, living or dead.
                    Living player characters stay on as elders. This happens straight away.
                </p>

                <p v-if="loading" class="hint" role="status">Working out who would be removed…</p>
                <p v-else-if="loadError" class="save-error" role="alert">{{ loadError }}</p>
                <template v-else-if="plan">
                    <div v-if="living.length" class="group-list">
                        <p class="list-label">Living people removed</p>
                        <ul class="names drop-living">
                            <li v-for="p in living" :key="p.id">{{ p.name }}</li>
                        </ul>
                    </div>
                    <div v-if="plan.elders?.length" class="group-list">
                        <p class="list-label">Staying on as elders</p>
                        <ul class="names drop-elders">
                            <li v-for="p in plan.elders" :key="p.id">{{ p.name }}</li>
                        </ul>
                    </div>
                    <details v-if="dead.length" class="dead">
                        <summary>{{ dead.length }} {{ dead.length === 1 ? 'person who has' : 'people who have' }} already died</summary>
                        <ul class="names">
                            <li v-for="p in dead" :key="p.id">{{ p.name }}</li>
                        </ul>
                    </details>
                </template>

                <p v-if="error" class="save-error" role="alert">{{ error }}</p>
            </div>

            <div class="dyn-footer">
                <a class="btn upgrade" :href="upgradeHref" target="_blank" rel="noopener">See upgrade options</a>
                <span class="spacer"></span>
                <button type="button" class="btn" :disabled="dropping" @click="close">Cancel</button>
                <button type="button" class="btn btn-danger" :disabled="dropping || loading || !plan" @click="drop">
                    {{ dropping ? 'Dropping…' : 'Drop the oldest generation' }}
                </button>
            </div>
        </div>
    </dialog>
</template>

<script setup>
// The free tier's way past a blocked advance: shows who dropping a tree's
// oldest generation would remove and who stays as an elder, then drops it
// (applied at once). The upgrade link is the other way out.
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useDynastiesStore } from '@shared/stores/dynasties';
import { upgradeUrl } from '@shared/utils/dynastyErrors';
import { advanceErrorMessage } from '@shared/utils/dynastyAdvance';

const props = defineProps({
    open: { type: Boolean, default: false },
    houseId: { type: String, default: '' },
    houseName: { type: String, default: '' },
});
const emit = defineEmits(['dropped', 'close']);

const store = useDynastiesStore();
const upgradeHref = upgradeUrl();
const titleId = `generation-${Math.random().toString(36).slice(2, 8)}`;

const dialogRef = ref(null);
const plan = ref(null);
const loading = ref(false);
const loadError = ref('');
const dropping = ref(false);
const error = ref('');

const living = computed(() => (plan.value?.removed || []).filter((p) => p.alive));
const dead = computed(() => (plan.value?.removed || []).filter((p) => !p.alive));

async function loadPlan() {
    plan.value = null;
    loadError.value = '';
    error.value = '';
    if (!props.houseId) return;
    loading.value = true;
    try {
        plan.value = await store.previewDrop(props.houseId);
    } catch (e) {
        loadError.value = advanceErrorMessage(store.error || e);
    } finally {
        loading.value = false;
    }
}

function sync(open) {
    const el = dialogRef.value;
    if (!el) return;
    if (open && !el.open) {
        el.showModal();
        loadPlan();
    } else if (!open && el.open) {
        el.close();
    }
}
watch(() => props.open, (v) => nextTick(() => sync(v)));
onMounted(() => sync(props.open));

function close() {
    if (!dropping.value) emit('close');
}

async function drop() {
    dropping.value = true;
    error.value = '';
    try {
        await store.dropGeneration(props.houseId);
        emit('dropped', props.houseId);
    } catch (e) {
        error.value = advanceErrorMessage(store.error || e);
    } finally {
        dropping.value = false;
    }
}
</script>

<style scoped src="./dynastyDialog.css"></style>
<style scoped>
.lead { margin: 0 0 0.8em; font-size: 0.92rem; line-height: 1.5; }
.list-label { margin: 0.9em 0 0.25em; font-size: 0.85rem; font-weight: 600; }
.names { margin: 0; padding-left: 1.2em; line-height: 1.5; }
.dead { margin-top: 0.9em; font-size: 0.9rem; }
.dead summary { cursor: pointer; min-height: 2.75em; display: flex; align-items: center; }
.dead summary:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: 2px; }
.upgrade { display: inline-flex; align-items: center; color: var(--theme-accent); border-color: var(--theme-accent); text-decoration: none; box-sizing: border-box; }
.dyn-footer .upgrade { flex-basis: 100%; justify-content: center; }
@media (min-width: 40em) {
    .dyn-footer .upgrade { flex-basis: auto; }
}
</style>
