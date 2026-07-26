<template>
    <div id="factionForm">
        <header>
            <h2>{{ isEdit ? 'Edit Faction' : 'Add Faction' }}</h2>
        </header>

        <div v-if="loadFailed" class="load-failed">
            <h3>Faction unavailable</h3>
            <p>This faction could not be loaded, so editing is unavailable until it does. Nothing has been changed.</p>
            <router-link :to="{ name: 'Factions' }">Back to factions</router-link>
        </div>

        <template v-else>
            <p v-if="!isEdit && !realmStore.isPaidTier" class="upgrade-notice">
                Factions are a paid feature. Upgrade your realm to create new factions. Existing factions stay editable.
            </p>

            <form @submit.prevent="save">
                <div class="form-section">
                    <h3>Details</h3>

                    <div class="form-field">
                        <label for="factionName">Name *</label>
                        <input id="factionName" name="name" type="text" v-model="form.Name" required maxlength="128" />
                    </div>

                    <div class="form-field">
                        <label for="factionBrief">Brief description</label>
                        <textarea id="factionBrief" name="brief" rows="2" v-model="form.BriefDescription" maxlength="256"></textarea>
                        <small class="field-help">Shown in the factions list.</small>
                    </div>

                    <div class="form-field">
                        <label>Description</label>
                        <InlineEditor v-model="form.Description" placeholder="Describe the faction's history, goals and reputation..." />
                        <small class="field-help">Shown on the faction's own page.</small>
                    </div>

                    <div class="form-field">
                        <label class="known-toggle">
                            <input type="checkbox" v-model="form.Known" />
                            Known to players
                        </label>
                        <small class="field-help">Unchecked hides the faction from players entirely.</small>
                    </div>
                </div>

                <div class="form-section">
                    <h3>Faction Image</h3>
                    <div class="image-upload-section">
                        <div
                            class="image-upload-area"
                            @click="triggerFileInput"
                            @drop.prevent="handleFileDrop"
                            @dragover.prevent
                            @dragenter.prevent
                        >
                            <input
                                type="file"
                                ref="elFileUploader"
                                @change="handleFileSelect"
                                accept="image/*"
                                style="display: none;"
                            />

                            <div v-if="!form.Image" class="drag-drop-content">
                                <span class="material-symbols-outlined upload-icon">cloud_upload</span>
                                <p>{{ isUploading ? 'Uploading...' : 'Click to select or drag and drop an image' }}</p>
                                <small>Square works best. Larger images are resized to 300x300.</small>
                            </div>

                            <div v-else class="selected-image">
                                <div class="image-preview">
                                    <img :src="form.Image" :alt="form.Name || 'Faction'" />
                                    <div v-if="isUploading" class="image-uploading-overlay">
                                        <span class="material-symbols-outlined spin">progress_activity</span>
                                        <span>Uploading...</span>
                                    </div>
                                    <div v-else class="image-overlay">
                                        <button
                                            @click.stop="removeImage"
                                            class="remove-image-btn"
                                            type="button"
                                            title="Remove Image"
                                        >
                                            <span class="material-symbols-outlined">delete</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div v-if="fileError" class="file-error">{{ fileError }}</div>
                    </div>
                </div>

                <div v-if="saveError" class="save-error">{{ saveError }}</div>

                <div class="form-actions">
                    <button v-if="isEdit" type="button" class="delete-faction-btn" @click="remove">
                        {{ confirmingDelete ? 'Confirm delete?' : 'Delete' }}
                    </button>
                    <span class="spacer"></span>
                    <button type="button" class="cancel-btn" @click="cancel">Cancel</button>
                    <button type="submit" :disabled="!canSave">{{ isSaving ? 'Saving...' : 'Save' }}</button>
                </div>
            </form>
        </template>
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import InlineEditor from '@shared/components/cms/InlineEditor.vue';
import { useFactionStore } from '@shared/stores/faction';
import { useRealmStore } from '@shared/stores/realm';
import { useNotifications } from '@shared/composables/useNotifications';

const router = useRouter();
const route = useRoute();
const factionStore = useFactionStore();
const realmStore = useRealmStore();
const { notifyInfo } = useNotifications();

