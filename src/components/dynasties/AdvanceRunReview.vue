<template>
    <section class="house-review" :aria-labelledby="headingId">
        <h3 :id="headingId">{{ house.name }}</h3>

        <p v-if="capState?.atHardCap" class="notice warn" role="note">
            At the hard cap: no marriages or pregnancies this year.
            <span class="cap-count">{{ capState.living }} living of {{ capState.hardCap }}.</span>
        </p>
        <p v-else-if="overSoftCap" class="notice" role="note">
            Over the soft cap, so fewer children are born this year.
            <span class="cap-count">{{ capState.living }} living, soft cap {{ capState.softCap }}.</span>
        </p>

        <p v-if="prune && pruneOff" class="notice prune-off" role="note">
            <span class="tag muted">Won't happen</span>
            This tree was at its generation limit, but the child behind it is left out, so saving keeps its oldest generation.
        </p>
        <div v-else-if="prune" class="notice warn prune" role="note">
            <p>This tree is at its generation limit. Saving removes its oldest generation.</p>
            <template v-if="livingRemoved.length">
                <p class="list-label">Living people removed</p>
                <ul class="names prune-living">
                    <li v-for="p in livingRemoved" :key="p.id">{{ p.name }}</li>
                </ul>
            </template>
            <template v-if="prune.elders?.length">
                <p class="list-label">Staying on as elders</p>
                <ul class="names prune-elders">
                    <li v-for="p in prune.elders" :key="p.id">{{ p.name }}</li>
                </ul>
            </template>
            <p v-if="deadRemoved.length" class="dead-count">
                Also removed: {{ deadRemoved.length }} {{ deadRemoved.length === 1 ? 'person who has' : 'people who have' }} already died.
            </p>
        </div>

        <p v-if="!house.groups.length" class="empty-line">Nothing happens in this tree this year.</p>

        <div v-for="g in house.groups" :key="g.id" class="event-group">
            <h4>{{ g.label }}</h4>
            <ul class="events">
                <li v-for="ev in g.events" :key="ev.ref" class="event" :class="{ dropped: ev.dropped, skipped: isSkipped(ev) }">
                    <div class="event-head">
                        <p class="event-line">
                            {{ eventLine(ev, run) }}
                            <span v-if="ev.byDm" class="tag">Added by you</span>
                            <span v-if="ev.dropped" class="tag muted">Left out</span>
                            <span v-else-if="isSkipped(ev)" class="tag muted">Won't happen</span>
                            <span v-if="isSkipped(ev)" class="skip-why">Its marriage is left out.</span>
                        </p>
                        <template v-if="editable">
                            <button v-if="ev.byDm" type="button" class="tool-btn small" :disabled="busy" @click="emit('remove', ev.ref)">Remove</button>
                            <button v-else type="button" class="tool-btn small" :aria-pressed="!!ev.dropped" :disabled="busy" @click="toggle(ev)">
                                {{ ev.dropped ? 'Put back' : 'Leave out' }}
                            </button>
                        </template>
                    </div>

                    <div v-if="!ev.dropped && (flags(ev).length || fields(ev).length)" class="event-detail">
                        <p v-if="flags(ev).length" class="flags">
                            <span v-for="f in flags(ev)" :key="f" class="flag">{{ f }}</span>
                        </p>
                        <label v-for="f in fields(ev)" :key="f.key" class="field">
                            <span>{{ f.label }}</span>
                            <input
                                type="text"
                                maxlength="1000"
                                :data-field="f.key"
                                :value="f.value"
                                :disabled="!editable || busy"
                                @change="save(ev, f, $event)"
                            />
                        </label>
                    </div>
                </li>
            </ul>
        </div>
    </section>
</template>

<script setup>
// One tree's part of an advance preview: its cap and prune notices, and its
// events by group, with rename, reword and leave-out. Edits go up as `edit`
// (a list of RunEdit) and DM-added children as `remove` (the event ref).
import { computed } from 'vue';
import { eventLine } from '@shared/utils/dynastyAdvance';

const props = defineProps({
    house: { type: Object, required: true },
    run: { type: Object, required: true },
    capState: { type: Object, default: null },
    prune: { type: Object, default: null },
    editable: { type: Boolean, default: false },
    busy: { type: Boolean, default: false },
});
const emit = defineEmits(['edit', 'remove']);

const headingId = `review-${Math.random().toString(36).slice(2, 8)}`;

const overSoftCap = computed(() => {
    const c = props.capState;
    return !!c && c.softCap != null && c.living > c.softCap;
});
// What the commit will skip although the review lists it, as the server
// works it out (run.skipped: a pregnancy whose marriage is left out;
// run.prunesOff: a prune no kept child sets off any more).
const pruneOff = computed(() => (props.run?.prunesOff || []).includes(props.house.houseId));
const isSkipped = (ev) => !ev.dropped && (props.run?.skipped || []).includes(ev.ref);
const livingRemoved = computed(() => (props.prune?.removed || []).filter((p) => p.alive));
const deadRemoved = computed(() => (props.prune?.removed || []).filter((p) => !p.alive));

