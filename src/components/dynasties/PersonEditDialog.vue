<template>
    <dialog ref="dialogRef" class="dyn-dialog person-dialog" :aria-labelledby="`${formId}-title`" @cancel.prevent="close">
        <div class="dyn-layout">
            <div class="dyn-header">
                <h3 :id="`${formId}-title`">{{ heading }}</h3>
                <button type="button" class="dyn-close" aria-label="Close" @click="close">&times;</button>
            </div>

            <div class="dyn-body">
                <div v-if="step === 'choose'" class="step">
                    <p class="hint">Start a new person from scratch, or base them on one of the realm's characters.</p>
                    <div class="step-actions">
                        <button type="button" class="btn" @click="chooseNew">New person</button>
                        <button type="button" class="btn" @click="chooseCharacter">From a character</button>
                    </div>
                </div>

                <div v-else-if="step === 'character'" class="step">
                    <p class="hint">Pick a character. Their name and dates fill in the form.</p>
                    <CharacterPicker v-model="pickerCharacterId" @selected="onCharacterPicked" />
                    <button v-if="startedFrom === 'choose'" type="button" class="link-btn back" @click="step = 'choose'">
                        Back
                    </button>
                </div>

                <form v-else :id="formId" novalidate @submit.prevent="save(false)">
                    <fieldset v-if="askAnchorSlot" class="group">
                        <legend>Record {{ context.anchor.name }} as</legend>
                        <div class="choices">
                            <label v-for="c in slotChoices" :key="c.value" class="choice" :class="{ on: anchorSlot === c.value }">
                                <input v-model="anchorSlot" type="radio" :name="`${formId}-slot`" :value="c.value" @change="applyAnchorSlot" />
                                {{ c.label }}
                            </label>
                        </div>
                    </fieldset>

                    <div class="field">
                        <label :for="`${formId}-name`">Name *</label>
                        <input
                            :id="`${formId}-name`"
                            ref="nameRef"
                            v-model="form.name"
                            data-field="name"
                            type="text"
                            maxlength="120"
                            autocomplete="off"
                            :placeholder="!editing && form.characterId ? 'Leave blank to use the character\'s name' : ''"
                        />
                    </div>

                    <div class="pair">
                        <div class="field">
                            <label :for="`${formId}-house`">House *</label>
                            <select :id="`${formId}-house`" v-model="form.houseId" @change="houseTouched = true">
                                <option value="" disabled>Choose a house</option>
                                <option v-for="h in dynastiesStore.houses" :key="h.id" :value="h.id">{{ h.name }}</option>
                            </select>
                        </div>
                        <div class="field">
                            <label :for="`${formId}-gender`">Gender</label>
                            <select :id="`${formId}-gender`" v-model="form.gender">
                                <option v-for="g in genders" :key="g.value" :value="g.value">{{ g.label }}</option>
                            </select>
                        </div>
                    </div>

                    <fieldset class="group">
                        <legend>Dates</legend>
                        <div v-for="f in yearFields" :key="f.key" class="field">
                            <label :for="`${formId}-${f.key}`">{{ f.label }}</label>
                            <div class="year-row">
                                <input
                                    :id="`${formId}-${f.key}`"
                                    v-model="form[f.key]"
                                    :data-field="f.key"
                                    type="text"
                                    inputmode="numeric"
                                    autocomplete="off"
                                    :aria-invalid="!!errors[f.key]"
                                    :aria-describedby="`${formId}-years-hint`"
                                    @blur="f.key === 'born' && (bornTouched = true)"
                                />
                                <span class="abbr">{{ abbr }}</span>
                            </div>
                            <p v-if="errors[f.key]" class="field-error">{{ errors[f.key] }}</p>
                        </div>
                        <div class="flag-row">
                            <label class="check"><input v-model="form.barren" type="checkbox" /> Barren</label>
                            <label class="check"><input v-model="form.willNotMarry" type="checkbox" /> Will not marry</label>
                            <label class="check"><input v-model="form.adopted" type="checkbox" /> Adopted</label>
                        </div>
                        <div v-if="form.barren" class="field">
                            <label :for="`${formId}-barren-since`">Barren since</label>
                            <div class="year-row">
                                <input :id="`${formId}-barren-since`" v-model="form.barrenSince" type="text" inputmode="numeric" autocomplete="off" />
                                <span class="abbr">{{ abbr }}</span>
                            </div>
                            <p v-if="errors.barrenSince" class="field-error">{{ errors.barrenSince }}</p>
                        </div>
                        <p :id="`${formId}-years-hint`" class="hint">
                            Born is required. Use a minus sign for years before {{ abbr }} 1. Leave Died blank if they're
                            still alive.
                            <template v-if="form.willNotMarry"> Only editors see Will not marry.</template>
                            <template v-if="form.adopted"> The father and mother below are adoptive parents, so they pass nothing on.</template>
                            <template v-if="form.barren"> Leave Barren since blank if they were barren all their life.</template>
                        </p>
                    </fieldset>

                    <fieldset class="group">
                        <legend>Parents</legend>
                        <div v-for="slot in parentSlots" :key="slot.key" class="field">
                            <PersonSourceField
                                v-model="form[slot.field]"
                                :model-label="labels[form[slot.field]] || ''"
                                :label="slot.label"
                                :partners="suggestionsFor(slot.key)"
                                empty-hint="Leave this empty if they're unknown."
                                :exclude-ids="excludeFor(slot.key)"
                                @picked="rememberPicked"
                                @new-person="startNewParent(slot.key)"
                                @from-character="startCharacterParent(slot.key)"
                            />
                        </div>
                        <div class="field">
                            <label :for="`${formId}-legit`">Legitimate</label>
                            <select :id="`${formId}-legit`" v-model="form.legitimate" class="narrow" :disabled="form.unknownBastard">
                                <option value="auto">Auto</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                            <p class="hint">{{ legitimacyHelp }}</p>
                        </div>
                        <div v-if="canAddUnknownBastard" class="field">
                            <label class="check">
                                <input
                                    v-model="form.unknownBastard"
                                    type="checkbox"
                                    :aria-describedby="`${formId}-bastard-hint`"
                                    @change="form.unknownBastard && (form.legitimate = 'no')"
                                />
                                Unknown bastard child
                            </label>
                            <p :id="`${formId}-bastard-hint`" class="hint">
                                The family doesn't know this child exists. Players won't see them until you reveal them.
                                The child needs a father or a mother.
                            </p>
                        </div>
                    </fieldset>

                    <fieldset class="group">
                        <legend>Ancestry</legend>
                        <p v-if="parentMix && !ancestryManual && !form.adopted" class="hint">
                            Worked out from the parents. Change any share to set it yourself.
                        </p>
                        <p v-else-if="parentMixDiffers" class="hint">
                            Set by hand.
                            <button type="button" class="link-btn" @click="useParentMix">
                                Use the parents' mix ({{ ancestryText(parentMix) }})
                            </button>
                        </p>
                        <p v-else-if="!form.ancestry.length && form.characterId" class="hint">
                            Leave this empty to take the character's races.
                        </p>
                        <div v-for="(row, i) in form.ancestry" :key="row.key" class="ancestry-row">
                            <input
                                v-model="row.race"
                                type="text"
                                autocomplete="off"
                                :list="`${formId}-races`"
                                placeholder="Race"
                                :aria-label="`Race ${i + 1}`"
                                @input="ancestryManual = true"
                            />
                            <span class="share">
                                <input
                                    v-model="row.share"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="any"
                                    inputmode="decimal"
                                    :aria-label="`Race ${i + 1} percentage`"
                                    @input="ancestryManual = true"
                                />
                                <span aria-hidden="true">%</span>
                            </span>
                            <button type="button" class="remove-btn" :aria-label="`Remove race ${i + 1}`" @click="removeAncestryRow(i)">
                                &times;
                            </button>
                        </div>
                        <datalist :id="`${formId}-races`">
                            <option v-for="r in raceSuggestions" :key="r" :value="r" />
                        </datalist>
                        <button type="button" class="link-btn" @click="addAncestryRow">+ Add a race</button>
                        <p v-if="ancestryError" class="field-error">{{ ancestryError }}</p>
                        <p v-else-if="ancestryNote" class="hint">{{ ancestryNote }}</p>
                    </fieldset>

                    <fieldset class="group">
                        <legend>Titles</legend>
                        <p v-if="!form.titles.length" class="hint">No titles recorded.</p>
                        <div v-for="(t, i) in form.titles" :key="t.key" class="title-row">
                            <input v-model="t.title" type="text" class="t-title" placeholder="Title" :aria-label="`Title ${i + 1}`" autocomplete="off" />
                            <input v-model="t.from" type="text" inputmode="numeric" class="t-year" :placeholder="`From (${abbr})`" :aria-label="`Title ${i + 1} from`" />
                            <input v-model="t.to" type="text" inputmode="numeric" class="t-year" :placeholder="`To (${abbr})`" :aria-label="`Title ${i + 1} to`" />
                            <input v-model="t.note" type="text" class="t-note" placeholder="Note" :aria-label="`Title ${i + 1} note`" autocomplete="off" />
                            <button type="button" class="remove-btn" :aria-label="`Remove title ${i + 1}`" @click="form.titles.splice(i, 1)">
                                &times;
                            </button>
                            <p v-if="titleErrors[i]" class="field-error t-err">{{ titleErrors[i] }}</p>
                        </div>
                        <button type="button" class="link-btn" @click="form.titles.push(titleRow())">+ Add a title</button>
                    </fieldset>

                    <div class="field">
                        <label :for="`${formId}-cause`">Cause of death</label>
                        <input :id="`${formId}-cause`" v-model="form.causeOfDeath" type="text" autocomplete="off" />
                    </div>

                    <div v-if="editing" class="field">
                        <span class="field-label">Character</span>
                        <CharacterPicker v-model="form.characterId" />
                        <p class="hint">Link this person to one of the realm's characters, if there is one.</p>
                    </div>
                    <div v-else-if="form.characterId" class="field">
                        <span class="field-label">Character</span>
                        <div class="linked-character">
                            <span>{{ linkedCharacterName }}</span>
                            <button type="button" class="link-btn" @click="chooseCharacter">Choose another</button>
                        </div>
                    </div>

                    <div class="field">
                        <label :for="`${formId}-notes`">Notes</label>
                        <textarea :id="`${formId}-notes`" v-model="form.notes" rows="3"></textarea>
                    </div>

                    <div class="field">
                        <label :for="`${formId}-bio`">Family bio</label>
                        <textarea :id="`${formId}-bio`" v-model="form.bio" rows="6" maxlength="20000"></textarea>
                        <p v-if="form.characterId" class="hint">
                            The family bio is separate from the character's own bio. The tree shows both.
                        </p>
                    </div>

                    <p v-if="failure" class="save-error" role="alert">
                        {{ failure.message }}
                        <router-link v-if="failure.upgrade" :to="UPGRADE_PATH">See upgrade options</router-link>
                    </p>
                </form>
            </div>

            <div class="dyn-footer">
                <span class="spacer"></span>
                <button v-if="step !== 'form'" type="button" class="btn" @click="close">Cancel</button>
                <template v-else>
                    <button type="button" class="btn" :disabled="saving" @click="close">Cancel</button>
                    <button
                        v-if="context?.role === 'child'"
                        type="button"
                        class="btn"
                        :disabled="saving || hasYearError"
                        @click="save(true)"
                    >
                        Save and add another
                    </button>
                    <button type="submit" :form="formId" class="btn btn-primary" :disabled="saving">
                        {{ saving ? 'Saving…' : 'Save' }}
                    </button>
                </template>
            </div>
        </div>

        <PersonEditDialog v-if="nestedMounted" ref="nestedRef" @saved="onNestedSaved" />
    </dialog>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { useDynastiesStore } from '@shared/stores/dynasties';
