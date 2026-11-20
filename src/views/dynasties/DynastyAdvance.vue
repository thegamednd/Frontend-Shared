<template>
    <div class="dynasties-view advance-view">
        <nav class="breadcrumb" aria-label="Breadcrumb">
            <router-link :to="{ name: 'Dynasties' }">Dynasties</router-link>
            <span aria-hidden="true">&rsaquo;</span>
            <span aria-current="page">Advance the year</span>
        </nav>
        <header class="dyn-page-head">
            <h2>Advance the year</h2>
            <p class="subtitle">Roll every active tree forward one year. You review the year before anything is saved.</p>
        </header>

        <LoadingState v-if="!loaded && !loadFailed" message="Loading the advance…" />

        <div v-else-if="loadFailed" class="empty">
            <p>The advance could not be loaded.</p>
            <button type="button" class="tool-btn" @click="load">Try again</button>
        </div>

        <template v-else>
            <section class="ledger" :class="phase" aria-label="Year">
                <p v-if="stampYear" class="ledger-year">
                    <span class="ledger-caption">{{ caption }}</span>
                    {{ stampYear }}
                </p>
                <CurrentToSetting
                    v-if="showYearLine"
                    :current-to="state?.currentTo ?? null"
                    :game-year="state?.gameYear ?? null"
                    :can-edit="!!state?.canSetYear && !busy"
                    :abbr="abbr"
                    :save="saveCurrentTo"
                />
            </section>

            <LettersPanel />

            <div v-if="actionError" class="error-text" role="alert">
                <p>{{ actionError.text }}</p>
                <button v-if="actionError.fresh" type="button" class="tool-btn primary" :disabled="busy" @click="advance">Run a fresh preview</button>
                <button v-else-if="actionError.refresh" type="button" class="tool-btn" :disabled="busy" @click="load">Refresh</button>
            </div>
            <div v-if="pollError" class="error-text" role="alert">
                <p>Lost touch with the advance while checking on it.</p>
                <button type="button" class="tool-btn" @click="resume">Check again</button>
            </div>

            <!-- Committed: what was saved, then the controls for the next year. -->
            <section v-if="phase === 'committed'" class="summary">
                <h3>{{ fmt(run.year) }} is recorded</h3>
                <p>The trees are now current to {{ fmt(run.year) }}.</p>
                <p v-if="letterStatus" class="letter-status">{{ letterStatus }}</p>
                <ul v-if="problems.length" class="problems">
                    <li v-for="(p, i) in problems" :key="i">{{ p }}</li>
                </ul>
            </section>

            <!-- No run, or the last one is done: the year line and Advance. -->
            <section v-if="phase === 'idle' || phase === 'committed'" class="start">
                <p v-if="state?.treeStatus?.needsSelection" class="notice warn" role="note">
                    Your realm has more active trees than its plan allows. Choose which ones stay active before you advance.
                    <button type="button" class="link-btn" @click="openActivation">Choose active trees</button>
                </p>
                <button type="button" class="tool-btn primary advance-btn" :disabled="!canAdvance || busy" :aria-describedby="limitReason ? 'advance-limit' : null" @click="advance">
                    <span class="material-symbols-outlined" aria-hidden="true">hourglass_bottom</span>
                    <span>{{ busy ? 'Starting…' : `Advance to ${fmt(nextYear)}` }}</span>
                </button>
                <p v-if="limitReason" id="advance-limit" class="limit-note">{{ limitReason }}</p>
            </section>

            <!-- Rolling or saving in the background. -->
            <template v-else-if="phase === 'running' || phase === 'committing'">
                <div class="progress" role="status">
                    <span class="sand" aria-hidden="true"></span>
                    <p v-if="phase === 'running'">Rolling {{ fmt(run.year) }} for every active tree. This can take a minute.</p>
                    <p v-else>Saving {{ fmt(run.year) }} to the trees.</p>
                </div>
                <div v-if="stuck" class="notice warn stuck" role="alert">
                    <p v-if="phase === 'running'">This preview is taking much longer than it should and has probably stopped.</p>
                    <p v-else>This save is taking much longer than it should and has probably stopped. Try again to finish it. Nothing gets saved twice.</p>
                    <button type="button" class="tool-btn primary" :disabled="busy" @click="retryStuck">Try again</button>
                </div>
            </template>

            <!-- Free tier: a roll would start a generation past the limit. -->
            <section v-else-if="phase === 'blocked'" class="blocked">
                <p class="notice warn">
                    These trees are at their generation limit, and someone in the youngest generation is about to have a child.
                    For each one, drop the oldest generation or upgrade your plan. Then run the advance again.
                </p>
                <ul class="blocked-list">
                    <li v-for="b in run.blocked || []" :key="b.houseId" class="blocked-row">
                        <span class="blocked-name">{{ b.houseName || run.houses?.[b.houseId] || 'Unknown house' }}</span>
                        <span v-if="droppedIds.includes(b.houseId)" class="done-tag">Dropped</span>
                        <button v-else type="button" class="tool-btn" @click="dropTarget = b">Drop or upgrade</button>
                    </li>
                </ul>
                <button v-if="droppedIds.length" type="button" class="tool-btn primary" :disabled="busy" @click="advance">Run the advance again</button>
            </section>

            <!-- The preview failed in the background. -->
            <section v-else-if="phase === 'failed'" class="failed">
                <div class="error-text" role="alert">
                    <p>The preview failed.</p>
                    <p v-if="run.error" class="detail">{{ run.error }}</p>
                </div>
                <button type="button" class="tool-btn primary" :disabled="busy" @click="advance">Try again</button>
            </section>

            <!-- Ready: the review. -->
            <template v-else-if="phase === 'ready'">
                <div v-if="yearMovedAway" class="notice warn" role="note">
                    <p>Everything for {{ fmt(run.year) }} is in the trees, but the "current to" year didn't move. Discard this run to clear it. The trees keep the year's changes.</p>
                    <p v-if="run.error" class="detail">{{ run.error }}</p>
                </div>
                <div v-else-if="run.commitAttempted" class="notice warn" role="note">
                    <p>The save stopped partway. Save again to finish it. Nothing gets saved twice.</p>
                    <p v-if="run.error" class="detail">{{ run.error }}</p>
                </div>

                <div v-if="editable && run.players?.length" class="players-bar">
                    <button type="button" class="tool-btn" @click="playersOpen = true">Player characters</button>
                    <span class="players-note">Give a player character a child this year.</span>
                </div>

                <section v-if="run.noRace?.length" class="no-race" aria-labelledby="no-race-title">
                    <h3 id="no-race-title">No race set, treated as human</h3>
                    <p class="hint">These people have no race, so they age as humans. Set a race and run a fresh preview if that's wrong.</p>
                    <ul>
                        <li v-for="p in run.noRace" :key="p.personId">
                            <router-link :to="{ name: 'DynastyPerson', params: { personId: p.personId } }">{{ p.name }}</router-link>
                        </li>
                    </ul>
                </section>

                <p v-if="!reviewHouses.length" class="empty-line">Nothing happens in any tree this year.</p>
                <AdvanceRunReview
                    v-for="h in reviewHouses"
                    :key="h.houseId"
                    :house="h"
                    :run="run"
                    :cap-state="run.capState?.[h.houseId] || null"
                    :prune="run.prunes?.[h.houseId] || null"
                    :editable="editable"
                    :busy="busy"
                    @edit="edit"
                    @remove="removeEvent"
                />

                <div class="decision">
                    <p class="decision-note">
                        <template v-if="run.commitAttempted">Save again to finish {{ fmt(run.year) }}.</template>
                        <template v-else>Saving records every event above and moves the trees on to {{ fmt(run.year) }}. Discard throws the preview away.</template>
                    </p>
                    <div class="decision-buttons">
                        <button v-if="!run.commitAttempted || yearMovedAway" type="button" class="tool-btn danger" :disabled="busy" @click="discardOpen = true">Discard</button>
                        <button type="button" class="tool-btn primary commit-btn" :disabled="busy" @click="commit">
                            {{ run.commitAttempted ? 'Save again' : `Save ${fmt(run.year)}` }}
                        </button>
                    </div>
                </div>
            </template>
        </template>

        <PlayerCharactersDialog v-if="run && phase === 'ready'" :open="playersOpen" :run="run" @close="playersOpen = false" />
        <GenerationLimitDialog
            :open="!!dropTarget"
            :house-id="dropTarget?.houseId || ''"
            :house-name="dropTarget?.houseName || ''"
            @dropped="onDropped"
            @close="dropTarget = null"
        />
        <DynastyConfirmDialog
            :open="discardOpen"
            title="Discard this preview?"
            confirm-label="Discard preview"
            busy-label="Discarding…"
            :busy="discarding"
            @confirm="discard"
            @close="discardOpen = false"
        >
            <p v-if="yearMovedAway" class="confirm-text">Discarding removes only the run. The trees keep this year's changes.</p>
            <p v-else class="confirm-text">Nothing in it is saved. The next advance rolls the year from scratch.</p>
        </DynastyConfirmDialog>
        <TreeActivationDialog
            v-if="store.status"
            :open="activationOpen"
            :houses="store.houses"
            :max-trees="store.status.maxTrees"
            :saving="activating"
            :error="activationError"
            @save="saveActivation"
            @close="activationOpen = false"
        />
    </div>
