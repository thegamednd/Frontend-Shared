<template>
    <div class="dynasties-view history-view">
        <nav class="breadcrumb" aria-label="Breadcrumb">
            <router-link :to="{ name: 'Dynasties' }">Dynasties</router-link>
            <span aria-hidden="true">&rsaquo;</span>
            <router-link :to="{ name: 'DynastyHouse', params: { houseId } }">{{ houseName || 'House' }}</router-link>
            <span aria-hidden="true">&rsaquo;</span>
            <span aria-current="page">History</span>
        </nav>
        <header class="dyn-page-head">
            <h2>Family history</h2>
            <p v-if="houseName" class="subtitle">{{ houseName }}</p>
        </header>

        <LoadingState v-if="state === 'loading'" message="Loading…" />

        <div v-else-if="state === 'failed'" class="empty">
            <p>Couldn't load this history.</p>
            <button type="button" class="tool-btn" @click="loadYears">Try again</button>
        </div>

        <p v-else-if="!years.length" class="empty-line">No years are recorded for this house yet.</p>

        <template v-else>
            <div class="year-nav">
                <button type="button" class="tool-btn" :disabled="adjacent.previous === null" @click="show(adjacent.previous)">Previous</button>
                <h3 class="year-title">{{ fmt(year) }}</h3>
                <button type="button" class="tool-btn" :disabled="adjacent.next === null" @click="show(adjacent.next)">Next</button>
            </div>

            <LoadingState v-if="yearState === 'loading'" message="Loading…" />
            <p v-else-if="yearState === 'failed'" class="error-text" role="alert">Couldn't load this year.</p>
            <p v-else-if="!hasEvents" class="empty-line nothing">Nothing of note happened this year.</p>
            <article v-else class="chronicle">
                <template v-for="(group, g) in groups" :key="g">
                    <div v-if="g > 0" class="divider" aria-hidden="true"><span class="rule"></span><span class="fleuron">&#10086;</span><span class="rule"></span></div>
                    <template v-for="(l, i) in group" :key="i">
                        <p v-if="l.type === 'note'" class="note">{{ l.text }}</p>
                        <p v-else class="line">
                            <router-link v-if="l.personId" :to="{ name: 'DynastyPerson', params: { personId: l.personId } }">{{ l.text }}</router-link>
                            <template v-else>{{ l.text }}</template>
                        </p>
                    </template>
                </template>
            </article>

            <div class="year-jump">
                <label for="year-select">Jump to a year</label>
                <select id="year-select" class="year-select" :value="year" @change="show(Number($event.target.value))">
                    <option v-for="y in years" :key="y.year" :value="y.year">{{ fmt(y.year) }}</option>
                </select>
            </div>
        </template>
    </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDynastiesStore } from '@shared/stores/dynasties';
import { useUserStore } from '@shared/stores/user';
import { useRealmStore } from '@shared/stores/realm';
import { formatYear } from '@shared/utils/dynastyYears';
import LoadingState from '@shared/components/LoadingState.vue';

const emit = defineEmits(['set-room']);
const route = useRoute();
const router = useRouter();
const store = useDynastiesStore();
const userStore = useUserStore();
const realmStore = useRealmStore();

const abbr = computed(() => realmStore.activeRealm?.DateSuffix?.Abbr || 'SF');
const fmt = (y) => formatYear(y, { abbr: abbr.value });

const editor = computed(() => Boolean(userStore.isDM || userStore.isAdmin));
// Until the realm's players load, isDM reads false for a DM too. Roles are known only once the
// realm has players, so a DM is never bounced early. A realm with none leaves the server's 403 to redirect.
const rolesKnown = computed(() => (realmStore.arActivePlayers?.length ?? 0) > 0);

const houseId = computed(() => route.params.houseId);
const houseName = ref('');
const state = ref('loading');
const yearState = ref('ready');
const years = ref([]);
const year = ref(null);
const lines = ref([]);

// Newest first, so Previous steps back in time and Next steps forward.
const adjacent = computed(() => {
    const i = years.value.findIndex((y) => y.year === year.value);
    return {
        previous: i >= 0 && years.value[i + 1] ? years.value[i + 1].year : null,
        next: i > 0 ? years.value[i - 1].year : null,
    };
});

