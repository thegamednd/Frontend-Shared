<template>
    <dialog ref="dialogRef" class="dyn-dialog house-dialog" aria-labelledby="house-dialog-title" @cancel.prevent="close">
        <div class="dyn-layout">
            <div class="dyn-header">
                <h3 id="house-dialog-title">{{ editing ? `Edit ${editing.name}` : 'Add a house' }}</h3>
                <button type="button" class="dyn-close" aria-label="Close" @click="close">&times;</button>
            </div>

            <div class="dyn-body">
                <form id="house-edit-form" novalidate @submit.prevent="save">
                    <div class="field">
                        <label for="hf-name">Name *</label>
                        <input id="hf-name" ref="nameRef" v-model="form.name" type="text" maxlength="80" required autocomplete="off" />
                    </div>
                    <div class="field">
                        <label for="hf-desc">Description</label>
                        <textarea id="hf-desc" v-model="form.description" rows="4"></textarea>
                    </div>

                    <div class="sigil-field">
                        <img v-if="sigilShown" class="sigil-preview" :src="form.sigil" alt="" @error="sigilBroken = true" />
                        <span v-else class="sigil-preview placeholder" aria-hidden="true">{{ initial }}</span>
                        <div class="field sigil-input">
                            <label for="hf-sigil">Sigil image URL</label>
                            <input
                                id="hf-sigil"
                                v-model="form.sigil"
                                type="url"
                                inputmode="url"
                                maxlength="500"
                                autocomplete="off"
                                placeholder="https://"
                                @input="sigilBroken = false"
                            />
                            <p class="hint">Paste a link to an image. Leave it blank to show the house's initial.</p>
                        </div>
                    </div>

                    <div v-if="editing && people.length" class="field">
                        <label for="hf-founder-id">Founder</label>
                        <select id="hf-founder-id" v-model="founderId">
                            <option value="">None</option>
                            <option v-if="founderId && !people.some((p) => p.id === founderId)" :value="founderId">
                                Current founder (from another house)
                            </option>
                            <option v-for="p in people" :key="p.id" :value="p.id">{{ p.name }}</option>
                        </select>
                    </div>

                    <fieldset v-if="!editing" class="group">
                        <legend>Founder</legend>
                        <div class="choices">
                            <label v-for="c in founderChoices" :key="c.value" class="choice" :class="{ on: founderMode === c.value }">
                                <input v-model="founderMode" type="radio" name="founder-mode" :value="c.value" />
                                {{ c.label }}
                            </label>
                        </div>
                        <CharacterPicker v-if="founderMode === 'character'" v-model="founderCharacterId" />
                        <div v-else-if="founderMode === 'new'" class="pair">
                            <div class="field">
                                <label for="hf-founder">Name</label>
                                <input id="hf-founder" v-model="founderName" type="text" autocomplete="off" />
                            </div>
                            <div class="field">
                                <label for="hf-founder-born">Born</label>
                                <div class="year-row">
                                    <input id="hf-founder-born" v-model="founderBorn" type="text" inputmode="numeric" autocomplete="off" />
                                    <span class="abbr">{{ abbr }}</span>
                                </div>
                                <p v-if="founderBornError" class="field-error">{{ founderBornError }}</p>
                            </div>
                        </div>
                        <p v-if="founderMode === 'character'" class="hint">
                            If the character has no birth year, add one to their sheet first, or start from a new person.
                        </p>
                    </fieldset>

                    <p v-if="failure" class="save-error" role="alert">
                        {{ failure.message }}
                        <a v-if="failure.upgrade" :href="upgradeHref" target="_blank" rel="noopener">See upgrade options</a>
                    </p>
                </form>
            </div>

            <div class="dyn-footer">
                <span class="spacer"></span>
                <button type="button" class="btn" :disabled="saving" @click="close">Cancel</button>
                <button type="submit" form="house-edit-form" class="btn btn-primary" :disabled="saving">
                    {{ saving ? 'Saving…' : 'Save' }}
                </button>
            </div>
        </div>
    </dialog>
</template>

<script setup>
import { computed, nextTick, reactive, ref } from 'vue';
import { useDynastiesStore } from '@shared/stores/dynasties';
import { useRealmStore } from '@shared/stores/realm';
import { toSignedYear } from '@shared/utils/dynastyYears';
import { saveFailure, upgradeUrl } from '@shared/utils/dynastyErrors';

const upgradeHref = upgradeUrl();
import CharacterPicker from './CharacterPicker.vue';

const emit = defineEmits(['saved']);
const dynastiesStore = useDynastiesStore();
const realmStore = useRealmStore();
const abbr = computed(() => realmStore.activeRealm?.DateSuffix?.Abbr || 'SF');

const dialogRef = ref(null);
const nameRef = ref(null);
const editing = ref(null);
const saving = ref(false);
const failure = ref(null);
const sigilBroken = ref(false);
const form = reactive({ name: '', description: '', sigil: '' });

