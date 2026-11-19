<template>
    <div
        ref="root"
        class="hourglass"
        :class="{ lined: showLines }"
        @load.capture="schedule"
    >
        <svg
            v-if="showLines && paths.length"
            class="hg-lines"
            :viewBox="`0 0 ${size.w} ${size.h}`"
            :width="size.w"
            :height="size.h"
            aria-hidden="true"
        >
            <path v-for="(p, i) in paths" :key="i" :d="p.d" :class="p.kind" />
        </svg>

        <p v-if="editable && addBlocked" :id="blockedId" class="add-blocked" role="note">
            {{ blockedText }}
            <router-link v-if="showUpgrade" :to="UPGRADE_PATH">See upgrade options</router-link>
        </p>

        <section class="hg-row" aria-label="Grandparents">
            <span class="rail">Grandparents</span>
            <div class="tier-body gp-body">
                <div
                    v-for="pair in grandparentPairs"
                    :key="pair.side"
                    class="pair"
                >
                    <PersonCard
                        v-for="gp in pair.people"
                        :key="gp.key"
                        :data-node="gp.person ? gp.key : null"
                        :person="gp.person"
                        :caption="gp.caption"
                        placeholder="unknown"
                        :house-id="houseId"
                        @select="select"
                    />
                </div>
            </div>
        </section>

        <section class="hg-row" aria-label="Parents">
            <span class="rail">Parents</span>
            <div class="tier-body pair-body">
                <template v-for="slot in parentSlots" :key="slot.key">
                    <PersonCard
                        v-if="data[slot.key]"
                        :data-node="slot.key"
                        :person="data[slot.key]"
                        :house-id="houseId"
                        @select="select"
                    />
                    <button
                        v-else-if="editable"
                        type="button"
                        class="add-slot"
                        :disabled="addBlocked"
                        :aria-describedby="addBlocked ? blockedId : null"
                        @click="emit('add', { role: slot.key })"
                    >
                        + Add {{ slot.key }}
                    </button>
                    <PersonCard v-else :person="null" placeholder="unknown" />
                </template>
            </div>
        </section>

        <section class="hg-row centre-row" aria-label="Spouses">
            <span class="rail">Spouses</span>
            <div data-node="centre" class="tier-body centre-body">
                <div v-for="m in leftSpouses" :key="m.id" class="spouse left">
                    <PersonCard
                        :data-node="`m-${m.id}`"
                        :person="m.spouse"
                        :caption="marriageCaption(m, abbr)"
                        :note="m.endNote || ''"
                        placeholder="unknown"
                        :house-id="houseId"
                        @select="select"
                    />
                    <button
                        v-if="editable"
                        type="button"
                        class="edit-marriage"
                        :title="marriageTitle(m)"
                        :aria-label="marriageTitle(m)"
                        @click="emit('edit-marriage', m)"
                    >
                        &#9998;
                    </button>
                </div>

                <div class="focus-slot">
                    <PersonCard
                        data-node="focus"
                        :person="data.person"
                        focus
                        :house-id="houseId"
                        @select="select"
                    />
                </div>

                <div v-for="m in rightSpouses" :key="m.id" class="spouse right">
                    <PersonCard
                        :data-node="`m-${m.id}`"
                        :person="m.spouse"
                        :caption="marriageCaption(m, abbr)"
                        :note="m.endNote || ''"
                        placeholder="unknown"
                        :house-id="houseId"
                        @select="select"
                    />
                    <button
                        v-if="editable"
                        type="button"
                        class="edit-marriage"
                        :title="marriageTitle(m)"
                        :aria-label="marriageTitle(m)"
                        @click="emit('edit-marriage', m)"
                    >
                        &#9998;
                    </button>
                </div>

                <button
                    v-if="editable"
                    type="button"
                    class="add-slot"
                    :disabled="addBlocked"
                    :aria-describedby="addBlocked ? blockedId : null"
                    @click="emit('add', { role: 'spouse' })"
                >
                    + Add spouse
                </button>
            </div>
        </section>

        <section class="hg-row" aria-label="Children">
            <span class="rail">Children</span>
            <div data-node="children" class="tier-body children-body">
                <p v-if="!orderedGroups.length && !editable" class="empty-copy">
                    No children recorded.
                </p>
                <div
                    v-for="(g, gi) in orderedGroups"
                    :key="groupKey(g, gi)"
                    class="group"
                    :class="g.relation"
                >
                    <p class="group-heading">{{ childGroupHeading(g) }}</p>
                    <div class="group-kids">
                        <div v-for="c in g.children" :key="c.id" class="child">
                            <PersonCard
                                :data-node="`c-${c.id}`"
                                :person="c"
                                :mark="c.legitimate === 'no' ? 'bastard' : ''"
                                :house-id="houseId"
                                @select="select"
                            />
                            <button
                                v-if="c.grandchildren?.length"
                                type="button"
                                class="gc-toggle"
                                :aria-expanded="Boolean(expanded[c.id])"
                                @click="toggle(c.id)"
                            >
                                <span class="caret" aria-hidden="true">{{
                                    expanded[c.id] ? '&#9662;' : '&#9656;'
                                }}</span>
                                {{ grandchildLabel(c) }}
                            </button>
                            <ul v-if="expanded[c.id]" class="gc-list">
                                <li v-for="gc in c.grandchildren" :key="gc.id">
                                    <PersonCard
                                        :person="gc"
                                        :house-id="houseId"
                                        @select="select"
                                    />
                                </li>
                                <li
                                    v-if="c.grandchildrenTruncated"
                                    class="more-note"
                                >
                                    + more not shown
                                </li>
                            </ul>
                        </div>
                        <p v-if="g.truncated" class="more-note">
                            + more not shown
                        </p>
                    </div>
                </div>
                <button
                    v-if="editable"
                    type="button"
                    class="add-slot"
                    :disabled="addBlocked"
                    :aria-describedby="addBlocked ? blockedId : null"
                    @click="emit('add', { role: 'child' })"
                >
                    + Add child
                </button>
            </div>
        </section>
    </div>