const isChild = (ev) => ev.kind === 'birth' || ev.kind === 'natural';

function flags(ev) {
    const out = [];
    if (ev.kind === 'birth' && ev.stillborn) out.push('Stillborn');
    else if (isChild(ev) && ev.diesInfant) out.push('Dies in infancy');
    if (isChild(ev) && ev.lifeThreatening) out.push('A dangerous birth');
    return out;
}

// The fields the server accepts for each kind (advanceService applyEdit).
function fields(ev) {
    const out = [];
    if ((isChild(ev) && !ev.stillborn) || ev.kind === 'marriage') {
        out.push({
            key: 'name',
            label: ev.kind === 'marriage' ? 'Spouse name' : 'Name',
            value: (ev.kind === 'marriage' ? ev.spouse?.name : ev.name) || '',
        });
    }
    if (ev.kind === 'death' || ev.kind === 'motherDied' || (isChild(ev) && (ev.stillborn || ev.diesInfant))) {
        out.push({ key: 'cause', label: isChild(ev) ? 'What happened' : 'Cause of death', value: ev.cause || '' });
    }
    if (isChild(ev) && ev.defect) out.push({ key: 'defectText', label: 'Birth defect', value: ev.defectText || '' });
    return out;
}

// The server refuses blank text, so a blank or unchanged field goes back to
// what it was and nothing is sent.
function save(ev, field, domEvent) {
    const input = domEvent.target;
    const next = input.value.trim();
    if (!next || next === field.value) {
        input.value = field.value;
        return;
    }
    emit('edit', [{ ref: ev.ref, [field.key]: next }]);
}

function toggle(ev) {
    emit('edit', [{ ref: ev.ref, dropped: !ev.dropped }]);
}
</script>

<style scoped src="../../views/dynasties/dynastyView.css"></style>
<style scoped>
.house-review {
    padding: 0.2em 0 1.2em 0.9em;
    border-left: 2px solid color-mix(in srgb, var(--theme-accent) 55%, transparent);
}
.house-review + .house-review { margin-top: 1.4em; }
.house-review h3 {
    margin: 0 0 0.6em;
    font-family: var(--theme-font-display, inherit);
    font-size: 1.2rem;
    overflow-wrap: anywhere;
}
.notice p { margin: 0; }
.cap-count { display: block; font-size: 0.82rem; opacity: 0.8; }
.prune .list-label { margin-top: 0.6em; font-weight: 600; font-size: 0.85rem; }
.names { margin: 0.2em 0 0; padding-left: 1.2em; }
.dead-count { margin-top: 0.6em; font-size: 0.85rem; }

.event-group + .event-group { margin-top: 0.9em; }
.event-group h4 {
    margin: 0 0 0.35em;
    font-size: 0.85rem;
    font-weight: 600;
    color: color-mix(in srgb, var(--theme-text) 65%, transparent);
}
.events { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35em; }
.event {
    padding: 0.5em 0.7em;
    border-radius: 8px;
    background: color-mix(in srgb, var(--theme-bg-surface) 50%, transparent);
    border: 1px solid color-mix(in srgb, var(--theme-text) 12%, transparent);
}
.event.dropped { border-style: dashed; background: transparent; }
.event.dropped .event-line { text-decoration: line-through; opacity: 0.6; }
.event.skipped { border-style: dashed; }
.skip-why { display: block; font-size: 0.82rem; opacity: 0.75; }
.prune-off { opacity: 0.85; }
.prune-off .tag { margin: 0 0.35em 0 0; }
.event-head { display: flex; align-items: flex-start; gap: 0.6em; }
.event-line { flex: 1; min-width: 0; margin: 0.45em 0; line-height: 1.45; overflow-wrap: anywhere; }
.tool-btn.small { flex: none; min-height: 2.75em; padding: 0.3em 0.75em; font-size: 0.85rem; }
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
.tag.muted { border-color: color-mix(in srgb, var(--theme-text) 35%, transparent); color: color-mix(in srgb, var(--theme-text) 65%, transparent); }

.event-detail { display: flex; flex-direction: column; gap: 0.5em; padding: 0.2em 0 0.3em; }
.flags { display: flex; flex-wrap: wrap; gap: 0.35em; margin: 0; }
.flag {
    font-size: 0.78rem;
    padding: 0.1em 0.5em;
    border-radius: 4px;
    color: var(--theme-danger, #e06c75);
    border: 1px solid color-mix(in srgb, var(--theme-danger, #e06c75) 60%, transparent);
}
.field { display: flex; flex-direction: column; gap: 0.25em; }
.field > span { font-size: 0.8rem; color: color-mix(in srgb, var(--theme-text) 70%, transparent); }
.field input {
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
.field input:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: 2px; }
.field input:disabled { opacity: 0.7; }

@media (min-width: 40em) {
    .house-review { padding-left: 1.2em; }
    .field { flex-direction: row; align-items: center; gap: 0.75em; }
    .field > span { flex: none; width: 8.5em; }
}
</style>
