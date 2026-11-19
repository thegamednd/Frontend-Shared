<template>
    <div class="person-picker">
        <input
            ref="input"
            v-model="query"
            type="text"
            autocomplete="off"
            :aria-label="label"
            placeholder="Type two or more letters of their name"
            @input="onInput"
            @keydown.esc.prevent="emit('cancel')"
        />
        <ul v-if="hits.length" class="hits">
            <li v-for="h in hits" :key="h.id">
                <button type="button" @click="pick(h)">
                    <span class="hit-name">{{ h.name }}</span>
                    <span class="hit-meta">{{ hitMeta(h) }}</span>
                </button>
            </li>
        </ul>
        <p v-else-if="searchedFor" class="hint">Nobody in the trees matches "{{ searchedFor }}".</p>
    </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useDynastiesStore } from '@shared/stores/dynasties';
import { useRealmStore } from '@shared/stores/realm';
import { shortLifespan } from '@shared/utils/dynastyLabels';

// Searches every tree in the realm for an existing person.
const props = defineProps({
    excludeIds: { type: Array, default: () => [] },
    label: { type: String, default: 'Find someone already in a tree' },
    autofocus: { type: Boolean, default: true },
});
const emit = defineEmits(['picked', 'cancel']);

const dynastiesStore = useDynastiesStore();
const realmStore = useRealmStore();
const abbr = computed(() => realmStore.activeRealm?.DateSuffix?.Abbr || 'SF');
const input = ref(null);
const query = ref('');
const hits = ref([]);
const searchedFor = ref('');
let timer = null;
// Only the newest search may fill the list; slower earlier replies are dropped.
let seq = 0;

onMounted(() => {
    if (props.autofocus) input.value?.focus();
});
onBeforeUnmount(() => clearTimeout(timer));

function onInput() {
    clearTimeout(timer);
    const q = query.value.trim();
    if (q.length < 2) {
        seq++;
        hits.value = [];
        searchedFor.value = '';
        return;
    }
    timer = setTimeout(() => runSearch(q), 250);
}

async function runSearch(q) {
    const mine = ++seq;
    let found = [];
    try {
        found = (await dynastiesStore.search(q)) || [];
    } catch {
        found = [];
    }
    if (mine !== seq) return;
    const skip = new Set(props.excludeIds.filter(Boolean));
    hits.value = found.filter((h) => !skip.has(h.id));
    searchedFor.value = q;
}

function hitMeta(h) {
    const years = shortLifespan(h, abbr.value);
    return [h.houseName, years === 'dates unknown' ? '' : years].filter(Boolean).join(', ');
}

function pick(p) {
    emit('picked', p);
    query.value = '';
    hits.value = [];
    searchedFor.value = '';
}
</script>

<style scoped>
.person-picker { display: flex; flex-direction: column; gap: 0.4em; }
input {
    width: 100%;
    box-sizing: border-box;
    padding: 0.5em 0.6em;
    font: inherit;
    font-size: 16px;
    color: var(--theme-text);
    background: color-mix(in srgb, var(--theme-bg-primary, #000) 55%, transparent);
    border: 1px solid color-mix(in srgb, var(--theme-text) 22%, transparent);
    border-radius: 8px;
}
input:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: 2px; }
.hits {
    margin: 0;
    padding: 0;
    list-style: none;
    max-height: 14em;
    overflow-y: auto;
    border: 1px solid color-mix(in srgb, var(--theme-text) 18%, transparent);
    border-radius: 8px;
}
.hits button {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    min-height: 2.75em;
    padding: 0.45em 0.7em;
    border: none;
    border-bottom: 1px solid color-mix(in srgb, var(--theme-text) 10%, transparent);
    background: none;
    color: var(--theme-text);
    font: inherit;
    text-align: left;
    cursor: pointer;
}
.hits li:last-child button { border-bottom: none; }
.hits button:hover,
.hits button:focus-visible { background: color-mix(in srgb, var(--theme-accent) 12%, transparent); outline: none; }
.hit-name { color: var(--theme-accent); }
.hit-meta { font-size: 0.8rem; color: color-mix(in srgb, var(--theme-text) 60%, transparent); }
.hint { margin: 0; font-size: 0.82rem; color: color-mix(in srgb, var(--theme-text) 60%, transparent); }
</style>
