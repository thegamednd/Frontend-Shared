<template>
    <div class="character-add" v-if="userStore.loaded">
        <div class="add-container">
            <h2 class="add-header">
                <span>Add New Character</span>
                <span class="header-actions">
                    <button @click="cancel" class="btn-cancel" title="Cancel">
                        <span class="material-symbols-outlined">cancel</span>
                    </button>
                    <button @click="save" ref="btnSave" class="btn-save" title="Save Character">
                        <span class="material-symbols-outlined">save</span>
                    </button>
                </span>
            </h2>

            <div class="member-add-content">
                <div class="member-add-form">
                <div class="form-section">
                    <h3>Basic Information</h3>
                    <div class="form-grid">
                        <div class="form-field">
                            <label for="name">Name <span class="required">*</span></label>
                            <input
                                ref="elName"
                                autocomplete="off"
                                type="text"
                                id="name"
                                v-model="characterData.Name"
                                maxlength="64"
                                required
                            />
                        </div>

                        <div class="form-field">
                            <label for="title">Title</label>
                            <input
                                autocomplete="off"
                                type="text"
                                id="title"
                                v-model="characterData.Title"
                                maxlength="64"
                            />
                        </div>

                        <div class="form-field">
                            <label for="pseudonym">Pseudonym</label>
                            <input
                                autocomplete="off"
                                type="text"
                                id="pseudonym"
                                v-model="characterData.Pseudonym"
                                maxlength="64"
                            />
                        </div>

                        <div class="form-field">
                            <label for="group">Group</label>
                            <VueMultiselect
                                v-model="characterGroup"
                                :options="characterGroups"
                                :multiple="false"
                                :close-on-select="true"
                                label="name"
                                track-by="name"
                                placeholder="Select a group"
                                class="custom-multiselect"
                            >
                                <template #option="{ option }">
                                    <div>{{ option.name }}</div>
                                </template>
                            </VueMultiselect>
                        </div>

                        <div class="form-field" v-if="characterGroup && characterGroup.name !== 'NPC'">
                            <label for="owner">Character Owner</label>
                            <VueMultiselect
                                v-model="characterOwner"
                                :options="realmStore.arAllRealmPlayers || []"
                                :multiple="false"
                                :close-on-select="true"
                                label="Name"
                                track-by="UserID"
                                placeholder="Select character owner"
                                class="custom-multiselect"
                            >
                                <template #option="{ option }">
                                    <div>{{ option.Name }}</div>
                                </template>
                            </VueMultiselect>
                        </div>

                        <div class="form-field" v-if="features.hasRaces">
                            <label for="races">Races</label>
                            <VueMultiselect
                                v-model="memberRaces"
                                :options="filteredRaceOptions"
                                :multiple="true"
                                :close-on-select="false"
                                label="RaceName"
                                track-by="ID"
                                placeholder="Select races"
                                class="custom-multiselect"
                            >
                                <template #option="{ option }">
                                    <div>{{ option.RaceName }}</div>
                                </template>
                            </VueMultiselect>
                        </div>

                        <div class="form-field" v-if="features.hasClasses">
                            <label for="classes">Classes</label>
                            <VueMultiselect
                                v-model="characterData.Classes"
                                :options="filteredClasses"
                                :multiple="true"
                                :close-on-select="false"
                                label="ClassName"
                                track-by="ClassName"
                                placeholder="Select classes"
                                class="custom-multiselect"
                            >
                                <template #option="{ option }">
                                    <div>{{ option.ClassName }}</div>
                                </template>
                            </VueMultiselect>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h3>Physical Information</h3>
                    <div class="form-grid">
                        <div class="form-field">
                            <label for="born">Born</label>
                            <input
                                autocomplete="off"
                                type="text"
                                id="born"
                                v-model="characterData.Born"
                                maxlength="64"
                            />
                        </div>

                        <div class="form-field">
                            <label for="died">Died</label>
                            <input
                                autocomplete="off"
                                type="text"
                                id="died"
                                v-model="characterData.Died"
                                maxlength="64"
                            />
                        </div>

                        <div class="form-field">
                            <label for="ethnicity">Ethnicity</label>
                            <input
                                autocomplete="off"
                                type="text"
                                id="ethnicity"
                                v-model="characterData.Ethnicity"
                                maxlength="64"
                            />
                        </div>

                        <div class="form-field">
                            <label for="eyes">Eyes</label>
                            <input
                                autocomplete="off"
                                type="text"
                                id="eyes"
                                v-model="characterData.Eyes"
                                maxlength="64"
                            />
                        </div>

                        <div class="form-field">
                            <label for="hair">Hair</label>
                            <input
                                autocomplete="off"
                                type="text"
                                id="hair"
                                v-model="characterData.Hair"
                                maxlength="64"
                            />
                        </div>

                        <div class="form-field">
                            <label for="height">Height</label>
                            <input
                                autocomplete="off"
                                type="text"
                                id="height"
                                v-model="characterData.Height"
                                maxlength="32"
                            />
                        </div>

                        <div class="form-field">
                            <label for="weight">Weight</label>
                            <input
                                autocomplete="off"
                                type="number"
                                id="weight"
                                v-model="characterData.Weight"
                                min="0"
                                class="weight-field"
                            />
                        </div>

                        <div class="form-field">
                            <label for="religion">Religion</label>
                            <input
                                autocomplete="off"
                                type="text"
                                id="religion"
                                v-model="characterData.Religion"
                                maxlength="64"
                            />
                        </div>
                    </div>
                </div>

                <div class="form-section" v-if="features.hasClasses">
                    <h3>Game Information</h3>
                    <div class="form-grid">
                        <div class="form-field">
                            <label for="level">Level</label>
                            <input
                                autocomplete="off"
                                type="number"
                                id="level"
                                v-model="characterData.Level"
                                min="1"
                                max="999"
                            />
                        </div>

                        <div class="form-field">
                            <label for="hp">Hit Points</label>
                            <input
                                autocomplete="off"
                                type="number"
                                id="hp"
                                v-model="characterData.HP"
                                min="1"
                                class="hp-field"
                            />
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h3>Character Image</h3>
                    <div class="image-upload-section">
                        <div
                            class="image-upload-area"
                            @click="triggerFileInput"
                            @drop="handleFileDrop"
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

                            <div v-if="!selectedFile && !characterData.Image" class="drag-drop-content">
                                <span class="material-symbols-outlined upload-icon">cloud_upload</span>
                                <p>Click to select or drag and drop an image</p>
                                <small>Recommended: 300px x 500px</small>
                            </div>

                            <div v-if="selectedFile || characterData.Image" class="selected-image">
                                <div class="image-preview">
                                    <img
                                        :src="selectedFileUrl || characterData.Image"
                                        :alt="characterData.Name || 'Character'"
                                        ref="elMemberImage"
                                    />
                                    <div class="image-overlay">
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

                        <div v-if="fileError" class="file-error">
                            {{ fileError }}
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h3>Biography</h3>
                    <div class="biography-section">
                        <InlineEditor
                            ref="editor"
                            v-model="characterData.Bio"
                            placeholder="Write the character's biography..."
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import VueMultiselect from 'vue-multiselect';
import 'vue-multiselect/dist/vue-multiselect.min.css';
import InlineEditor from '@shared/components/cms/InlineEditor.vue';
import { features } from '@shared/config/features';