import { useCharacterStore } from '@shared/stores/character';
import { useRealmStore } from '@shared/stores/realm';
import { useUserStore } from '@shared/stores/user';
import { toSignedYear } from '@shared/utils/dynastyYears';
import { legitimacyText } from '@shared/utils/dynastyLabels';
import { ancestryText, mixAncestry, normalizeAncestry } from '@shared/utils/dynastyAncestry';
import { characterName, characterYear } from '@shared/utils/dynastyCharacters';
import { saveFailure, UPGRADE_PATH } from '@shared/utils/dynastyErrors';
import PersonSourceField from './PersonSourceField.vue';
import CharacterPicker from './CharacterPicker.vue';

const emit = defineEmits(['saved', 'saved-another']);
const dynastiesStore = useDynastiesStore();
const characterStore = useCharacterStore();
const realmStore = useRealmStore();
const userStore = useUserStore();
const abbr = computed(() => realmStore.activeRealm?.DateSuffix?.Abbr || 'SF');

let uid = 0;
const formId = `person-form-${Math.random().toString(36).slice(2, 8)}`;

const genders = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
    { value: 'unknown', label: 'Unknown' },
];
const slotChoices = [
    { value: 'father', label: 'Father' },
    { value: 'mother', label: 'Mother' },
];
const parentSlots = [
    { key: 'father', field: 'fatherId', label: 'Father' },
    { key: 'mother', field: 'motherId', label: 'Mother' },
];
const yearFields = [
    { key: 'born', label: 'Born *' },
    { key: 'died', label: 'Died' },
];

