<template>
  <div class="races-crud">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading races...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <span class="material-symbols-outlined">error</span>
      <p>{{ error }}</p>
      <button type="button" @click="fetchRaces" class="btn-secondary">
        <span class="material-symbols-outlined">refresh</span>
        Retry
      </button>
    </div>

    <!-- List View -->
    <div v-else-if="!showForm && !showDisableConfirm" class="races-list">
      <div class="list-header">
        <div class="filter-input-group">
          <span class="material-symbols-outlined">search</span>
          <input
            v-model="filterText"
            type="text"
            placeholder="Filter races..."
            class="filter-input"
          />
        </div>
        <div class="header-actions">
          <button
            type="button"
            @click="showDisabled = !showDisabled"
            class="toggle-disabled-btn"
            :class="{ active: showDisabled }"
            :title="showDisabled ? 'Hide disabled races' : 'Show disabled races'"
          >
            <span class="material-symbols-outlined">{{ showDisabled ? 'visibility_off' : 'visibility' }}</span>
            {{ showDisabled ? 'Hide' : 'Show' }} Disabled
          </button>
          <button type="button" @click="addNewRace" class="add-btn">
            <span class="material-symbols-outlined">add</span>
            Add Custom Race
          </button>
        </div>
      </div>

      <div v-if="filteredRaces.length > 0" class="races-table">
        <div class="table-header">
          <div class="col-name">Name</div>
          <div class="col-description">Description</div>
        </div>
        <div v-for="raceItem in filteredRaces" :key="raceItem.ID" class="table-row" :class="{ 'disabled-race': raceItem.IsDisabled, 'expanded': expandedRowId === raceItem.ID }" @click="editRace(raceItem)">
          <div class="col-name">{{ raceItem.RaceName }}</div>
          <div class="col-description" :title="raceItem.ShortDescription || extractShortDesc(raceItem.Content)">
            {{ raceItem.ShortDescription || extractShortDesc(raceItem.Content) }}
          </div>
          <button class="row-expand-btn" @click="toggleRowExpand(raceItem.ID, $event)" :aria-label="expandedRowId === raceItem.ID ? 'Collapse details' : 'Expand details'">
            <span class="material-symbols-outlined">{{ expandedRowId === raceItem.ID ? 'expand_less' : 'expand_more' }}</span>
          </button>
          <div v-if="expandedRowId === raceItem.ID" class="row-detail">
            <span class="row-detail-label">Description:</span>
            {{ raceItem.ShortDescription || extractShortDesc(raceItem.Content) }}
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <span class="material-symbols-outlined">group_off</span>
        <p>No races available</p>
        <button type="button" @click="addNewRace" class="add-first-btn">
          <span class="material-symbols-outlined">add</span>
          Add Your First Custom Race
        </button>
      </div>
    </div>

    <!-- Add/Edit Form Dialog -->
    <dialog ref="formDialog" class="race-dialog">
      <div class="dialog-content">
        <div class="modal-header">
          <h4>{{ getFormTitle() }}</h4>
          <button type="button" @click="cancelForm" class="close-btn" :disabled="saving">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="modal-body">
          <div v-if="error" class="error-message">
            <span class="material-symbols-outlined">error</span>
            {{ error }}
          </div>

          <p v-if="isCreatingOverride" class="override-notice">
            <span class="material-symbols-outlined">info</span>
            You're creating a custom version of this template race for your realm.
          </p>

          <div class="form-body">
            <div class="form-group">
              <label for="raceName">
                <span class="material-symbols-outlined">label</span>
                Race Name *
              </label>
              <input
                id="raceName"
                v-model="formData.RaceName"
                type="text"
                placeholder="e.g., Human"
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label for="raceShortDesc">
                <span class="material-symbols-outlined">short_text</span>
                Short Description
              </label>
              <input
                id="raceShortDesc"
                v-model="formData.ShortDescription"
                type="text"
                placeholder="Brief 1-2 sentence summary"
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label for="raceTags">
                <span class="material-symbols-outlined">sell</span>
                Tags
              </label>
              <input
                id="raceTags"
                v-model="tagsInput"
                type="text"
                placeholder="e.g., humanoid, common, versatile (comma-separated)"
                class="form-input"
              />
              <small class="form-hint">Comma-separated tags for categorization</small>
            </div>

            <div class="form-section">
              <h5>Size & Speed</h5>
              <div class="form-row">
                <div class="form-group">
                  <label for="raceSize">Size</label>
                  <select
                    id="raceSize"
                    v-model="formData.Size"
                    class="form-input"
                  >
                    <option value="">Select size...</option>
                    <option value="Tiny">Tiny</option>
                    <option value="Small">Small</option>
                    <option value="Medium">Medium</option>
                    <option value="Large">Large</option>
                    <option value="Huge">Huge</option>
                    <option value="Gargantuan">Gargantuan</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="raceSpeed">Speed (ft)</label>
                  <input
                    id="raceSpeed"
                    v-model.number="formData.Speed"
                    type="number"
                    placeholder="30"
                    class="form-input"
                  />
                </div>
              </div>
            </div>

            <div class="form-section">
              <h5>Ability Score Increases</h5>
              <div class="form-row">
                <div class="form-group">
                  <label for="asiStr">Strength</label>
                  <input
                    id="asiStr"
                    v-model.number="abilityScoreIncreases.Strength"
                    type="number"
                    placeholder="0"
                    class="form-input"
                  />
                </div>
                <div class="form-group">
                  <label for="asiDex">Dexterity</label>
                  <input
                    id="asiDex"
                    v-model.number="abilityScoreIncreases.Dexterity"
                    type="number"
                    placeholder="0"
                    class="form-input"
                  />
                </div>
                <div class="form-group">
                  <label for="asiCon">Constitution</label>
                  <input
                    id="asiCon"
                    v-model.number="abilityScoreIncreases.Constitution"
                    type="number"
                    placeholder="0"
                    class="form-input"
                  />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="asiInt">Intelligence</label>
                  <input
                    id="asiInt"
                    v-model.number="abilityScoreIncreases.Intelligence"
                    type="number"
                    placeholder="0"
                    class="form-input"
                  />
                </div>
                <div class="form-group">
                  <label for="asiWis">Wisdom</label>
                  <input
                    id="asiWis"
                    v-model.number="abilityScoreIncreases.Wisdom"
                    type="number"
                    placeholder="0"
                    class="form-input"
                  />
                </div>
                <div class="form-group">
                  <label for="asiCha">Charisma</label>
                  <input
                    id="asiCha"
                    v-model.number="abilityScoreIncreases.Charisma"
                    type="number"
                    placeholder="0"
                    class="form-input"
                  />
                </div>
              </div>
            </div>

            <div class="form-group">
              <label for="raceLanguages">
                <span class="material-symbols-outlined">translate</span>
                Languages
              </label>
              <input
                id="raceLanguages"
                v-model="languagesInput"
                type="text"
                placeholder="e.g., Common, Elvish (comma-separated)"
                class="form-input"
              />
              <small class="form-hint">Languages known by this race</small>
            </div>

            <div class="form-group">
              <label for="raceTraits">
                <span class="material-symbols-outlined">star</span>
                Racial Traits
              </label>
              <input
                id="raceTraits"
                v-model="traitsInput"
                type="text"
                placeholder="e.g., Darkvision, Fey Ancestry (comma-separated)"
                class="form-input"
              />
              <small class="form-hint">Special traits and abilities</small>
            </div>

            <div class="form-group">
              <label>
                <span class="material-symbols-outlined">description</span>
                Full Description
              </label>
              <ckeditor v-model="formData.Content" :editor="editor" :config="editorConfig" />
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <div class="form-actions">
            <!-- View Template Button for Overrides -->
            <button
              v-if="editingRace && editingRace.Replaces && !isCreatingOverride"
              type="button"
              @click="viewTemplate"
              class="btn-info"
              :disabled="saving"
            >
              <span class="material-symbols-outlined">visibility</span>
              View Race Template
            </button>

            <!-- Restore Button for Disabled Races -->
            <button
              v-if="editingRace && editingRace.IsDisabled && !isCreatingOverride"
              type="button"
              @click="restoreRace"
              class="btn-success"
              :disabled="saving"
            >
              <span class="material-symbols-outlined">restore</span>
              Restore
            </button>

            <!-- Permanent Delete Button for Custom Disabled Races (not overrides) -->
            <button
              v-if="editingRace && editingRace.IsDisabled && editingRace.RealmID && !editingRace.Replaces && !isCreatingOverride"
              type="button"
              @click="confirmPermanentDelete(editingRace)"
              class="btn-danger"
              :disabled="saving"
            >
              <span class="material-symbols-outlined">delete_forever</span>
              Delete Permanently
            </button>

            <!-- Disable Button for Non-Disabled Races -->
            <button
              v-if="editingRace && !editingRace.IsDisabled"
              type="button"
              @click="confirmDisable(editingRace)"
              class="btn-danger"
              :disabled="saving"
            >
              <span class="material-symbols-outlined">block</span>
              Disable
            </button>

            <div class="spacer"></div>
            <button type="button" @click="cancelForm" class="btn-secondary" :disabled="saving">
              Cancel
            </button>
            <button type="button" @click="saveRace" class="btn-primary" :disabled="!isFormValid || saving">
              <span v-if="saving" class="spinner-small"></span>
              <span v-else>{{ editingRace ? 'Update' : 'Create' }} Race</span>
            </button>
          </div>
        </div>
      </div>
    </dialog>

    <!-- Disable Confirmation Dialog -->
    <dialog ref="disableDialog" class="race-dialog disable-dialog">
      <div class="dialog-content">
        <div class="modal-header">
          <h4>Disable Race?</h4>
          <button type="button" @click="cancelDisable" class="close-btn" :disabled="disabling">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="modal-body">
          <div v-if="error" class="error-message">
            <span class="material-symbols-outlined">error</span>
            {{ error }}
          </div>

          <div class="disable-confirm-content">
            <div class="confirm-icon">
              <span class="material-symbols-outlined">warning</span>
            </div>
            <p>Are you sure you want to disable <strong>{{ raceToDisable?.RaceName }}</strong>?</p>
            <p class="info-text">This will make the race unavailable to new characters.</p>
          </div>
        </div>

        <div class="modal-footer">
          <div class="confirm-actions">
            <button type="button" @click="cancelDisable" class="btn-secondary" :disabled="disabling">
              Cancel
            </button>
            <button type="button" @click="disableRace" class="btn-danger" :disabled="disabling">
              <span v-if="disabling" class="spinner-small"></span>
              <span v-else>Disable Race</span>
            </button>
          </div>
        </div>
      </div>
    </dialog>

    <!-- View Template Dialog (Read-Only) -->
    <dialog ref="templateDialog" class="race-dialog">
      <div class="dialog-content">
        <div class="modal-header">
          <h4>View Race Template</h4>
          <button type="button" @click="cancelViewTemplate" class="close-btn">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="modal-body">
          <div v-if="error" class="error-message">
            <span class="material-symbols-outlined">error</span>
            {{ error }}
          </div>

          <div v-if="templateRace" class="form-body">
            <div class="form-group">
              <label for="templateRaceName">
                <span class="material-symbols-outlined">label</span>
                Race Name
              </label>
              <input
                id="templateRaceName"
                :value="templateRace.RaceName"
                type="text"
                class="form-input"
                disabled
              />
            </div>

            <div class="form-group">
              <label for="templateShortDesc">
                <span class="material-symbols-outlined">short_text</span>
                Short Description
              </label>
              <input
                id="templateShortDesc"
                :value="templateRace.ShortDescription || ''"
                type="text"
                class="form-input"
                disabled
              />
            </div>

            <div class="form-group">
              <label for="templateTags">
                <span class="material-symbols-outlined">sell</span>
                Tags
              </label>
              <input
                id="templateTags"
                :value="(templateRace.Tags || []).join(', ')"
                type="text"
                class="form-input"
                disabled
              />
            </div>

            <div class="form-section">
              <h5>Size & Speed</h5>
              <div class="form-row">
                <div class="form-group">
                  <label>Size</label>
                  <input
                    :value="templateRace.Size || ''"
                    type="text"
                    class="form-input"
                    disabled
                  />
                </div>
                <div class="form-group">
                  <label>Speed (ft)</label>
                  <input
                    :value="templateRace.Speed || ''"
                    type="number"
                    class="form-input"
                    disabled
                  />
                </div>
              </div>
            </div>

            <div class="form-section">
              <h5>Ability Score Increases</h5>
              <div class="form-row">
                <div class="form-group">
                  <label>Strength</label>
                  <input
                    :value="templateRace.AbilityScoreIncreases?.Strength || 0"
                    type="number"
                    class="form-input"
                    disabled
                  />
                </div>
                <div class="form-group">
                  <label>Dexterity</label>
                  <input
                    :value="templateRace.AbilityScoreIncreases?.Dexterity || 0"
                    type="number"
                    class="form-input"
                    disabled
                  />
                </div>
                <div class="form-group">
                  <label>Constitution</label>
                  <input
                    :value="templateRace.AbilityScoreIncreases?.Constitution || 0"
                    type="number"
                    class="form-input"
                    disabled
                  />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Intelligence</label>
                  <input
                    :value="templateRace.AbilityScoreIncreases?.Intelligence || 0"
                    type="number"
                    class="form-input"
                    disabled
                  />
                </div>
                <div class="form-group">
                  <label>Wisdom</label>
                  <input
                    :value="templateRace.AbilityScoreIncreases?.Wisdom || 0"
                    type="number"
                    class="form-input"
                    disabled
                  />
                </div>
                <div class="form-group">
                  <label>Charisma</label>
                  <input
                    :value="templateRace.AbilityScoreIncreases?.Charisma || 0"
                    type="number"
                    class="form-input"
                    disabled
                  />
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>
                <span class="material-symbols-outlined">translate</span>
                Languages
              </label>
              <input
                :value="(templateRace.Languages || []).join(', ')"
                type="text"
                class="form-input"
                disabled
              />
            </div>

            <div class="form-group">
              <label>
                <span class="material-symbols-outlined">star</span>
                Racial Traits
              </label>
              <input
                :value="(templateRace.Traits || []).join(', ')"
                type="text"
                class="form-input"
                disabled
              />
            </div>

            <div class="form-group">
              <label>
                <span class="material-symbols-outlined">description</span>
                Full Description
              </label>
              <div class="readonly-content" v-html="templateRace.Content || 'No content'"></div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <div class="form-actions">
            <button type="button" @click="confirmRevert" class="btn-danger" :disabled="reverting">
              <span class="material-symbols-outlined">restore</span>
              Revert to Race Template
            </button>
            <div class="spacer"></div>
            <button type="button" @click="cancelViewTemplate" class="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </dialog>

    <!-- Revert Confirmation Dialog -->
    <dialog ref="revertDialog" class="race-dialog disable-dialog">
      <div class="dialog-content">
        <div class="modal-header">
          <h4>Revert to Template?</h4>
          <button type="button" @click="cancelRevert" class="close-btn" :disabled="reverting">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="modal-body">
          <div v-if="error" class="error-message">
            <span class="material-symbols-outlined">error</span>
            {{ error }}
          </div>

          <div class="delete-confirm-content">
            <div class="confirm-icon">
              <span class="material-symbols-outlined">warning</span>
            </div>
            <p>Are you sure you want to revert to the template race <strong>{{ templateRace?.RaceName }}</strong>?</p>
            <p class="warning-text">This will delete your custom changes permanently.</p>
          </div>
        </div>

        <div class="modal-footer">
          <div class="confirm-actions">
            <button type="button" @click="cancelRevert" class="btn-secondary" :disabled="reverting">
              Cancel
            </button>
            <button type="button" @click="revertToTemplate" class="btn-danger" :disabled="reverting">
              <span v-if="reverting" class="spinner-small"></span>
              <span v-else>Confirm Revert</span>
            </button>
          </div>
        </div>
      </div>
    </dialog>

    <!-- Permanent Delete Confirmation Dialog -->
    <DeleteRaceWarning
      ref="deleteDialog"
      :raceName="raceToDelete?.RaceName || ''"
      @confirm="permanentDeleteRace"
      @cancel="cancelPermanentDelete"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import apiClient from '@shared/utils/api';
