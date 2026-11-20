<template>
    <dialog ref="dialogRef" class="dyn-dialog players-dialog" :aria-labelledby="titleId" @cancel.prevent="close">
        <div class="dyn-layout">
            <div class="dyn-header">
                <h3 :id="titleId">Player characters</h3>
                <button type="button" class="dyn-close" aria-label="Close" @click="close">&times;</button>
            </div>

            <div class="dyn-body">
                <p class="lead">
                    The advance never rolls a death, marriage or pregnancy for a player character.
                    Give one a child this year here. Children you add are saved with the advance.
                </p>

                <p v-if="!rows.length" class="hint">No player character is in an active tree.</p>

                <ul v-else class="player-rows">
                    <li v-for="row in rows" :key="row.key" class="player-row">
                        <ul class="people">
                            <li v-for="p in row.people" :key="p.id" class="person">
                                <div class="person-text">
                                    <span class="person-name">{{ p.name }}</span>
                                    <span v-if="p.member" class="role">Player character</span>
                                    <span v-else-if="p.odds" class="odds">{{ p.odds }} chance of a child outside the marriage</span>
                                </div>
                                <button
                                    type="button"
                                    class="btn small"
                                    :disabled="busy || !p.gender"
                                    :title="p.gender ? null : 'This preview has no gender for them. Run a fresh preview.'"
                                    @click="illegitimate(p)"
                                >
                                    Illegitimate child
                                </button>
                            </li>
                        </ul>

                        <ul v-if="row.pairs.length" class="couples">
                            <li v-for="pr in row.pairs" :key="pr.motherId + pr.fatherId" class="couple">
                                <span class="couple-names">{{ nameOf(pr.fatherId) }} and {{ nameOf(pr.motherId) }}</span>
                                <button
                                    type="button"
                                    class="btn small"
                                    :aria-label="`Child of ${nameOf(pr.motherId)} and ${nameOf(pr.fatherId)}`"
                                    :disabled="busy"
                                    @click="child(pr)"
                                >
                                    Child
                                </button>
                            </li>
                        </ul>

                        <ul v-if="row.events.length" class="row-events">
                            <li v-for="ev in row.events" :key="ev.ref" class="row-event" :class="{ dropped: ev.dropped }">
                                <span class="event-line">
                                    {{ eventLine(ev, run) }}
                                    <span v-if="ev.byDm" class="tag">Added by you</span>
                                </span>
                                <button v-if="ev.byDm" type="button" class="btn small" :disabled="busy" @click="remove(ev)">Remove</button>
                                <button v-else type="button" class="btn small" :aria-pressed="!!ev.dropped" :disabled="busy" @click="toggle(ev)">
                                    {{ ev.dropped ? 'Put back' : 'Leave out' }}
                                </button>
                            </li>
                        </ul>
                    </li>
                </ul>

                <p v-if="error" class="save-error" role="alert">
                    {{ error.text }}
                    <a v-if="error.upgrade" :href="upgradeHref" target="_blank" rel="noopener">See upgrade options</a>
                </p>
            </div>

            <div class="dyn-footer">
                <span class="spacer"></span>
                <button type="button" class="btn" @click="close">Done</button>
            </div>
        </div>
    </dialog>
</template>

<script setup>
// potp's Party dialog for RealmForge: the run's living player characters (a
// couple shares a row) with their spouses' odds, and buttons to give them a
// child this year. Added children go through the server's cap checks, which
// refuse with TREE_FULL or GENERATION_LIMIT.
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useDynastiesStore } from '@shared/stores/dynasties';
import { eventLine, advanceErrorMessage } from '@shared/utils/dynastyAdvance';
import { upgradeUrl } from '@shared/utils/dynastyErrors';

const props = defineProps({
    open: { type: Boolean, default: false },
    run: { type: Object, required: true },
});
const emit = defineEmits(['close']);

const store = useDynastiesStore();
const upgradeHref = upgradeUrl();
const titleId = `players-${Math.random().toString(36).slice(2, 8)}`;

const dialogRef = ref(null);
const busy = ref(false);
const error = ref(null);

const people = computed(() => props.run?.people || {});
const nameOf = (id) => people.value[id]?.name || 'Someone';
const genderOf = (id) => people.value[id]?.gender || null;

