<template>
    <div class="dynasties-view scandals-view">
        <nav class="breadcrumb" aria-label="Breadcrumb">
            <router-link :to="{ name: 'Dynasties' }">Dynasties</router-link>
            <span aria-hidden="true">&rsaquo;</span>
            <span aria-current="page">Scandals</span>
        </nav>
        <header class="dyn-page-head">
            <h2>Scandals</h2>
            <p class="subtitle">Gossip the Lorekeeper can pass on to players. You can reword any of it, switch it off or delete it.</p>
        </header>

        <LoadingState v-if="!settingsLoaded && !loadFailed" message="Loading scandals…" />

        <div v-else-if="loadFailed" class="empty">
            <p>The scandals could not be loaded.</p>
            <button type="button" class="tool-btn" @click="start">Try again</button>
        </div>

        <div v-else-if="!scandalsOn" class="empty off">
            <p>Scandals are switched off for this realm. You can turn them on at the bottom of Manage Races.</p>
            <router-link class="tool-btn" :to="{ name: 'ManageRaces' }">Go to Manage Races</router-link>
        </div>

        <template v-else>
            <div class="filters">
                <div class="tabs" role="tablist" aria-label="Which scandals">
                    <button
                        v-for="t in TABS"
                        :key="t.value"
                        type="button"
                        role="tab"
                        class="tab"
                        :class="{ on: status === t.value }"
                        :aria-selected="status === t.value ? 'true' : 'false'"
                        :tabindex="status === t.value ? 0 : -1"
                        @click="setStatus(t.value)"
                        @keydown.right.prevent="stepTab(1)"
                        @keydown.left.prevent="stepTab(-1)"
                    >{{ t.label }}</button>
                </div>
                <form class="search" role="search" @submit.prevent="searchNow">
                    <label :for="searchId" class="sr-only">Search scandals</label>
                    <span class="material-symbols-outlined" aria-hidden="true">search</span>
                    <input :id="searchId" v-model="q" type="search" placeholder="Search scandals or names" autocomplete="off" @input="searchSoon" />
                </form>
            </div>

            <div v-if="actionError" class="error-text" role="alert">
                <p>{{ actionError }}</p>
            </div>

            <p v-if="listing" class="empty-line" role="status">Loading…</p>
            <p v-else-if="listFailed" class="empty-line">
                The list could not be loaded.
                <button type="button" class="link-btn" @click="fetchList">Try again</button>
            </p>
            <p v-else-if="!scandals.length" class="empty-line">{{ emptyText }}</p>

            <ul v-else class="scandal-list">
                <li v-for="s in scandals" :key="s.id" class="scandal" :class="{ off: s.disabled }">
                    <div class="meta">
                        <span v-if="s.year != null" class="year">{{ fmt(s.year) }}</span>
                        <span class="source">{{ s.source === 'report' ? 'Session report' : 'Family tree' }}</span>
                        <span v-if="s.secret" class="secret-tag">Secret, awaiting your decision</span>
                        <span v-else-if="s.disabled" class="state-tag">Disabled</span>
                        <span v-if="s.rumour" class="state-tag">Rumour</span>
                        <span v-if="s.dmEdited" class="state-tag">Edited</span>
                    </div>

                    <template v-if="editingId !== s.id">
                        <blockquote class="teaser">{{ s.vague }}</blockquote>
                        <p v-if="s.about?.length" class="about">About {{ s.about.join(', ') }}</p>
                        <p v-if="s.secret" class="secret-hint">This one starts switched off. Enable it if you want players to hear it.</p>
                        <div v-if="openIds.has(s.id)" :id="detailId(s.id)" class="detail">{{ s.detail }}</div>

                        <div class="actions">
                            <button
                                type="button"
                                class="link-btn more"
                                :aria-expanded="openIds.has(s.id) ? 'true' : 'false'"
                                :aria-controls="detailId(s.id)"
                                @click="toggleOpen(s.id)"
                            >{{ openIds.has(s.id) ? 'Less' : 'More' }}</button>
                            <span class="spacer"></span>
                            <button type="button" class="tool-btn" :disabled="busyId === s.id" @click="startEdit(s)">Edit</button>
                            <button type="button" class="tool-btn" :disabled="busyId === s.id" @click="toggleDisabled(s)">{{ s.disabled ? 'Enable' : 'Disable' }}</button>
                            <button type="button" class="tool-btn danger" :disabled="busyId === s.id" @click="deleteTarget = s">Delete</button>
                        </div>
                    </template>

                    <form v-else class="edit" @submit.prevent="saveEdit(s)">
                        <label :for="`${uid}-vague`" class="field-label">Teaser</label>
                        <p class="field-hint">What the Lorekeeper says first. It names nobody.</p>
                        <textarea :id="`${uid}-vague`" v-model="draft.vague" class="vague-input" rows="3" :aria-invalid="vagueError ? 'true' : 'false'"></textarea>
                        <p class="count" :class="{ over: draft.vague.length > VAGUE_MAX }">{{ draft.vague.length }} / {{ VAGUE_MAX }}</p>
                        <p v-if="vagueError" class="field-error">{{ vagueError }}</p>

                        <label :for="`${uid}-detail`" class="field-label">Detail</label>
                        <p class="field-hint">What the Lorekeeper says if a player asks for more.</p>
                        <textarea :id="`${uid}-detail`" v-model="draft.detail" class="detail-input" rows="6" :aria-invalid="detailError ? 'true' : 'false'"></textarea>
                        <p class="count" :class="{ over: draft.detail.length > DETAIL_MAX }">{{ draft.detail.length }} / {{ DETAIL_MAX }}</p>
                        <p v-if="detailError" class="field-error">{{ detailError }}</p>

                        <div class="actions">
                            <span class="spacer"></span>
                            <button type="button" class="tool-btn" :disabled="busyId === s.id" @click="cancelEdit">Cancel</button>
                            <button type="submit" class="tool-btn primary" :disabled="!canSave || busyId === s.id">Save</button>
                        </div>
                    </form>
                </li>
            </ul>
        </template>

        <DynastyConfirmDialog
            :open="!!deleteTarget"
            title="Delete this scandal?"
            confirm-label="Delete scandal"
            busy-label="Deleting…"
            :busy="deleting"
            @confirm="confirmDelete"
            @close="deleteTarget = null"
        >
            <p v-if="deleteTarget?.source === 'report'" class="confirm-text">This came from a session report, so it can come back the next time that report is edited or rescanned. To hide it for good, use Disable instead.</p>
            <p v-else class="confirm-text">If this is still true in the family tree, a later rescan can find it and bring it back. To hide it for good, use Disable instead.</p>
        </DynastyConfirmDialog>
    </div>