const dialogRef = ref(null);
const nameRef = ref(null);
const nestedRef = ref(null);
const nestedMounted = ref(false);
const editing = ref(null);
const context = ref(null);
const savedDefaults = ref({});
const anchorSlot = ref(null);
const saving = ref(false);
const failure = ref(null);
const labels = ref({});
const pickerCharacterId = ref(null);
// Which screen shows: 'choose' (new or character), 'character' (pick one), 'form'.
const step = ref('form');
// How the caller opened the dialog: 'new', 'character' or 'choose'.
const startedFrom = ref('new');
// Person id to house id, for the people the form may set as parents.
const houseById = ref({});
// True once the editor picks a house by hand; the parents' house no longer applies.
const houseTouched = ref(false);
const bornTouched = ref(false);
let nestedFor = null;

// Only editors (DMs and administrators) can add a hidden child; the server checks too.
const canAddUnknownBastard = computed(() => !editing.value && (userStore.isDM || userStore.isAdmin));

const form = reactive(blankForm());

function blankForm() {
    return {
        name: '',
        houseId: '',
        gender: 'unknown',
        born: '',
        died: '',
        fatherId: null,
        motherId: null,
        legitimate: 'auto',
        titles: [],
        causeOfDeath: '',
        notes: '',
        bio: '',
        characterId: null,
        barren: false,
        barrenSince: '',
        willNotMarry: false,
        adopted: false,
        unknownBastard: false,
        ancestry: [],
    };
}