import { useCharacterStore } from '@shared/stores/character';
import { useRealmStore } from '@shared/stores/realm';
import { useUserStore } from '@shared/stores/user';
import { useRouter } from 'vue-router';

const characterStore = useCharacterStore();
const userStore = useUserStore();
const realmStore = useRealmStore();

// Conditionally import gaming-system-specific stores (resolved in onMounted)
let classesStore = null;
let racesStore = null;
let accountStore = null;
const storesReady = ref(false);

const btnSave = ref(null);
const editor = ref(null);
const elFileUploader = ref(null);
const elMemberImage = ref(null);
const elName = ref(null);
const fileError = ref('');
const characterData = ref({
    Aura: {
        Code: null,
    },
    UserID: null,
    HP: 1,
    Level: 1,
    Group: '',
    Image: null,
});
const characterGroups = ref([{name: "Active"}, {name: "Archive"}, {name: "Deceased"}, {name: "Retired"}, {name: "NPC"}]);
const characterGroup = ref(null);
const characterOwner = ref(null);
const memberRaces = ref([]);
const characterClasses = ref([]);
const selectedFile = ref(null);
const router = useRouter();

onMounted(async () => {
    // Load gaming-system-specific stores before using them
    if (features.hasClasses) {
        try {
            const [classesModule, racesModule, accountModule] = await Promise.all([
                import('@/stores/classes'),
                import('@/stores/races'),
                import('@shared/stores/account')
            ]);
            classesStore = classesModule.useClassesStore();
            racesStore = racesModule.useRacesStore();
            accountStore = accountModule.useAccountStore();
            storesReady.value = true;
        } catch (e) {
            console.warn('Gaming system stores not available:', e);
        }
    }

    if (userStore.loaded) {
        characterData.value = Object.fromEntries(
            Object.entries(characterStore.default).map(([key, { val }]) => [key, val])
        );
        // Initialize stores (sets currentRealmId and loads data)
        if (racesStore && !racesStore.loaded) {
            await racesStore.init();
        }
        if (classesStore && !classesStore.loaded) {
            await classesStore.init();
        }
        if (classesStore) {
            characterClasses.value = classesStore.getSortedClasses;
        }
        characterData.value.RealmID = realmStore.activeRealmId;
        // Set default UserID to current user
        characterData.value.UserID = userStore.userSub;
        // Set default level to 1
        characterData.value.Level = 1;
    }
});