import { useUserStore } from '@shared/stores/user';
import { useCharacterStore } from '@shared/stores/character';
import { useRacesStore } from '@shared/stores/races';
import { useAccountStore } from '@shared/stores/account';
import DeleteRaceWarning from '@shared/components/dialogs/DeleteRaceWarning.vue';
import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Bold,
  Italic,
  Link,
  List,
  Heading,
  BlockQuote,
  Table,
  TableToolbar,
  Undo,
  SourceEditing
} from 'ckeditor5';
import { Ckeditor } from '@ckeditor/ckeditor5-vue';
import 'ckeditor5/ckeditor5.css';

const props = defineProps({
  gamingSystemId: {
    type: String,
    default: null
  },
  realmId: {
    type: String,
    required: true
  },
  allowedRaceIds: {
    type: Array,
    default: null  // null = all races, array = specific IDs only
  }
});

const emit = defineEmits(['close']);

const userStore = useUserStore();
const characterStore = useCharacterStore();
const racesStore = useRacesStore();
const accountStore = useAccountStore();

// CKEditor Configuration
const editor = ClassicEditor;
const editorConfig = {
  licenseKey: 'GPL',
  plugins: [Essentials, Paragraph, Bold, Italic, Link, List, Heading, BlockQuote, Table, TableToolbar, Undo, SourceEditing],
  toolbar: ['heading', '|', 'bold', 'italic', 'link', '|', 'bulletedList', 'numberedList', '|', 'blockQuote', 'insertTable', '|', 'undo', 'redo', '|', 'sourceEditing'],
  heading: {
    options: [
      { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
      { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
      { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
      { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' }
    ]
  },
  table: {
    contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells']
  }
};

// Dialog refs
const formDialog = ref(null);
const disableDialog = ref(null);
const templateDialog = ref(null);
const expandedRowId = ref(null);

function toggleRowExpand(id, event) {
  event.stopPropagation();
  expandedRowId.value = expandedRowId.value === id ? null : id;
}
const revertDialog = ref(null);

// State
const races = ref([]);
const loading = ref(false);
const error = ref(null);
const saving = ref(false);
const disabling = ref(false);
const filterText = ref('');
const showDisabled = ref(false);
const loadingRaceId = ref(null);

// Template viewing state
const viewingTemplate = ref(false);
const templateRace = ref(null);
const showRevertConfirm = ref(false);
const reverting = ref(false);

// Form state
const showForm = ref(false);
const editingRace = ref(null);
const isCreatingOverride = ref(false);
const formData = ref({
  RaceName: '',
  ShortDescription: '',
  Content: '',
  Tags: [],
  Size: '',
  Speed: null,
  AbilityScoreIncreases: {},
  Languages: [],
  Traits: []
});

// Helper inputs for arrays/objects
const tagsInput = ref('');
const languagesInput = ref('');
const traitsInput = ref('');
const abilityScoreIncreases = ref({
  Strength: 0,
  Dexterity: 0,
  Constitution: 0,
  Intelligence: 0,
  Wisdom: 0,
  Charisma: 0
});

// Disable state
const showDisableConfirm = ref(false);
const raceToDisable = ref(null);

// Delete state
const deleteDialog = ref(null);
const raceToDelete = ref(null);
const deleting = ref(false);

// Computed
const isFormValid = computed(() => {
  return formData.value.RaceName.trim().length > 0;
});

const filteredRaces = computed(() => {
  let filtered = races.value;

  // Filter by allowed race IDs (from ManageRaces package toggles)
  // Falls back to account access if allowedRaceIds not provided
  if (props.allowedRaceIds !== null) {
    filtered = filtered.filter(r => props.allowedRaceIds.includes(r.ID) || r.RealmID);
  } else if (props.gamingSystemId) {
    const racesAccess = accountStore.access?.[props.gamingSystemId]?.Races;
    if (Array.isArray(racesAccess)) {
      filtered = filtered.filter(r => racesAccess.includes(r.ID) || r.RealmID);
    }
  }

  // Filter out disabled races unless showDisabled is true
  if (!showDisabled.value) {
    filtered = filtered.filter(r => !r.IsDisabled);
  }

  // Filter by search text
  if (filterText.value.trim()) {
    const search = filterText.value.toLowerCase();
    filtered = filtered.filter(r =>
      r.RaceName.toLowerCase().includes(search) ||
      (r.ShortDescription && r.ShortDescription.toLowerCase().includes(search)) ||
      (r.Content && r.Content.toLowerCase().includes(search))
    );
  }

  // Sort alphabetically by RaceName
  return filtered.slice().sort((a, b) =>
    a.RaceName.localeCompare(b.RaceName, undefined, { sensitivity: 'base' })
  );
});

// Watch for dialog state changes
watch(showForm, (newValue) => {
  if (newValue) {
    formDialog.value?.showModal();
  } else {
    formDialog.value?.close();
  }
});

watch(showDisableConfirm, (newValue) => {
  if (newValue) {
    disableDialog.value?.showModal();
  } else {
    disableDialog.value?.close();
  }
});

watch(viewingTemplate, (newValue) => {
  if (newValue) {
    templateDialog.value?.showModal();
  } else {
    templateDialog.value?.close();
  }
});

watch(showRevertConfirm, (newValue) => {
  if (newValue) {
    revertDialog.value?.showModal();
  } else {
    revertDialog.value?.close();
  }
});

// Helper Methods
const isTemplateRace = (raceItem) => {
  return raceItem?.IsTemplate === true && !raceItem?.RealmID;
};

const hasFullDetails = (raceItem) => {
  if (!raceItem) return false;

  const keys = Object.keys(raceItem);

  // Content is a key property - if it's missing, we need to fetch
  if (!keys.includes('Content')) {
    return false;
  }

  // Check for minimal realm-specific race
  const hasRealmRace = keys.includes('RaceName') &&
                       keys.includes('ID') &&
                       keys.includes('RealmID');
  if (hasRealmRace && keys.length <= 5) {
    const onlyHasMinimalProps = keys.every(k =>
      k === 'RaceName' || k === 'ID' || k === 'RealmID' || k === 'Replaces' || k === 'IsDisabled'
    );
    if (onlyHasMinimalProps) return false;
  }

  // Check for minimal template race
  if (keys.length === 3) {
    const hasMinimalTemplateProps = keys.includes('RaceName') &&
                                    keys.includes('ID') &&
                                    keys.includes('GamingSystemID');
    if (hasMinimalTemplateProps) return false;
  }

  return true;
};

const canEditRace = (raceItem) => {
  if (userStore.isAdmin) return true;
  if (isTemplateRace(raceItem)) return true;
  return true;
};

const getEditTitle = (raceItem) => {
  if (!canEditRace(raceItem)) return 'Admin only';
  if (isTemplateRace(raceItem) && !userStore.isAdmin) return 'Create custom version';
  return 'Edit';
};

const getFormTitle = () => {
  if (isCreatingOverride.value) return 'Create Custom Version';
  if (editingRace.value) return 'Edit Race';
  return 'Add New Race';
};

const extractShortDesc = (content) => {
  if (!content) return '';
  const text = content.replace(/<[^>]*>/g, '');
  return text.length > 100 ? text.substring(0, 100) + '...' : text;
};

// API Methods
const fetchRaces = async (force = false) => {
  loading.value = true;
  error.value = null;

  try {
    // Use the races store to load races for the current realm
    // Only force reload after mutations, not on initial load
    await racesStore.loadRaces(force);


    // Update local races list from the store
    races.value = racesStore.getRacesForCurrentRealm;
  } catch (err) {
    console.error('Error fetching races:', err);
    error.value = err.response?.data?.message || 'Failed to load races';
  } finally {
    loading.value = false;
  }
};

// CRUD Methods
const addNewRace = async () => {
  error.value = null;
  editingRace.value = null;
  isCreatingOverride.value = false;
  formData.value = {
    RaceName: '',
    ShortDescription: '',
    Content: '',
    Tags: [],
    Size: '',
    Speed: null,
    AbilityScoreIncreases: {},
    Languages: [],
    Traits: []
  };
  tagsInput.value = '';
  languagesInput.value = '';
  traitsInput.value = '';
  abilityScoreIncreases.value = {
    Strength: 0,
    Dexterity: 0,
    Constitution: 0,
    Intelligence: 0,
    Wisdom: 0,
    Charisma: 0
  };

  await nextTick();
  showForm.value = true;
};

const editRace = async (raceItem) => {
  error.value = null;

  const cachedRace = racesStore.getRaceById(raceItem.ID);
  let raceData = raceItem;

  if (cachedRace && hasFullDetails(cachedRace)) {
    raceData = cachedRace;
  } else {
    loadingRaceId.value = raceItem.ID;

    try {
      raceData = await racesStore.getRace(raceItem.ID) || raceItem;
    } finally {
      loadingRaceId.value = null;
    }
  }

  editingRace.value = raceData;

  if (isTemplateRace(raceData) && !userStore.isAdmin) {
    isCreatingOverride.value = true;
  } else {
    isCreatingOverride.value = false;
  }

  formData.value = {
    RaceName: raceData.RaceName,
    ShortDescription: raceData.ShortDescription || '',
    Content: raceData.Content || '',
    Tags: raceData.Tags || [],
    Size: raceData.Size || '',
    Speed: raceData.Speed || null,
    AbilityScoreIncreases: raceData.AbilityScoreIncreases || {},
    Languages: raceData.Languages || [],
    Traits: raceData.Traits || []
  };

  // Initialize helper inputs
  tagsInput.value = (raceData.Tags || []).join(', ');
  languagesInput.value = (raceData.Languages || []).join(', ');
  traitsInput.value = (raceData.Traits || []).join(', ');
  abilityScoreIncreases.value = {
    Strength: raceData.AbilityScoreIncreases?.Strength || 0,
    Dexterity: raceData.AbilityScoreIncreases?.Dexterity || 0,
    Constitution: raceData.AbilityScoreIncreases?.Constitution || 0,
    Intelligence: raceData.AbilityScoreIncreases?.Intelligence || 0,
    Wisdom: raceData.AbilityScoreIncreases?.Wisdom || 0,
    Charisma: raceData.AbilityScoreIncreases?.Charisma || 0
  };

  await nextTick();
  showForm.value = true;
};

const saveRace = async () => {
  if (!isFormValid.value || saving.value) return;

  saving.value = true;
  error.value = null;

  try {
    // Parse comma-separated inputs
    const tags = tagsInput.value
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const languages = languagesInput.value
      .split(',')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const traits = traitsInput.value
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    // Build ability score increases object (only include non-zero values)
    const asi = {};
    if (abilityScoreIncreases.value.Strength) asi.Strength = abilityScoreIncreases.value.Strength;
    if (abilityScoreIncreases.value.Dexterity) asi.Dexterity = abilityScoreIncreases.value.Dexterity;
    if (abilityScoreIncreases.value.Constitution) asi.Constitution = abilityScoreIncreases.value.Constitution;
    if (abilityScoreIncreases.value.Intelligence) asi.Intelligence = abilityScoreIncreases.value.Intelligence;
    if (abilityScoreIncreases.value.Wisdom) asi.Wisdom = abilityScoreIncreases.value.Wisdom;
    if (abilityScoreIncreases.value.Charisma) asi.Charisma = abilityScoreIncreases.value.Charisma;

    // Build base race data
    const baseData = {
      RaceName: formData.value.RaceName.trim(),
      ShortDescription: formData.value.ShortDescription.trim() || undefined,
      Content: formData.value.Content.trim() || '',
      Tags: tags.length > 0 ? tags : undefined,
      Size: formData.value.Size || undefined,
      Speed: formData.value.Speed || undefined,
      AbilityScoreIncreases: Object.keys(asi).length > 0 ? asi : undefined,
      Languages: languages.length > 0 ? languages : undefined,
      Traits: traits.length > 0 ? traits : undefined
    };

    if (isCreatingOverride.value) {
      // Creating an override of a template race
      const templateData = { ...editingRace.value };

      delete templateData.ID;
      delete templateData.IsTemplate;
      delete templateData.GamingSystemID;
      delete templateData.RealmID;
      delete templateData.CreatedAt;
      delete templateData.UpdatedAt;

      const overrideData = {
        ...templateData,
        ...baseData,
        Replaces: editingRace.value.ID,
        IsTemplate: false
      };

      await apiClient.post('/races/race', overrideData);
    } else if (editingRace.value) {
      // Updating existing
      const updateData = {
        ...baseData,
        RealmID: props.realmId
      };
      await apiClient.put(`/races/race/${editingRace.value.ID}`, updateData);
    } else {
      // Creating new custom race
      const newRaceData = {
        ...baseData,
        IsTemplate: false
      };

      await apiClient.post('/races/race', newRaceData);
    }

    // Refresh the list
    await fetchRaces(true);
    cancelForm();
  } catch (err) {
    console.error('Error saving race:', err);
    error.value = err.response?.data?.message || 'Failed to save race';
  } finally {
    saving.value = false;
  }
};

const cancelForm = () => {
  showForm.value = false;
  editingRace.value = null;
  isCreatingOverride.value = false;
  formData.value = {
    RaceName: '',
    ShortDescription: '',
    Content: '',
    Tags: [],
    Size: '',
    Speed: null,
    AbilityScoreIncreases: {},
    Languages: [],
    Traits: []
  };
  tagsInput.value = '';
  languagesInput.value = '';
  traitsInput.value = '';
  abilityScoreIncreases.value = {
    Strength: 0,
    Dexterity: 0,
    Constitution: 0,
    Intelligence: 0,
    Wisdom: 0,
    Charisma: 0
  };
};

const confirmDisable = (raceItem) => {
  error.value = null;
  raceToDisable.value = raceItem;
  showDisableConfirm.value = true;
};

const disableRace = async () => {
  if (!raceToDisable.value || disabling.value) return;

  disabling.value = true;
  error.value = null;

  try {
    if (isCreatingOverride.value) {
      // Parse form data
      const tags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t.length > 0);
      const languages = languagesInput.value.split(',').map(l => l.trim()).filter(l => l.length > 0);
      const traits = traitsInput.value.split(',').map(t => t.trim()).filter(t => t.length > 0);

      const asi = {};
      if (abilityScoreIncreases.value.Strength) asi.Strength = abilityScoreIncreases.value.Strength;
      if (abilityScoreIncreases.value.Dexterity) asi.Dexterity = abilityScoreIncreases.value.Dexterity;
      if (abilityScoreIncreases.value.Constitution) asi.Constitution = abilityScoreIncreases.value.Constitution;
      if (abilityScoreIncreases.value.Intelligence) asi.Intelligence = abilityScoreIncreases.value.Intelligence;
      if (abilityScoreIncreases.value.Wisdom) asi.Wisdom = abilityScoreIncreases.value.Wisdom;
      if (abilityScoreIncreases.value.Charisma) asi.Charisma = abilityScoreIncreases.value.Charisma;

      const baseData = {
        RaceName: formData.value.RaceName.trim(),
        ShortDescription: formData.value.ShortDescription.trim() || undefined,
        Content: formData.value.Content.trim() || '',
        Tags: tags.length > 0 ? tags : undefined,
        Size: formData.value.Size || undefined,
        Speed: formData.value.Speed || undefined,
        AbilityScoreIncreases: Object.keys(asi).length > 0 ? asi : undefined,
        Languages: languages.length > 0 ? languages : undefined,
        Traits: traits.length > 0 ? traits : undefined
      };

      const templateData = { ...raceToDisable.value };
      delete templateData.ID;
      delete templateData.IsTemplate;
      delete templateData.GamingSystemID;
      delete templateData.RealmID;
      delete templateData.CreatedAt;
      delete templateData.UpdatedAt;
      delete templateData.IsDisabled;

      const disabledOverride = {
        ...templateData,
        ...baseData,
        Replaces: raceToDisable.value.ID,
        IsDisabled: true,
        IsTemplate: false
      };

      await apiClient.post('/races/race', disabledOverride);
    } else if (isTemplateRace(raceToDisable.value) && !userStore.isAdmin) {
      // TEMPLATE (non-admin): Create an override with IsDisabled: true (soft-delete in this realm)
      const templateData = { ...raceToDisable.value };

      delete templateData.ID;
      delete templateData.IsTemplate;
      delete templateData.GamingSystemID;
      delete templateData.RealmID;
      delete templateData.CreatedAt;
      delete templateData.UpdatedAt;
      delete templateData.IsDisabled;

      const disabledOverride = {
        ...templateData,
        Replaces: raceToDisable.value.ID,
        IsDisabled: true,
        IsTemplate: false
      };

      await apiClient.post('/races/race', disabledOverride);
    } else {
      // ADMIN disabling TEMPLATE — update template directly (hides it in every realm without an override)
      // Otherwise (OVERRIDE or CUSTOM) — direct update on the race itself
      const updateData = { IsDisabled: true };
      if (!isTemplateRace(raceToDisable.value)) {
        updateData.RealmID = props.realmId;
      }

      await apiClient.put(`/races/race/${raceToDisable.value.ID}`, updateData);
    }

    await fetchRaces(true);
    cancelDisable();
    cancelForm();
  } catch (err) {
    console.error('Error disabling race:', err);
    error.value = err.response?.data?.message || 'Failed to disable race';
  } finally {
    disabling.value = false;
  }
};

const cancelDisable = () => {
  showDisableConfirm.value = false;
  raceToDisable.value = null;
};

// Permanent Delete Methods
const confirmPermanentDelete = (raceItem) => {
  error.value = null;
  raceToDelete.value = raceItem;
  deleteDialog.value?.show();
};

const permanentDeleteRace = async () => {
  if (!raceToDelete.value || deleting.value) return;

  deleting.value = true;
  error.value = null;

  try {
    await apiClient.delete(`/races/race/${raceToDelete.value.ID}`);

    await fetchRaces(true);
    cancelPermanentDelete();
    cancelForm();
  } catch (err) {
    console.error('Error deleting race:', err);
    error.value = err.response?.data?.message || 'Failed to delete race permanently';
  } finally {
    deleting.value = false;
  }
};

const cancelPermanentDelete = () => {
  deleteDialog.value?.close();
  raceToDelete.value = null;
};

const restoreRace = async () => {
  if (!editingRace.value || saving.value) return;

  saving.value = true;
  error.value = null;

  try {
    const updateData = {
      IsDisabled: false,
      RealmID: props.realmId
    };

    await apiClient.put(`/races/race/${editingRace.value.ID}`, updateData);

    await fetchRaces(true);
    cancelForm();
  } catch (err) {
    console.error('Error restoring race:', err);
    error.value = err.response?.data?.message || 'Failed to restore race';
  } finally {
    saving.value = false;
  }
};

const viewTemplate = async () => {
  if (!editingRace.value?.Replaces) {
    console.error('No template to view - Replaces field not set');
    return;
  }

  error.value = null;

  try {
    const response = await apiClient.get(`/races/race/${editingRace.value.Replaces}`);

    if (response.status >= 200 && response.status < 300) {
      templateRace.value = response.data;
      viewingTemplate.value = true;
    } else {
      error.value = 'Failed to load template race';
    }
  } catch (err) {
    console.error('Error fetching template race:', err);
    error.value = err.response?.data?.message || 'Failed to load template race';
  }
};

const cancelViewTemplate = () => {
  viewingTemplate.value = false;
  templateRace.value = null;
};

const confirmRevert = () => {
  showRevertConfirm.value = true;
};

const cancelRevert = () => {
  showRevertConfirm.value = false;
};

const revertToTemplate = async () => {
  if (!editingRace.value || reverting.value) return;

  reverting.value = true;
  error.value = null;

  try {
    await apiClient.delete(`/races/race/${editingRace.value.ID}`);

    await fetchRaces(true);

    showRevertConfirm.value = false;
    viewingTemplate.value = false;
    cancelForm();
  } catch (err) {
    console.error('Error reverting to template:', err);
    error.value = err.response?.data?.message || 'Failed to revert to template';
  } finally {
    reverting.value = false;
  }
};

// Lifecycle
onMounted(() => {
  fetchRaces();
});

// Expose methods for parent components
defineExpose({
  refreshRaces: () => {
    races.value = racesStore.getRacesForCurrentRealm;
  }
});
</script>

<style scoped>
.races-crud {
  min-height: 400px;
  height: 100%;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #ccc;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-top-color: var(--theme-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}

.spinner-small {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error State */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #f54242;
  text-align: center;
}

.error-state .material-symbols-outlined {
  font-size: 4rem;
  margin-bottom: 1rem;
}

/* List View */
.races-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.races-table {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.row-expand-btn {
  display: none;
}

.filter-input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  max-width: 400px;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  transition: all 0.2s ease;
}

.filter-input-group:focus-within {
  border-color: color-mix(in srgb, var(--theme-accent) 50%, transparent);
  background: rgba(255, 255, 255, 0.08);
}

.filter-input-group .material-symbols-outlined {
  color: #999;
  font-size: 1.2rem;
}

.filter-input {
  flex: 1;
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 1rem;
  outline: none;
}

.filter-input::placeholder {
  color: #666;
}

.toggle-disabled-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: rgba(255, 255, 255, 0.05);
  color: #ccc;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-disabled-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: color-mix(in srgb, var(--theme-accent) 30%, transparent);
  color: var(--theme-accent);
}

.toggle-disabled-btn.active {
  background: color-mix(in srgb, var(--theme-accent) 15%, transparent);
  border-color: color-mix(in srgb, var(--theme-accent) 50%, transparent);
  color: var(--theme-accent);
}

.toggle-disabled-btn .material-symbols-outlined {
  font-size: 1.2rem;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-btn:hover {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

/* Table */
.table-header,
.table-row {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 1rem;
  padding: 1rem 1.5rem;
  align-items: center;
}

.table-header {
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: 600;
  color: var(--theme-accent);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.table-row {
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s ease;
  cursor: pointer;
}

.table-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.table-row:last-child {
  border-bottom: none;
}

.disabled-race {
  background: rgba(128, 128, 128, 0.15) !important;
  opacity: 0.7;
}

.disabled-race:hover {
  background: rgba(128, 128, 128, 0.2) !important;
  opacity: 0.85;
}

.col-name {
  font-weight: 600;
  color: var(--theme-accent);
}

.col-description {
  color: #ccc;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #6c757d;
}

.empty-state .material-symbols-outlined {
  font-size: 4rem;
  margin-bottom: 1rem;
  color: #444;
}

.empty-state p {
  margin: 0 0 1.5rem 0;
  font-size: 1.1rem;
}

.add-first-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-first-btn:hover {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

/* Dialog */
.race-dialog {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid var(--theme-accent);
  border-radius: 1rem;
  padding: 0;
  width: 90%;
  max-width: 1000px;
  max-height: 90vh;
  overflow: hidden;
  color: #ffffff;
}

.race-dialog[open] {
  display: grid;
  grid-template-rows: auto 1fr auto;
}

.race-dialog::backdrop {
  background: rgba(0, 0, 0, 0.8);
}

.disable-dialog {
  max-width: 500px;
}

.dialog-content {
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100%;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h4 {
  margin: 0;
  color: var(--theme-accent);
  font-size: 1.5rem;
  font-weight: 600;
}

.close-btn {
  background: transparent;
  border: none;
  color: #ccc;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.close-btn:hover:not(:disabled) {
  color: var(--theme-accent);
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
}

.close-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.close-btn .material-symbols-outlined {
  font-size: 1.5rem;
}

.modal-body {
  padding: 2rem;
  overflow-y: auto;
  min-height: 0;
}

.modal-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(245, 66, 66, 0.1);
  border: 1px solid rgba(245, 66, 66, 0.3);
  border-radius: 0.5rem;
  color: #f54242;
  font-size: 0.9rem;
  margin: 0 0 1.5rem 0;
}

.error-message .material-symbols-outlined {
  font-size: 1.2rem;
}

.override-notice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(66, 135, 245, 0.1);
  border: 1px solid rgba(66, 135, 245, 0.3);
  border-radius: 0.5rem;
  color: #4287f5;
  font-size: 0.9rem;
  margin: 0 0 1.5rem 0;
}

.override-notice .material-symbols-outlined {
  font-size: 1.2rem;
}

.form-body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--theme-accent);
  font-weight: 600;
  font-size: 0.95rem;
}

.form-group label .material-symbols-outlined {
  font-size: 1.2rem;
}

.form-input,
.form-textarea {
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  color: #ffffff;
  font-size: 1rem;
  font-family: inherit;
  transition: all 0.2s ease;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--theme-accent) 50%, transparent);
  background: rgba(255, 255, 255, 0.08);
}

select.form-input option {
  background: #1a1f2e;
  color: #ffffff;
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
}

.form-hint {
  color: #999;
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

.readonly-content {
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  color: #ccc;
  font-size: 1rem;
  line-height: 1.6;
  max-height: 400px;
  overflow-y: auto;
}

.readonly-content :deep(h1),
.readonly-content :deep(h2),
.readonly-content :deep(h3) {
  color: var(--theme-accent);
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.readonly-content :deep(h1) {
  font-size: 1.5rem;
}

.readonly-content :deep(h2) {
  font-size: 1.3rem;
}

.readonly-content :deep(h3) {
  font-size: 1.1rem;
}

.readonly-content :deep(p) {
  margin: 0.5rem 0;
}

.readonly-content :deep(a) {
  color: #4287f5;
  text-decoration: none;
}

.readonly-content :deep(a:hover) {
  text-decoration: underline;
}

.readonly-content :deep(ul),
.readonly-content :deep(ol) {
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}

.readonly-content :deep(blockquote) {
  border-left: 3px solid var(--theme-accent);
  padding-left: 1rem;
  margin: 1rem 0;
  color: #999;
}

.readonly-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

.readonly-content :deep(table th),
.readonly-content :deep(table td) {
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.5rem;
  text-align: left;
}

.readonly-content :deep(table th) {
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  color: var(--theme-accent);
  font-weight: 600;
}

/* Form Sections */
.form-section {
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.75rem;
  margin: 0.5rem 0;
}

.form-section h5 {
  margin: 0 0 1rem 0;
  color: var(--theme-accent);
  font-size: 1.1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

/* CKEditor Styling */
:deep(.ck-editor) {
  width: 100%;
}

:deep(.ck-editor__editable) {
  min-height: 250px;
  max-height: 500px;
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  color: #ffffff !important;
}

:deep(.ck-editor__editable:focus) {
  border-color: color-mix(in srgb, var(--theme-accent) 50%, transparent) !important;
  background: rgba(255, 255, 255, 0.08) !important;
  box-shadow: none !important;
}

:deep(.ck.ck-toolbar) {
  background: rgba(255, 255, 255, 0.08) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-bottom: none !important;
}

:deep(.ck.ck-button) {
  color: #ccc !important;
}

:deep(.ck.ck-button .ck-icon) {
  color: #ccc !important;
}

:deep(.ck.ck-button .ck-button__label) {
  color: #ccc !important;
}

:deep(.ck.ck-button:not(.ck-disabled):hover) {
  background: color-mix(in srgb, var(--theme-accent) 20%, transparent) !important;
  color: var(--theme-accent) !important;
}

:deep(.ck.ck-button:not(.ck-disabled):hover .ck-icon) {
  color: var(--theme-accent) !important;
}

:deep(.ck.ck-button.ck-on) {
  background: color-mix(in srgb, var(--theme-accent) 30%, transparent) !important;
  color: var(--theme-accent) !important;
}

:deep(.ck.ck-button.ck-on .ck-icon) {
  color: var(--theme-accent) !important;
}

:deep(.ck.ck-toolbar .ck.ck-toolbar__separator) {
  background: rgba(255, 255, 255, 0.2) !important;
}

:deep(.ck-content h1),
:deep(.ck-content h2),
:deep(.ck-content h3) {
  color: var(--theme-accent) !important;
}

:deep(.ck-content a) {
  color: #4287f5 !important;
}

:deep(.ck-content blockquote) {
  border-left-color: var(--theme-accent) !important;
  color: #ccc !important;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem 2rem;
}

.form-actions .spacer {
  flex: 1;
}

.btn-secondary,
.btn-primary,
.btn-danger,
.btn-success,
.btn-info {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 100px;
}

.btn-danger .material-symbols-outlined,
.btn-success .material-symbols-outlined,
.btn-info .material-symbols-outlined {
  font-size: 1.2rem;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #ccc;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.btn-primary {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.btn-primary:disabled,
.btn-secondary:disabled,
.btn-danger:disabled,
.btn-success:disabled,
.btn-info:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  background: linear-gradient(135deg, #f54242 0%, #d63939 100%);
  color: #ffffff;
}

.btn-danger:hover:not(:disabled) {
  background: linear-gradient(135deg, #d63939 0%, #c23232 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(245, 66, 66, 0.3);
}

.btn-success {
  background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
  color: #ffffff;
}

.btn-success:hover:not(:disabled) {
  background: linear-gradient(135deg, #45a049 0%, #3d8b40 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
}

.btn-info {
  background: linear-gradient(135deg, #4287f5 0%, #3a78e0 100%);
  color: #ffffff;
}

.btn-info:hover:not(:disabled) {
  background: linear-gradient(135deg, #3a78e0 0%, #3269cc 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(66, 135, 245, 0.3);
}

/* Disable Confirmation */
.disable-confirm-content,
.delete-confirm-content {
  text-align: center;
  padding: 1rem 0;
}

.confirm-icon {
  margin-bottom: 1rem;
}

.confirm-icon .material-symbols-outlined {
  font-size: 4rem;
  color: #f54242;
}

.disable-confirm-content p,
.delete-confirm-content p {
  color: #ccc;
  font-size: 1rem;
  margin: 0 0 0.5rem 0;
}

.disable-confirm-content strong,
.delete-confirm-content strong {
  color: var(--theme-accent);
}

.warning-text {
  color: #f54242;
  font-weight: 600;
  margin-bottom: 1rem !important;
}

.info-text {
  color: #4287f5;
  font-weight: 500;
  margin-bottom: 1rem !important;
}

.confirm-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  padding: 1.5rem 2rem;
}

/* Responsive */
@media (max-width: 768px) {
  .list-header {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-input-group {
    max-width: none;
  }

  .header-actions {
    flex-direction: column;
    width: 100%;
  }

  .toggle-disabled-btn,
  .add-btn {
    width: 100%;
    justify-content: center;
  }

  .table-header,
  .table-row {
    grid-template-columns: 1fr auto;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    position: relative;
  }

  .table-header .col-description,
  .table-row .col-description {
    display: none;
  }

  .table-header .row-expand-btn {
    display: none;
  }

  .row-expand-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.2s, color 0.2s;
  }

  .row-expand-btn:active {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
  }

  .row-expand-btn .material-symbols-outlined {
    font-size: 20px;
  }

  .row-detail {
    grid-column: 1 / -1;
    padding: 0.5rem 0 0;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    margin-top: 0.25rem;
    color: #ccc;
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .row-detail-label {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    display: block;
    margin-bottom: 0.15rem;
  }

  .form-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .form-actions .spacer {
    display: none;
  }

  .race-dialog {
    width: 95%;
  }

  .modal-header,
  .modal-body {
    padding: 1rem;
  }

  .confirm-actions {
    flex-direction: column;
    padding: 1rem;
  }

  .btn-secondary,
  .btn-primary,
  .btn-danger,
  .btn-success,
  .btn-info {
    width: 100%;
  }
}
</style>