// "under 0.1%" rather than a misleading "0.0%".
const oddsText = (odds) => (odds > 0 && odds < 0.0005 ? 'under 0.1%' : `${(odds * 100).toFixed(1)}%`);

const rows = computed(() =>
    (props.run?.players || []).map((row) => {
        const members = row.memberIds || [];
        const spouseOdds = new Map((row.spouses || []).map((s) => [s.personId, s.odds]));
        const ids = [...new Set([...members, ...spouseOdds.keys()])];
        const peopleRows = ids.map((id) => {
            const member = members.includes(id);
            const odds = spouseOdds.get(id);
            return { id, name: nameOf(id), gender: genderOf(id), member, odds: !member && odds ? oddsText(odds) : null };
        });

        // One Child button per marriage of a player character.
        const pairs = [];
        for (const [x, y] of row.couples || []) {
            const mother = genderOf(x) === 'female' ? x : genderOf(y) === 'female' ? y : null;
            if (mother) pairs.push({ motherId: mother, fatherId: mother === x ? y : x });
        }

        const idSet = new Set(ids);
        const events = (props.run?.events || []).filter(
            (ev) =>
                (ev.kind === 'pregnancy' && (idSet.has(ev.motherId) || idSet.has(ev.fatherId))) ||
                (ev.kind === 'natural' && idSet.has(ev.fatherId))
        );
        return { key: ids.join('|'), people: peopleRows, pairs, events };
    })
);

async function act(fn) {
    busy.value = true;
    error.value = null;
    try {
        await fn();
    } catch (e) {
        const e2 = store.error || e;
        error.value = { text: advanceErrorMessage(e2), upgrade: e2?.code === 'GENERATION_LIMIT' };
    } finally {
        busy.value = false;
    }
}

function illegitimate(p) {
    const body = p.gender === 'female' ? { kind: 'pregnancy', motherId: p.id, other: true } : { kind: 'natural', fatherId: p.id };
    return act(() => store.addPlayerEvent(props.run.id, body));
}

function child(pr) {
    return act(() => store.addPlayerEvent(props.run.id, { kind: 'pregnancy', motherId: pr.motherId, fatherId: pr.fatherId }));
}

function remove(ev) {
    return act(() => store.removePlayerEvent(props.run.id, ev.ref));
}

function toggle(ev) {
    return act(() => store.editRun(props.run.id, [{ ref: ev.ref, dropped: !ev.dropped }]));
}

function sync(open) {
    const el = dialogRef.value;
    if (!el) return;
    if (open && !el.open) {
        error.value = null;
        el.showModal();
    } else if (!open && el.open) {
        el.close();
    }
}
watch(() => props.open, (v) => nextTick(() => sync(v)));
onMounted(() => sync(props.open));

function close() {
    if (!busy.value) emit('close');
}
</script>

<style scoped src="./dynastyDialog.css"></style>
<style scoped>
.lead { margin: 0 0 1em; font-size: 0.92rem; line-height: 1.5; }
.player-rows { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.75em; }
.player-row {
    padding: 0.6em 0.75em;
    border: 1px solid color-mix(in srgb, var(--theme-text) 15%, transparent);
    border-radius: 10px;
}
.people, .couples, .row-events { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4em; }
.couples, .row-events {
    margin-top: 0.5em;
    padding-top: 0.5em;
    border-top: 1px dashed color-mix(in srgb, var(--theme-text) 18%, transparent);
}
.person, .couple, .row-event { display: flex; align-items: center; gap: 0.6em; }
.person-text, .couple-names, .event-line { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.person-text { display: flex; flex-direction: column; }
.person-name { font-weight: 600; }
.role, .odds { font-size: 0.8rem; color: color-mix(in srgb, var(--theme-text) 62%, transparent); }
.event-line { font-size: 0.9rem; line-height: 1.45; }
.row-event.dropped .event-line { text-decoration: line-through; opacity: 0.6; }
.btn.small { flex: none; min-height: 2.75em; padding: 0.3em 0.75em; font-size: 0.85rem; }
.tag {
    display: inline-block;
    margin-left: 0.35em;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.05em 0.45em;
    border-radius: 4px;
    border: 1px solid var(--theme-accent);
    color: var(--theme-accent);
    white-space: nowrap;
}
</style>