</template>

<script setup>
// The yearly advance, DM only. One run at a time: no run, then running,
// blocked, ready, committing and committed (or failed). The store polls a
// running or committing run; this page shows whatever status it reads.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useDynastiesStore } from '@shared/stores/dynasties';
import { useUserStore } from '@shared/stores/user';
import { useRealmStore } from '@shared/stores/realm';
import { formatYear } from '@shared/utils/dynastyYears';
import { groupEvents, advanceErrorMessage } from '@shared/utils/dynastyAdvance';
import LoadingState from '@shared/components/LoadingState.vue';
import CurrentToSetting from '@shared/components/dynasties/CurrentToSetting.vue';
import AdvanceRunReview from '@shared/components/dynasties/AdvanceRunReview.vue';
import PlayerCharactersDialog from '@shared/components/dynasties/PlayerCharactersDialog.vue';
import GenerationLimitDialog from '@shared/components/dynasties/GenerationLimitDialog.vue';
import DynastyConfirmDialog from '@shared/components/dynasties/DynastyConfirmDialog.vue';
import LettersPanel from '@shared/components/dynasties/LettersPanel.vue';
import TreeActivationDialog from '@shared/components/dynasties/TreeActivationDialog.vue';

const emit = defineEmits(['set-room']);
const router = useRouter();
const store = useDynastiesStore();
const userStore = useUserStore();
const realmStore = useRealmStore();