const yearText = (y) => (y === null || y === undefined ? '' : String(y));
const isBlank = (v) => v === null || v === undefined || String(v).trim() === '';

// Parses a year field: { year } or { error }.
function parseYear(input) {
    try {
        return { year: toSignedYear(input) };
    } catch (e) {
        return { error: e.message, year: null };
    }
}

// ---- Ancestry: rows of race + percentage ----

const ancestryManual = ref(false);
const parentMix = ref(null);
const parentAncestry = ref({});

const ancestryRow = (race = '', share = '') => ({ key: ++uid, race, share: share === '' ? '' : String(share) });
const rowsFrom = (ancestry) =>
    Object.entries(ancestry || {})
        .sort((a, b) => b[1] - a[1])
        .map(([race, share]) => ancestryRow(race, share));

function addAncestryRow() {
    form.ancestry.push(ancestryRow());
    ancestryManual.value = true;
}

function removeAncestryRow(i) {
    form.ancestry.splice(i, 1);
    ancestryManual.value = true;
}

function useParentMix() {
    if (!parentMix.value) return;
    form.ancestry = rowsFrom(parentMix.value);
    ancestryManual.value = false;
}

// Suggestions: every race on the realm's characters and in the current mix.
const raceSuggestions = computed(() => {
    const names = new Set();
    Object.values(characterStore.characters || {}).forEach((c) =>
        (Array.isArray(c.Races) ? c.Races : []).forEach((r) => {
            const n = typeof r === 'string' ? r : r?.name || r?.Name;
            if (n) names.add(n);
        })
    );
    Object.keys(parentMix.value || {}).forEach((n) => names.add(n));
    return [...names].sort();
});

const enteredAncestry = computed(() => form.ancestry.filter((r) => r.race.trim() || String(r.share).trim() !== ''));

const ancestryError = computed(() => {
    const rows = enteredAncestry.value;
    if (!rows.length) return '';
    if (rows.some((r) => !r.race.trim())) return 'Give every row a race.';
    const names = rows.map((r) => r.race.trim().toLowerCase());
    if (new Set(names).size !== names.length) return 'Each race can appear only once.';
    const shares = rows.map((r) => Number(r.share));
    if (shares.some((n) => !Number.isFinite(n) || n < 0 || n > 100)) return 'Each share is a percentage from 0 to 100.';
    const total = shares.reduce((a, b) => a + b, 0);
    if (Math.abs(total - 100) > 0.5) {
        return `The shares add up to ${Math.round(total * 100) / 100}%. They need to add up to 100%.`;
    }
    return '';
});

const savedAncestry = computed(() => {
    if (ancestryError.value) return null;
    return normalizeAncestry(Object.fromEntries(enteredAncestry.value.map((r) => [r.race.trim(), Number(r.share)])));
});