const initial = computed(() => (form.name || '?').trim().charAt(0).toUpperCase() || '?');
const sigilShown = computed(() => /^https?:\/\/\S+$/i.test(form.sigil.trim()) && !sigilBroken.value);

const founderMode = ref('none');
const founderCharacterId = ref(null);
const founderName = ref('');
const founderBorn = ref('');
// Edit mode: the house's people to choose a founder from, and the choice.
const people = ref([]);
const founderId = ref('');
// Kept across a failed save so Save can be retried without duplicates.
let createdHouse = null;
let createdPerson = null;

const founderChoices = [
    { value: 'none', label: 'None' },
    { value: 'character', label: 'From a character' },
    { value: 'new', label: 'New person' },
];

const founderBornError = computed(() => {
    try {
        toSignedYear(founderBorn.value);
        return '';
    } catch (e) {
        return e.message;
    }
});

/** Opens the dialog to add a house, or to edit `house` (with its people for the founder list). */
function open(house = null, housePeople = null) {
    editing.value = house;
    people.value = Array.isArray(housePeople) ? housePeople : [];
    founderId.value = house?.founderId || '';
    form.name = house?.name || '';
    form.description = house?.description || '';
    form.sigil = house?.sigil || '';
    sigilBroken.value = false;
    founderMode.value = 'none';
    founderCharacterId.value = null;
    founderName.value = '';
    founderBorn.value = '';
    failure.value = null;
    saving.value = false;
    createdHouse = null;
    createdPerson = null;
    dialogRef.value?.showModal();
    nextTick(() => nameRef.value?.focus());
}

function close() {
    if (saving.value) return;
    dialogRef.value?.close();
}

async function save() {
    if (saving.value) return;
    const name = form.name.trim();
    if (!name) {
        failure.value = { message: 'Give the house a name.' };
        return;
    }
    const sigil = form.sigil.trim();
    if (sigil && !/^https?:\/\/\S+$/i.test(sigil)) {
        failure.value = { message: 'The sigil needs to be a web link starting with http:// or https://.' };
        return;
    }
    const wantsCharacter = founderMode.value === 'character';
    const wantsNew = founderMode.value === 'new';
    if (wantsCharacter && !founderCharacterId.value) {
        failure.value = { message: 'Pick a character, or choose None.' };
        return;
    }
    if (wantsNew && !founderName.value.trim()) {
        failure.value = { message: "Enter the founder's name, or choose None." };
        return;
    }
    if (wantsNew && (founderBornError.value || !founderBorn.value.trim())) {
        failure.value = { message: founderBornError.value || 'Enter the year the founder was born.' };
        return;
    }

    saving.value = true;
    failure.value = null;
    const payload = { name, description: form.description.trim() || null, sigil: sigil || null };
    try {
        if (editing.value) {
            createdHouse = await dynastiesStore.saveHouse({
                ...payload,
                id: editing.value.id,
                founderId: people.value.length ? founderId.value || null : editing.value.founderId || null,
            });
        } else {
            // Steps done on an earlier attempt are kept, so a retry resumes
            // instead of creating a second house or person.
            if (!createdHouse) createdHouse = await dynastiesStore.saveHouse(payload);
            if (wantsCharacter || wantsNew) {
                if (!createdPerson) {
                    createdPerson = await dynastiesStore.savePerson(
                        wantsCharacter
                            ? { houseId: createdHouse.id, characterId: founderCharacterId.value }
                            : {
                                  name: founderName.value.trim(),
                                  houseId: createdHouse.id,
                                  gender: 'unknown',
                                  born: toSignedYear(founderBorn.value),
                              }
                    );
                }
                createdHouse = await dynastiesStore.saveHouse({ ...payload, id: createdHouse.id, founderId: createdPerson.id });
            }
        }
        emit('saved', createdHouse);
        dialogRef.value?.close();
    } catch (e) {
        failure.value = saveFailure(dynastiesStore, e, 'The house was not saved.');
    } finally {
        saving.value = false;
    }
}

defineExpose({ open });
</script>

<style scoped src="./dynastyDialog.css"></style>
<style scoped>
.sigil-field { display: flex; align-items: flex-start; gap: 0.9em; }
.sigil-input { flex: 1; }
.sigil-preview {
    flex: none;
    width: 4.5em;
    height: 4.5em;
    margin-top: 1.4em;
    border-radius: 10px;
    object-fit: contain;
    background: color-mix(in srgb, var(--theme-bg-primary, #000) 40%, transparent);
    border: 1px solid color-mix(in srgb, var(--theme-text) 18%, transparent);
}
.sigil-preview.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--theme-font-display, inherit);
    font-size: 2rem;
    color: var(--theme-accent);
}
</style>