const abbr = computed(() => realmStore.activeRealm?.DateSuffix?.Abbr || 'SF');
const fmt = (y) => formatYear(y, { abbr: abbr.value });

const editor = computed(() => Boolean(userStore.isDM || userStore.isAdmin));
// Until the realm's players load, isDM reads false for a DM too.
const rolesKnown = computed(() => (realmStore.getRealmDMs?.length ?? 0) > 0);

const loaded = ref(false);
const loadFailed = ref(false);
const busy = ref(false);
const actionError = ref(null);
const playersOpen = ref(false);
const discardOpen = ref(false);
const discarding = ref(false);
const dropTarget = ref(null);
const droppedIds = ref([]);
const activationOpen = ref(false);
const activating = ref(false);
const activationError = ref('');

const state = computed(() => store.advance.state);
const run = computed(() => store.advance.run);
const pollError = computed(() => !!store.advance.error);
const phase = computed(() => run.value?.status || 'idle');
const editable = computed(() => phase.value === 'ready' && !run.value?.commitAttempted);
// A failed save with everything written whose year someone else had already moved: the server lets it be
// discarded. Any other failed save can only be saved again.
const yearMovedAway = computed(() => !!(run.value?.commitAttempted && run.value?.treesWritten && run.value?.yearMoved));

// The server pins an unset "current to" to the game year when it first reads
// it, and advances into currentTo + 1.
const currentTo = computed(() => state.value?.currentTo ?? state.value?.gameYear ?? null);
const nextYear = computed(() => (currentTo.value == null ? null : currentTo.value + 1));
const limitReason = computed(() => {
    if (state.value?.gameYear == null) return "The realm has no game year set, so the trees can't advance yet.";
    if (currentTo.value >= state.value.gameYear) {
        // Before the first save the DM may still start the trees from an earlier year.
        return state.value.canSetYear
            ? 'The trees are current to the game year. To start from an earlier year, set the year above. Otherwise, wait for the game year to move on.'
            : 'The trees are current to the game year. You can advance them again once the game year moves on.';
    }
    return '';
});

