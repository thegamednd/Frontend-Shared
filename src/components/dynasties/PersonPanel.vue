<template>
    <aside class="person-panel" aria-label="Person record">
        <div class="panel-head">
            <div class="head-text">
                <h3>{{ person.name }}</h3>
                <router-link
                    v-if="person.houseId && house"
                    class="house-link"
                    :to="{ name: 'DynastyHouse', params: { houseId: person.houseId } }"
                    >House {{ house }}</router-link
                >
            </div>
            <img v-if="portrait" class="portrait" :src="portrait" :alt="`Portrait of ${person.name}`" />
        </div>

        <p v-if="person.hidden" class="hidden-note">
            <span class="tag">Hidden from the family</span>
            <button v-if="editable" type="button" class="small-btn" @click="emit('reveal')">Reveal</button>
        </p>

        <dl class="facts">
            <div>
                <dt>Gender</dt>
                <dd>{{ genderText }}</dd>
            </div>
            <div>
                <dt>Life</dt>
                <dd>{{ lifespanText(person, abbr, gameYear) }}</dd>
            </div>
            <div v-if="ancestryLine">
                <dt>Ancestry</dt>
                <dd>{{ ancestryLine }}</dd>
            </div>
            <div v-if="person.adopted">
                <dt>Birth</dt>
                <dd>Adopted</dd>
            </div>
            <div v-else-if="legitimacy && legitimacy !== 'unknown'">
                <dt>Birth</dt>
                <dd>{{ legitimacyText(legitimacy) }}</dd>
            </div>
            <div v-if="person.causeOfDeath">
                <dt>Cause of death</dt>
                <dd>{{ person.causeOfDeath }}</dd>
            </div>
            <div v-if="person.barren">
                <dt>Fertility</dt>
                <dd>{{ person.barrenSince != null ? `Barren since ${formatYear(person.barrenSince, { abbr })}` : 'Barren' }}</dd>
            </div>
            <div v-if="dmInfo && person.willNotMarry" class="editor-only">
                <dt>Marriage</dt>
                <dd>Will not marry <span class="tag">editors only</span></dd>
            </div>
            <div v-if="dmInfo && person.fatherPresumed" class="editor-only">
                <dt>True father</dt>
                <dd>Not the recorded father, but a man outside the family <span class="tag">editors only</span></dd>
            </div>
        </dl>

        <section v-if="dmInfo && person.stats" class="block" aria-label="Hidden stats">
            <button type="button" class="small-btn" :aria-expanded="statsShown" @click="statsShown = !statsShown">
                {{ statsShown ? 'Hide stats' : 'Show stats' }}
            </button>
            <span class="tag">editors only</span>
            <template v-if="statsShown">
                <dl class="stat-grid">
                    <div v-for="s in shownStats" :key="s.key">
                        <dt>{{ s.label }}</dt>
                        <dd>{{ s.value ?? '–' }}</dd>
                    </div>
                </dl>
                <p class="stat-note">Total {{ statTotal }}</p>
            </template>
        </section>

        <section v-if="person.titles?.length" class="block">
            <h4>Titles</h4>
            <ul class="titles">
                <li v-for="(t, i) in person.titles" :key="i">
                    <span class="title-name">{{ t.title }}</span>
                    <span v-if="titleYears(t)" class="muted">{{ titleYears(t) }}</span>
                    <span v-if="t.note" class="muted note">{{ t.note }}</span>
                </li>
            </ul>
        </section>

        <section v-if="person.bio || characterBio" class="block">
            <h4>Family bio</h4>
            <p v-for="(para, i) in bioParagraphs" :key="i" class="bio-para">{{ para }}</p>
            <p v-if="characterBio && person.characterId" class="muted">
                {{ person.bio ? 'Their character also has a' : 'Their character has a' }}
                <router-link :to="{ name: 'Member', params: { id: person.characterId } }">bio in the gallery</router-link>.
            </p>
        </section>

        <section v-if="person.notes" class="block">
            <h4>Notes</h4>
            <p class="notes">{{ person.notes }}</p>
        </section>

        <section v-if="siblings.length" class="block">
            <h4>Siblings</h4>
            <ul class="plain-list">
                <li v-for="s in siblings" :key="s.person.id">
                    <router-link :to="{ name: 'DynastyPerson', params: { personId: s.person.id } }">{{ s.person.name }}</router-link>
                    <span class="muted">{{ siblingCaption(s) }}</span>
                </li>
            </ul>
        </section>

        <router-link v-if="person.characterId" class="character-link" :to="{ name: 'Member', params: { id: person.characterId } }"
            >Open their character</router-link
        >

        <template v-if="editable">
            <div class="panel-actions">
                <button type="button" class="action-btn" @click="emit('edit')">Edit</button>
                <button
                    type="button"
                    class="action-btn danger"
                    :disabled="!deletable"
                    :title="deletable ? '' : 'Remove their children and marriages first'"
                    @click="emit('delete')"
                >
                    Delete
                </button>
            </div>
            <p v-if="!deletable" class="muted">To delete this person, remove their children and marriages first.</p>
            <p v-if="error" class="error-text" role="alert">{{ error }}</p>

            <section class="block">
                <h4>Marriages</h4>
                <p v-if="!marriages.length" class="muted">No marriages recorded.</p>
                <ul v-else class="plain-list marriages">
                    <li v-for="m in marriages" :key="m.id">
                        <span class="marriage-text">
                            <router-link v-if="m.spouse" :to="{ name: 'DynastyPerson', params: { personId: m.spouse.id } }">{{
                                m.spouse.name
                            }}</router-link>
                            <span v-else>Unknown spouse</span>
                            <span class="muted">{{ marriageCaption(m, abbr) }}</span>
                            <span v-if="m.endNote" class="muted">{{ m.endNote }}</span>
                            <span v-if="m.notes" class="muted note">{{ m.notes }}</span>
                        </span>
                        <button type="button" class="small-btn" @click="emit('edit-marriage', m)">Edit</button>
                    </li>
                </ul>
            </section>
        </template>
    </aside>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useCharacterStore } from '@shared/stores/character';
