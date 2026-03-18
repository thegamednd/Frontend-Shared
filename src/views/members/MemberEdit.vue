<template>
  <div class="character-edit">
    <div class="edit-container">
      <h2 class="edit-header">
        <span>Edit Character</span>
        <span class="header-actions">
          <button
            type="button"
            @click="showDeleteDialog"
            :disabled="loading"
            class="btn-delete"
            title="Delete Character - This cannot be undone"
          >
            <span class="material-symbols-outlined">delete</span>
          </button>
          <button
            type="button"
            @click="cancelEdit"
            :disabled="loading"
            class="btn-cancel"
            title="Cancel"
          >
            <span class="material-symbols-outlined">cancel</span>
          </button>
          <button
            type="button"
            @click="saveCharacter"
            :disabled="loading || !isFormValid"
            class="btn-save"
            title="Save"
          >
            <span class="material-symbols-outlined">save</span>
          </button>
        </span>
      </h2>

      <div v-if="error" class="error-banner">
        <span class="material-symbols-outlined">error</span>
        {{ error }}
      </div>

      <div v-if="loading" class="loading-banner">
        <span class="material-symbols-outlined loading-spinner">refresh</span>
        {{ loading ? (character.ID ? 'Saving character...' : 'Loading character...') : '' }}
      </div>

      <div class="member-edit-content">
        <div class="member-edit-form">
          <div class="form-section">
          <h3>Basic Information</h3>
          <div class="form-grid">
            <div class="form-field">
              <label for="name">Name <span class="required">*</span></label>
              <input
                id="name"
                v-model="character.Name"
                type="text"
                required
                :disabled="loading"
                maxlength="64"
              />
            </div>

            <div class="form-field">
              <label for="title">Title</label>
              <input
                id="title"
                v-model="character.Title"
                type="text"
                :disabled="loading"
                maxlength="64"
              />
            </div>

            <div class="form-field">
              <label for="pseudonym">Pseudonym</label>
              <input
                id="pseudonym"
                v-model="character.Pseudonym"
                type="text"
                :disabled="loading"
                maxlength="64"
              />
            </div>

            <div class="form-field">
              <label for="group">Group</label>
              <VueMultiselect
                v-model="character.Group"
                :options="characterStore.arSortedGroups || []"
                :multiple="false"
                label="Name"
                track-by="Name"
                placeholder="Select a group..."
                :disabled="loading"
                class="custom-multiselect"
              >
                <template #option="{ option }">
                  <div>{{ option.Name }}</div>
                </template>
              </VueMultiselect>
            </div>

            <div class="form-field" v-if="character.Group && character.Group.Name !== 'NPC'">
              <label for="owner">Character Owner</label>
              <VueMultiselect
                v-model="selectedOwner"
                :options="ownerOptions"
                :multiple="false"
                label="Name"
                track-by="UserID"
                placeholder="Select character owner..."
                :disabled="loading"
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
                v-model="character.Races"
                :options="filteredRaceOptions"
                :multiple="true"
                :close-on-select="false"
                label="RaceName"
                track-by="ID"
                placeholder="Select races..."
                :disabled="loading"
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
                v-model="character.Classes"
                :options="availableClasses"
                :multiple="true"
                :close-on-select="false"
                label="ClassName"
                track-by="ID"
                placeholder="Select classes..."
                :disabled="loading"
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
                id="born"
                v-model="character.Born"
                type="text"
                :disabled="loading"
                maxlength="64"
              />
            </div>

            <div class="form-field">
              <label for="died">Died</label>
              <input
                id="died"
                v-model="character.Died"
                type="text"
                :disabled="loading"
                maxlength="64"
              />
            </div>

            <div class="form-field">
              <label for="ethnicity">Ethnicity</label>
              <input
                id="ethnicity"
                v-model="character.Ethnicity"
                type="text"
                :disabled="loading"
                maxlength="64"
              />
            </div>

            <div class="form-field">
              <label for="eyes">Eyes</label>
              <input
                id="eyes"
                v-model="character.Eyes"
                type="text"
                :disabled="loading"
                maxlength="64"
              />
            </div>

            <div class="form-field">
              <label for="hair">Hair</label>
              <input
                id="hair"
                v-model="character.Hair"
                type="text"
                :disabled="loading"
                maxlength="64"
              />
            </div>

            <div class="form-field">
              <label for="height">Height</label>
              <input
                id="height"
                v-model="character.Height"
                type="text"
                :disabled="loading"
                maxlength="32"
              />
            </div>

            <div class="form-field">
              <label for="weight">Weight</label>
              <input
                id="weight"
                v-model.number="character.Weight"
                type="number"
                :disabled="loading"
                min="0"
                class="weight-field"
              />
            </div>

            <div class="form-field">
              <label for="religion">Religion</label>
              <input
                id="religion"
                v-model="character.Religion"
                type="text"
                :disabled="loading"
                maxlength="64"
              />
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3>Character Image</h3>
          <div class="image-upload-section">
            <div
              class="image-upload-area"
              @dragover.prevent
              @click="handleImageSelect"
              @drop="handleImageDrop"
              :class="{ 'drag-over': isDragOver }"
              @dragenter.prevent="isDragOver = true"
              @dragleave.prevent="isDragOver = false"
            >
              <input
                type="file"
                ref="imageInput"
                @change="handleImageChange"
                accept="image/*"
                style="display: none"
              />

              <div v-if="!selectedImage && !existingImageUrl" class="drag-drop-content">
                <span class="material-symbols-outlined upload-icon">cloud_upload</span>
                <p>Click to select or drag and drop an image</p>
                <small>Recommended: 300px × 500px</small>
              </div>

              <div v-if="selectedImage || existingImageUrl" class="selected-image">
                <div class="image-preview">
                  <img
                    :src="selectedImageUrl || existingImageUrl"
                    alt="Character Image"
                    @load="onImageLoad"
                  />
                  <div class="image-overlay">
                    <button
                      type="button"
                      @click.stop="removeImage"
                      class="remove-image-btn"
                      title="Remove image"
                    >
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="imageError" class="file-error">
              {{ imageError }}
            </div>
          </div>
        </div>

        <div class="form-section" v-if="features.hasClasses">
          <h3>Game Information</h3>
          <div class="form-grid">
            <div class="form-field">
              <label for="level">Level</label>
              <input
                id="level"
                v-model.number="character.Level"
                type="number"
                min="1"
                max="999"
                :disabled="loading"
              />
            </div>

            <div class="form-field">
              <label for="hp">Hit Points</label>
              <input
                id="hp"
                v-model.number="character.HP"
                type="number"
                min="1"
                :disabled="loading"
                class="hp-field"
              />
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3>Biography</h3>
          <div class="biography-section">
            <InlineEditor
              ref="bioEditor"
              v-model="character.Bio"
              placeholder="Write the character's biography..."
              :disabled="loading"
            />
          </div>
        </div>
      </div>
    </div>
  </div>

    <!-- Delete Character Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="closeDeleteDialog">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>
            <span class="material-symbols-outlined">warning</span>
            Delete Character
          </h3>
          <button @click="closeDeleteDialog" class="close-btn">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="modal-body">
          <div class="delete-warning">
            <div class="warning-icon">
              <span class="material-symbols-outlined">delete_forever</span>
            </div>
            <div class="warning-content">
              <p><strong>This action cannot be undone!</strong></p>
              <p>You are about to permanently delete the character <strong>{{ character.Name || 'Unknown' }}</strong>.</p>
              <p>This will:</p>
              <ul>
                <li>Remove the character from the database</li>
                <li>Delete the character's image from storage</li>
                <li>Remove all associated data</li>
              </ul>
            </div>
          </div>

          <div class="confirmation-section">
            <label class="confirmation-checkbox">
              <input
                type="checkbox"
                v-model="deleteConfirmed"
                :disabled="deleting"
              />
              <span class="checkbox-text">
                I understand this action cannot be undone
              </span>
            </label>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closeDeleteDialog" class="btn-cancel" :disabled="deleting">
            <span class="material-symbols-outlined">close</span>
            Cancel
          </button>
          <button
            @click="confirmDelete"
            class="btn-delete-confirm"
            :disabled="!deleteConfirmed || deleting"
          >
            <span v-if="deleting" class="material-symbols-outlined loading">hourglass_empty</span>
            <span v-else class="material-symbols-outlined">delete_forever</span>
            {{ deleting ? 'Deleting...' : 'Delete Character' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCharacterStore } from '@shared/stores/character';
import { useRealmStore } from '@shared/stores/realm';
import { useUserStore } from '@shared/stores/user';
import { features } from '@shared/config/features';
import VueMultiselect from 'vue-multiselect';
import 'vue-multiselect/dist/vue-multiselect.min.css';
import InlineEditor from '@shared/components/cms/InlineEditor.vue';

const route = useRoute();
const router = useRouter();
const characterStore = useCharacterStore();
const realmStore = useRealmStore();
const userStore = useUserStore();
const imagesCdnUrl = import.meta.env.VITE_IMAGES_CDN_URL;

// Conditionally initialize classes/races/account stores
let classesStore = null;
let racesStore = null;
let accountStoreForAccess = null;
if (features.hasClasses) {
  const [classesModule, racesModule, accountModule] = await Promise.all([
    import(/* @vite-ignore */ '@/stores/classes'),
    import(/* @vite-ignore */ '@/stores/races'),
    import('@shared/stores/account')
  ]);
  classesStore = classesModule.useClassesStore();
  racesStore = racesModule.useRacesStore();
  accountStoreForAccess = accountModule.useAccountStore();
} else if (features.hasRaces) {
  const [racesModule, accountModule] = await Promise.all([
    import(/* @vite-ignore */ '@/stores/races'),
    import('@shared/stores/account')
  ]);
  racesStore = racesModule.useRacesStore();
  accountStoreForAccess = accountModule.useAccountStore();
}

const loading = ref(false);
const error = ref(null);

// Image upload related refs
const imageInput = ref(null);
const imageUploader = ref(null);
const selectedImage = ref(null);
const imageError = ref('');
const isDragOver = ref(false);

// Bio editor ref
const bioEditor = ref(null);

// Delete modal state
const showDeleteModal = ref(false);
const deleteConfirmed = ref(false);
const deleting = ref(false);

// Reactive character object for editing
const character = reactive({
  ID: null,
  Name: '',
  Pseudonym: '',
  Title: '',
  Bio: '',
  Height: '',
  Weight: null,
  Eyes: '',
  Hair: '',
  Ethnicity: '',
  Level: 1,
  HP: 1,
  Classes: [],
  Races: [],
  Group: null,
  Religion: '',
  Born: null,
  Died: null,
  Image: null,
  UserID: null
});

const isFormValid = computed(() => {
  return character.Name && character.Name.trim().length > 0;
});

const selectedImageUrl = computed(() => {
  return selectedImage.value ? URL.createObjectURL(selectedImage.value) : null;
});

const existingImageUrl = computed(() => {
  return character.Image ? `${imagesCdnUrl}/${character.Image}` : null;
});

const ownerOptions = computed(() => {
  const noneOption = { Name: 'None', UserID: null };
  const players = (realmStore.arAllRealmPlayers || []).map(player => ({
    ...player,
    // Override Name with full name if we have both first and last name
    Name: (player.NameFirst && player.NameLast)
      ? `${player.NameFirst} ${player.NameLast}`
      : player.NameFirst || player.Name || 'Unknown'
  }));
  return [noneOption, ...players];
});

// Computed property to get the owner object for the multiselect
const selectedOwner = computed({
  get() {
    if (!character.UserID) {
      return { Name: 'None', UserID: null };
    }
    const owner = realmStore.arAllRealmPlayers?.find(player => player.UserID === character.UserID);
    return owner || { Name: 'None', UserID: null };
  },
  set(newOwner) {
    if (newOwner && newOwner.UserID !== null) {
      character.UserID = newOwner.UserID;
    } else {
      character.UserID = null;
    }
  }
});

// Computed property to filter out disabled classes
const availableClasses = computed(() => {
  if (!classesStore) return [];
  let allClasses = classesStore.getSortedClasses || [];
  // Filter by granular access
  const gamingSystemId = realmStore.activeRealmClassesSystemId;
  if (gamingSystemId && accountStoreForAccess) {
    const classesAccess = accountStoreForAccess.access?.[gamingSystemId]?.Classes;
    if (Array.isArray(classesAccess)) {
      allClasses = allClasses.filter(c => classesAccess.includes(c.ID) || c.RealmID);
    }
  }
  return allClasses.filter(classItem => !classItem.IsDisabled);
});

const filteredRaceOptions = computed(() => {
  if (!racesStore) return [];
  let races = racesStore.getSortedRaces || [];
  const gamingSystemId = realmStore.activeRealmRacesSystemId;
  if (gamingSystemId && accountStoreForAccess) {
    const racesAccess = accountStoreForAccess.access?.[gamingSystemId]?.Races;
    if (Array.isArray(racesAccess)) {
      races = races.filter(r => racesAccess.includes(r.ID) || r.RealmID);
    }
  }
  return races;
});

// Note: Level can now be set for both living and deceased characters

onMounted(async () => {
  try {
    const characterId = route.params.id;
    if (!characterId) {
      error.value = 'No character ID provided';
      router.push('/gallery');
      return;
    }

    // Ensure character store is initialized
    if (!characterStore.loaded) {
      console.log('Character store not loaded, loading now...');
      if (userStore.activeRealmId) {
        await characterStore.loadCharactersForActiveRealm();
      } else {
        console.warn('No active realm - cannot load characters for editing');
        router.push('/gallery');
        return;
      }
    }

    await loadCharacter(characterId);
  } catch (err) {
    console.error('Error in onMounted:', err);
    error.value = 'Failed to initialize character editor';
  }
});

// Delete methods
const showDeleteDialog = () => {
  showDeleteModal.value = true;
  deleteConfirmed.value = false;
};

const closeDeleteDialog = () => {
  showDeleteModal.value = false;
  deleteConfirmed.value = false;
  deleting.value = false;
};

const confirmDelete = async () => {
  if (!deleteConfirmed.value || deleting.value) return;

  deleting.value = true;

  try {
    // Call character store delete method
    await characterStore.deleteCharacter(character.ID);

    console.log('Character deleted successfully:', character.ID);

    // Navigate back to gallery after successful deletion
    router.push('/gallery');

  } catch (error) {
    console.error('Error deleting character:', error);
    // Show user-friendly error message
    if (error.response?.status === 403) {
      alert('You do not have permission to delete this character.');
    } else if (error.response?.status === 404) {
      alert('Character not found or already deleted.');
    } else {
      alert('Failed to delete character. Please try again.');
    }
    deleting.value = false;
  }
};

const loadCharacter = async (characterId) => {
  try {
    loading.value = true;
    error.value = null;

    // Ensure character store has loaded its basic data
    if (!characterStore.loaded) {
      if (userStore.activeRealmId) {
        await characterStore.loadCharactersForActiveRealm();
      } else {
        console.warn('No active realm - cannot load characters');
        error.value = 'No active realm set - cannot load characters';
        return;
      }
    }

    // Load races from races store if available
    if (racesStore) {
      await racesStore.loadRaces();
    }

    // Get character from store or fetch if not available
    let characterData = characterStore.characters[characterId];

    // Also try looking by ID field if not found by id
    if (!characterData) {
      characterData = characterStore.characterList.find(char =>
        (char.ID && char.ID === characterId) ||
        (char.id && char.id === characterId)
      );
    }

    if (!characterData) {
      console.log('Character not found');
      error.value = 'Character not found';
      router.push('/gallery');
      return;
    }

    // Reset form to defaults first
    Object.assign(character, {
      ID: null,
      Name: '',
      Pseudonym: '',
      Title: '',
      Bio: '',
      Height: '',
      Weight: null,
      Eyes: '',
      Hair: '',
      Ethnicity: '',
      Level: 1,
      HP: 1,
      Classes: [],
      Races: [],
      Group: null,
      Religion: '',
      Born: null,
      Died: null,
      Image: null,
      UserID: null
    });

    // Simple direct mapping - try both upper and lower case
    character.Name = characterData.Name || characterData.name || '';
    character.Pseudonym = characterData.Pseudonym || characterData.pseudonym || '';
    character.Title = characterData.Title || characterData.title || '';
    character.Bio = characterData.Bio || characterData.bio || '';
    character.Height = String(characterData.Height || characterData.height || '');
    character.Weight = characterData.Weight || characterData.weight || null;
    character.Eyes = characterData.Eyes || characterData.eyes || '';
    character.Hair = characterData.Hair || characterData.hair || '';
    character.Ethnicity = characterData.Ethnicity || characterData.ethnicity || '';
    character.Level = characterData.Level || characterData.level || 1;
    character.HP = characterData.HP || characterData.hp || 1;
    character.Religion = characterData.Religion || characterData.religion || '';
    character.Image = characterData.Image || characterData.image || null;

    // Handle born/died (might be strings or numbers)
    if (characterData.Born || characterData.born) {
      const bornValue = characterData.Born || characterData.born;
      character.Born = typeof bornValue === 'string' ? parseInt(bornValue, 10) : bornValue;
    }

    if (characterData.Died || characterData.died) {
      const diedValue = characterData.Died || characterData.died;
      character.Died = typeof diedValue === 'string' ? parseInt(diedValue, 10) : diedValue;
    }

    // Helper function to parse DynamoDB format
    const parseDynamoDBValue = (value) => {
      if (!value) return null;

      // Handle DynamoDB types
      if (typeof value === 'object') {
        if (value.S) return value.S; // String
        if (value.N) return parseFloat(value.N); // Number
        if (value.BOOL !== undefined) return value.BOOL; // Boolean
        if (value.L) return value.L.map(item => parseDynamoDBValue(item)); // List
        if (value.M) {
          // Map - convert to regular object
          const obj = {};
          for (const [key, val] of Object.entries(value.M)) {
            obj[key] = parseDynamoDBValue(val);
          }
          return obj;
        }
      }

      // Return as-is if not DynamoDB format
      return value;
    };

    // Handle classes (stored as array of class IDs)
    if (features.hasClasses && classesStore) {
      const classesData = characterData.Classes || characterData.classes || [];
      if (Array.isArray(classesData)) {
        character.Classes = classesData
          .map(classItem => {
            const parsed = parseDynamoDBValue(classItem);

            // Handle different formats
            if (typeof parsed === 'string') {
              // ID format (new): "class-uuid-123"
              // Try to find by ID first
              let classObj = classesStore.getSortedClasses?.find(cls => cls.ID === parsed);

              // Fallback: Legacy format - class name string
              if (!classObj) {
                classObj = classesStore.getSortedClasses?.find(cls => cls.ClassName === parsed);
              }

              return classObj || { ID: parsed, ClassName: parsed };
            } else if (parsed && typeof parsed === 'object' && parsed.ID) {
              // Object format with ID
              const classObj = classesStore.getSortedClasses?.find(cls => cls.ID === parsed.ID);
              return classObj || parsed;
            } else if (parsed && typeof parsed === 'object' && parsed.ClassName) {
              // Legacy object format with ClassName only
              const classObj = classesStore.getSortedClasses?.find(cls => cls.ClassName === parsed.ClassName);
              return classObj || parsed;
            }

            return null;
          })
          .filter(item => item !== null);
      }
    }

    // Handle races - use races store instead of character store
    if (features.hasRaces && racesStore) {
      const racesData = characterData.Races || characterData.races || [];
      if (Array.isArray(racesData)) {
        character.Races = racesData
          .map(raceItem => {
            const parsed = parseDynamoDBValue(raceItem);

            // Handle different formats
            if (typeof parsed === 'string') {
              // Simple string format: "Human" - find by RaceName
              const raceObj = racesStore.getSortedRaces?.find(race => race.RaceName === parsed);
              return raceObj || { ID: parsed, RaceName: parsed };
            } else if (parsed && typeof parsed === 'object' && parsed.RaceName) {
              // Object format with RaceName (new format)
              const raceObj = racesStore.getSortedRaces?.find(race => race.RaceName === parsed.RaceName);
              return raceObj || { ID: parsed.ID, RaceName: parsed.RaceName };
            } else if (parsed && typeof parsed === 'object' && parsed.name) {
              // Object format with name (legacy format)
              const raceObj = racesStore.getSortedRaces?.find(race => race.RaceName === parsed.name);
              return raceObj || { ID: parsed.name, RaceName: parsed.name };
            }

            return null;
          })
          .filter(item => item !== null);
      }
    }

    // Handle group
    const groupData = characterData.Group || characterData.group;
    if (groupData && typeof groupData === 'string') {
      // Single group string
      const groupObj = characterStore.arSortedGroups?.find(grp => grp.Name === groupData);
      character.Group = groupObj || { Name: groupData };
    } else if (Array.isArray(groupData) && groupData.length > 0) {
      // Legacy array format - take the first item
      const firstGroup = groupData[0];
      const groupObj = characterStore.arSortedGroups?.find(grp => grp.Name === firstGroup);
      character.Group = groupObj || { Name: firstGroup };
    } else {
      character.Group = null;
    }

    // Handle UserID (character owner)
    character.UserID = characterData.UserID || characterData.userID || null;

    character.ID = characterId || characterData.ID || characterData.id;

  } catch (err) {
    console.error('Error loading character:', err);
    error.value = 'Failed to load character data';
  } finally {
    loading.value = false;
  }
};

// Image handling functions
const handleImageSelect = () => {
  if (!loading.value) {
    imageInput.value.click();
  }
};

const handleImageDrop = (event) => {
  event.preventDefault();
  isDragOver.value = false;

  if (loading.value) return;

  const file = event.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    handleImageFile(file);
  } else {
    imageError.value = 'Please select a valid image file.';
  }
};

const handleImageChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    handleImageFile(file);
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

const handleImageFile = async (file) => {
  try {
    imageError.value = '';

    // Basic file validation
    if (!file.type.startsWith('image/')) {
      throw new Error('Please select a valid image file.');
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('Image file must be smaller than 5MB.');
    }

    // Resize image to 300x500px and convert to JPG
    const resizedFile = await resizeImageToTargetSize(file);
    selectedImage.value = resizedFile;

  } catch (error) {
    imageError.value = error.message;
    selectedImage.value = null;
  }
};

const removeImage = () => {
  selectedImage.value = null;
  character.imageUrl = null;
  imageError.value = '';
  if (imageInput.value) {
    imageInput.value.value = '';
  }
};

const onImageLoad = () => {
  // Image loaded successfully
  imageError.value = '';
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]); // Remove data:image/...;base64, prefix
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const saveCharacter = async () => {
  if (!isFormValid.value) {
    error.value = 'Please provide a character name';
    return;
  }

  try {
    loading.value = true;
    error.value = null;

    // Prepare update data with proper field mapping
    const updates = {};

    // Map basic fields back to API format
    const reverseFieldMapping = {
      'Name': 'Name',
      'Pseudonym': 'Pseudonym',
      'Title': 'Title',
      'Bio': 'Bio',
      'Height': 'Height',
      'Weight': 'Weight',
      'Eyes': 'Eyes',
      'Hair': 'Hair',
      'Ethnicity': 'Ethnicity',
      'Level': 'Level',
      'HP': 'HP',
      'Religion': 'Religion',
      'Born': 'Born',
      'Died': 'Died'
    };

    // Map basic fields with type safety
    Object.entries(reverseFieldMapping).forEach(([formKey, apiKey]) => {
      const value = character[formKey];
      if (value !== null && value !== undefined && value !== '') {
        // Special handling for numeric fields
        if (['Weight', 'Level', 'HP', 'Born', 'Died'].includes(apiKey)) {
          const numValue = Number(value);
          if (!isNaN(numValue)) {
            updates[apiKey] = numValue;
          }
        } else {
          // String fields (including Height)
          updates[apiKey] = String(value);
        }
      }
    });

    // Convert classes back to array of class IDs
    if (features.hasClasses) {
      if (character.Classes && Array.isArray(character.Classes)) {
        updates.Classes = character.Classes
          .filter(classObj => classObj && (classObj.ID || classObj)) // Remove empty/null values
          .map(classObj => {
            // Handle both object format and string format
            return typeof classObj === 'string' ? classObj : classObj.ID;
          })
          .filter(classId => classId && (typeof classId === 'string' ? classId.trim() : true)); // Remove any empty strings
      } else {
        updates.Classes = [];
      }
    }

    // Convert races back to array of strings (use RaceName from races store)
    if (features.hasRaces) {
      if (character.Races && Array.isArray(character.Races)) {
        updates.Races = character.Races
          .filter(raceObj => raceObj && (raceObj.RaceName || raceObj)) // Remove empty/null values
          .map(raceObj => {
            // Handle both object format and string format
            return typeof raceObj === 'string' ? raceObj : raceObj.RaceName;
          })
          .filter(raceName => raceName && (typeof raceName === 'string' ? raceName.trim() : true)); // Remove any empty strings
      } else {
        updates.Races = [];
      }
    }

    // Convert group back to string
    if (character.Group && character.Group.Name) {
      updates.Group = character.Group.Name;
    } else if (typeof character.Group === 'string') {
      updates.Group = character.Group;
    }

    // Set UserID directly
    updates.UserID = character.UserID;

    // Handle image upload if new image selected
    if (selectedImage.value) {
      try {
        const imageBase64 = await fileToBase64(selectedImage.value);
        updates.imageBase64 = imageBase64;
        updates.imageFilename = selectedImage.value.name;
        updates.imageType = selectedImage.value.type;
      } catch (imageError) {
        console.error('Error processing image:', imageError);
        error.value = 'Failed to process image. Please try again.';
        return;
      }
    }

    console.log('Saving character updates:', updates);
    console.log('UserID being sent:', updates.UserID);
    console.log('Character UserID:', character.UserID);

    const response = await characterStore.updateCharacter(character.ID, updates);

    // Clear the selected image since it's been uploaded
    selectedImage.value = null;
    if (imageInput.value) {
      imageInput.value.value = '';
    }

    // Refresh the character data to get the updated image URL
    setTimeout(async () => {
      try {
        if (userStore.activeRealmId) {
          await characterStore.loadCharactersForActiveRealm();
          // Reload the character data
          await loadCharacter(character.ID);
        }
      } catch (err) {
        console.warn('Could not refresh character data:', err);
      }
    }, 1000); // Give the backend a moment to process the image

    // Navigate back to member view using the character's own ID
    router.push(`/gallery/${character.ID}`);

  } catch (err) {
    console.error('Error saving character:', err);
    error.value = err.response?.data?.message || err.message || 'Failed to save character';
  } finally {
    loading.value = false;
  }
};

