<template>
    <div ref="scroller" class="dynasties-view person-view">
        <LoadingState v-if="state === 'loading'" message="Loading the family tree…" />

        <div v-else-if="state === 'missing' || state === 'failed'" class="empty">
            <p>{{ state === 'missing' ? 'This person could not be found.' : 'This person could not be loaded.' }}</p>
            <router-link class="tool-btn" :to="{ name: 'Dynasties' }">Back to Dynasties</router-link>
        </div>

        <template v-else-if="data">
            <div class="top-row">
                <nav class="breadcrumb" aria-label="Breadcrumb">
                    <router-link :to="{ name: 'Dynasties' }">Dynasties</router-link>
                    <template v-if="data.person.houseId">
                        <span aria-hidden="true">&rsaquo;</span>
                        <router-link :to="houseLink">{{ houseName || 'House' }}</router-link>
                    </template>
                    <span aria-hidden="true">&rsaquo;</span>
                    <span aria-current="page">{{ data.person.name }}</span>
                    <span v-if="frozen" class="frozen-tag">Frozen</span>
                </nav>
                <router-link v-if="data.person.houseId" class="tool-btn" :to="houseLink">House overview</router-link>
            </div>

            <p v-if="actionError" class="error-text action-error" role="alert">
                {{ actionError }}
                <a v-if="actionUpgrade" :href="upgradeHref" target="_blank" rel="noopener">See upgrade options</a>
            </p>

            <div class="person-layout" :class="{ switching }" :aria-busy="switching">
                <Hourglass
                    :data="data"
                    :editable="editor"
                    :can-add="canAdd"
                    @select="goPerson"
                    @add="add"
                    @edit-marriage="editMarriage"
                />
                <PersonPanel
                    :person="data.person"
                    :house="houseName"
                    :marriages="data.marriages || []"
                    :deletable="Boolean(data.deletable)"
                    :editable="editor && !frozen"
                    :dm-view="editor"
                    :legitimacy="data.legitimacy || 'unknown'"
                    :character-bio="Boolean(data.characterBio)"
                    :siblings="data.siblings || []"
                    :father="data.father || null"
                    :mother="data.mother || null"
                    :error="deleteError"
                    @edit="editPerson"
                    @reveal="revealHidden"
                    @delete="confirmOpen = true"
                    @edit-marriage="editMarriage"
                />
            </div>
        </template>

        <template v-if="editor">
            <PersonEditDialog ref="personDialog" @saved="onPersonSaved" @saved-another="refresh" />
            <MarriageEditDialog ref="marriageDialog" @saved="refresh" @deleted="refresh" />
            <DynastyConfirmDialog
                :open="confirmOpen"
                title="Delete this person?"
                :busy="deleting"
                @confirm="removePerson"
                @close="confirmOpen = false"
            >
                <p>This removes their record. You can't undo it.</p>
            </DynastyConfirmDialog>
        </template>
    </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDynastiesStore } from '@shared/stores/dynasties';
import { useUserStore } from '@shared/stores/user';
import { useCharacterStore } from '@shared/stores/character';
import LoadingState from '@shared/components/LoadingState.vue';
import Hourglass from '@shared/components/dynasties/Hourglass.vue';
import PersonPanel from '@shared/components/dynasties/PersonPanel.vue';
import PersonEditDialog from '@shared/components/dynasties/PersonEditDialog.vue';
import MarriageEditDialog from '@shared/components/dynasties/MarriageEditDialog.vue';
import DynastyConfirmDialog from '@shared/components/dynasties/DynastyConfirmDialog.vue';
import { saveFailure, upgradeUrl } from '@shared/utils/dynastyErrors';

const emit = defineEmits(['set-room']);
const route = useRoute();
const router = useRouter();
const store = useDynastiesStore();
const userStore = useUserStore();
const characterStore = useCharacterStore();

