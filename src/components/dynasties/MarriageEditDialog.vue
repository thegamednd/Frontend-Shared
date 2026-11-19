<template>
    <dialog ref="dialogRef" class="dyn-dialog marriage-dialog" aria-labelledby="marriage-dialog-title" @cancel.prevent="close">
        <div class="dyn-layout">
            <div class="dyn-header">
                <h3 id="marriage-dialog-title">{{ heading }}</h3>
                <button type="button" class="dyn-close" aria-label="Close" @click="close">&times;</button>
            </div>

            <div class="dyn-body">
                <form id="marriage-edit-form" novalidate @submit.prevent="save">
                    <div class="field">
                        <PersonSourceField
                            v-model="spouseId"
                            :model-label="labels[spouseId] || ''"
                            label="Spouse *"
                            :exclude-ids="[anchor?.id]"
                            @picked="useSpouse"
                            @new-person="openSpouseForm('new')"
                            @from-character="openSpouseForm('character')"
                        />
                    </div>

                    <fieldset class="group">
                        <legend>Dates</legend>
                        <div v-for="f in yearFields" :key="f.key" class="field">
                            <label :for="`mf-${f.key}`">{{ f.label }}</label>
                            <div class="year-row">
                                <input
                                    :id="`mf-${f.key}`"
                                    v-model="form[f.key]"
                                    type="text"
                                    inputmode="numeric"
                                    autocomplete="off"
                                    :aria-invalid="!!errors[f.key]"
                                />
                                <span class="abbr">{{ abbr }}</span>
                                <label class="check">
                                    <input v-model="form[f.approx]" type="checkbox" />
                                    approx.
                                </label>
                            </div>
                            <p v-if="errors[f.key]" class="field-error">{{ errors[f.key] }}</p>
                        </div>
                        <p class="hint">Leave a year blank if nobody knows it.</p>
                    </fieldset>

                    <div class="pair">
                        <div class="field">
                            <label for="mf-reason">How it ended</label>
                            <select id="mf-reason" v-model="form.endReason">
                                <option value="">Still married</option>
                                <option v-for="(text, value) in END_REASON_LABELS" :key="value" :value="value">{{ text }}</option>
                            </select>
                        </div>
                        <div class="field">
                            <label for="mf-order">Order</label>
                            <input id="mf-order" v-model="form.order" type="number" step="1" inputmode="numeric" />
                        </div>
                    </div>

                    <div class="field">
                        <label for="mf-endnote">End note</label>
                        <input id="mf-endnote" v-model="form.endNote" type="text" autocomplete="off" />
                    </div>

                    <div class="field">
                        <label for="mf-notes">Notes</label>
                        <textarea id="mf-notes" v-model="form.notes" rows="3"></textarea>
                    </div>

                    <p v-if="confirmDelete" class="confirm-delete" role="alert">
                        Delete this marriage? The children keep both parents. Only the marriage record goes.
                    </p>

                    <p v-if="failure" class="save-error" role="alert">
                        {{ failure.message }}
                        <a v-if="failure.upgrade" :href="upgradeHref" target="_blank" rel="noopener">See upgrade options</a>
                    </p>
                </form>
            </div>

            <div class="dyn-footer">
                <template v-if="editing">
                    <button
                        v-if="!confirmDelete"
                        type="button"
                        class="btn btn-danger"
                        :disabled="saving || deleting"
                        @click="confirmDelete = true"
                    >
                        Delete marriage
                    </button>
                    <template v-else>
                        <button type="button" class="btn btn-danger" :disabled="deleting" @click="doDelete">
                            {{ deleting ? 'Deleting…' : 'Yes, delete it' }}
                        </button>
                        <button type="button" class="btn" :disabled="deleting" @click="confirmDelete = false">Keep it</button>
                    </template>
                </template>
                <span class="spacer"></span>
                <button type="button" class="btn" :disabled="saving" @click="close">Cancel</button>
                <button type="submit" form="marriage-edit-form" class="btn btn-primary" :disabled="saving || hasYearError">
                    {{ saving ? 'Saving…' : 'Save' }}
                </button>
            </div>
        </div>

        <PersonEditDialog ref="personDialogRef" @saved="onNewSpouse" />
    </dialog>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { useDynastiesStore } from '@shared/stores/dynasties';
import { useRealmStore } from '@shared/stores/realm';
import { toSignedYear } from '@shared/utils/dynastyYears';
import { END_REASON_LABELS } from '@shared/utils/dynastyLabels';
import { saveFailure, upgradeUrl } from '@shared/utils/dynastyErrors';

const upgradeHref = upgradeUrl();
import PersonSourceField from './PersonSourceField.vue';
import PersonEditDialog from './PersonEditDialog.vue';

const emit = defineEmits(['saved', 'deleted']);
const dynastiesStore = useDynastiesStore();
const realmStore = useRealmStore();
const abbr = computed(() => realmStore.activeRealm?.DateSuffix?.Abbr || 'SF');

const yearFields = [
    { key: 'from', approx: 'fromApprox', label: 'Married' },
    { key: 'to', approx: 'toApprox', label: 'Ended' },
];

