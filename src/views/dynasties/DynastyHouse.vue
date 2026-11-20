<template>
    <div class="dynasties-view">
        <LoadingState v-if="state === 'loading'" message="Loading the house…" />

        <div v-else-if="state === 'missing' || state === 'failed'" class="empty">
            <p>{{ state === 'missing' ? 'This house could not be found.' : 'This house could not be loaded.' }}</p>
            <router-link class="tool-btn" :to="{ name: 'Dynasties' }">Back to Dynasties</router-link>
        </div>

        <template v-else-if="house">
            <nav class="breadcrumb" aria-label="Breadcrumb">
                <router-link :to="{ name: 'Dynasties' }">Dynasties</router-link>
                <span aria-hidden="true">&rsaquo;</span>
                <span aria-current="page">{{ house.name }}</span>
            </nav>

            <section class="house-intro">
                <img v-if="house.sigil" class="crest" :src="house.sigil" :alt="`${house.name} sigil`" />
                <span v-else class="crest shield" aria-hidden="true">{{ initial(house.name) }}</span>
                <div class="intro-text">
                    <h2 class="house-title">
                        {{ house.name }}
                        <span v-if="frozen" class="frozen-tag">Frozen</span>
                    </h2>
                    <p v-if="house.founderId" class="founder">
                        Founded by
                        <router-link :to="{ name: 'DynastyPerson', params: { personId: house.founderId } }">{{ founderName }}</router-link>
                    </p>
                    <p v-if="house.description" class="description">{{ house.description }}</p>
                </div>
            </section>

            <p v-if="frozen && editor" class="notice" role="note">
                This tree is frozen. You can browse it but not change it. Make it active again from the Dynasties page to edit it.
            </p>

            <div v-if="editor" class="toolbar">
                <router-link class="tool-btn history-link" :to="{ name: 'DynastyHistory', params: { houseId } }">
                    <span class="material-symbols-outlined" aria-hidden="true">history_edu</span>
                    <span>History</span>
                </router-link>
                <template v-if="!frozen">
                    <button type="button" class="tool-btn" @click="houseDialog.open(house, people)">Edit house</button>
                    <button
                        type="button"
                        class="tool-btn primary"
                        :disabled="full || limitsState !== 'ok'"
                        :aria-describedby="full || limitsState === 'failed' ? 'house-full-note' : null"
                        @click="personDialog.open({ defaults: { houseId } })"
                    >
                        Add person
                    </button>
                </template>
                <button
                    type="button"
                    class="tool-btn danger"
                    :disabled="people.length > 0"
                    :title="people.length > 0 ? 'Remove the people in this house first' : ''"
                    @click="confirmOpen = true"
                >
                    Delete house
                </button>
            </div>
            <p v-if="editor && !frozen && limitsState === 'failed'" id="house-full-note" class="notice" role="note">
                This tree's limits could not be loaded, so you can't add anyone yet. Reload the page to try again.
            </p>
            <p v-else-if="editor && full && !frozen" id="house-full-note" class="notice" role="note">{{ fullText }}</p>
            <p v-if="actionError" class="error-text" role="alert">{{ actionError }}</p>

            <section v-if="elders.length" class="block elders">
                <h3>Elders</h3>
                <p class="section-copy">Player characters who are still alive but no longer count toward the family's generations.</p>
                <ul class="row-list">
                    <li v-for="p in elders" :key="p.id" class="row">
                        <router-link class="row-link" :to="personLink(p.id)">
                            <img v-if="portrait(p)" class="thumb" :src="portrait(p)" alt="" loading="lazy" />
                            <span v-else class="thumb blank" aria-hidden="true"></span>
                            <span class="row-text">
                                <span class="row-name">
                                    {{ p.name }}
                                    <span v-if="p.hidden" class="hidden-tag">Hidden from the family</span>
                                </span>
                                <span class="row-meta">{{ yearsText(p) }}</span>
                            </span>
                        </router-link>
                    </li>
                </ul>
            </section>

            <section v-if="members.length || !elders.length" class="block">
                <h3>People of the house</h3>
                <p v-if="!members.length" class="empty-line">No one is recorded in this house yet.</p>
                <ul v-else class="row-list">
                    <li v-for="p in members" :key="p.id" class="row">
                        <router-link class="row-link" :to="personLink(p.id)">
                            <img v-if="portrait(p)" class="thumb" :src="portrait(p)" alt="" loading="lazy" />
                            <span v-else class="thumb blank" aria-hidden="true"></span>
                            <span class="row-text">
                                <span class="row-name">
                                    {{ p.name }}
                                    <span v-if="p.hidden" class="hidden-tag">Hidden from the family</span>
                                </span>
                                <span class="row-meta">{{ yearsText(p) }}</span>
                                <span v-if="titlesText(p.titles)" class="row-meta">{{ titlesText(p.titles) }}</span>
                            </span>
                        </router-link>
                        <button v-if="p.hidden && editor && !frozen" type="button" class="tool-btn small" @click="reveal(p.id)">Reveal</button>
                    </li>
                </ul>
            </section>

            <section v-if="marriedIn.length" class="block">
                <h3>Married into the house</h3>
                <ul class="row-list">
                    <li v-for="m in marriedIn" :key="m.marriage.id" class="row">
                        <router-link class="row-link" :to="personLink(m.person.id)">
                            <span class="row-text">
                                <span class="row-name">{{ m.person.name }}</span>
                                <span class="row-meta">
                                    Married {{ m.spouse.name }}, {{ marriageCaption(m.marriage, abbr) }}
                                </span>
                                <span v-if="houseName(m.person.houseId)" class="row-meta">From {{ houseName(m.person.houseId) }}</span>
                            </span>
                        </router-link>
                    </li>
                </ul>
            </section>

            <section v-if="bornElsewhere.length" class="block">
                <h3>Born to the house, recorded elsewhere</h3>
                <p class="section-copy">Children of this house whose line is recorded in another house's tree.</p>
                <ul class="row-list">
                    <li v-for="b in bornElsewhere" :key="b.person.id" class="row">
                        <router-link class="row-link" :to="personLink(b.person.id)">
                            <span class="row-text">
                                <span class="row-name">{{ b.person.name }}</span>
                                <span class="row-meta">{{ yearsText(b.person) }}</span>
                                <span class="row-meta">
                                    Child of {{ b.parents.map((p) => p.name).join(' and ') }}<template v-if="houseName(b.person.houseId)">, in {{ houseName(b.person.houseId) }}</template>
                                </span>
                            </span>
                        </router-link>
                    </li>
                </ul>
            </section>
        </template>

        <template v-if="editor">
            <HouseEditDialog ref="houseDialog" @saved="reload" />
            <PersonEditDialog ref="personDialog" @saved="reload" @saved-another="reload" />
            <DynastyConfirmDialog
                :open="confirmOpen"
                title="Delete this house?"
                confirm-label="Delete house"
                :busy="deleting"
                @confirm="removeHouse"
                @close="confirmOpen = false"
            >
                <p>This removes the house record. You can't undo it.</p>
            </DynastyConfirmDialog>
        </template>
    </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDynastiesStore } from '@shared/stores/dynasties';
