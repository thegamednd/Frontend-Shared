<template>
    <div class="dynasties-view">
        <header class="dyn-page-head">
            <h2>Dynasties</h2>
            <p class="subtitle">The houses of the realm and the people in them</p>
        </header>

        <LoadingState v-if="!loaded && !loadFailed" message="Loading houses…" />

        <div v-else-if="loadFailed" class="empty">
            <p>The houses could not be loaded.</p>
            <button type="button" class="tool-btn" @click="load">Try again</button>
        </div>

        <template v-else>
            <div v-if="editor" class="toolbar">
                <span v-if="status" class="tree-count" :class="{ full: atLimit }">Trees: {{ status.total }} of {{ status.maxTrees }}</span>
                <span class="spacer"></span>
                <button v-if="canChoose" type="button" class="tool-btn" @click="activationOpen = true">Choose active trees</button>
                <button type="button" class="tool-btn primary" :disabled="addBlocked" :aria-describedby="addBlocked ? 'add-house-note' : null" @click="houseDialog.open()">
                    <span class="material-symbols-outlined" aria-hidden="true">add</span>
                    Add house
                </button>
            </div>

            <p v-if="editor && status?.needsSelection" id="add-house-note" class="notice warn" role="note">
                Your realm has more active trees than its plan allows. Choose which ones stay active before you add a house.
            </p>
            <p v-else-if="editor && atLimit" id="add-house-note" class="notice" role="note">
                Your plan has room for {{ status.maxTrees }} family {{ status.maxTrees === 1 ? 'tree' : 'trees' }}.
                <router-link :to="UPGRADE_PATH">See upgrade options</router-link>
            </p>

            <div v-if="!store.houses.length" class="empty">
                <p>{{ editor ? 'No houses yet. Add one to start a family tree.' : 'No houses yet.' }}</p>
            </div>

            <template v-else>
                <div class="filter-bar">
                    <span class="material-symbols-outlined" aria-hidden="true">search</span>
                    <input
                        v-model.trim="filter"
                        type="search"
                        placeholder="Search houses and people"
                        aria-label="Search houses and people"
                    />
                </div>

                <ul v-if="filteredHouses.length" class="house-grid">
                    <li v-for="h in filteredHouses" :key="h.id">
                        <router-link class="house-card" :class="{ frozen: h.frozen }" :to="houseEntry(h)">
                            <img v-if="h.sigil" class="crest" :src="h.sigil" alt="" loading="lazy" />
                            <span v-else class="crest shield" aria-hidden="true">{{ initial(h.name) }}</span>
                            <span class="card-text">
                                <span class="house-name">
                                    {{ h.name }}
                                    <span v-if="h.frozen" class="frozen-tag">Frozen</span>
                                </span>
                                <span v-if="h.founderName" class="founder">Founded by {{ h.founderName }}</span>
                                <span class="count">{{ peopleText(h) }}</span>
                            </span>
                        </router-link>
                    </li>
                </ul>
                <p v-else-if="filter" class="empty-line">No house matches "{{ filter }}".</p>

                <section v-if="showPeople" class="people" aria-label="People">
                    <h3>People</h3>
                    <ul v-if="hits.length" class="hit-list">
                        <li v-for="p in hits" :key="p.id">
                            <router-link class="hit" :to="{ name: 'DynastyPerson', params: { personId: p.id } }">
                                <span class="hit-name">{{ p.name }}</span>
                                <span class="hit-meta">{{ p.houseName }}</span>
                                <span v-if="yearsText(p)" class="hit-meta">{{ yearsText(p) }}</span>
                            </router-link>
                        </li>
                    </ul>
                    <p v-else class="empty-line">No people match "{{ filter }}".</p>
                </section>
            </template>
        </template>

        <HouseEditDialog v-if="editor" ref="houseDialog" @saved="onHouseSaved" />
        <TreeActivationDialog
            v-if="editor && status"
            :open="activationOpen"
            :houses="store.houses"
            :max-trees="status.maxTrees"
            :saving="activating"
            :error="activationError"
            @save="saveActivation"
            @close="activationOpen = false"
        />
    </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useDynastiesStore } from '@shared/stores/dynasties';