import { useRealmStore } from '@shared/stores/realm';
import { formatYear } from '@shared/utils/dynastyYears';
import { lifespanText, legitimacyText, marriageCaption } from '@shared/utils/dynastyLabels';
import { ancestryText } from '@shared/utils/dynastyAncestry';
import { characterImageUrl } from '@shared/utils/dynastyCharacters';

const props = defineProps({
    person: { type: Object, required: true },
    house: { type: String, default: '' },
    marriages: { type: Array, default: () => [] },
    deletable: { type: Boolean, default: false },
    // Edit, delete, reveal and marriage edits.
    editable: { type: Boolean, default: false },
    // DM-only details (hidden stats, presumed father, will not marry), shown even when editing is off.
    dmView: { type: Boolean, default: false },
    legitimacy: { type: String, default: 'unknown' },
    // The linked character has a bio of their own.
    characterBio: { type: Boolean, default: false },
    error: { type: String, default: '' },
    // Everyone sharing a parent: { person, relation: full | half | sibling, through, adopted }.
    siblings: { type: Array, default: () => [] },
    // The focus person's parents, to name the one a half-sibling shares.
    father: { type: Object, default: null },
    mother: { type: Object, default: null },
});
const emit = defineEmits(['edit', 'delete', 'edit-marriage', 'reveal']);
const dmInfo = computed(() => props.dmView || props.editable);

const characterStore = useCharacterStore();
const realmStore = useRealmStore();
const abbr = computed(() => realmStore.activeRealm?.DateSuffix?.Abbr || 'SF');
const gameYear = computed(() => realmStore.activeRealm?.Date?.y ?? null);

const bioParagraphs = computed(() =>
    (props.person.bio || '')
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
);

const ancestryLine = computed(() => ancestryText(props.person.ancestry));

// Hidden stats: the server sends them to editors only, and they show on request.
const STATS = [
    ['str', 'Str'],
    ['int', 'Int'],
    ['wis', 'Wis'],
    ['dex', 'Dex'],
    ['con', 'Con'],
    ['cha', 'Cha'],
    ['com', 'Com'],
];
const statsShown = ref(false);
watch(
    () => props.person.id,
    () => {
        statsShown.value = false;
    }
);
const shownStats = computed(() => STATS.map(([key, label]) => ({ key, label, value: props.person.stats?.[key] })));
const statTotal = computed(() => shownStats.value.reduce((sum, s) => sum + (Number(s.value) || 0), 0));

const GENDER_TEXT = { male: 'Male', female: 'Female', other: 'Other', unknown: 'Unknown' };
const genderText = computed(() => GENDER_TEXT[props.person.gender] || 'Unknown');

const portrait = computed(() => {
    const id = props.person.characterId;
    return id ? characterImageUrl(characterStore.characters?.[id]) : '';
});

// "Sister, b. 304 SF", or "Half-sister through their mother, Lechuza, b. 306 SF".
function siblingCaption(s) {
    const kin = { male: 'brother', female: 'sister' }[s.person.gender] || 'sibling';
    const parent = s.through === 'father' ? props.father : props.mother;
    const parts = [
        s.relation === 'half'
            ? `Half-${kin} through their ${s.through}${parent?.name ? `, ${parent.name}` : ''}`
            : kin.charAt(0).toUpperCase() + kin.slice(1),
    ];
    if (s.adopted) parts.push('adopted');
    if (s.person.born != null) parts.push(`b. ${formatYear(s.person.born, { abbr: abbr.value })}`);
    return parts.join(', ');
}