import { useUserStore } from '@shared/stores/user';
import { useRealmStore } from '@shared/stores/realm';
import { useCharacterStore } from '@shared/stores/character';
import { formatYear } from '@shared/utils/dynastyYears';
import { marriageCaption, shortLifespan } from '@shared/utils/dynastyLabels';
import { characterImageUrl } from '@shared/utils/dynastyCharacters';
import LoadingState from '@shared/components/LoadingState.vue';
import HouseEditDialog from '@shared/components/dynasties/HouseEditDialog.vue';
import PersonEditDialog from '@shared/components/dynasties/PersonEditDialog.vue';
import DynastyConfirmDialog from '@shared/components/dynasties/DynastyConfirmDialog.vue';

const emit = defineEmits(['set-room']);
const route = useRoute();
const router = useRouter();
const store = useDynastiesStore();
const userStore = useUserStore();
const realmStore = useRealmStore();
const characterStore = useCharacterStore();
const abbr = computed(() => realmStore.activeRealm?.DateSuffix?.Abbr || 'SF');

const editor = computed(() => Boolean(userStore.isDM || userStore.isAdmin));
const houseDialog = ref(null);
const personDialog = ref(null);
const confirmOpen = ref(false);
const deleting = ref(false);
const actionError = ref('');
const state = ref('loading');

const houseId = computed(() => route.params.houseId);
const page = computed(() => store.house);
const house = computed(() => page.value?.house || null);
const people = computed(() => page.value?.people || []);
const elders = computed(() => page.value?.elders || []);
// Elders get their own row, so they are left out of the general list.
const members = computed(() => {
    const ids = new Set(elders.value.map((p) => p.id));
    return people.value.filter((p) => !ids.has(p.id));
});
const marriedIn = computed(() => page.value?.marriedIn || []);
const bornElsewhere = computed(() => page.value?.bornElsewhere || []);

// Until the house list (with the limits) has loaded, Add person stays off.
const limitsState = ref(store.status ? 'ok' : 'loading');
const frozen = computed(() => Boolean(house.value?.frozen || store.limitReached(houseId.value).frozen));
const full = computed(() => store.limitReached(houseId.value).full);
const fullText = computed(() => {
    const cap = store.status?.limits?.hardCap;
    return cap != null ? `This family is at its limit of ${cap} living members.` : 'This family is at its limit of living members.';
});

const founderName = computed(() => people.value.find((p) => p.id === house.value?.founderId)?.name || 'its founder');

const initial = (name) => (name || '?').trim().charAt(0).toUpperCase() || '?';
const personLink = (personId) => ({ name: 'DynastyPerson', params: { personId } });
const houseName = (id) => (id && id !== houseId.value ? store.houses.find((h) => h.id === id)?.name || '' : '');
const portrait = (p) => (p.characterId ? characterImageUrl(characterStore.characters?.[p.characterId]) : '');
const yearsText = (p) => shortLifespan(p, abbr.value);