watch(() => characterGroup.value, (newVal) => {
    if (newVal) {
        characterData.value.Group = newVal.name;
    }
});

watch(() => characterOwner.value, (newVal) => {
    if (newVal) {
        characterData.value.UserID = newVal.UserID;
    } else {
        // Default to current user if no owner is explicitly selected
        characterData.value.UserID = userStore.userSub;
    }
});

if (features.hasRaces) {
    watch(() => memberRaces.value, (newVal) => {
        characterData.value.Races = newVal ? newVal.map((race) => race.RaceName) : [];
    });
}

if (features.hasClasses) {
    watch(storesReady, () => {
        if (classesStore) {
            watch(() => classesStore.getSortedClasses, (newVal) => {
                characterClasses.value = newVal;
            });
        }
    });
}

watch(() => realmStore.activeRealmId, (newVal) => {
    characterData.value.RealmID = newVal;
});

// Filter races by granular access
const filteredRaceOptions = computed(() => {
    if (!storesReady.value || !racesStore) return [];
    let races = racesStore.getSortedRaces;
    const gamingSystemId = realmStore.activeRealmRacesSystemId;
    if (gamingSystemId && accountStore) {
        const racesAccess = accountStore.access?.[gamingSystemId]?.Races;
        if (Array.isArray(racesAccess)) {
            races = races.filter(r => racesAccess.includes(r.ID) || r.RealmID);
        }
    }
    return races;
});