const editor = computed(() => Boolean(userStore.isDM || userStore.isAdmin));
const scroller = ref(null);
const personDialog = ref(null);
const marriageDialog = ref(null);
const state = ref('loading');
const data = ref(null);
const switching = ref(false);
const confirmOpen = ref(false);
const deleting = ref(false);
const deleteError = ref('');
const actionError = ref('');
// Whether actionError comes with the upgrade link (a generation limit on a free plan).
const actionUpgrade = ref(false);
const upgradeHref = upgradeUrl();
// Any new message (or clearing it) drops the link; the parent-link failure sets it after its message.
watch(actionError, () => (actionUpgrade.value = false), { flush: 'sync' });

// The parent role awaiting a save, and the record it will be linked to.
let pendingParent = null;

const personId = computed(() => route.params.personId);
const personHouseId = computed(() => data.value?.person?.houseId || '');
const houseLink = computed(() => ({ name: 'DynastyHouse', params: { houseId: personHouseId.value } }));
const houseName = computed(() => store.houses.find((h) => h.id === personHouseId.value)?.name || '');

// Adding is blocked by the person's own tree: frozen first, then full. The
// generation limit is the server's call and comes back through the dialogs.
// Until the house list (with the limits) has loaded, nothing can be added;
// if it fails to load, the tree says so instead of guessing.
const limitsState = ref(store.status ? 'ok' : 'loading');
const limit = computed(() => store.limitReached(personHouseId.value));
const frozen = computed(() => limit.value.frozen);
const canAdd = computed(() => {
    if (limitsState.value === 'loading') return { reason: 'loading' };
    if (limitsState.value === 'failed') return { reason: 'unknown' };
    return { reason: limit.value.frozen ? 'frozen' : limit.value.full ? 'full' : null };
});

const SUMMARY_KEYS = ['id', 'name', 'houseId', 'gender', 'born', 'died', 'characterId'];
function summaryOf(p) {
    const out = {};
    SUMMARY_KEYS.forEach((k) => {
        if (p?.[k] !== undefined) out[k] = p[k];
    });
    return out;
}

// Names for every person id the dialogs may show.
const labels = computed(() => {
    const d = data.value;
    const map = {};
    const put = (p) => {
        if (p?.id && p.name) map[p.id] = p.name;
    };
    if (!d) return map;
    put(d.person);
    put(d.father);
    put(d.mother);
    (d.marriages || []).forEach((m) => put(m.spouse));
    (d.childGroups || []).forEach((g) => {
        put(g.otherParent);
        (g.children || []).forEach(put);
    });
    return map;
});

const spouses = computed(() => (data.value?.marriages || []).map((m) => m.spouse).filter(Boolean));
const marriageSpans = computed(() =>
    (data.value?.marriages || []).map((m) => ({ spouseId: m.spouseId, from: m.from, to: m.to }))
);

let loadToken = 0;

// Fetches the current person. A soft load keeps the tree on screen.
async function load({ soft = false } = {}) {
    if (!personId.value) return;
    const token = ++loadToken;
    if (soft && data.value) {
        switching.value = true;
    } else {
        data.value = null;
        state.value = 'loading';
    }
    let result;
    try {
        result = await store.fetchPerson(personId.value);
    } catch (e) {
        if (token !== loadToken) return;
        switching.value = false;
        const missing = e?.response?.status === 404;
        if (soft && !missing && data.value) {
            actionError.value = 'The tree could not be refreshed.';
            return;
        }
        state.value = missing ? 'missing' : 'failed';
        return;
    }
    if (token !== loadToken) return;
    // A slower earlier response may have overwritten the store.
    store.person = result;
    data.value = result;
    switching.value = false;
    state.value = 'ready';
}

const refresh = () => load({ soft: true });

function goPerson(id) {
    router.push({ name: 'DynastyPerson', params: { personId: id } });
}