</template>

<script setup>
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    reactive,
    ref,
    watch,
} from 'vue';
import PersonCard from './PersonCard.vue';
import { useDynastiesStore } from '@shared/stores/dynasties';
import { useRealmStore } from '@shared/stores/realm';
import { childGroupHeading, marriageCaption } from '@shared/utils/dynastyLabels';
import { UPGRADE_PATH } from '@shared/utils/dynastyErrors';

const props = defineProps({
    data: { type: Object, required: true },
    editable: { type: Boolean, default: false },
    // Why adding people is blocked, if it is: null | 'full' | 'frozen' | 'generation'.
    canAdd: { type: Object, default: () => ({ reason: null }) },
});
const emit = defineEmits(['select', 'add', 'edit-marriage']);

const dynastiesStore = useDynastiesStore();
const realmStore = useRealmStore();
const abbr = computed(() => realmStore.activeRealm?.DateSuffix?.Abbr || 'SF');

// Lines are drawn only when the rows sit side by side (640px and up).
const LINE_MIN_WIDTH = 640;

const blockedId = `hg-blocked-${Math.random().toString(36).slice(2, 8)}`;
const addBlocked = computed(() => Boolean(props.canAdd?.reason));
const limits = computed(() => dynastiesStore.status?.limits || {});
const blockedText = computed(() => {
    switch (props.canAdd?.reason) {
        case 'full':
            return limits.value.hardCap != null
                ? `This family is at its limit of ${limits.value.hardCap} living members.`
                : 'This family is at its limit of living members.';
        case 'frozen':
            return "This tree is frozen. You can browse it, but you can't add anyone.";
        case 'generation':
            return limits.value.maxGenerations != null
                ? `Your plan allows ${limits.value.maxGenerations} generations.`
                : "Your plan doesn't allow another generation.";
        default:
            return '';
    }
});
const showUpgrade = computed(() => props.canAdd?.reason === 'generation' && limits.value.family === 'free');

const parentSlots = [{ key: 'father' }, { key: 'mother' }];

const houseId = computed(() => props.data.person?.houseId || '');

const grandparentPairs = computed(() => {
    const gp = props.data.grandparents || {};
    return [
        {
            side: 'paternal',
            people: [
                {
                    key: 'pgf',
                    person: gp.paternalGrandfather || null,
                    caption: "Father's father",
                },
                {
                    key: 'pgm',
                    person: gp.paternalGrandmother || null,
                    caption: "Father's mother",
                },
            ],
        },
        {
            side: 'maternal',
            people: [
                {
                    key: 'mgf',
                    person: gp.maternalGrandfather || null,
                    caption: "Mother's father",
                },
                {
                    key: 'mgm',
                    person: gp.maternalGrandmother || null,
                    caption: "Mother's mother",
                },
            ],
        },
    ];
});