</template>

<script setup>
// The DM's scandals: the gossip the Lorekeeper can pass on. Lists by status
// with a search, and edits, switches off or deletes each one. DM only, guarded
// the way the advance page is.
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useDynastiesStore } from '@shared/stores/dynasties';
import { useUserStore } from '@shared/stores/user';
import { useRealmStore } from '@shared/stores/realm';
import { formatYear } from '@shared/utils/dynastyYears';
import { scandalErrorMessage } from '@shared/utils/dynastyErrors';
import LoadingState from '@shared/components/LoadingState.vue';
import DynastyConfirmDialog from '@shared/components/dynasties/DynastyConfirmDialog.vue';

const emit = defineEmits(['set-room']);
const router = useRouter();
const store = useDynastiesStore();
const userStore = useUserStore();
const realmStore = useRealmStore();

// The server's limits for a DM edit.
const VAGUE_MAX = 400;
const DETAIL_MAX = 4000;

const TABS = [
    { value: 'active', label: 'Active' },
    { value: 'disabled', label: 'Disabled' },
    { value: 'all', label: 'All' },
];

const uid = Math.random().toString(36).slice(2, 8);
const searchId = `scandal-search-${uid}`;
const detailId = (id) => `scandal-detail-${uid}-${id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

const abbr = computed(() => realmStore.activeRealm?.DateSuffix?.Abbr || 'SF');
const fmt = (y) => formatYear(y, { abbr: abbr.value });
const editor = computed(() => Boolean(userStore.isDM || userStore.isAdmin));
// Until the realm's players load, isDM reads false for a DM too.
const rolesKnown = computed(() => (realmStore.getRealmDMs?.length ?? 0) > 0);

const settingsLoaded = ref(false);
const loadFailed = ref(false);
const scandalsOn = ref(false);
const status = ref('active');
const q = ref('');
const scandals = ref([]);
const listing = ref(false);
const listFailed = ref(false);
const actionError = ref('');
const openIds = reactive(new Set());
const busyId = ref(null);
const editingId = ref(null);
const draft = reactive({ vague: '', detail: '', origVague: '', origDetail: '' });
const deleteTarget = ref(null);
const deleting = ref(false);

const emptyText = computed(() => {
    if (q.value.trim()) return 'Nothing matches that search.';
    if (status.value === 'active') return 'No active scandals.';
    if (status.value === 'disabled') return 'Nothing is switched off.';
    return 'No scandals yet. They turn up as the trees grow and session reports come in.';
});

// Mirrors the server's check, so a save it would refuse can't be sent.
function textError(text, label, max) {
    if (!text.trim()) return `The ${label} can't be empty.`;
    if (text.length > max) return `The ${label} is too long (${max} characters at most).`;
    if (text.includes('\u2014')) return 'Replace the long dashes with commas or full stops.';
    if (/[<>]/.test(text)) return "Angle brackets aren't allowed.";
    return '';
}
const vagueError = computed(() => textError(draft.vague, 'teaser', VAGUE_MAX));
const detailError = computed(() => textError(draft.detail, 'detail', DETAIL_MAX));
const patch = computed(() => {
    const p = {};
    if (draft.vague !== draft.origVague) p.vague = draft.vague.trim();
    if (draft.detail !== draft.origDetail) p.detail = draft.detail.trim();
    return p;
});
const canSave = computed(() => !vagueError.value && !detailError.value && Object.keys(patch.value).length > 0);