const cancelEdit = () => {
  // Navigate back to member view using the character's own ID
  router.push(`/gallery/${character.ID}`);
};

</script>

<style scoped>
.character-edit {
  height: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 8px;
  color: #ffffff;
}

.edit-container {
  height: 100%;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 2rem;
}

.edit-container h2 {
  color: #ffd700;
  text-align: center;
  margin: 0;
  font-size: 2rem;
}

.edit-header {
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

.edit-header > span:first-child {
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

.btn-delete {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  color: white;
  border: 2px solid #dc3545;
  border-radius: 0.375rem;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-right: 0.5rem;
}

.btn-delete:hover:not(:disabled) {
  background: linear-gradient(135deg, #c82333 0%, #a71e2a 100%);
  border-color: #c82333;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3);
}

.btn-delete:disabled {
  background: #6c757d;
  border-color: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

.btn-delete .material-symbols-outlined {
  font-size: 18px;
  pointer-events: none;
}

.error-banner {
  background: rgba(220, 53, 69, 0.9);
  color: white;
  padding: 0.8rem 1rem;
  border-radius: 0.3rem;
  border: 1px solid #dc3545;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-weight: 500;
}

.error-banner .material-symbols-outlined {
  font-size: 20px;
}

.loading-banner {
  background: rgba(13, 110, 253, 0.9);
  color: white;
  padding: 0.8rem 1rem;
  border-radius: 0.3rem;
  border: 1px solid #0d6efd;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-weight: 500;
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.member-edit-content {
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.5rem;
  display: flex;
  justify-content: center;
}

.member-edit-form {
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

.form-field input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: rgba(255, 255, 255, 0.1);
}

.weight-field {
    width: 6em;
}

.hp-field {
    width: 5em;
}

.biography-section {
    min-height: 200px;
}

/* Image uploader styles */
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

.image-upload-area.drag-over {
    border-color: #ffd700;
    background: rgba(255, 215, 0, 0.2);
    transform: scale(1.02);
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

@media (max-width: 768px) {
  .character-edit {
    padding: 1rem;
    height: 100%;
  }

  .edit-container {
    height: 100%;
  }

  .edit-header {
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

  .member-edit-form {
    max-width: none;
  }

  .image-upload-area {
    min-height: 150px;
    padding: 0.75rem;
  }

  .upload-icon {
    font-size: 2rem;
  }

  .image-preview {
    max-width: 250px;
    max-height: 300px;
  }
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

/* Delete Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid #dc3545;
  border-radius: 1rem;
  padding: 0;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #444;
}

.modal-header h3 {
  margin: 0;
  color: #dc3545;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.close-btn {
  background: transparent;
  border: none;
  color: #ccc;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: color 0.2s ease;
}

.close-btn:hover {
  color: #dc3545;
}

.modal-body {
  padding: 1.5rem;
}

.delete-warning {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.warning-icon {
  color: #dc3545;
  margin-top: 0.25rem;
  font-size: 2rem;
}

.warning-content {
  flex: 1;
}

.warning-content p {
  margin: 0 0 1rem 0;
  color: var(--theme-text-primary);
  line-height: 1.5;
}

.warning-content strong {
  color: #dc3545;
}

.warning-content ul {
  margin: 0.5rem 0;
  padding-left: 1.25rem;
  color: var(--theme-text-primary);
}

.warning-content li {
  margin-bottom: 0.25rem;
}

.confirmation-section {
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.3);
  border-radius: 0.5rem;
  padding: 1rem;
}

.confirmation-checkbox {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  user-select: none;
}

.confirmation-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-text {
  color: var(--theme-text-primary);
  font-weight: 600;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #444;
}

.btn-delete-confirm {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  border: none;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-delete-confirm:hover:not(:disabled) {
  background: linear-gradient(135deg, #c82333 0%, #a71e2a 100%);
  transform: translateY(-1px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
}

.btn-delete-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.loading {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Field hints and validation */
.field-hint {
    color: #888;
    font-size: 0.8rem;
    font-style: italic;
    margin-top: 0.25rem;
    display: block;
}

.level-hint {
    color: #dc3545;
    font-weight: 500;
}

/* Mobile responsive modal */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    margin: 1rem;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 1rem;
  }

  .modal-footer {
    flex-direction: column;
    gap: 0.5rem;
  }

  .btn-cancel,
  .btn-delete-confirm {
    width: 100%;
    justify-content: center;
  }

  .delete-warning {
    flex-direction: column;
    text-align: center;
  }

  .warning-icon {
    align-self: center;
  }
}
</style>