// Spouses alternate either side of the focus card, first marriage nearest.
const marriages = computed(() => props.data.marriages || []);
const leftSpouses = computed(() =>
    marriages.value.filter((_, i) => i % 2 === 0).reverse()
);
const rightSpouses = computed(() =>
    marriages.value.filter((_, i) => i % 2 === 1)
);

// Signed slot of each marriage: negative left of the focus, positive right.
const marriageSlot = computed(() => {
    const slots = {};
    marriages.value.forEach((m, i) => {
        const rank = Math.floor(i / 2) + 1;
        slots[m.id] = i % 2 === 0 ? -rank : rank;
    });
    return slots;
});

function marriageFor(group) {
    if (group.relation !== 'spouse' || !group.otherParent?.id) return null;
    return (
        marriages.value.find((m) => m.spouseId === group.otherParent.id) || null
    );
}

// Child groups sit roughly under the marriage they come from.
const orderedGroups = computed(() =>
    (props.data.childGroups || [])
        .map((g, i) => {
            const m = marriageFor(g);
            return { g, i, slot: m ? marriageSlot.value[m.id] : 0 };
        })
        .sort((a, b) => a.slot - b.slot || a.i - b.i)
        .map((x) => x.g)
);

const groupKey = (g, i) => `${g.relation}-${g.otherParent?.id || 'none'}-${i}`;

const marriageTitle = (m) =>
    `Edit marriage to ${m.spouse?.name || 'unknown spouse'}`;

function grandchildLabel(c) {
    const n = c.grandchildren.length;
    const plus = c.grandchildrenTruncated ? '+' : '';
    return `${n}${plus} ${n === 1 && !plus ? 'grandchild' : 'grandchildren'}`;
}

const expanded = reactive({});

function toggle(id) {
    expanded[id] = !expanded[id];
    schedule();
}

function select(id) {
    if (id && id !== props.data.person?.id) emit('select', id);
}

// ============ CONNECTORS ============

const root = ref(null);
const showLines = ref(false);
const size = reactive({ w: 0, h: 0 });
const paths = ref([]);

// What to join, as data-node keys. Only people who exist are named.
const linkModel = computed(() => {
    const d = props.data;
    const gp = d.grandparents || {};
    const has = (v, key) => (v ? key : null);
    return {
        pairs: [
            {
                a: has(gp.paternalGrandfather, 'pgf'),
                b: has(gp.paternalGrandmother, 'pgm'),
                to: has(d.father, 'father'),
            },
            {
                a: has(gp.maternalGrandfather, 'mgf'),
                b: has(gp.maternalGrandmother, 'mgm'),
                to: has(d.mother, 'mother'),
            },
            {
                a: has(d.father, 'father'),
                b: has(d.mother, 'mother'),
                to: 'focus',
            },
        ],
        marriages: marriages.value.map((m, i) => ({
            key: `m-${m.id}`,
            inner: i < 2 ? 'focus' : `m-${marriages.value[i - 2].id}`,
        })),
        groups: orderedGroups.value.map((g) => {
            const m = marriageFor(g);
            return {
                children: g.children.map((c) => `c-${c.id}`),
                from: m ? `m-${m.id}` : null,
                dashed: g.relation !== 'spouse',
            };
        }),
    };
});

/**
 * Pure geometry: given node boxes (relative to the container) and the link
 * model, returns SVG paths. Kinds: 'bar' (marriage), 'line', 'dashed'.
 */