const factionId = computed(() => route.params.id || null);
const isEdit = computed(() => !!factionId.value);

const form = ref({ Name: '', BriefDescription: '', Description: '', Image: null, Known: true });
const elFileUploader = ref(null);
const fileError = ref('');
const saveError = ref('');
const isUploading = ref(false);
const isSaving = ref(false);
const confirmingDelete = ref(false);
const loadFailed = ref(false);

// Free tier may edit an existing faction but may not create a new one. The
// server enforces this; the disabled button just avoids a pointless round trip.
const canSave = computed(() =>
    !loadFailed.value && !!form.value.Name.trim() && !isSaving.value && !isUploading.value &&
    (isEdit.value || realmStore.isPaidTier)
);

onMounted(async () => {
    if (!isEdit.value) return;
    // Force a fresh load rather than trusting a possibly-stale or
    // partially-populated store — otherwise a transient earlier failure
    // could produce a false "not found" here.
    await factionStore.loadFactions(true);
    const faction = factionStore.getFactionById(factionId.value);
    if (!faction) {
        loadFailed.value = true;
        return;
    }
    form.value = {
        Name: faction.Name || '',
        BriefDescription: faction.BriefDescription || '',
        Description: faction.Description || '',
        Image: faction.Image || null,
        Known: faction.Known !== false,
    };
});

function triggerFileInput() {
    elFileUploader.value?.click();
}

function handleFileDrop(event) {
    const file = event.dataTransfer?.files?.[0];
    if (file) processFile(file);
}

function handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (file) processFile(file);
}

async function processFile(file) {
    fileError.value = '';
    if (!file.type.startsWith('image/')) {
        fileError.value = 'Please select an image file.';
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        fileError.value = 'File size must be less than 5MB.';
        return;
    }
    isUploading.value = true;
    try {
        form.value.Image = await factionStore.uploadFactionImage(file);
    } catch (error) {
        fileError.value = 'Failed to upload image. Please try again.';
        console.error('Faction image upload failed:', error);
    } finally {
        isUploading.value = false;
    }
}

function removeImage() {
    form.value.Image = null;
    if (elFileUploader.value) elFileUploader.value.value = '';
}

// Maps a failed save's response status to actionable copy. A 403 means the
// realm genuinely isn't entitled (paywall); a 503 means we couldn't even
// check entitlement (transient) and must not be read as a paywall.
function describeSaveError(error) {
    const status = error?.response?.status;
    if (status === 403) return 'Factions are a paid feature. Upgrade your realm to create new factions.';
    if (status === 503) return 'Could not verify your realm subscription. Please try again in a moment.';
    return 'Failed to save faction. Please try again.';
}

async function save() {
    if (loadFailed.value) return;
    if (!canSave.value) {
        if (!isEdit.value && !realmStore.isPaidTier) {
            notifyInfo('Factions are a paid feature. Upgrade your realm to create new factions.');
        }
        return;
    }
    isSaving.value = true;
    saveError.value = '';
    try {
        // An explicit null clears the image server-side; undefined would leave it.
        const payload = { ...form.value, Image: form.value.Image || null };
        if (isEdit.value) await factionStore.updateFaction(factionId.value, payload);
        else await factionStore.createFaction(payload);
        router.push({ name: 'Factions' });
    } catch (error) {
        console.error('Failed to save faction:', error);
        saveError.value = describeSaveError(error);
    } finally {
        isSaving.value = false;
    }
}

async function remove() {
    if (loadFailed.value) return;
    if (!confirmingDelete.value) {
        confirmingDelete.value = true;
        setTimeout(() => { confirmingDelete.value = false; }, 4000);
        return;
    }
    saveError.value = '';
    try {
        await factionStore.deleteFaction(factionId.value);
        router.push({ name: 'Factions' });
    } catch (error) {
        console.error('Failed to delete faction:', error);
        saveError.value = 'Failed to delete faction. Please try again.';
        confirmingDelete.value = false;
    }
}

function cancel() {
    router.push({ name: 'Factions' });
}
</script>