// A run still running or saving this long after it started has lost its
// background worker; the server lets it be started again after 10 minutes.
const STUCK_MS = 10 * 60 * 1000;
const clock = ref(Date.now());
let clockTimer = null;
const stuck = computed(() => {
    const r = run.value;
    if (!r || (r.status !== 'running' && r.status !== 'committing')) return false;
    const since = Date.parse((r.status === 'committing' && r.committingSince) || r.startedAt || '');
    return Number.isFinite(since) && clock.value - since >= STUCK_MS;
});
async function retryStuck() {
    if (run.value?.status === 'committing') await commit();
    else await advance();
}
const canAdvance = computed(() => !limitReason.value);

const showYearLine = computed(() => phase.value === 'idle' || phase.value === 'committed');
const CAPTIONS = {
    idle: 'Next year',
    running: 'Rolling',
    blocked: 'On hold',
    ready: 'Preview of',
    committing: 'Saving',
    committed: 'Recorded',
    failed: 'Preview failed',
};
const caption = computed(() => CAPTIONS[phase.value] || '');
const stampYear = computed(() => {
    if (phase.value === 'idle') return nextYear.value != null && canAdvance.value ? fmt(nextYear.value) : '';
    return run.value?.year != null ? fmt(run.value.year) : '';
});

// Trees with events, plus any with a prune or at the hard cap and nothing else to show.
const reviewHouses = computed(() => {
    const r = run.value;
    if (!r) return [];
    const list = groupEvents(r);
    const have = new Set(list.map((h) => h.houseId));
    const extra = [
        ...Object.keys(r.prunes || {}),
        ...Object.entries(r.capState || {}).filter(([, c]) => c?.atHardCap).map(([id]) => id),
    ];
    for (const id of extra) {
        if (have.has(id)) continue;
        have.add(id);
        list.push({ houseId: id, name: r.houses?.[id] || 'Unknown house', groups: [] });
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
});

const problems = computed(() => {
    const r = run.value;
    const out = [];
    for (const c of r?.result?.characterErrors || []) {
        out.push(`Character record not updated for ${r.people?.[c.personId]?.name || 'someone'}: ${c.message}`);
    }
    for (const h of r?.result?.historyErrors || []) {
        out.push(`History not saved for ${r.houses?.[h.houseId] || 'a tree'}: ${h.message}`);
    }
    return out;
});

// What became of the letters for a saved year. Queued this long after the save means the worker is lost.
const LETTERS_WAIT_MS = 10 * 60 * 1000;
const letterStatus = computed(() => {
    const res = run.value?.result;
    if (!res?.letters) return '';
    if (res.letters === 'queued') {
        const at = Date.parse(res.committedAt || '');
        return Number.isFinite(at) && clock.value - at > LETTERS_WAIT_MS ? 'Letters may not have gone out.' : 'Letters are being sent.';
    }
    if (res.letters === 'failed') return 'The letters could not be sent.';
    if (res.letters === 'sent') {
        const n = res.lettersSent ?? 0;
        const skipped = res.lettersSkipped ?? 0;
        return `Letters sent to ${n} ${n === 1 ? 'player' : 'players'}.${skipped > 0 ? ` ${skipped} could not be sent.` : ''}`;
    }
    return '';
});

const STALE_TEXT = "The trees changed after this preview was made, so it can't be saved. Run a fresh preview to roll the year again.";

async function load() {
    loadFailed.value = false;
    actionError.value = null;
    try {
        const data = await store.fetchAdvance();
        store.advance.run = data?.latestRun || null;
        loaded.value = true;
        resume();
    } catch (e) {
        if (store.error?.code === 'FORBIDDEN') {
            router.replace({ name: 'Dynasties' });
            return;
        }
        loadFailed.value = true;
    }
}

// Picks polling back up for a run still at work in the background.
function resume() {
    const r = run.value;
    if (r && (r.status === 'running' || r.status === 'committing' || (r.status === 'committed' && r.result?.letters === 'queued'))) store.pollRun(r.id);
}

// Once a commit lands, the "current to" year has moved: reread it.
watch(
    () => run.value?.status,
    (now, before) => {
        if (now === 'committed' && before === 'committing') store.fetchAdvance().catch(() => {});
    }
);

function showError(e) {
    const err = store.error || e;
    const code = err?.code;
    if (code === 'TREE_SELECTION_REQUIRED') {
        openActivation();
        return;
    }
    if (code === 'STALE_PREVIEW') actionError.value = { text: STALE_TEXT, fresh: true };
    else if (code === 'RUN_BUSY' || code === 'RUN_NOT_READY' || code === 'RUN_STATE') actionError.value = { text: advanceErrorMessage(err), refresh: true };
    else actionError.value = { text: advanceErrorMessage(err) };
}

async function act(fn) {
    busy.value = true;
    actionError.value = null;
    try {
        return await fn();
    } catch (e) {
        showError(e);
        return null;
    } finally {
        busy.value = false;
    }
}

async function advance() {
    const r = await act(() => store.startAdvance());
    if (!r) return;
    droppedIds.value = [];
    store.pollRun(r.id);
}

async function commit() {
    const id = run.value.id;
    const r = await act(() => store.commitRun(id));
    if (r) store.pollRun(r.id);
    // No answer (the connection dropped): read where the run really stands.
    else if (!store.error?.code || store.error.code === 'UNKNOWN') store.pollRun(id);
}

const edit = (edits) => act(() => store.editRun(run.value.id, edits));
const removeEvent = (ref) => act(() => store.removePlayerEvent(run.value.id, ref));

async function discard() {
    discarding.value = true;
    actionError.value = null;
    try {
        await store.discardRun(run.value.id);
        discardOpen.value = false;
        store.fetchAdvance().catch(() => {});
    } catch (e) {
        discardOpen.value = false;
        showError(e);
    } finally {
        discarding.value = false;
    }
}

async function saveCurrentTo(year) {
    try {
        await store.setCurrentTo(year);
    } catch (e) {
        throw new Error(advanceErrorMessage(store.error || e));
    }
}

function onDropped(houseId) {
    if (!droppedIds.value.includes(houseId)) droppedIds.value = [...droppedIds.value, houseId];
    dropTarget.value = null;
}

async function openActivation() {
    activationError.value = '';
    await store.fetchHouses().catch(() => {});
    if (store.status) activationOpen.value = true;
}

async function saveActivation(ids) {
    activating.value = true;
    activationError.value = '';
    try {
        await store.setActiveHouses(ids);
        activationOpen.value = false;
        store.fetchAdvance().catch(() => {});
    } catch (e) {
        activationError.value = store.error?.message || e?.message || 'The active trees were not saved.';
    } finally {
        activating.value = false;
    }
}

let started = false;
watch(
    [editor, rolesKnown],
    ([isEditor, known]) => {
        if (isEditor) {
            if (!started) {
                started = true;
                load();
            }
        } else if (known) {
            router.replace({ name: 'Dynasties' });
        }
    },
    { immediate: true }
);

onMounted(() => {
    emit('set-room', 'dynasties');
    clockTimer = setInterval(() => { clock.value = Date.now(); }, 30 * 1000);
});
onBeforeUnmount(() => {
    store.stopPolling();
    if (clockTimer) clearInterval(clockTimer);
});
</script>

<style scoped src="./dynastyView.css"></style>
<style scoped>
.breadcrumb { margin-bottom: 0.5em; }

/* The year being worked on is the page's one large element. */
.ledger {
    margin: 0 0 1.25em;
    padding: 0.9em 0 1em;
    border-top: 1px solid color-mix(in srgb, var(--theme-text) 15%, transparent);
    border-bottom: 1px solid color-mix(in srgb, var(--theme-text) 15%, transparent);
}
.ledger-year {
    margin: 0 0 0.25em;
    display: flex;
    flex-direction: column;
    font-family: var(--theme-font-display, inherit);
    font-size: clamp(2.4rem, 11vw, 3.6rem);
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.01em;
    color: var(--theme-accent);
    font-variant-numeric: lining-nums tabular-nums;
}
.ledger-caption {
    margin-bottom: 0.35em;
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 600;
    letter-spacing: 0;
    color: color-mix(in srgb, var(--theme-text) 70%, transparent);
}
.ledger.blocked .ledger-year,
.ledger.failed .ledger-year { color: color-mix(in srgb, var(--theme-text) 55%, transparent); }

.error-text p, .notice p { margin: 0; }
.error-text .tool-btn { margin-top: 0.6em; }
.error-text p.detail, .notice p.detail { margin-top: 0.35em; font-size: 0.85rem; opacity: 0.85; overflow-wrap: anywhere; }

.summary { margin-bottom: 1.5em; }
.summary h3 { margin: 0 0 0.3em; font-family: var(--theme-font-display, inherit); font-size: 1.2rem; }
.summary p { margin: 0; }
.letter-status { margin-top: 0.3em; font-size: 0.9rem; color: color-mix(in srgb, var(--theme-text) 70%, transparent); }
.problems { margin: 0.75em 0 0; padding-left: 1.2em; color: var(--theme-danger, #e06c75); font-size: 0.9rem; }

.start { display: flex; flex-direction: column; align-items: stretch; gap: 0.6em; }
.advance-btn { width: 100%; font-size: 1rem; }
.limit-note { margin: 0; font-size: 0.88rem; color: color-mix(in srgb, var(--theme-text) 70%, transparent); }
.link-btn {
    padding: 0;
    margin-left: 0.25em;
    background: none;
    border: none;
    color: var(--theme-accent);
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
}

/* An hourglass of falling sand, drawn rather than spun. */
.progress {
    display: flex;
    align-items: center;
    gap: 0.9em;
    padding: 1em 0;
}
.progress p { margin: 0; line-height: 1.5; }
.stuck { display: flex; flex-direction: column; align-items: flex-start; gap: 0.6em; }
.stuck p { margin: 0; }
.sand {
    flex: none;
    width: 4px;
    height: 2.4em;
    border-radius: 2px;
    background: linear-gradient(var(--theme-accent) 0 0) top / 100% 0% no-repeat,
        color-mix(in srgb, var(--theme-text) 18%, transparent);
    animation: sand 1.6s ease-in-out infinite;
}
@keyframes sand {
    from { background-size: 100% 0%; }
    to { background-size: 100% 100%; }
}
@media (prefers-reduced-motion: reduce) {
    .sand { animation: none; background-size: 100% 50%; }
}

.blocked .notice { margin-bottom: 0.9em; }
.blocked-list { list-style: none; margin: 0 0 1em; padding: 0; display: flex; flex-direction: column; gap: 0.5em; }
.blocked-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5em 0.75em;
    padding: 0.5em 0.75em;
    border: 1px solid color-mix(in srgb, var(--theme-text) 15%, transparent);
    border-radius: 10px;
}
.blocked-name { flex: 1; min-width: 8em; font-weight: 600; overflow-wrap: anywhere; }
.done-tag { font-size: 0.8rem; color: var(--theme-accent); }

.players-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5em 0.75em; margin-bottom: 1em; }
.players-note { font-size: 0.85rem; color: color-mix(in srgb, var(--theme-text) 65%, transparent); }

.no-race {
    margin-bottom: 1.4em;
    padding: 0.7em 0.9em;
    border-radius: 10px;
    border: 1px dashed color-mix(in srgb, var(--theme-text) 25%, transparent);
}
.no-race h3 { margin: 0 0 0.25em; font-size: 1rem; }
.no-race .hint { margin: 0 0 0.4em; font-size: 0.85rem; color: color-mix(in srgb, var(--theme-text) 65%, transparent); }
.no-race ul { margin: 0; padding-left: 1.2em; line-height: 1.7; }
.no-race a { color: var(--theme-accent); }

/* Commit and Discard stay in reach at the foot of a long review on phones. */
.decision {
    position: sticky;
    bottom: 0;
    margin: 1.5em -1em 0;
    padding: 0.75em 1em calc(0.75em + env(safe-area-inset-bottom, 0px));
    background: var(--theme-bg-surface, var(--theme-bg-primary));
    border-top: 1px solid color-mix(in srgb, var(--theme-text) 18%, transparent);
}
.decision-note { margin: 0 0 0.6em; font-size: 0.82rem; color: color-mix(in srgb, var(--theme-text) 65%, transparent); }
.decision-buttons { display: flex; gap: 0.5em; }
.decision-buttons .tool-btn { flex: 1; }
.tool-btn.commit-btn { background: var(--theme-accent); color: var(--theme-bg-primary, #111); font-weight: 600; }
.tool-btn.commit-btn:hover:not(:disabled) { background: var(--theme-accent); color: var(--theme-bg-primary, #111); filter: brightness(1.1); }
.confirm-text { margin: 0; line-height: 1.5; }

@media (min-width: 40em) {
    .advance-btn { width: auto; align-self: flex-start; }
    .decision { margin: 2em 0 0; border-radius: 10px; border: 1px solid color-mix(in srgb, var(--theme-text) 18%, transparent); }
    .decision-buttons { justify-content: flex-end; }
    .decision-buttons .tool-btn { flex: none; }
}
</style>