function add({ role }) {
    const d = data.value;
    if (!d) return;
    actionError.value = '';
    const person = d.person;
    const anchor = summaryOf(person);
    if (role === 'spouse') {
        marriageDialog.value.open({ anchor, labels: labels.value });
        return;
    }
    if (role === 'father' || role === 'mother') {
        pendingParent = { role, record: person };
        personDialog.value.open({
            defaults: { houseId: person.houseId, gender: role === 'father' ? 'male' : 'female' },
            context: { anchor, role, partners: [], labels: labels.value },
            source: 'choose',
        });
        return;
    }
    if (role === 'child') {
        pendingParent = null;
        const defaults = { houseId: person.houseId };
        if (person.gender === 'male') defaults.fatherId = person.id;
        else if (person.gender === 'female') defaults.motherId = person.id;
        personDialog.value.open({
            defaults,
            context: { anchor, role: 'child', partners: spouses.value, marriages: marriageSpans.value, labels: labels.value },
            source: 'choose',
        });
    }
}

function editPerson() {
    const d = data.value;
    if (!d) return;
    pendingParent = null;
    actionError.value = '';
    personDialog.value.open({ person: d.person, context: { anchor: null, role: null, partners: [], labels: labels.value } });
}

function editMarriage(marriage) {
    const d = data.value;
    if (!d) return;
    actionError.value = '';
    marriageDialog.value.open({ marriage, anchor: summaryOf(d.person), labels: labels.value });
}

async function revealHidden() {
    actionError.value = '';
    try {
        await store.revealPerson(personId.value);
        await refresh();
    } catch {
        actionError.value = store.error?.message || 'That person could not be revealed.';
    }
}

// Every stored field of the record, so the PUT drops nothing.
function editableFields(record) {
    const out = { ...record };
    delete out.createdAt;
    delete out.updatedAt;
    return out;
}

async function onPersonSaved(saved) {
    const pending = pendingParent;
    pendingParent = null;
    if (pending && saved?.id) {
        const field = pending.role === 'father' ? 'fatherId' : 'motherId';
        try {
            await store.savePerson({ ...editableFields(pending.record), [field]: saved.id });
        } catch (e) {
            // The parent was created only to be linked: without the link it is an
            // orphan using a place in the tree, so it goes again. Read the failure
            // before deleting, which clears store.error.
            const failure = saveFailure(store, e, 'The parent could not be linked.');
            const who = saved.name || 'The new parent';
            let removed = true;
            try {
                await store.deletePerson(saved.id);
            } catch {
                removed = false;
            }
            actionError.value = removed
                ? `${who} was not added as a parent: ${failure.message}`
                : `${who} was saved but could not be set as a parent: ${failure.message}`;
            actionUpgrade.value = failure.upgrade;
        }
    }
    await refresh();
}

async function removePerson() {
    const d = data.value;
    if (!d) return;
    deleting.value = true;
    deleteError.value = '';
    const houseId = d.person.houseId;
    try {
        await store.deletePerson(d.person.id);
        confirmOpen.value = false;
        router.push(houseId ? { name: 'DynastyHouse', params: { houseId } } : { name: 'Dynasties' });
    } catch {
        confirmOpen.value = false;
        deleteError.value = store.error?.message || 'This person was not deleted.';
    } finally {
        deleting.value = false;
    }
}

watch(personId, (id) => {
    if (!id) return;
    deleteError.value = '';
    actionError.value = '';
    confirmOpen.value = false;
    scroller.value?.scrollIntoView?.({ block: 'start' });
    load({ soft: state.value === 'ready' });
});

onMounted(() => {
    emit('set-room', 'dynasties');
    // The house list carries the plan limits and frozen flags the tree needs.
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
.person-view { max-width: 1200px; }
.top-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.6em 1em;
    margin-bottom: 1em;
}
.person-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 1.25em;
    transition: opacity 0.15s ease;
}
.person-layout.switching { opacity: 0.6; }

@media (min-width: 64em) {
    .person-layout { grid-template-columns: minmax(0, 1fr) 20em; align-items: start; }
}
@media (prefers-reduced-motion: reduce) {
    .person-layout { transition: none; }
}
</style>