const filteredClasses = computed(() => {
    if (!storesReady.value || !classesStore) return [];
    const isWizard = (characterData.value.Classes || []).some((selectedClass) => {
        return selectedClass.IsWizard || selectedClass.MechanicsData?.IsWizard;
    });

    // Apply granular access filtering
    let baseClasses = characterClasses.value;
    const gamingSystemId = realmStore.activeRealmClassesSystemId;
    if (gamingSystemId && accountStore) {
        const classesAccess = accountStore.access?.[gamingSystemId]?.Classes;
        if (Array.isArray(classesAccess)) {
            baseClasses = baseClasses.filter(c => classesAccess.includes(c.ID) || c.RealmID);
        }
    }

    const selectedClassIds = (characterData.value.Classes || []).map(c => c.ID);

    // Build set of parent class names that have children (e.g., "Wizard")
    const parentNames = new Set(baseClasses.map(c => c.MechanicsData?.Parent).filter(Boolean));

    return baseClasses.filter((thisClass) => {
        // Filter out disabled classes
        if (thisClass.IsDisabled) {
            return false;
        }
        // Hide parent classes that have subclasses (e.g., "Wizard" when wizard subclasses exist)
        if (parentNames.has(thisClass.ClassName)) {
            return false;
        }
        // If a wizard class is already selected, hide other wizard classes (only one allowed)
        if (isWizard && (thisClass.IsWizard || thisClass.MechanicsData?.IsWizard) && !selectedClassIds.includes(thisClass.ID)) {
            return false;
        }
        return true;
    });
});


const selectedFileUrl = computed(() => {
    return selectedFile.value ? URL.createObjectURL(selectedFile.value) : '';
});

// Image handling methods
const triggerFileInput = () => {
    elFileUploader.value?.click();
};

const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) {
        validateAndSetFile(file);
    }
};

const handleFileDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
        validateAndSetFile(file);
    }
};

const resizeImageToTargetSize = (file) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = () => {
            // Set target dimensions
            const targetWidth = 300;
            const targetHeight = 500;

            canvas.width = targetWidth;
            canvas.height = targetHeight;

            // Stretch the image to fill the entire canvas (no aspect ratio preservation)
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

            // Convert to JPG blob
            canvas.toBlob((blob) => {
                if (blob) {
                    // Create a new File object with JPG name
                    const fileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
                    const resizedFile = new File([blob], fileName, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(resizedFile);
                } else {
                    reject(new Error('Failed to convert image to JPG'));
                }
            }, 'image/jpeg', 0.9); // 90% quality
        };

        img.onerror = () => {
            reject(new Error('Failed to load image for resizing'));
        };

        img.src = URL.createObjectURL(file);
    });
};

const validateAndSetFile = async (file) => {
    fileError.value = '';

    // Check file type
    if (!file.type.startsWith('image/')) {
        fileError.value = 'Please select an image file.';
        return;
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        fileError.value = 'File size must be less than 5MB.';
        return;
    }

    try {
        // Resize image to 300x500px and convert to JPG
        const resizedFile = await resizeImageToTargetSize(file);
        selectedFile.value = resizedFile;
    } catch (error) {
        fileError.value = 'Failed to process image: ' + error.message;
    }
};

const removeImage = () => {
    selectedFile.value = null;
    characterData.value.Image = null;
    if (elFileUploader.value) {
        elFileUploader.value.value = '';
    }
};

// Form actions
const save = async () => {
    try {
        // Validate required fields
        const errors = [];

        if (!characterData.value.Name?.trim()) {
            errors.push('name');
        }
        if (features.hasRaces && (!characterData.value.Races || !characterData.value.Races.length)) {
            errors.push('races');
        }
        if (features.hasClasses && (!characterData.value.Classes || !characterData.value.Classes.length)) {
            errors.push('classes');
        }
        if (features.hasClasses && !characterData.value.Born?.trim()) {
            errors.push('born');
        }
        if (!characterData.value.Group?.trim()) {
            errors.push('group');
        }

        if (errors.length) {
            const firstError = errors[0];
            const errorElement = document.getElementById(firstError);
            if (errorElement) {
                errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                errorElement.focus();
            }
            alert(`Please fill in all required fields. Missing: ${errors.join(', ')}`);
            return;
        }

        if (features.hasClasses && !selectedFile.value) {
            fileError.value = 'Please select an image.';
            return;
        }

        // Convert image to base64
        let imageBase64 = null;
        let imageType = null;

        if (selectedFile.value) {
            imageBase64 = await fileToBase64(selectedFile.value);
            imageType = selectedFile.value.type;
        }

        // Prepare character data for API using existing format
        const payload = {
            ...characterData.value,
            imageBase64: imageBase64,
            imageType: imageType,
            imageFilename: selectedFile.value?.name || null
        };

        console.log('Saving character...', payload);

        // Use existing postMember method
        const result = await characterStore.postMember(payload);

        if (result) {
            console.log('Character saved successfully');
            router.push('/gallery');
        } else {
            alert('Failed to create character. Please try again.');
        }
    } catch (error) {
        console.error('Error saving character:', error);
        alert('An error occurred while saving the character. Please try again.');
    }
};