function titleYears(t) {
    const from = formatYear(t.from, { abbr: abbr.value });
    const to = formatYear(t.to, { abbr: abbr.value });
    if (from && to) return `${from} to ${to}`;
    if (from) return `from ${from}`;
    if (to) return `until ${to}`;
    return '';
}
</script>

<style scoped>
/* Full width under the tree on phones; the view places it beside the tree
   on wide screens. */
.person-panel {
    display: flex;
    flex-direction: column;
    gap: 0.9em;
    padding: 1em;
    background: color-mix(in srgb, var(--theme-bg-surface) 70%, transparent);
    border: 1px solid color-mix(in srgb, var(--theme-text) 15%, transparent);
    border-top: 3px solid var(--theme-accent);
    border-radius: 12px;
    color: var(--theme-text);
    min-width: 0;
}
.panel-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75em; }
.head-text { min-width: 0; }
h3 {
    margin: 0;
    font-family: var(--theme-font-display, inherit);
    font-size: 1.3rem;
    line-height: 1.2;
    overflow-wrap: anywhere;
}
h4 { margin: 0 0 0.4em; font-size: 0.95rem; color: var(--theme-accent); }
.house-link { color: var(--theme-accent); font-size: 0.9rem; }
.portrait {
    width: 4.5em;
    height: 4.5em;
    flex: none;
    border-radius: 10px;
    object-fit: cover;
    object-position: top;
    border: 1px solid color-mix(in srgb, var(--theme-text) 20%, transparent);
}
.facts { display: grid; grid-template-columns: minmax(0, 1fr); gap: 0.45em; margin: 0; }
.facts > div { display: grid; grid-template-columns: 7.5em minmax(0, 1fr); gap: 0.5em; }
dt { color: color-mix(in srgb, var(--theme-text) 60%, transparent); font-size: 0.85rem; }
dd { margin: 0; overflow-wrap: anywhere; }
.tag {
    display: inline-block;
    margin-left: 0.35em;
    padding: 0.05em 0.45em;
    border: 1px solid #d8a657;
    border-radius: 4px;
    color: #d8a657;
    font-size: 0.72rem;
    white-space: nowrap;
}
.hidden-note { display: flex; align-items: center; flex-wrap: wrap; gap: 0.5em; margin: 0; }
.hidden-note .tag { margin-left: 0; }
.block { min-width: 0; }
.stat-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.4em; margin: 0.6em 0 0.3em; }
.stat-grid > div {
    padding: 0.3em;
    text-align: center;
    border: 1px solid color-mix(in srgb, var(--theme-text) 15%, transparent);
    border-radius: 8px;
}
.stat-grid dd { font-weight: 700; font-size: 1.05rem; }
.stat-note { margin: 0; font-size: 0.85rem; }
.titles, .plain-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 0.5em; }
.titles li, .plain-list li { display: flex; flex-direction: column; gap: 0.1em; min-width: 0; }
.title-name { font-weight: 600; }
.muted { color: color-mix(in srgb, var(--theme-text) 62%, transparent); font-size: 0.86rem; margin: 0; }
.note { font-style: italic; overflow-wrap: anywhere; }
.bio-para, .notes { margin: 0 0 0.6em; line-height: 1.55; white-space: pre-line; }
a { color: var(--theme-accent); }
.character-link { align-self: flex-start; }
.panel-actions { display: flex; gap: 0.5em; }
.action-btn, .small-btn {
    min-height: 2.5em;
    padding: 0.35em 1em;
    font: inherit;
    color: var(--theme-text);
    background: transparent;
    border: 1px solid color-mix(in srgb, var(--theme-text) 25%, transparent);
    border-radius: 8px;
    cursor: pointer;
}
.small-btn { min-height: 2.25em; padding: 0.25em 0.75em; font-size: 0.85rem; }
.action-btn:hover:not(:disabled), .small-btn:hover { border-color: var(--theme-accent); color: var(--theme-accent); }
.action-btn.danger { border-color: var(--theme-danger, #e06c75); color: var(--theme-danger, #e06c75); }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.action-btn:focus-visible, .small-btn:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: 2px; }
.error-text { margin: 0; color: var(--theme-danger, #e06c75); }
.marriages li { flex-direction: row; align-items: flex-start; justify-content: space-between; gap: 0.6em; }
.marriage-text { display: flex; flex-direction: column; gap: 0.1em; min-width: 0; }
</style>