function buildConnectors(boxes, model) {
    const out = [];
    const sameRow = (a, b) => Math.abs(a.cy - b.cy) < a.h / 2;
    const elbow = (x1, y1, x2, y2, midY) =>
        Math.abs(x1 - x2) < 1
            ? `M ${x1} ${y1} V ${y2}`
            : `M ${x1} ${y1} V ${midY} H ${x2} V ${y2}`;

    for (const { a, b, to } of model.pairs) {
        const A = boxes[a];
        const B = boxes[b];
        const T = boxes[to];
        if (!T || (!A && !B)) continue;
        let x;
        let y;
        let bottom;
        if (A && B && sameRow(A, B)) {
            out.push({ kind: 'bar', d: `M ${A.right} ${A.cy} H ${B.left}` });
            x = (A.right + B.left) / 2;
            y = A.cy;
            bottom = Math.max(A.bottom, B.bottom);
        } else {
            const one = A || B;
            x = one.cx;
            y = one.bottom;
            bottom = one.bottom;
        }
        out.push({
            kind: 'line',
            d: elbow(x, y, T.cx, T.top, (bottom + T.top) / 2),
        });
    }

    const joints = {};
    for (const { key, inner } of model.marriages) {
        const S = boxes[key];
        const I = boxes[inner];
        if (!S) continue;
        if (I && sameRow(S, I)) {
            const [l, r] = S.cx < I.cx ? [S.right, I.left] : [I.right, S.left];
            out.push({ kind: 'bar', d: `M ${l} ${S.cy} H ${r}` });
            joints[key] = { x: (l + r) / 2, y: S.cy };
        } else {
            joints[key] = { x: S.cx, y: S.bottom };
        }
    }

    const focus = boxes.focus;
    const laneTop = Math.max(boxes.centre?.bottom ?? 0, focus?.bottom ?? 0);
    const laneBottom = boxes.children?.top ?? laneTop;
    const lanes = model.groups.length + 1;

    model.groups.forEach((g, k) => {
        const kids = g.children.map((c) => boxes[c]).filter(Boolean);
        if (!kids.length) return;
        const rowTop = Math.min(...kids.map((c) => c.top));
        const first = kids.filter((c) => Math.abs(c.top - rowTop) < 4);
        const bracketY = rowTop - 10;
        const minX = Math.min(...first.map((c) => c.cx));
        const maxX = Math.max(...first.map((c) => c.cx));
        if (maxX - minX > 1) {
            out.push({ kind: 'line', d: `M ${minX} ${bracketY} H ${maxX}` });
        }
        first.forEach((c) =>
            out.push({ kind: 'line', d: `M ${c.cx} ${bracketY} V ${c.top}` })
        );
        const src =
            (g.from && joints[g.from]) ||
            (focus ? { x: focus.cx, y: focus.bottom } : null);
        if (!src) return;
        const midY = laneTop + ((k + 1) * (laneBottom - laneTop)) / lanes;
        out.push({
            kind: g.dashed ? 'dashed' : 'line',
            d: elbow(src.x, src.y, (minX + maxX) / 2, bracketY, midY),
        });
    });

    return out;
}

function measure() {
    const el = root.value;
    if (!el) return;
    const width = el.clientWidth;
    showLines.value = width >= LINE_MIN_WIDTH;
    if (!showLines.value) {
        paths.value = [];
        return;
    }
    const origin = el.getBoundingClientRect();
    const boxes = {};
    el.querySelectorAll('[data-node]').forEach((node) => {
        const r = node.getBoundingClientRect();
        const left = r.left - origin.left;
        const top = r.top - origin.top;
        boxes[node.dataset.node] = {
            left,
            top,
            right: left + r.width,
            bottom: top + r.height,
            cx: left + r.width / 2,
            cy: top + r.height / 2,
            h: r.height,
        };
    });
    size.w = width;
    size.h = el.clientHeight;
    paths.value = buildConnectors(boxes, linkModel.value);
}

let frame = 0;
function schedule() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(measure);
}

let observer = null;

onMounted(() => {
    if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(schedule);
        observer.observe(root.value);
    }
    nextTick(schedule);
});

onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
    cancelAnimationFrame(frame);
});

watch(
    () => props.data,
    () => nextTick(schedule),
    { deep: true }
);

watch(
    () => props.data.person?.id,
    () => {
        Object.keys(expanded).forEach((k) => delete expanded[k]);
    }
);

watch(
    () => props.editable,
    () => nextTick(schedule)
);
</script>

<style scoped>
/* Mobile first: tiers stack with their label above. From 640px the label
   becomes a left rail and connector lines join the generations. */
.hourglass {
    position: relative;
    padding: 1em 0.75em 1.25em;
    background: color-mix(in srgb, var(--theme-bg-surface) 50%, transparent);
    border: 1px solid color-mix(in srgb, var(--theme-text) 15%, transparent);
    border-radius: 12px;
}
.hg-lines {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 0;
    pointer-events: none;
    overflow: visible;
}
.hg-lines path {
    fill: none;
    stroke: color-mix(in srgb, var(--theme-accent) 70%, transparent);
    stroke-width: 1.5;
}
.hg-lines path.bar { stroke: var(--theme-accent); stroke-width: 3; }
.hg-lines path.dashed { stroke-dasharray: 5 4; }