const parentMixDiffers = computed(
    () =>
        !!parentMix.value &&
        !form.adopted &&
        ancestryManual.value &&
        ancestryText(parentMix.value) !== ancestryText(savedAncestry.value)
);

const ancestryNote = computed(() => {
    const saved = savedAncestry.value;
    if (!saved || !Object.keys(saved).length) return '';
    const entered = enteredAncestry.value.filter((r) => Number(r.share) > 0);
    const changed =
        entered.length !== Object.keys(saved).length || entered.some((r) => saved[r.race.trim()] !== Number(r.share));
    return changed ? `Races under 10% are shared out among the others, so this saves as ${ancestryText(saved)}.` : '';
});

async function ancestryOf(id) {
    if (!id) return null;
    if (id in parentAncestry.value) return parentAncestry.value[id];
    let a = null;
    const hg = dynastiesStore.person;
    if (hg?.person?.id === id) a = hg.person.ancestry || null;
    else {
        const known = (dynastiesStore.house?.people || []).find((p) => p.id === id);
        if (known) a = known.ancestry || null;
    }
    parentAncestry.value = { ...parentAncestry.value, [id]: a };
    return a;
}

async function refreshParentMix() {
    const [fatherId, motherId] = [form.fatherId, form.motherId];
    const [a, b] = await Promise.all([ancestryOf(fatherId), ancestryOf(motherId)]);
    if (fatherId !== form.fatherId || motherId !== form.motherId) return;
    parentMix.value = mixAncestry(a, b);
    // An adopted child's race does not come from the adoptive parents.
    if (parentMix.value && !ancestryManual.value && !form.adopted) form.ancestry = rowsFrom(parentMix.value);
}
watch(() => [form.fatherId, form.motherId], refreshParentMix);

watch(
    () => form.adopted,
    (adopted) => {
        if (ancestryManual.value) return;
        if (adopted) form.ancestry = [];
        else refreshParentMix();
    }
);

// ---- Titles ----

function titleRow(t = {}) {
    return { key: ++uid, title: t.title || '', from: yearText(t.from), to: yearText(t.to), note: t.note || '' };
}

const titleErrors = computed(() => form.titles.map((t) => parseYear(t.from).error || parseYear(t.to).error || ''));

// ---- Validation ----

const errors = computed(() => {
    const born = parseYear(form.born);
    const died = parseYear(form.died);
    let barrenSince = '';
    if (form.barren) {
        const since = parseYear(form.barrenSince);
        barrenSince = since.error || '';
        if (!barrenSince && since.year !== null && born.year !== null && since.year < born.year) {
            barrenSince = 'Barren since cannot be before they were born.';
        }
    }
    let diedError = died.error || '';
    if (!diedError && died.year !== null && born.year !== null && died.year < born.year) {
        diedError = 'They cannot die before they were born.';
    }
    return {
        born: born.error || (isBlank(form.born) && bornTouched.value ? 'Enter the year they were born.' : ''),
        died: diedError,
        barrenSince,
    };
});

// A linked character can supply the birth year, so Born may stay blank then.
const bornMissing = computed(() => isBlank(form.born) && !(form.characterId && !editing.value));

const hasYearError = computed(
    () =>
        bornMissing.value ||
        !!errors.value.born ||
        !!errors.value.died ||
        !!errors.value.barrenSince ||
        titleErrors.value.some(Boolean)
);

// ---- Legitimacy ----

function resolveAutoLegitimacy({ fatherId, motherId, born, anchorId, marriages }) {
    if (!anchorId || !Array.isArray(marriages)) return null;
    let otherId = null;
    if (fatherId === anchorId) otherId = motherId;
    else if (motherId === anchorId) otherId = fatherId;
    else return null;
    if (!otherId) return 'unknown';
    const between = marriages.filter((m) => m.spouseId === otherId);
    if (!between.length) return 'no';
    if (between.some((m) => m.from == null && m.to == null)) return 'yes';
    if (born === null || born === undefined) return 'unknown';
    const covered = between.some((m) => (m.from ?? -Infinity) <= born && born <= (m.to ?? Infinity));
    return covered ? 'yes' : 'no';
}

const legitimacyHelp = computed(() => {
    const ctx = context.value;
    const resolved =
        ctx?.role === 'child'
            ? resolveAutoLegitimacy({
                  fatherId: form.fatherId,
                  motherId: form.motherId,
                  born: parseYear(form.born).year,
                  anchorId: ctx.anchor?.id,
                  marriages: ctx.marriages,
              })
            : null;
    if (!resolved) return 'Auto decides from whether the parents were married when the child was born.';
    return `On Auto, this comes out as ${legitimacyText(resolved).toLowerCase()}.`;
});