const hasEvents = computed(() => lines.value.some((l) => l.type !== 'divider'));

// The year's lines split at the dividers, one group per kind of event.
const groups = computed(() => {
    const out = [[]];
    for (const l of lines.value) {
        if (l.type === 'divider') out.push([]);
        else out[out.length - 1].push(l);
    }
    return out.filter((g) => g.length);
});

// Guards against a slow earlier request landing after a later click.
let requested = 0;
async function show(target) {
    if (target === null || target === undefined) return;
    const ticket = ++requested;
    year.value = target;
    yearState.value = 'loading';
    try {
        const data = await store.fetchHistory(houseId.value, target);
        if (ticket !== requested) return;
        lines.value = data?.lines || [];
        yearState.value = 'ready';
    } catch {
        if (ticket !== requested) return;
        yearState.value = 'failed';
    }
}

async function loadYears() {
    state.value = 'loading';
    try {
        // The house name sits in the heading, so a failed load shows the failure state.
        const house = await store.fetchHouse(houseId.value);
        houseName.value = house?.house?.name || '';
        const data = await store.fetchHistoryYears(houseId.value);
        years.value = [...(data?.years || [])].sort((a, b) => b.year - a.year);
        state.value = 'ready';
        if (years.value.length) await show(years.value[0].year);
    } catch (e) {
        if (store.error?.code === 'FORBIDDEN' || e?.response?.status === 403) {
            router.replace({ name: 'DynastyHouse', params: { houseId: houseId.value } });
            return;
        }
        state.value = 'failed';
    }
}

let started = false;
watch(
    [editor, rolesKnown],
    ([isEditor, known]) => {
        if (isEditor) {
            if (!started) {
                started = true;
                loadYears();
            }
        } else if (known) {
            router.replace({ name: 'DynastyHouse', params: { houseId: houseId.value } });
        }
    },
    { immediate: true }
);

onMounted(() => emit('set-room', 'dynasties'));
</script>

<style scoped src="./dynastyView.css"></style>
<style scoped>
.breadcrumb { margin-bottom: 1em; }

.year-nav {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 0.5em;
    margin-bottom: 1.25em;
}
.year-nav .tool-btn:first-child { justify-self: start; }
.year-nav .tool-btn:last-child { justify-self: end; }
.year-title {
    margin: 0;
    text-align: center;
    font-family: var(--theme-font-display, inherit);
    font-size: 1.35rem;
    color: var(--theme-accent);
}

.nothing { text-align: center; padding: 1.5em 0; }

/* The year reads as a page of the chronicle: a ruled margin on the left, serif-ish display body. */
.chronicle {
    padding: 0.4em 0 0.4em 1em;
    border-left: 3px solid var(--theme-accent);
    max-width: 65ch;
}
.line, .note { margin: 0 0 0.55em; line-height: 1.55; overflow-wrap: anywhere; }
.line a {
    display: block;
    min-height: 2.75em;
    box-sizing: border-box;
    padding: 0.5em 0.2em;
    color: var(--theme-text);
    text-decoration: none;
    border-bottom: 1px dotted color-mix(in srgb, var(--theme-text) 25%, transparent);
}
.line a:hover { color: var(--theme-accent); }
.line a:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: 2px; }
.note { font-size: 0.88rem; font-style: italic; color: color-mix(in srgb, var(--theme-text) 62%, transparent); }
.divider { display: flex; align-items: center; gap: 0.6em; margin: 0.9em 0; color: var(--theme-accent); }
.divider .rule { flex: 1; height: 1px; background: color-mix(in srgb, var(--theme-accent) 45%, transparent); }

.year-jump { margin-top: 2em; display: flex; flex-direction: column; gap: 0.4em; max-width: 20em; }
.year-jump label { font-size: 0.9rem; color: color-mix(in srgb, var(--theme-text) 65%, transparent); }
.year-select {
    min-height: 2.75em;
    padding: 0.4em 0.7em;
    border-radius: 8px;
    background: color-mix(in srgb, var(--theme-bg-surface) 50%, transparent);
    border: 1px solid color-mix(in srgb, var(--theme-text) 25%, transparent);
    color: var(--theme-text);
    font: inherit;
}
.year-select:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: 2px; }
</style>