const dialogRef = ref(null);
const personDialogRef = ref(null);
const editing = ref(null);
const anchor = ref(null);
const spouseId = ref(null);
const labels = ref({});
const saving = ref(false);
const deleting = ref(false);
const confirmDelete = ref(false);
const failure = ref(null);

const form = reactive({
    from: '',
    to: '',
    fromApprox: false,
    toApprox: false,
    endReason: '',
    endNote: '',
    notes: '',
    order: '',
});

const heading = computed(() => {
    const name = anchor.value?.name;
    if (editing.value) return name ? `Edit ${name}'s marriage` : 'Edit marriage';
    return name ? `Add a spouse for ${name}` : 'Add a spouse';
});

function parseYear(input) {
    try {
        return { year: toSignedYear(input) };
    } catch (e) {
        return { error: e.message, year: null };
    }
}

const errors = computed(() => {
    const from = parseYear(form.from);
    const to = parseYear(form.to);
    let toError = to.error || '';
    if (!toError && from.year !== null && to.year !== null && to.year < from.year) {
        toError = 'A marriage cannot end before it starts.';
    }
    return { from: from.error || '', to: toError };
});

const hasYearError = computed(() => !!errors.value.from || !!errors.value.to);
const text = (y) => (y === null || y === undefined ? '' : String(y));

/** Opens the dialog for a new marriage of `anchor`, or to edit `marriage`. */
function open({ marriage = null, anchor: who, labels: names = {} } = {}) {
    editing.value = marriage;
    anchor.value = who || null;
    const id = who?.id;
    spouseId.value = marriage
        ? marriage.spouseId || (marriage.personA === id ? marriage.personB : marriage.personA) || null
        : null;
    labels.value = {};
    Object.entries(names || {}).forEach(([pid, name]) => {
        if (pid && name) labels.value[pid] = name;
    });
    if (marriage?.spouse?.id && marriage.spouse.name) labels.value[marriage.spouse.id] = marriage.spouse.name;
    form.from = text(marriage?.from);
    form.to = text(marriage?.to);
    form.fromApprox = !!marriage?.fromApprox;
    form.toApprox = !!marriage?.toApprox;
    form.endReason = marriage?.endReason || '';
    form.endNote = marriage?.endNote || '';
    form.notes = marriage?.notes || '';
    form.order = marriage?.order ?? '';
    failure.value = null;
    saving.value = false;
    deleting.value = false;
    confirmDelete.value = false;
    dialogRef.value?.showModal();
}

function close() {
    if (saving.value || deleting.value) return;
    dialogRef.value?.close();
}

function useSpouse(person) {
    labels.value = { ...labels.value, [person.id]: person.name };
    spouseId.value = person.id;
}

function openSpouseForm(source) {
    personDialogRef.value?.open({
        defaults: { houseId: anchor.value?.houseId },
        context: { anchor: anchor.value, role: 'spouse', partners: [] },
        source,
    });
}

function onNewSpouse(person) {
    if (person?.id) useSpouse(person);
}

function buildPayload() {
    const from = parseYear(form.from).year;
    const to = parseYear(form.to).year;
    const payload = {
        personA: anchor.value?.id,
        personB: spouseId.value,
        from,
        to,
        fromApprox: from !== null && form.fromApprox,
        toApprox: to !== null && form.toApprox,
        endNote: form.endNote.trim() || null,
        notes: form.notes.trim() || null,
    };
    if (editing.value?.id) payload.id = editing.value.id;
    if (form.endReason) payload.endReason = form.endReason;
    if (form.order !== '' && form.order !== null) payload.order = Number(form.order);
    return payload;
}

async function save() {
    if (saving.value || hasYearError.value) return;
    if (!spouseId.value) {
        failure.value = { message: 'Choose a spouse.' };
        return;
    }
    if (form.endReason && form.endReason !== 'death' && parseYear(form.to).year === null) {
        failure.value = { message: 'Enter the year it ended, or set it back to Still married.' };
        return;
    }
    saving.value = true;
    failure.value = null;
    try {
        const record = await dynastiesStore.saveMarriage(buildPayload());
        saving.value = false;
        emit('saved', record);
        dialogRef.value?.close();
    } catch (e) {
        failure.value = saveFailure(dynastiesStore, e, 'The marriage was not saved.');
    } finally {
        saving.value = false;
    }
}

async function doDelete() {
    if (!editing.value || deleting.value) return;
    deleting.value = true;
    failure.value = null;
    try {
        await dynastiesStore.deleteMarriage(editing.value.id);
        deleting.value = false;
        confirmDelete.value = false;
        emit('deleted');
        dialogRef.value?.close();
    } catch (e) {
        confirmDelete.value = false;
        failure.value = saveFailure(dynastiesStore, e, 'The marriage was not deleted.');
    } finally {
        deleting.value = false;
    }
}

defineExpose({ open });
</script>

<style scoped src="./dynastyDialog.css"></style>
<style scoped>
.confirm-delete {
    margin: 0.5em 0 0;
    padding: 0.6em 0.8em;
    border-left: 3px solid var(--theme-danger, #e06c75);
    border-radius: 0 8px 8px 0;
    background: color-mix(in srgb, var(--theme-danger, #e06c75) 10%, transparent);
}
</style>