// Helper function to convert file to base64
const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Remove the data:image/jpeg;base64, prefix
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const cancel = () => {
    if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
        router.push('/gallery');
    }
};
</script>

<style scoped>
.character-add {
  height: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 8px;
  color: #ffffff;
}

.add-container {
  height: 100%;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 2rem;
}

.add-header {
  width: 100%;
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid var(--theme-accent);
  border-radius: 0.3em;
  padding: 0.8em 1em;
  margin: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--theme-accent);
  font-size: 1.2em;
  font-weight: 600;
  text-shadow: 1px 1px 2px color-mix(in srgb, var(--theme-bg-primary) 50%, transparent);
  box-sizing: border-box;
}

.add-header > span:first-child {
  flex: 1;
}

.header-actions {
  display: flex;
  gap: 0.5em;
  margin-left: auto;
}

.btn-save,
.btn-cancel {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  border: 1px solid var(--theme-accent);
  border-radius: 0.3em;
  padding: 0.4em 0.8em;
  font-size: 0.9em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 40px;
}

.btn-save:hover:not(:disabled),
.btn-cancel:hover:not(:disabled) {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-1px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
}

.btn-save:disabled,
.btn-cancel:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-save .material-symbols-outlined,
.btn-cancel .material-symbols-outlined {
  font-size: 18px;
  pointer-events: none;
}

.member-add-content {
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.5rem;
  display: flex;
  justify-content: center;
}

.member-add-form {
    width: 100%;
    max-width: 800px;
    display: flex;
    flex-direction: column;
    gap: 2em;
}

.form-section {
    background: color-mix(in srgb, var(--theme-bg-surface) 30%, transparent);
    border: 1px solid #444;
    border-radius: 0.5em;
    padding: 1.5em;
}

.form-section h3 {
    color: var(--theme-accent);
    margin: 0 0 1em 0;
    font-size: 1.3em;
    border-bottom: 1px solid var(--theme-accent);
    padding-bottom: 0.5em;
}

.form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1em;
}

.form-field {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
}