// ---- Headings and parents ----

const heading = computed(() => {
    if (editing.value) return `Edit ${editing.value.name}`;
    const role = context.value?.role;
    if (role === 'child') return 'Add a child';
    if (role === 'father') return 'Add a father';
    if (role === 'mother') return 'Add a mother';
    if (role === 'spouse') return 'Add a spouse';
    return 'Add a person';
});

const askAnchorSlot = computed(
    () =>
        !editing.value &&
        context.value?.role === 'child' &&
        ['other', 'unknown'].includes(context.value?.anchor?.gender || 'unknown')
);

function excludeFor(slot) {
    const other = slot === 'father' ? form.motherId : form.fatherId;
    return [editing.value?.id, other].filter(Boolean);
}

function suggestionsFor(slot) {
    const ctx = context.value;
    if (!ctx || ctx.role !== 'child' || !anchorSlot.value) return [];
    return anchorSlot.value !== slot ? ctx.partners || [] : [];
}

function seedLabels() {
    const map = { ...labels.value };
    const houses = { ...houseById.value };
    const add = (p) => {
        if (p?.id && p.name) map[p.id] = p.name;
        if (p?.id && p.houseId) houses[p.id] = p.houseId;
    };
    add(context.value?.anchor);
    (context.value?.partners || []).forEach(add);
    const hg = dynastiesStore.person;
    if (hg) {
        add(hg.person);
        add(hg.father);
        add(hg.mother);
        (hg.marriages || []).forEach((m) => add(m.spouse));
        (hg.childGroups || []).forEach((g) => {
            add(g.otherParent);
            (g.children || []).forEach(add);
        });
    }
    (dynastiesStore.house?.people || []).forEach(add);
    Object.entries(context.value?.labels || {}).forEach(([id, name]) => {
        if (id && name) map[id] = name;
    });
    labels.value = map;
    houseById.value = houses;
}

function rememberPicked(p) {
    if (p?.id && p.name) labels.value = { ...labels.value, [p.id]: p.name };
    if (p?.id && p.houseId) houseById.value = { ...houseById.value, [p.id]: p.houseId };
}

// A new person takes the father's house, then the mother's, until the editor picks one.
function followParentHouse() {
    if (editing.value || houseTouched.value) return;
    const map = houseById.value;
    const house = (form.fatherId && map[form.fatherId]) || (form.motherId && map[form.motherId]);
    if (house) form.houseId = house;
}
watch(() => [form.fatherId, form.motherId], followParentHouse);

function fill(person, defaults) {
    Object.assign(form, blankForm());
    bornTouched.value = false;
    const src = person || defaults || {};
    form.name = src.name || '';
    form.houseId = src.houseId || '';
    form.gender = src.gender || 'unknown';
    form.born = yearText(src.born);
    form.died = yearText(src.died);
    form.fatherId = src.fatherId || null;
    form.motherId = src.motherId || null;
    form.legitimate = src.legitimate === true ? 'yes' : src.legitimate === false ? 'no' : 'auto';
    form.titles = (src.titles || []).map(titleRow);
    form.causeOfDeath = src.causeOfDeath || '';
    form.notes = src.notes || '';
    form.bio = src.bio || '';
    form.characterId = src.characterId || null;
    form.barren = src.barren === true;
    form.barrenSince = yearText(src.barrenSince);
    form.willNotMarry = src.willNotMarry === true;
    form.adopted = src.adopted === true;
    form.ancestry = rowsFrom(src.ancestry);
    ancestryManual.value = Object.keys(src.ancestry || {}).length > 0;
    parentMix.value = null;
    refreshParentMix();
}

function applyAnchorSlot() {
    const anchorId = context.value?.anchor?.id;
    if (!anchorId || !anchorSlot.value) return;
    if (anchorSlot.value === 'father') {
        form.fatherId = anchorId;
        if (form.motherId === anchorId) form.motherId = null;
    } else {
        form.motherId = anchorId;
        if (form.fatherId === anchorId) form.fatherId = null;
    }
}

function pickAnchorSlot(defaults) {
    const anchor = context.value?.anchor;
    if (context.value?.role !== 'child' || !anchor) return null;
    if (anchor.gender === 'male') return 'father';
    if (anchor.gender === 'female') return 'mother';
    return defaults?.motherId === anchor.id ? 'mother' : 'father';
}