function failText(e, fallback) {
    return scandalErrorMessage(store, e, fallback);
}

// Each fetch takes a ticket; only the newest one writes the list.
let ticket = 0;
async function fetchList() {
    const mine = ++ticket;
    listing.value = true;
    listFailed.value = false;
    try {
        const list = await store.listScandals({ status: status.value, q: q.value.trim() });
        if (mine !== ticket) return;
        scandals.value = list;
    } catch (e) {
        if (mine !== ticket) return;
        if (store.error?.code === 'FORBIDDEN') {
            router.replace({ name: 'Dynasties' });
            return;
        }
        listFailed.value = true;
    } finally {
        if (mine === ticket) listing.value = false;
    }
}

async function start() {
    loadFailed.value = false;
    settingsLoaded.value = false;
    try {
        const s = await store.getScandalSettings();
        scandalsOn.value = !!s?.on;
        settingsLoaded.value = true;
        if (scandalsOn.value) await fetchList();
    } catch (e) {
        if (store.error?.code === 'FORBIDDEN') {
            router.replace({ name: 'Dynasties' });
            return;
        }
        loadFailed.value = true;
    }
}

function setStatus(v) {
    if (status.value === v) return;
    status.value = v;
    cancelEdit();
    fetchList();
}
function stepTab(dir) {
    const i = TABS.findIndex((t) => t.value === status.value);
    const next = TABS[(i + dir + TABS.length) % TABS.length];
    setStatus(next.value);
    // Keep focus on the tab now selected.
    setTimeout(() => document.querySelector('.scandals-view .tab.on')?.focus(), 0);
}

let searchTimer = null;
function searchSoon() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(fetchList, 300);
}
function searchNow() {
    clearTimeout(searchTimer);
    fetchList();
}

function toggleOpen(id) {
    if (openIds.has(id)) openIds.delete(id);
    else openIds.add(id);
}