.add-blocked {
    position: relative;
    z-index: 1;
    margin: 0 0 1em;
    padding: 0.55em 0.8em;
    border-left: 3px solid var(--theme-accent);
    border-radius: 0 8px 8px 0;
    background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
    font-size: 0.88rem;
}
.add-blocked a { margin-left: 0.3em; color: var(--theme-accent); }

.hg-row {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    align-items: center;
    gap: 0.5em;
}
.hg-row + .hg-row {
    margin-top: 1.25em;
    padding-top: 1em;
    border-top: 1px solid color-mix(in srgb, var(--theme-text) 10%, transparent);
}
.rail {
    font-family: var(--theme-font-display, inherit);
    font-size: 0.8rem;
    color: color-mix(in srgb, var(--theme-text) 60%, transparent);
}
.tier-body,
.pair,
.pair-body {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 0.75em;
    min-width: 0;
}
.children-body { align-items: flex-start; }
.focus-slot { order: -1; flex-basis: 100%; display: flex; justify-content: center; }
.spouse { position: relative; }
.edit-marriage {
    position: absolute;
    top: -1.1em;
    right: -1.1em;
    width: 2.75em;
    height: 2.75em;
    padding: 0;
    border: 1px solid var(--theme-accent);
    border-radius: 50%;
    background: var(--theme-bg-surface);
    color: var(--theme-accent);
    font-size: 0.8rem;
    line-height: 1;
    cursor: pointer;
}
.edit-marriage:hover { background: color-mix(in srgb, var(--theme-accent) 20%, var(--theme-bg-surface)); }
.edit-marriage:focus-visible,
.add-slot:focus-visible,
.gc-toggle:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: 2px; }

.group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.9em;
    flex-basis: 100%;
    min-width: 0;
}
.group-heading {
    margin: 0;
    padding: 0.1em 0.6em;
    background: var(--theme-bg-surface);
    color: color-mix(in srgb, var(--theme-text) 80%, transparent);
    font-size: 0.78rem;
    font-style: italic;
    text-align: center;
}
.group.outside .group-heading,
.group.unknown .group-heading { color: color-mix(in srgb, var(--theme-text) 55%, transparent); }
.group-kids {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: flex-start;
    gap: 0.75em;
}
.child { display: flex; flex-direction: column; align-items: center; gap: 0.35em; }
.gc-toggle {
    min-height: 2em;
    padding: 0.15em 0.4em;
    background: none;
    border: none;
    color: var(--theme-accent);
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;
}
.gc-toggle:hover { text-decoration: underline; }
.caret { display: inline-block; width: 0.9em; }
.gc-list {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4em;
    margin: 0;
    padding: 0.4em 0 0 0.6em;
    list-style: none;
    border-left: 1px solid var(--theme-accent);
}
.more-note,
.empty-copy {
    align-self: center;
    margin: 0;
    color: color-mix(in srgb, var(--theme-text) 55%, transparent);
    font-size: 0.78rem;
    font-style: italic;
}
.add-slot {
    min-width: 7em;
    min-height: 2.75em;
    padding: 0.5em 0.8em;
    background: transparent;
    border: 1px dashed color-mix(in srgb, var(--theme-accent) 60%, transparent);
    border-radius: 8px;
    color: var(--theme-accent);
    font: inherit;
    font-size: 0.8rem;
    cursor: pointer;
}
.add-slot:hover:not(:disabled) {
    border-color: var(--theme-accent);
    background: color-mix(in srgb, var(--theme-accent) 8%, transparent);
}
.add-slot:disabled {
    border-color: color-mix(in srgb, var(--theme-text) 20%, transparent);
    color: color-mix(in srgb, var(--theme-text) 40%, transparent);
    cursor: not-allowed;
}

@media (min-width: 640px) {
    .hourglass { padding: 1.25em 1.25em 1.5em; }
    .hg-row { grid-template-columns: 6.5em minmax(0, 1fr); gap: 0.75em; }
    .hg-row + .hg-row { margin-top: 2.5em; padding-top: 0; border-top: none; }
    .rail { text-align: right; }
    .tier-body, .pair, .pair-body { gap: 1.25em; }
    .gp-body { gap: 2.5em; }
    .centre-body, .children-body { gap: 1.75em; }
    .focus-slot { order: 0; flex-basis: auto; }
    .group { flex-basis: auto; }
}
</style>