import { useUserStore } from '@shared/stores/user';
import { useRealmStore } from '@shared/stores/realm';
import { shortLifespan } from '@shared/utils/dynastyLabels';
import { UPGRADE_PATH } from '@shared/utils/dynastyErrors';
import LoadingState from '@shared/components/LoadingState.vue';
import HouseEditDialog from '@shared/components/dynasties/HouseEditDialog.vue';
import TreeActivationDialog from '@shared/components/dynasties/TreeActivationDialog.vue';

const emit = defineEmits(['set-room']);
const router = useRouter();
const store = useDynastiesStore();
const userStore = useUserStore();
const realmStore = useRealmStore();
const abbr = computed(() => realmStore.activeRealm?.DateSuffix?.Abbr || 'SF');

const editor = computed(() => Boolean(userStore.isDM || userStore.isAdmin));
const status = computed(() => store.status);
const loaded = ref(false);
const loadFailed = ref(false);

const houseDialog = ref(null);
const activationOpen = ref(false);
const activating = ref(false);
const activationError = ref('');

const atLimit = computed(() => !!status.value && status.value.total >= status.value.maxTrees);
const addBlocked = computed(() => !!status.value?.needsSelection || atLimit.value);
// Shown while the plan needs a choice, and whenever a tree is frozen (to reactivate after an upgrade).
const canChoose = computed(() => !!status.value?.needsSelection || store.houses.some((h) => h.frozen));

async function load() {
    loadFailed.value = false;
    try {
        await store.fetchHouses();
        loaded.value = true;
    } catch {
        loadFailed.value = true;
    }
}

// A DM is asked to choose as soon as the list shows a realm over its plan.
watch(
    () => editor.value && !!status.value?.needsSelection && loaded.value,
    (needs) => {
        if (needs) activationOpen.value = true;
    },
    { immediate: true }
);

async function saveActivation(ids) {
    activating.value = true;
    activationError.value = '';
    try {
        await store.setActiveHouses(ids);
        activationOpen.value = false;
        // The activation reply carries bare house records; refetch for the counts.
        await store.fetchHouses().catch(() => {});
    } catch (e) {
        activationError.value = store.error?.message || e?.message || 'The active trees were not saved.';
    } finally {
        activating.value = false;
    }
}

function onHouseSaved(house) {
    if (house?.id) router.push(houseEntry(house));
}

// A house opens on its founder's tree; houses without one open the house page.
const houseEntry = (h) =>
    h.founderId ? { name: 'DynastyPerson', params: { personId: h.founderId } } : { name: 'DynastyHouse', params: { houseId: h.id } };

const filter = ref('');
const hits = ref([]);
const searchedFor = ref('');
let timer = null;

const filteredHouses = computed(() => {
    const needle = filter.value.toLowerCase();
    if (!needle) return store.houses;
    return store.houses.filter((h) => (h.name || '').toLowerCase().includes(needle));
});
const showPeople = computed(() => filter.value.length >= 2 && searchedFor.value === filter.value);

watch(filter, (q) => {
    clearTimeout(timer);
    if (q.length < 2) {
        searchedFor.value = '';
        hits.value = [];
        return;
    }
    timer = setTimeout(async () => {
        let found = [];
        try {
            found = (await store.search(q)) || [];
        } catch {
            found = [];
        }
        if (q !== filter.value) return;
        hits.value = found;
        searchedFor.value = q;
    }, 250);
});

const initial = (name) => (name || '?').trim().charAt(0).toUpperCase() || '?';
function peopleText(h) {
    const n = h.personCount || 0;
    const people = n === 1 ? '1 person' : `${n} people`;
    return h.livingCount != null && n ? `${people}, ${h.livingCount} living` : people;
}
function yearsText(p) {
    const text = shortLifespan(p, abbr.value);
    return text === 'dates unknown' ? '' : text;
}

onMounted(() => {
    emit('set-room', 'dynasties');
    load();
});
onBeforeUnmount(() => clearTimeout(timer));
</script>