function startEdit(s) {
    actionError.value = '';
    editingId.value = s.id;
    draft.vague = draft.origVague = s.vague || '';
    draft.detail = draft.origDetail = s.detail || '';
}
function cancelEdit() {
    editingId.value = null;
}

// The saved record replaces the old one. A DM change always clears "secret",
// and a row that no longer fits the tab leaves the list.
function applyRecord(old, rec) {
    const merged = { ...old, ...rec, about: old.about, secret: false };
    const fits = status.value === 'all' || (status.value === 'disabled') === !!merged.disabled;
    scandals.value = fits
        ? scandals.value.map((x) => (x.id === old.id ? merged : x))
        : scandals.value.filter((x) => x.id !== old.id);
}
function dropRow(id) {
    scandals.value = scandals.value.filter((x) => x.id !== id);
}

async function update(s, body, fallback) {
    busyId.value = s.id;
    actionError.value = '';
    try {
        const rec = await store.updateScandal(s.id, body);
        applyRecord(s, rec || {});
        return true;
    } catch (e) {
        actionError.value = failText(e, fallback);
        if (store.error?.code === 'NOT_FOUND') dropRow(s.id);
        return false;
    } finally {
        busyId.value = null;
    }
}

async function saveEdit(s) {
    if (!canSave.value) return;
    if (await update(s, { ...patch.value }, 'The changes were not saved.')) editingId.value = null;
}

function toggleDisabled(s) {
    return update(s, { disabled: !s.disabled }, s.disabled ? 'The scandal was not enabled.' : 'The scandal was not disabled.');
}

async function confirmDelete() {
    const s = deleteTarget.value;
    if (!s) return;
    deleting.value = true;
    actionError.value = '';
    try {
        await store.deleteScandal(s.id);
        dropRow(s.id);
    } catch (e) {
        actionError.value = failText(e, 'The scandal was not deleted.');
    } finally {
        deleting.value = false;
        deleteTarget.value = null;
    }
}

let started = false;
watch(
    [editor, rolesKnown],
    ([isEditor, known]) => {
        if (isEditor) {
            if (!started) {
                started = true;
                start();
            }
        } else if (known) {
            router.replace({ name: 'Dynasties' });
        }
    },
    { immediate: true }
);

onMounted(() => emit('set-room', 'dynasties'));
onBeforeUnmount(() => clearTimeout(searchTimer));
</script>

<style scoped src="./dynastyView.css"></style>
<style scoped>
.breadcrumb { margin-bottom: 0.5em; }
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
}
.off .tool-btn { margin-top: 0.75em; }

/* Status tabs and search: stacked on phones, one row from 40em. */
.filters { display: flex; flex-direction: column; gap: 0.6em; margin: 0 0 1em; }
.tabs {
    display: flex;
    padding: 3px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--theme-text) 8%, transparent);
}
.tab {
    flex: 1;
    min-height: 2.5rem;
    padding: 0 0.75em;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: color-mix(in srgb, var(--theme-text) 70%, transparent);
    font: inherit;
    font-size: 0.9rem;
    cursor: pointer;
}
.tab.on {
    background: var(--theme-bg-primary, transparent);
    color: var(--theme-text);
    box-shadow: inset 0 0 0 1px var(--theme-accent);
    font-weight: 600;
}
.tab:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: 2px; }
.search {
    display: flex;
    align-items: center;
    gap: 0.4em;
    min-height: 2.75rem;
    padding: 0 0.7em;
    box-sizing: border-box;
    border: 1px solid color-mix(in srgb, var(--theme-text) 25%, transparent);
    border-radius: 8px;
}
.search:focus-within { border-color: var(--theme-accent); }
.search .material-symbols-outlined { font-size: 1.15rem; color: color-mix(in srgb, var(--theme-text) 55%, transparent); }
.search input {
    flex: 1;
    min-width: 0;
    padding: 0.5em 0;
    border: none;
    background: transparent;
    color: var(--theme-text);
    font: inherit;
    font-size: 16px; /* stops iOS zooming in */
    outline: none;
}
@media (min-width: 40em) {
    .filters { flex-direction: row; align-items: center; }
    .tabs { flex: none; }
    .tab { flex: none; }
    .search { flex: 1; }
}