<style scoped>
#factionForm { max-width: 900px; margin: 0 auto; padding: 1em; }
#factionForm header h2 { margin-bottom: 0.75em; }

.upgrade-notice {
    padding: 0.75em 0.9em;
    margin-bottom: 1em;
    border-left: 3px solid #d8a657;
    border-radius: 0 8px 8px 0;
    background: color-mix(in srgb, #d8a657 8%, transparent);
}

.load-failed { text-align: center; padding: 3em 1em; }
.load-failed h3 { margin: 0 0 0.5em; }
.load-failed p { margin: 0 0 1em; color: color-mix(in srgb, var(--theme-text) 65%, transparent); }
.load-failed a { color: var(--theme-accent); }

.form-section {
    margin-bottom: 1.5em;
    padding: 1em;
    border-radius: 12px;
    background: color-mix(in srgb, var(--theme-bg-surface) 50%, transparent);
    border: 1px solid color-mix(in srgb, var(--theme-text) 15%, transparent);
}

.form-section h3 {
    margin: 0 0 0.75em;
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: var(--theme-accent);
}

.form-field { display: flex; flex-direction: column; gap: 0.3em; margin-bottom: 1em; }
.form-field:last-child { margin-bottom: 0; }
.form-field label { font-size: 0.9em; }

.form-field input[type="text"],
.form-field textarea {
    background: color-mix(in srgb, var(--theme-bg-surface) 50%, transparent);
    border: 1px solid color-mix(in srgb, var(--theme-text) 20%, transparent);
    border-radius: 8px;
    padding: 0.6em;
    color: var(--theme-text);
    font: inherit;
}

.form-field input[type="text"]:focus-visible,
.form-field textarea:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: 1px; }

.field-help { color: color-mix(in srgb, var(--theme-text) 55%, transparent); font-size: 0.8em; }
.known-toggle { flex-direction: row; display: flex; align-items: center; gap: 0.5em; }

.image-upload-area {
    border: 2px dashed color-mix(in srgb, var(--theme-text) 25%, transparent);
    border-radius: 12px;
    padding: 1.5em;
    text-align: center;
    cursor: pointer;
}
.image-upload-area:hover { border-color: var(--theme-accent); }
.upload-icon { font-size: 2.5rem; color: var(--theme-accent); }
.drag-drop-content p { margin: 0.4em 0 0.2em; }
.drag-drop-content small { color: color-mix(in srgb, var(--theme-text) 55%, transparent); }

.image-preview { position: relative; display: inline-block; }
.image-preview img { max-width: 300px; width: 100%; border-radius: 8px; display: block; }
.image-overlay { position: absolute; top: 0.4em; right: 0.4em; }
.remove-image-btn {
    display: flex; align-items: center; justify-content: center;
    background: rgb(0 0 0 / 0.7); color: #ef4444;
    border: 1px solid #ef4444; border-radius: 50%;
    width: 36px; height: 36px; cursor: pointer;
}
.file-error { color: #ef4444; margin-top: 0.5em; font-size: 0.9em; }

.image-uploading-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.4em;
    background: rgb(0 0 0 / 0.6);
    color: #fff;
    border-radius: 8px;
    font-size: 0.85em;
}
.image-uploading-overlay .material-symbols-outlined { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.save-error { color: #ef4444; margin-bottom: 0.75em; font-size: 0.9em; }

.form-actions { display: flex; gap: 0.6em; align-items: center; flex-wrap: wrap; }
.form-actions .spacer { flex: 1; }
.form-actions button {
    padding: 0.6em 1.1em; border-radius: 8px; cursor: pointer; font: inherit;
    background: transparent;
    border: 1px solid color-mix(in srgb, var(--theme-text) 25%, transparent);
    color: var(--theme-text);
}
.form-actions button[type="submit"] { border-color: var(--theme-accent); }
.form-actions button:disabled { opacity: 0.5; cursor: not-allowed; }
.delete-faction-btn { border-color: #ef4444 !important; color: #ef4444 !important; }

@media (min-width: 40em) {
    #factionForm { padding: 1.5em; }
    .form-section { padding: 1.25em; }
}
</style>