<style scoped src="./dynastyView.css"></style>
<style scoped>
.toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5em;
    margin-bottom: 0.9em;
}
.toolbar .spacer { flex: 1; }
.tree-count {
    font-size: 0.88rem;
    padding: 0.3em 0.75em;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--theme-text) 20%, transparent);
    color: color-mix(in srgb, var(--theme-text) 80%, transparent);
}
.tree-count.full { border-color: var(--theme-accent); color: var(--theme-accent); }

.filter-bar {
    display: flex;
    align-items: center;
    gap: 0.5em;
    max-width: 26em;
    margin-bottom: 1em;
    padding: 0 0.7em;
    border: 1px solid color-mix(in srgb, var(--theme-text) 20%, transparent);
    border-radius: 10px;
    background: color-mix(in srgb, var(--theme-bg-surface) 50%, transparent);
}
.filter-bar:focus-within { border-color: var(--theme-accent); }
.filter-bar .material-symbols-outlined { font-size: 1.15rem; color: color-mix(in srgb, var(--theme-text) 55%, transparent); }
.filter-bar input {
    flex: 1;
    min-width: 0;
    padding: 0.6em 0;
    background: transparent;
    border: none;
    color: var(--theme-text);
    font: inherit;
    font-size: 16px;
}
.filter-bar input:focus { outline: none; }

.house-grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.6em;
}
.house-card {
    display: flex;
    align-items: center;
    gap: 0.9em;
    height: 100%;
    box-sizing: border-box;
    padding: 0.75em 0.9em;
    border-radius: 10px;
    background: color-mix(in srgb, var(--theme-bg-surface) 50%, transparent);
    border: 1px solid color-mix(in srgb, var(--theme-text) 15%, transparent);
    color: var(--theme-text);
    text-decoration: none;
}
.house-card:hover { border-color: var(--theme-accent); }
.house-card:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: 2px; }
.house-card.frozen { border-style: dashed; }
.house-card.frozen .crest { filter: grayscale(0.7); opacity: 0.75; }

.crest { flex: none; width: 48px; height: 56px; object-fit: contain; }
/* A heraldic shield with the house initial stands in until a house has a sigil. */
.crest.shield {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-bottom: 8px;
    box-sizing: border-box;
    clip-path: polygon(0 0, 100% 0, 100% 58%, 50% 100%, 0 58%);
    background: linear-gradient(160deg, var(--theme-accent), color-mix(in srgb, var(--theme-accent) 35%, var(--theme-bg-primary, #000)));
    color: var(--theme-bg-primary, #111);
    font-family: var(--theme-font-display, inherit);
    font-size: 1.45rem;
    font-weight: 700;
}
.card-text { display: flex; flex-direction: column; gap: 0.15em; min-width: 0; }
.house-name {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5em;
    font-weight: 700;
    font-size: 1.05em;
    overflow-wrap: anywhere;
}
.founder { font-size: 0.85rem; color: color-mix(in srgb, var(--theme-text) 80%, transparent); }
.count { font-size: 0.8rem; color: color-mix(in srgb, var(--theme-text) 55%, transparent); }

.people { margin-top: 1.5em; padding-top: 1em; border-top: 1px solid color-mix(in srgb, var(--theme-text) 15%, transparent); }
.people h3 { margin: 0 0 0.6em; font-size: 1.05rem; }
.hit-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4em; }
.hit {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.15em 0.9em;
    min-height: 2.75em;
    box-sizing: border-box;
    padding: 0.55em 0.9em;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, var(--theme-text) 15%, transparent);
    color: var(--theme-text);
    text-decoration: none;
}
.hit:hover { border-color: var(--theme-accent); }
.hit:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: 2px; }
.hit-name { font-weight: 600; flex-basis: 100%; }
.hit-meta { font-size: 0.82rem; color: color-mix(in srgb, var(--theme-text) 60%, transparent); }

@media (min-width: 40em) {
    .house-grid { grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); }
    .hit-name { flex-basis: auto; }
}
</style>