const linkedCharacterName = computed(() => characterName(characterStore.characters?.[form.characterId]) || 'Linked character');

function firstStep(person, defaults, source) {
    if (person || defaults.characterId) return 'form';
    if (source === 'choose' || source === 'character') return source;
    return 'form';
}

/**
 * Opens the dialog.
 * person: the record to edit, or null to add one.
 * defaults: starting values for a new person (houseId, fatherId, characterId, ...).
 * context: { role: 'child' | 'father' | 'mother' | 'spouse', anchor, partners, marriages, labels }.
 * source: 'new' (straight to the form), 'character' (pick a character first) or 'choose'.
 */
function open({ person = null, defaults = {}, context: ctx = null, source = 'new' } = {}) {
    editing.value = person;
    context.value = ctx;
    savedDefaults.value = { ...defaults };
    fill(person, defaults);
    if (!person) {
        if (ctx?.role === 'father' && form.gender === 'unknown') form.gender = 'male';
        if (ctx?.role === 'mother' && form.gender === 'unknown') form.gender = 'female';
    }
    anchorSlot.value = person ? null : pickAnchorSlot(defaults);
    applyAnchorSlot();
    failure.value = null;
    saving.value = false;
    pickerCharacterId.value = null;
    startedFrom.value = source;
    step.value = firstStep(person, defaults, source);
    houseTouched.value = false;
    houseById.value = {};
    seedLabels();
    followParentHouse();
    if (!person && defaults.characterId) onCharacterSelected(characterStore.characters?.[defaults.characterId]);
    if (!dynastiesStore.houses?.length) dynastiesStore.fetchHouses?.().catch(() => {});
    if (!dialogRef.value?.open) dialogRef.value?.showModal();
    if (step.value === 'form') nextTick(() => nameRef.value?.focus());
}

function chooseNew() {
    step.value = 'form';
    nextTick(() => nameRef.value?.focus());
}

function chooseCharacter() {
    pickerCharacterId.value = null;
    step.value = 'character';
}

function startingGender() {
    const role = context.value?.role;
    if (role === 'father') return 'male';
    if (role === 'mother') return 'female';
    return savedDefaults.value.gender || 'unknown';
}

function onCharacterPicked(character) {
    if (!character) return;
    const id = character.ID || character.id;
    // Switching characters: drop what the previous one filled in.
    if (form.characterId && form.characterId !== id) {
        form.name = '';
        form.gender = startingGender();
        form.born = '';
        form.died = '';
    }
    form.characterId = id;
    onCharacterSelected(character);
    pickerCharacterId.value = null;
    step.value = 'form';
    nextTick(() => nameRef.value?.focus());
}

// Fills blanks from the character: name, born and died.
function onCharacterSelected(c) {
    if (editing.value || !c) return;
    const name = characterName(c);
    if (!form.name.trim() && name) form.name = name;
    const born = characterYear(c.Born);
    const died = characterYear(c.Died);
    if (isBlank(form.born) && born !== null) form.born = String(born);
    if (isBlank(form.died) && died !== null) form.died = String(died);
}

function close() {
    if (saving.value) return;
    dialogRef.value?.close();
}

async function openNested(slot, defaults, source) {
    nestedFor = slot;
    nestedMounted.value = true;
    await nextTick();
    nestedRef.value?.open({ defaults, source });
}

function parentDefaults(slot) {
    return { houseId: form.houseId || savedDefaults.value.houseId || '', gender: slot === 'father' ? 'male' : 'female' };
}

const startNewParent = (slot) => openNested(slot, parentDefaults(slot), 'new');
const startCharacterParent = (slot) => openNested(slot, parentDefaults(slot), 'character');

function onNestedSaved(person) {
    if (nestedFor && person?.id) {
        rememberPicked(person);
        if (nestedFor === 'father') form.fatherId = person.id;
        else form.motherId = person.id;
    }
    nestedFor = null;
}