function titlesText(titles) {
    return (titles || [])
        .map((t) => {
            const from = formatYear(t.from, { abbr: abbr.value });
            const to = formatYear(t.to, { abbr: abbr.value });
            if (from && to) return `${t.title} (${from} to ${to})`;
            if (from) return `${t.title} (from ${from})`;
            if (to) return `${t.title} (until ${to})`;
            return t.title;
        })
        .join('; ');
}

let loadToken = 0;

async function load() {
    if (!houseId.value) return;
    const token = ++loadToken;
    store.house = null;
    state.value = 'loading';
    try {
        await store.fetchHouse(houseId.value);
    } catch (e) {
        if (token !== loadToken) return;
        state.value = e?.response?.status === 404 ? 'missing' : 'failed';
        return;
    }
    if (token !== loadToken) return;
    state.value = 'ready';
}

// Refreshes after a save without the loading state.
async function reload() {
    try {
        await store.fetchHouse(houseId.value);
    } catch (e) {
        console.warn('Dynasties: house refresh failed', e);
    }
}

async function reveal(id) {
    actionError.value = '';
    try {
        await store.revealPerson(id);
        await reload();
    } catch (e) {
        actionError.value = store.error?.message || 'That person could not be revealed.';
    }
}

async function removeHouse() {
    deleting.value = true;
    actionError.value = '';
    try {
        await store.deleteHouse(houseId.value);
        confirmOpen.value = false;
        router.push({ name: 'Dynasties' });
    } catch (e) {
        confirmOpen.value = false;
        actionError.value = store.error?.message || 'The house was not deleted.';
    } finally {
        deleting.value = false;
    }
}

watch(houseId, () => {
    actionError.value = '';
    confirmOpen.value = false;
    load();
});

onMounted(() => {
    emit('set-room', 'dynasties');
    // The house list carries the plan limits and frozen flags.
    if (!store.status) {
        store
            .fetchHouses()
            .then(() => (limitsState.value = 'ok'))
            .catch(() => (limitsState.value = 'failed'));
    }
    if (!Object.keys(characterStore.characters || {}).length) characterStore.fetchCharacters?.();
    load();
});
</script>

<style scoped src="./dynastyView.css"></style>
<style scoped>
.breadcrumb { margin-bottom: 1em; }
.house-intro { display: flex; align-items: flex-start; gap: 1em; margin-bottom: 1.25em; }
.crest { flex: none; width: 64px; height: 74px; object-fit: contain; }
.crest.shield {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-bottom: 10px;
    box-sizing: border-box;
    clip-path: polygon(0 0, 100% 0, 100% 58%, 50% 100%, 0 58%);
    background: linear-gradient(160deg, var(--theme-accent), color-mix(in srgb, var(--theme-accent) 35%, var(--theme-bg-primary, #000)));
    color: var(--theme-bg-primary, #111);
    font-family: var(--theme-font-display, inherit);
    font-size: 1.9rem;
    font-weight: 700;
}
.intro-text { min-width: 0; }
.house-title {
    margin: 0 0 0.25em;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5em;
    font-family: var(--theme-font-display, inherit);
    overflow-wrap: anywhere;
}
.founder { margin: 0 0 0.4em; font-size: 0.92rem; }
.founder a { color: var(--theme-accent); }
.description { margin: 0; line-height: 1.55; max-width: 65ch; white-space: pre-line; color: color-mix(in srgb, var(--theme-text) 85%, transparent); }

.toolbar { display: flex; flex-wrap: wrap; gap: 0.5em; margin-bottom: 1em; }
.tool-btn.small { min-height: 2.5em; padding: 0.3em 0.8em; font-size: 0.85rem; }

.block { margin-top: 1.5em; }
.block h3 { margin: 0 0 0.6em; font-size: 1.05rem; }
.section-copy { margin: -0.3em 0 0.7em; font-size: 0.88rem; color: color-mix(in srgb, var(--theme-text) 65%, transparent); }
.row-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4em; }
.row { display: flex; align-items: stretch; gap: 0.5em; }
.row > .tool-btn { align-self: center; }
.row-link {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.75em;
    min-height: 2.75em;
    box-sizing: border-box;
    padding: 0.55em 0.85em;
    border-radius: 10px;
    background: color-mix(in srgb, var(--theme-bg-surface) 50%, transparent);
    border: 1px solid color-mix(in srgb, var(--theme-text) 15%, transparent);
    color: var(--theme-text);
    text-decoration: none;
}
.row-link:hover { border-color: var(--theme-accent); }
.row-link:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: 2px; }
.thumb { flex: none; width: 40px; height: 40px; border-radius: 8px; object-fit: cover; }
.thumb.blank { background: color-mix(in srgb, var(--theme-text) 8%, transparent); }
.row-text { display: flex; flex-direction: column; gap: 0.15em; min-width: 0; }
.row-name { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5em; font-weight: 600; overflow-wrap: anywhere; }
.row-meta { font-size: 0.82rem; color: color-mix(in srgb, var(--theme-text) 62%, transparent); overflow-wrap: anywhere; }

@media (min-width: 40em) {
    .crest { width: 80px; height: 92px; }
}
</style>