/* Entries: a hairline between each, no boxes. The teaser is the one large thing. */
.scandal-list { list-style: none; margin: 0; padding: 0; }
.scandal {
    padding: 1em 0;
    border-bottom: 1px solid color-mix(in srgb, var(--theme-text) 12%, transparent);
    min-width: 0;
}
.scandal:first-child { border-top: 1px solid color-mix(in srgb, var(--theme-text) 12%, transparent); }
.meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35em 0.75em;
    font-size: 0.8rem;
    color: color-mix(in srgb, var(--theme-text) 60%, transparent);
}
.year { font-variant-numeric: tabular-nums; font-weight: 600; color: var(--theme-text); }
.secret-tag,
.state-tag {
    font-size: 0.72rem;
    font-weight: 600;
    border-radius: 4px;
    padding: 0.1em 0.45em;
}
.secret-tag { border: 1px solid #d8a657; color: #d8a657; background: color-mix(in srgb, #d8a657 10%, transparent); }
.state-tag { border: 1px solid color-mix(in srgb, var(--theme-text) 25%, transparent); }
.teaser {
    margin: 0.55em 0 0.35em;
    padding: 0.1em 0 0.1em 0.8em;
    border-left: 3px solid var(--theme-accent);
    font-family: var(--theme-font-display, inherit);
    font-size: 1.08rem;
    line-height: 1.45;
    max-width: 65ch;
    overflow-wrap: anywhere;
}
.scandal.off .teaser { border-left-color: color-mix(in srgb, var(--theme-text) 25%, transparent); color: color-mix(in srgb, var(--theme-text) 70%, transparent); }
.about { margin: 0; font-size: 0.88rem; overflow-wrap: anywhere; }
.secret-hint { margin: 0.35em 0 0; font-size: 0.85rem; color: #d8a657; }
.detail {
    margin: 0.6em 0 0;
    max-width: 65ch;
    font-size: 0.92rem;
    line-height: 1.55;
    white-space: pre-line;
    overflow-wrap: anywhere;
}
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5em; margin-top: 0.7em; }
.actions .spacer { flex: 1; }
.actions .tool-btn { min-width: 0; padding: 0.45em 0.85em; }
.link-btn {
    min-height: 2.75em;
    padding: 0 0.2em;
    border: none;
    background: none;
    color: var(--theme-accent);
    font: inherit;
    font-size: 0.9rem;
    text-decoration: underline;
    cursor: pointer;
}
.link-btn:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: 2px; }

/* Inline edit. */
.edit { margin-top: 0.6em; }
.field-label { display: block; margin-top: 0.6em; font-weight: 600; font-size: 0.9rem; }
.field-hint { margin: 0.1em 0 0.35em; font-size: 0.82rem; color: color-mix(in srgb, var(--theme-text) 60%, transparent); }
.edit textarea {
    display: block;
    width: 100%;
    box-sizing: border-box;
    padding: 0.55em 0.65em;
    border: 1px solid color-mix(in srgb, var(--theme-text) 25%, transparent);
    border-radius: 8px;
    background: transparent;
    color: var(--theme-text);
    font: inherit;
    font-size: 16px;
    line-height: 1.45;
    resize: vertical;
}
.edit textarea:focus { outline: none; border-color: var(--theme-accent); }
.edit textarea[aria-invalid='true'] { border-color: var(--theme-danger, #e06c75); }
.count { margin: 0.2em 0 0; text-align: right; font-size: 0.75rem; font-variant-numeric: tabular-nums; color: color-mix(in srgb, var(--theme-text) 55%, transparent); }
.count.over { color: var(--theme-danger, #e06c75); }
.field-error { margin: 0.2em 0 0; font-size: 0.85rem; color: var(--theme-danger, #e06c75); }
.error-text p { margin: 0; }
.confirm-text { margin: 0; line-height: 1.5; }
</style>