function buildPayload() {
    const born = parseYear(form.born).year;
    const died = parseYear(form.died).year;
    const payload = {
        name: form.name.trim(),
        houseId: form.houseId || null,
        gender: form.gender,
        born,
        died,
        fatherId: form.fatherId || null,
        motherId: form.motherId || null,
        titles: form.titles
            .filter((t) => t.title.trim() || t.note.trim() || !isBlank(t.from) || !isBlank(t.to))
            .map((t) => ({
                title: t.title.trim(),
                from: parseYear(t.from).year,
                to: parseYear(t.to).year,
                note: t.note.trim() || null,
            })),
        causeOfDeath: form.causeOfDeath.trim() || null,
        notes: form.notes.trim() || null,
        bio: form.bio.trim() || null,
        characterId: form.characterId || null,
        barren: form.barren,
        barrenSince: form.barren ? parseYear(form.barrenSince).year : null,
        willNotMarry: form.willNotMarry,
        adopted: form.adopted,
        ancestry: enteredAncestry.value.length
            ? Object.fromEntries(enteredAncestry.value.map((r) => [r.race.trim(), Number(r.share)]))
            : null,
    };
    if (editing.value?.id) payload.id = editing.value.id;
    if (form.legitimate !== 'auto') payload.legitimate = form.legitimate === 'yes';
    if (canAddUnknownBastard.value && form.unknownBastard) {
        payload.hidden = true;
        payload.legitimate = false;
    }
    return payload;
}

async function save(another) {
    if (saving.value) return;
    bornTouched.value = true;
    if (hasYearError.value) {
        failure.value = { message: 'Fix the dates marked above first.' };
        return;
    }
    if (ancestryError.value) {
        failure.value = { message: ancestryError.value };
        return;
    }
    const payload = buildPayload();
    if (!payload.name && (editing.value || !payload.characterId)) {
        failure.value = { message: 'Enter a name.' };
        return;
    }
    if (!payload.houseId) {
        failure.value = { message: 'Choose a house.' };
        return;
    }

    saving.value = true;
    failure.value = null;
    let record;
    try {
        record = await dynastiesStore.savePerson(payload);
    } catch (e) {
        failure.value = saveFailure(dynastiesStore, e, 'The person was not saved.');
        saving.value = false;
        return;
    }
    saving.value = false;
    emit('saved', record);

    if (another && context.value?.role === 'child') {
        const keep = { houseId: form.houseId, fatherId: form.fatherId, motherId: form.motherId };
        const slot = anchorSlot.value;
        // The next sibling is a different person, so the character link never carries over.
        fill(null, { ...savedDefaults.value, ...keep, name: '', characterId: null });
        anchorSlot.value = slot;
        pickerCharacterId.value = null;
        step.value = startedFrom.value === 'new' ? 'form' : startedFrom.value;
        if (step.value === 'form') nextTick(() => nameRef.value?.focus());
        emit('saved-another');
        return;
    }
    dialogRef.value?.close();
}

defineExpose({ open });
</script>

<style scoped src="./dynastyDialog.css"></style>
<style scoped>
.step { display: flex; flex-direction: column; gap: 0.75em; }
.step-actions { display: flex; flex-wrap: wrap; gap: 0.5em; }
.back { align-self: flex-start; }
.flag-row { display: flex; flex-wrap: wrap; gap: 0.5em 1.25em; margin-bottom: 0.75em; }
.narrow { max-width: 12em; }
.ancestry-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 6.5em 2.5em;
    align-items: center;
    gap: 0.5em;
    margin-bottom: 0.5em;
}
.share { display: inline-flex; align-items: center; gap: 0.3em; }
.title-row {
    display: grid;
    grid-template-columns: 1fr 1fr 2.5em;
    gap: 0.4em;
    margin-bottom: 0.75em;
    padding-bottom: 0.75em;
    border-bottom: 1px dashed color-mix(in srgb, var(--theme-text) 15%, transparent);
}
.t-title, .t-note { grid-column: 1 / 3; }
.t-title { grid-row: 1; }
.title-row .remove-btn { grid-column: 3; grid-row: 1; }
.t-year { grid-row: 2; }
.t-note { grid-row: 3; }
.t-err { grid-column: 1 / -1; }
.remove-btn {
    width: 2.5em;
    height: 2.5em;
    padding: 0;
    border: 1px solid color-mix(in srgb, var(--theme-text) 20%, transparent);
    border-radius: 8px;
    background: transparent;
    color: var(--theme-text);
    font-size: 1.1rem;
    cursor: pointer;
}
.remove-btn:hover { border-color: var(--theme-danger, #e06c75); color: var(--theme-danger, #e06c75); }
.linked-character {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8em;
    padding: 0.5em 0.75em;
    border-left: 3px solid var(--theme-accent);
    border-radius: 0 8px 8px 0;
    background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
}

@media (min-width: 40em) {
    .title-row { grid-template-columns: minmax(0, 2fr) 6em 6em minmax(0, 2fr) 2.5em; }
    .t-title, .t-year, .t-note, .title-row .remove-btn { grid-column: auto; grid-row: auto; }
}
</style>