.form-field label {
    color: var(--theme-accent);
    font-weight: 600;
    font-size: 0.9em;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.required {
    color: #ff6b6b;
}

.form-field input {
    background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
    color: #ffffff;
    border: 1px solid #444;
    border-radius: 0.3em;
    padding: 0.6em 1em;
    font-size: 1em;
    transition: all 0.2s ease;
}

.form-field input:focus {
    outline: none;
    border-color: var(--theme-accent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.weight-field {
    width: 6em;
}

.hp-field {
    width: 5em;
}

/* Vue Multiselect Styling */
.custom-multiselect {
    --ms-font-size: 1em;
    --ms-line-height: 1.4;
    --ms-bg: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
    --ms-bg-disabled: #2a3a5a;
    --ms-border-color: #444;
    --ms-border-width: 1px;
    --ms-border-color-active: var(--theme-accent);
    --ms-border-radius: 0.3em;
    --ms-py: 0.6em;
    --ms-px: 1em;
    --ms-ring-width: 2px;
    --ms-ring-color: color-mix(in srgb, var(--theme-accent) 30%, transparent);
    --ms-placeholder-color: #888;
    --ms-max-height: 10rem;
    --ms-spinner-color: var(--theme-accent);
    --ms-caret-color: var(--theme-accent);
    --ms-clear-color: var(--theme-accent);
    --ms-clear-color-hover: #e6b373;
    --ms-tag-font-size: 0.9em;
    --ms-tag-line-height: 1.4;
    --ms-tag-font-weight: 600;
    --ms-tag-bg: var(--theme-accent);
    --ms-tag-bg-disabled: #666;
    --ms-tag-color: var(--theme-bg-surface);
    --ms-tag-color-disabled: #ffffff;
    --ms-tag-radius: 0.3em;
    --ms-tag-py: 0.3em;
    --ms-tag-px: 0.6em;
    --ms-tag-my: 0.125em;
    --ms-tag-mx: 0.25em;
    --ms-option-font-size: 1em;
    --ms-option-line-height: 1.4;
    --ms-option-bg-pointed: #3a4a6a;
    --ms-option-bg-selected: var(--theme-accent);
    --ms-option-bg-disabled: #2a3a5a;
    --ms-option-bg-selected-pointed: #e6b373;
    --ms-option-bg-selected-disabled: #666;
    --ms-option-color-pointed: #ffffff;
    --ms-option-color-selected: var(--theme-bg-surface);
    --ms-option-color-disabled: #666;
    --ms-option-color-selected-pointed: var(--theme-bg-surface);
    --ms-option-color-selected-disabled: #ffffff;
    --ms-option-py: 0.6em;
    --ms-option-px: 1em;
    --ms-empty-color: #888;
}


.image-upload-section {
    width: 100%;
}

.image-upload-area {
    border: 2px dashed #8b4513;
    border-radius: 6px;
    padding: 1rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    background: rgba(139, 69, 19, 0.1);
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.image-upload-area:hover {
    border-color: #ffd700;
    background: rgba(255, 215, 0, 0.1);
}

.drag-drop-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: #ffd700;
}

.upload-icon {
    font-size: 3rem;
    opacity: 0.7;
}

.drag-drop-content p {
    margin: 0;
    font-size: 1rem;
    font-weight: 500;
    color: #ffd700;
}

.drag-drop-content small {
    color: #ccc;
    font-size: 0.8rem;
}

.selected-image {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}

.image-preview {
    position: relative;
    max-width: 300px;
    max-height: 400px;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.image-preview img {
    width: 100%;
    height: auto;
    display: block;
    max-height: 400px;
    object-fit: cover;
}

.image-overlay {
    position: absolute;
    top: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 0 0 0 6px;
}

.remove-image-btn {
    background: rgba(255, 107, 107, 0.9);
    color: white;
    border: none;
    padding: 0.5rem;
    cursor: pointer;
    border-radius: 0 0 0 6px;
    transition: background-color 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}

.remove-image-btn:hover {
    background: rgba(255, 107, 107, 1);
}

.remove-image-btn .material-symbols-outlined {
    font-size: 1.2rem;
}

.file-error {
    color: #ff6b6b;
    background: rgba(255, 107, 107, 0.1);
    border: 1px solid rgba(255, 107, 107, 0.3);
    border-radius: 4px;
    padding: 0.75rem;
    margin-top: 1rem;
    font-size: 0.9rem;
}

.biography-section {
    min-height: 200px;
}

/* Field hints and validation */
.field-hint {
    color: #888;
    font-size: 0.8rem;
    font-style: italic;
    margin-top: 0.25rem;
    display: block;
}


/* Disabled field styling */
input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: rgba(255, 255, 255, 0.1);
}

/* Responsive design */
@media (max-width: 768px) {
    .character-add {
        padding: 1rem;
        height: 100%;
    }

    .add-container {
        height: 100%;
    }

    .add-header {
        flex-direction: column;
        gap: 1em;
        text-align: center;
        font-size: 1rem;
    }

    .header-actions {
        justify-content: center;
        margin-left: 0;
    }

    .form-grid {
        grid-template-columns: 1fr;
    }

    .member-add-form {
        max-width: none;
    }
}
</style>
