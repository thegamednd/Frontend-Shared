<template>
  <div class="classes-crud">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading classes...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <span class="material-symbols-outlined">error</span>
      <p>{{ error }}</p>
      <button type="button" @click="fetchClasses" class="btn-secondary">
        <span class="material-symbols-outlined">refresh</span>
        Retry
      </button>
    </div>

    <!-- List View -->
    <div v-else-if="!showForm && !showDisableConfirm" class="classes-list">
      <div class="list-header">
        <div class="filter-input-group">
          <span class="material-symbols-outlined">search</span>
          <input
            v-model="filterText"
            type="text"
            placeholder="Filter classes..."
            class="filter-input"
          />
        </div>
        <div class="header-actions">
          <button
            type="button"
            @click="showDisabled = !showDisabled"
            class="toggle-disabled-btn"
            :class="{ active: showDisabled }"
            :title="showDisabled ? 'Hide disabled classes' : 'Show disabled classes'"
          >
            <span class="material-symbols-outlined">{{ showDisabled ? 'visibility_off' : 'visibility' }}</span>
            {{ showDisabled ? 'Hide' : 'Show' }} Disabled
          </button>
          <button type="button" @click="addNewClass" class="add-btn">
            <span class="material-symbols-outlined">add</span>
            Add Custom Class
          </button>
        </div>
      </div>

      <div v-if="filteredClasses.length > 0" class="classes-table">
        <div class="table-header">
          <div class="col-name">Name</div>
          <div class="col-description">{{ isTheGame ? 'Parent' : 'Description' }}</div>
        </div>
        <div v-for="classItem in filteredClasses" :key="classItem.ID" class="table-row" :class="{ 'disabled-class': classItem.IsDisabled, 'expanded': expandedRowId === classItem.ID }" @click="editClass(classItem)">
          <div class="col-name">{{ classItem.ClassName }}</div>
          <div v-if="isTheGame" class="col-description">
            {{ classItem.MechanicsData?.Parent || '—' }}
          </div>
          <div v-else class="col-description" :title="classItem.ShortDescription || extractShortDesc(classItem.Content)">
            {{ classItem.ShortDescription || extractShortDesc(classItem.Content) }}
          </div>
          <button class="row-expand-btn" @click="toggleRowExpand(classItem.ID, $event)" :aria-label="expandedRowId === classItem.ID ? 'Collapse details' : 'Expand details'">
            <span class="material-symbols-outlined">{{ expandedRowId === classItem.ID ? 'expand_less' : 'expand_more' }}</span>
          </button>
          <div v-if="expandedRowId === classItem.ID" class="row-detail">
            <span class="row-detail-label">{{ isTheGame ? 'Parent' : 'Description' }}:</span>
            {{ isTheGame ? (classItem.MechanicsData?.Parent || '—') : (classItem.ShortDescription || extractShortDesc(classItem.Content)) }}
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <span class="material-symbols-outlined">school_off</span>
        <p>No classes available</p>
        <button type="button" @click="addNewClass" class="add-first-btn">
          <span class="material-symbols-outlined">add</span>
          Add Your First Custom Class
        </button>
      </div>
    </div>

    <!-- Add/Edit Form Dialog -->
    <dialog ref="formDialog" class="class-dialog">
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
            You're creating a custom version of this template class for your realm.
          </p>

          <div class="form-body">
        <div class="form-group">
          <label for="className">
            <span class="material-symbols-outlined">label</span>
            Class Name *
          </label>
          <input
            id="className"
            v-model="formData.ClassName"
            type="text"
            placeholder="e.g., Fighter"
            class="form-input"
          />
        </div>

        <!-- D&D fields (non-TheGame) -->
        <template v-if="!isTheGame">
        <div class="form-group">
          <label for="classShortDesc">
            <span class="material-symbols-outlined">short_text</span>
            Short Description
          </label>
          <input
            id="classShortDesc"
            v-model="formData.ShortDescription"
            type="text"
            placeholder="Brief 1-2 sentence summary"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label for="classTags">
            <span class="material-symbols-outlined">sell</span>
            Tags
          </label>
          <input
            id="classTags"
            v-model="tagsInput"
            type="text"
            placeholder="e.g., martial, tank, melee (comma-separated)"
            class="form-input"
          />
          <small class="form-hint">Comma-separated tags for categorization</small>
        </div>

        <div class="form-section">
          <h5>Hit Points</h5>
          <div class="form-row">
            <div class="form-group">
              <label for="hpBase">Base HP</label>
              <input
                id="hpBase"
                v-model.number="hitPointsData.base"
                type="number"
                placeholder="10"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label for="hpPerLevel">Per Level</label>
              <input
                id="hpPerLevel"
                v-model.number="hitPointsData.perLevel"
                type="number"
                placeholder="6"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label for="hpDiceType">Dice Type</label>
              <input
                id="hpDiceType"
                v-model="hitPointsData.diceType"
                type="text"
                placeholder="d10"
                class="form-input"
              />
            </div>
          </div>
        </div>

        <div class="form-group">
          <label for="primaryAttributes">
            <span class="material-symbols-outlined">psychology</span>
            Primary Attributes
          </label>
          <input
            id="primaryAttributes"
            v-model="primaryAttributesInput"
            type="text"
            placeholder="e.g., Strength, Constitution (comma-separated)"
            class="form-input"
          />
          <small class="form-hint">Key ability scores that define this class</small>
        </div>

        <div class="form-section">
          <h5>Proficiencies</h5>
          <div class="form-group">
            <label for="profWeapons">Weapons</label>
            <input
              id="profWeapons"
              v-model="proficiencies.weaponsInput"
              type="text"
              placeholder="e.g., Simple weapons, Martial weapons"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label for="profArmor">Armor</label>
            <input
              id="profArmor"
              v-model="proficiencies.armorInput"
              type="text"
              placeholder="e.g., Light armor, Medium armor, Shields"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label for="profSaves">Saving Throws</label>
            <input
              id="profSaves"
              v-model="proficiencies.savesInput"
              type="text"
              placeholder="e.g., Strength, Constitution"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label for="profSkills">Skills</label>
            <input
              id="profSkills"
              v-model="proficiencies.skillsInput"
              type="text"
              placeholder="e.g., Athletics, Intimidation, Survival"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label for="profTools">Tools</label>
            <input
              id="profTools"
              v-model="proficiencies.toolsInput"
              type="text"
              placeholder="e.g., Smith's tools, Brewer's supplies"
              class="form-input"
            />
          </div>
        </div>
        </template>

        <!-- TheGame fields -->
        <template v-if="isTheGame">
        <div class="form-group">
          <label for="classSegment">
            <span class="material-symbols-outlined">link</span>
            URL Segment
          </label>
          <input
            id="classSegment"
            v-model="theGameForm.Segment"
            type="text"
            placeholder="e.g., warrior"
            class="form-input"
          />
          <small class="form-hint">URL-friendly slug for this class</small>
        </div>

        <div class="form-group">
          <label for="classParent">
            <span class="material-symbols-outlined">account_tree</span>
            Parent Class
          </label>
          <select
            id="classParent"
            v-model="theGameForm.Parent"
            class="form-input"
          >
            <option :value="null">None (Root Class)</option>
            <option v-for="name in availableParentClasses" :key="name" :value="name">
              {{ name }}
            </option>
          </select>
          <small class="form-hint">Select a parent class to make this a specialization</small>
        </div>

        <div class="form-group">
          <label for="classSkills">
            <span class="material-symbols-outlined">bolt</span>
            Class Skills
          </label>
          <VueMultiselect
            id="classSkills"
            v-model="theGameForm.Skills"
            :options="availableSkillNames"
            :multiple="true"
            :close-on-select="false"
            :clear-on-select="false"
            :preserve-search="true"
            placeholder="Select class skills"
            :taggable="false"
            class="form-multiselect-vue"
          />
          <small class="form-hint">Type to filter, click to select multiple skills</small>
        </div>


        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="theGameForm.IsWizard" />
            <span>Is Wizard Class</span>
          </label>
        </div>
        </template>

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
              v-if="editingClass && editingClass.Replaces && !isCreatingOverride"
              type="button"
              @click="viewTemplate"
              class="btn-info"
              :disabled="saving"
            >
              <span class="material-symbols-outlined">visibility</span>
              View Class Template
            </button>

            <!-- Restore Button for Disabled Classes -->
            <button
              v-if="editingClass && editingClass.IsDisabled && !isCreatingOverride"
              type="button"
              @click="restoreClass"
              class="btn-success"
              :disabled="saving"
            >
              <span class="material-symbols-outlined">restore</span>
              Restore
            </button>

            <!-- Permanent Delete Button for Custom Disabled Classes (not overrides) -->
            <button
              v-if="editingClass && editingClass.IsDisabled && editingClass.RealmID && !editingClass.Replaces && !isCreatingOverride"
              type="button"
              @click="confirmPermanentDelete(editingClass)"
              class="btn-danger"
              :disabled="saving"
            >
              <span class="material-symbols-outlined">delete_forever</span>
              Delete Permanently
            </button>

            <!-- Disable Button for Non-Disabled Classes -->
            <button
              v-if="editingClass && !editingClass.IsDisabled"
              type="button"
              @click="confirmDisable(editingClass)"
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
            <button type="button" @click="saveClass" class="btn-primary" :disabled="!isFormValid || saving">
              <span v-if="saving" class="spinner-small"></span>
              <span v-else>{{ editingClass ? 'Update' : 'Create' }} Class</span>
            </button>
          </div>
        </div>
      </div>
    </dialog>

    <!-- Disable Confirmation Dialog -->
    <dialog ref="disableDialog" class="class-dialog disable-dialog">
      <div class="dialog-content">
        <div class="modal-header">
          <h4>Disable Class?</h4>
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
            <p>Are you sure you want to disable <strong>{{ classToDisable?.ClassName }}</strong>?</p>
            <p class="info-text">This will make the class unavailable to new characters.</p>
          </div>
        </div>

        <div class="modal-footer">
          <div class="confirm-actions">
            <button type="button" @click="cancelDisable" class="btn-secondary" :disabled="disabling">
              Cancel
            </button>
            <button type="button" @click="disableClass" class="btn-danger" :disabled="disabling">
              <span v-if="disabling" class="spinner-small"></span>
              <span v-else>Disable Class</span>
            </button>
          </div>
        </div>
      </div>
    </dialog>

    <!-- View Template Dialog (Read-Only) -->
    <dialog ref="templateDialog" class="class-dialog">
      <div class="dialog-content">
        <div class="modal-header">
          <h4>View Class Template</h4>
          <button type="button" @click="cancelViewTemplate" class="close-btn">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="modal-body">
          <div v-if="error" class="error-message">
            <span class="material-symbols-outlined">error</span>
            {{ error }}
          </div>

          <div v-if="templateClass" class="form-body">
            <div class="form-group">
              <label for="templateClassName">
                <span class="material-symbols-outlined">label</span>
                Class Name
              </label>
              <input
                id="templateClassName"
                :value="templateClass.ClassName"
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
                :value="templateClass.ShortDescription || ''"
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
                :value="(templateClass.Tags || []).join(', ')"
                type="text"
                class="form-input"
                disabled
              />
            </div>

            <div class="form-section">
              <h5>Hit Points</h5>
              <div class="form-row">
                <div class="form-group">
                  <label>Base HP</label>
                  <input
                    :value="templateClass.HitPointsData?.base || ''"
                    type="number"
                    class="form-input"
                    disabled
                  />
                </div>
                <div class="form-group">
                  <label>Per Level</label>
                  <input
                    :value="templateClass.HitPointsData?.perLevel || ''"
                    type="number"
                    class="form-input"
                    disabled
                  />
                </div>
                <div class="form-group">
                  <label>Dice Type</label>
                  <input
                    :value="templateClass.HitPointsData?.diceType || ''"
                    type="text"
                    class="form-input"
                    disabled
                  />
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>
                <span class="material-symbols-outlined">psychology</span>
                Primary Attributes
              </label>
              <input
                :value="(templateClass.PrimaryAttributes || []).join(', ')"
                type="text"
                class="form-input"
                disabled
              />
            </div>

            <div class="form-section">
              <h5>Proficiencies</h5>
              <div class="form-group">
                <label>Weapons</label>
                <input
                  :value="(templateClass.Proficiencies?.weapons || []).join(', ')"
                  type="text"
                  class="form-input"
                  disabled
                />
              </div>
              <div class="form-group">
                <label>Armor</label>
                <input
                  :value="(templateClass.Proficiencies?.armor || []).join(', ')"
                  type="text"
                  class="form-input"
                  disabled
                />
              </div>
              <div class="form-group">
                <label>Saving Throws</label>
                <input
                  :value="(templateClass.Proficiencies?.saves || []).join(', ')"
                  type="text"
                  class="form-input"
                  disabled
                />
              </div>
              <div class="form-group">
                <label>Skills</label>
                <input
                  :value="(templateClass.Proficiencies?.skills || []).join(', ')"
                  type="text"
                  class="form-input"
                  disabled
                />
              </div>
              <div class="form-group">
                <label>Tools</label>
                <input
                  :value="(templateClass.Proficiencies?.tools || []).join(', ')"
                  type="text"
                  class="form-input"
                  disabled
                />
              </div>
            </div>

            <div class="form-group">
              <label>
                <span class="material-symbols-outlined">description</span>
                Full Description
              </label>
              <div class="readonly-content" v-html="templateClass.Content || 'No content'"></div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <div class="form-actions">
            <button type="button" @click="confirmRevert" class="btn-danger" :disabled="reverting">
              <span class="material-symbols-outlined">restore</span>
              Revert to Class Template
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
    <dialog ref="revertDialog" class="class-dialog disable-dialog">
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
            <p>Are you sure you want to revert to the template class <strong>{{ templateClass?.ClassName }}</strong>?</p>
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
    <DeleteClassWarning
      ref="deleteDialog"
      :className="classToDelete?.ClassName || ''"
      @confirm="permanentDeleteClass"
      @cancel="cancelPermanentDelete"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import apiClient from '@shared/utils/api';
import { useUserStore } from '@shared/stores/user';
import { useCharacterStore } from '@shared/stores/character';
import { useClassesStore } from '@shared/stores/classes';
import { useSkillsStore } from '@shared/stores/skills';
import { useAccountStore } from '@shared/stores/account';
import VueMultiselect from 'vue-multiselect';
import 'vue-multiselect/dist/vue-multiselect.min.css';
import DeleteClassWarning from '@shared/components/dialogs/DeleteClassWarning.vue';
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
  allowedClassIds: {
    type: Array,
    default: null  // null = all classes, array = specific IDs only
  }
});

const emit = defineEmits(['close']);

const userStore = useUserStore();
const characterStore = useCharacterStore();
const classesStore = useClassesStore();
const skillsStore = useSkillsStore();
const accountStore = useAccountStore();

// TheGame detection
const THE_GAME_SYSTEM_ID = '6c55cf38-7bb2-4e10-a98f-e688c1af48b3';
const isTheGame = computed(() => props.gamingSystemId === THE_GAME_SYSTEM_ID);

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
const classes = ref([]);
const loading = ref(false);
const error = ref(null);
const saving = ref(false);
const disabling = ref(false);
const filterText = ref('');
const showDisabled = ref(false); // Toggle to show/hide disabled classes
const loadingClassId = ref(null); // Track which class is being loaded

// Template viewing state
const viewingTemplate = ref(false);
const templateClass = ref(null);
const showRevertConfirm = ref(false);
const reverting = ref(false);

// Form state
const showForm = ref(false);
const editingClass = ref(null);
const isCreatingOverride = ref(false);
const formData = ref({
  ClassName: '',
  ShortDescription: '',
  Content: '',
  Tags: [],
  HitPointsData: {},
  PrimaryAttributes: [],
  Proficiencies: {}
});

// TheGame-specific form state
const theGameForm = ref({
  Segment: '',
  Parent: null,
  Skills: [],
  OptionalSkills: [],
  IsWizard: false
});

const availableParentClasses = computed(() => {
  if (!isTheGame.value) return [];
  return classes.value
    .filter(c => !c.IsDisabled && (!editingClass.value || c.ID !== editingClass.value.ID))
    .map(c => c.ClassName)
    .sort();
});

const availableSkillNames = computed(() => {
  if (!isTheGame.value) return [];
  return skillsStore.arSkills.map(s => s.SkillName).sort();
});

// Helper inputs for arrays/objects
const tagsInput = ref('');
const primaryAttributesInput = ref('');
const hitPointsData = ref({ base: null, perLevel: null, diceType: '' });
const proficiencies = ref({
  weaponsInput: '',
  armorInput: '',
  savesInput: '',
  skillsInput: '',
  toolsInput: ''
});

// Disable state
const showDisableConfirm = ref(false);
const classToDisable = ref(null);

// Delete state
const deleteDialog = ref(null);
const classToDelete = ref(null);
const deleting = ref(false);

// Computed
const isFormValid = computed(() => {
  return formData.value.ClassName.trim().length > 0;
});

const filteredClasses = computed(() => {
  let filtered = classes.value;

  // Filter by allowed class IDs (from ManageClasses package toggles)
  // Falls back to account access if allowedClassIds not provided
  if (props.allowedClassIds !== null) {
    filtered = filtered.filter(c => props.allowedClassIds.includes(c.ID) || c.RealmID);
  } else if (props.gamingSystemId) {
    const classesAccess = accountStore.access?.[props.gamingSystemId]?.Classes;
    if (Array.isArray(classesAccess)) {
      filtered = filtered.filter(c => classesAccess.includes(c.ID) || c.RealmID);
    }
  }

  // Filter out disabled classes unless showDisabled is true
  if (!showDisabled.value) {
    filtered = filtered.filter(c => !c.IsDisabled);
  }

  // Filter by search text
  if (filterText.value.trim()) {
    const search = filterText.value.toLowerCase();
    filtered = filtered.filter(c =>
      c.ClassName.toLowerCase().includes(search) ||
      (c.ShortDescription && c.ShortDescription.toLowerCase().includes(search)) ||
      (c.Content && c.Content.toLowerCase().includes(search))
    );
  }

  // Sort alphabetically by ClassName
  return filtered.slice().sort((a, b) =>
    a.ClassName.localeCompare(b.ClassName, undefined, { sensitivity: 'base' })
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
const isTemplateClass = (classItem) => {
  return classItem?.IsTemplate === true && !classItem?.RealmID;
};

const hasFullDetails = (classItem) => {
  // Check if this is a minimal class object that needs full details fetched
  if (!classItem) return false;

  const keys = Object.keys(classItem);

  // Content is a key property - if it's missing, we need to fetch
  // (Content can be an empty string "", which is valid, but undefined means not fetched)
  if (!keys.includes('Content')) {
    return false; // Needs fetch
  }

  // Check for minimal realm-specific class: ClassName, ID, RealmID (with optional Replaces and IsDisabled)
  // This could be 3-5 properties
  const hasRealmClass = keys.includes('ClassName') &&
                        keys.includes('ID') &&
                        keys.includes('RealmID');
  if (hasRealmClass && keys.length <= 5) {
    // If it only has ClassName, ID, RealmID (and optionally Replaces, IsDisabled), needs fetch
    const onlyHasMinimalProps = keys.every(k =>
      k === 'ClassName' || k === 'ID' || k === 'RealmID' || k === 'Replaces' || k === 'IsDisabled'
    );
    if (onlyHasMinimalProps) return false; // Needs fetch
  }

  // Check for minimal template class: ClassName, ID, GamingSystemID (3 properties)
  if (keys.length === 3) {
    const hasMinimalTemplateProps = keys.includes('ClassName') &&
                                     keys.includes('ID') &&
                                     keys.includes('GamingSystemID');
    if (hasMinimalTemplateProps) return false; // Needs fetch
  }

  // Otherwise, assume it has full details
  return true;
};

const canEditClass = (classItem) => {
  // Admins can edit anything
  if (userStore.isAdmin) return true;

  // Template classes can only be edited by admins (will create override)
  if (isTemplateClass(classItem)) return true;

  // Custom and override classes can be edited by anyone with access to the realm
  return true;
};

const getEditTitle = (classItem) => {
  if (!canEditClass(classItem)) return 'Admin only';
  if (isTemplateClass(classItem) && !userStore.isAdmin) return 'Create custom version';
  return 'Edit';
};

const getFormTitle = () => {
  if (isCreatingOverride.value) return 'Create Custom Version';
  if (editingClass.value) return 'Edit Class';
  return 'Add New Class';
};

const extractShortDesc = (content) => {
  if (!content) return '';
  // Strip HTML tags and get first 100 characters
  const text = content.replace(/<[^>]*>/g, '');
  return text.length > 100 ? text.substring(0, 100) + '...' : text;
};

// API Methods
const fetchClasses = async (force = false) => {
  loading.value = true;
  error.value = null;

  try {
    // Use the classes store to load classes for the current realm
    // Only force reload after mutations, not on initial load
    await classesStore.loadClasses(force);

    // Update local classes list from the store
    classes.value = classesStore.getClassesForCurrentRealm;
  } catch (err) {
    console.error('Error fetching classes:', err);
    error.value = err.response?.data?.message || 'Failed to load classes';
  } finally {
    loading.value = false;
  }
};

// CRUD Methods
const addNewClass = async () => {
  error.value = null;
  editingClass.value = null;
  isCreatingOverride.value = false;
  formData.value = {
    ClassName: '',
    ShortDescription: '',
    Content: '',
    Tags: [],
    HitPointsData: {},
    PrimaryAttributes: [],
    Proficiencies: {}
  };
  tagsInput.value = '';
  primaryAttributesInput.value = '';
  hitPointsData.value = { base: null, perLevel: null, diceType: '' };
  proficiencies.value = {
    weaponsInput: '',
    armorInput: '',
    savesInput: '',
    skillsInput: '',
    toolsInput: ''
  };
  theGameForm.value = { Segment: '', Parent: null, Skills: [], OptionalSkills: [], IsWizard: false };

  // Use nextTick to ensure all reactive updates are processed before showing the dialog
  await nextTick();
  showForm.value = true;
};

const editClass = async (classItem) => {
  error.value = null;

  // Check if the class is already in the classes store with full details
  const cachedClass = classesStore.getClassById(classItem.ID);
  let classData = classItem;

  if (cachedClass && hasFullDetails(cachedClass)) {
    // Use cached data - no need to fetch
    classData = cachedClass;
  } else {
    // Need to fetch full details - set loading state
    loadingClassId.value = classItem.ID;

    try {
      // Fetch full class details from the classes store
      classData = await classesStore.getClass(classItem.ID) || classItem;
    } finally {
      loadingClassId.value = null;
    }
  }

  editingClass.value = classData;

  // Check if this is a template class being edited by non-admin
  if (isTemplateClass(classData) && !userStore.isAdmin) {
    isCreatingOverride.value = true;
  } else {
    isCreatingOverride.value = false;
  }

  formData.value = {
    ClassName: classData.ClassName,
    ShortDescription: classData.ShortDescription || '',
    Content: classData.Content || '',
    Tags: classData.Tags || [],
    HitPointsData: classData.HitPointsData || {},
    PrimaryAttributes: classData.PrimaryAttributes || [],
    Proficiencies: classData.Proficiencies || {}
  };

  // Initialize helper inputs
  tagsInput.value = (classData.Tags || []).join(', ');
  primaryAttributesInput.value = (classData.PrimaryAttributes || []).join(', ');
  hitPointsData.value = { ...(classData.HitPointsData || { base: null, perLevel: null, diceType: '' }) };

  const prof = classData.Proficiencies || {};
  proficiencies.value = {
    weaponsInput: (prof.weapons || []).join(', '),
    armorInput: (prof.armor || []).join(', '),
    savesInput: (prof.saves || []).join(', '),
    skillsInput: (prof.skills || []).join(', '),
    toolsInput: (prof.tools || []).join(', ')
  };

  // Initialize TheGame form from MechanicsData
  if (isTheGame.value && classData.MechanicsData) {
    theGameForm.value = {
      Segment: classData.MechanicsData.Segment || '',
      Parent: classData.MechanicsData.Parent || null,
      Skills: classData.MechanicsData.Skills || [],
      OptionalSkills: classData.MechanicsData.OptionalSkills || [],
      IsWizard: !!classData.MechanicsData.IsWizard
    };
  } else {
    theGameForm.value = { Segment: '', Parent: null, Skills: [], OptionalSkills: [], IsWizard: false };
  }

  // Use nextTick to ensure all reactive updates are processed before showing the dialog
  await nextTick();
  showForm.value = true;
};

const saveClass = async () => {
  if (!isFormValid.value || saving.value) return;

  saving.value = true;
  error.value = null;

  try {
    // Parse comma-separated inputs
    const tags = tagsInput.value
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const primaryAttrs = primaryAttributesInput.value
      .split(',')
      .map(a => a.trim())
      .filter(a => a.length > 0);

    const prof = {
      weapons: proficiencies.value.weaponsInput.split(',').map(w => w.trim()).filter(w => w.length > 0),
      armor: proficiencies.value.armorInput.split(',').map(a => a.trim()).filter(a => a.length > 0),
      saves: proficiencies.value.savesInput.split(',').map(s => s.trim()).filter(s => s.length > 0),
      skills: proficiencies.value.skillsInput.split(',').map(s => s.trim()).filter(s => s.length > 0),
      tools: proficiencies.value.toolsInput.split(',').map(t => t.trim()).filter(t => t.length > 0)
    };

    // Build base class data
    let baseData;
    if (isTheGame.value) {
      baseData = {
        ClassName: formData.value.ClassName.trim(),
        Content: formData.value.Content.trim() || '',
        Image: formData.value.Image || undefined,
        MechanicsData: {
          Name: formData.value.ClassName.trim(),
          Segment: theGameForm.value.Segment || undefined,
          Parent: theGameForm.value.Parent || undefined,
          Skills: theGameForm.value.Skills.length > 0 ? theGameForm.value.Skills : undefined,
          OptionalSkills: theGameForm.value.OptionalSkills.length > 0 ? theGameForm.value.OptionalSkills : undefined,
          IsWizard: theGameForm.value.IsWizard || undefined
        }
      };
    } else {
      baseData = {
        ClassName: formData.value.ClassName.trim(),
        ShortDescription: formData.value.ShortDescription.trim() || undefined,
        Content: formData.value.Content.trim() || '',
        Tags: tags.length > 0 ? tags : undefined,
        HitPointsData: (hitPointsData.value.base || hitPointsData.value.perLevel || hitPointsData.value.diceType)
          ? hitPointsData.value
          : undefined,
        PrimaryAttributes: primaryAttrs.length > 0 ? primaryAttrs : undefined,
        Proficiencies: (prof.weapons.length || prof.armor.length || prof.saves.length || prof.skills.length || prof.tools.length)
          ? prof
          : undefined
      };
    }

    if (isCreatingOverride.value) {
      // Creating an override of a template class
      // Start with ALL fields from the template class
      const templateData = { ...editingClass.value };

      // Remove fields that should not be in the override
      delete templateData.ID;  // New ID will be generated by backend
      delete templateData.IsTemplate;  // Override is not a template
      delete templateData.GamingSystemID;  // Override is realm-specific
      delete templateData.RealmID;  // Backend will set from user's ActiveRealm
      delete templateData.CreatedAt;  // Backend will set
      delete templateData.UpdatedAt;  // Backend will set

      // Merge with form data changes and set Replaces
      const overrideData = {
        ...templateData,
        ...baseData,
        Replaces: editingClass.value.ID,
        IsTemplate: false
      };

      await apiClient.post('/classes/class', overrideData);
    } else if (editingClass.value) {
      // Updating existing - backend will create override if it's a template
      const updateData = {
        ...baseData,
        RealmID: props.realmId  // Backend uses this to create override for template classes
      };
      await apiClient.put(`/classes/class/${editingClass.value.ID}`, updateData);
    } else {
      // Creating new custom class
      // Backend will set RealmID from user's ActiveRealm
      const newClassData = {
        ...baseData,
        IsTemplate: false
      };

      await apiClient.post('/classes/class', newClassData);
    }

    // Refresh the list
    await fetchClasses(true);
    cancelForm();
  } catch (err) {
    console.error('Error saving class:', err);
    error.value = err.response?.data?.message || 'Failed to save class';
  } finally {
    saving.value = false;
  }
};

const cancelForm = () => {
  showForm.value = false;
  editingClass.value = null;
  isCreatingOverride.value = false;
  formData.value = {
    ClassName: '',
    ShortDescription: '',
    Content: '',
    Tags: [],
    HitPointsData: {},
    PrimaryAttributes: [],
    Proficiencies: {}
  };
  tagsInput.value = '';
  primaryAttributesInput.value = '';
  hitPointsData.value = { base: null, perLevel: null, diceType: '' };
  proficiencies.value = {
    weaponsInput: '',
    armorInput: '',
    savesInput: '',
    skillsInput: '',
    toolsInput: ''
  };
  theGameForm.value = { Segment: '', Parent: null, Skills: [], OptionalSkills: [], IsWizard: false };
};

const confirmDisable = (classItem) => {
  error.value = null;
  classToDisable.value = classItem;
  showDisableConfirm.value = true;
};

const disableClass = async () => {
  if (!classToDisable.value || disabling.value) return;

  disabling.value = true;
  error.value = null;

  try {
    // Check if we're creating an override (editing template with form changes)
    if (isCreatingOverride.value) {
      // Build baseData same as saveClass
      let baseData;
      if (isTheGame.value) {
        baseData = {
          ClassName: formData.value.ClassName.trim(),
          Content: formData.value.Content.trim() || '',
          MechanicsData: {
            Name: formData.value.ClassName.trim(),
            Segment: theGameForm.value.Segment || undefined,
            Parent: theGameForm.value.Parent || undefined,
            Skills: theGameForm.value.Skills.length > 0 ? theGameForm.value.Skills : undefined,
            OptionalSkills: theGameForm.value.OptionalSkills.length > 0 ? theGameForm.value.OptionalSkills : undefined,
            IsWizard: theGameForm.value.IsWizard || undefined
          }
        };
      } else {
        const tags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t.length > 0);
        const primaryAttrs = primaryAttributesInput.value.split(',').map(a => a.trim()).filter(a => a.length > 0);
        const prof = {
          weapons: proficiencies.value.weaponsInput.split(',').map(w => w.trim()).filter(w => w.length > 0),
          armor: proficiencies.value.armorInput.split(',').map(a => a.trim()).filter(a => a.length > 0),
          saves: proficiencies.value.savesInput.split(',').map(s => s.trim()).filter(s => s.length > 0),
          skills: proficiencies.value.skillsInput.split(',').map(s => s.trim()).filter(s => s.length > 0),
          tools: proficiencies.value.toolsInput.split(',').map(t => t.trim()).filter(t => t.length > 0)
        };
        baseData = {
          ClassName: formData.value.ClassName.trim(),
          ShortDescription: formData.value.ShortDescription.trim() || undefined,
          Content: formData.value.Content.trim() || '',
          Tags: tags.length > 0 ? tags : undefined,
          HitPointsData: (hitPointsData.value.base || hitPointsData.value.perLevel || hitPointsData.value.diceType)
            ? hitPointsData.value
            : undefined,
          PrimaryAttributes: primaryAttrs.length > 0 ? primaryAttrs : undefined,
          Proficiencies: (prof.weapons.length || prof.armor.length || prof.saves.length || prof.skills.length || prof.tools.length)
            ? prof
            : undefined
        };
      }

      // Creating an override with form data and IsDisabled: true
      const templateData = { ...classToDisable.value };
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
        Replaces: classToDisable.value.ID,
        IsDisabled: true,
        IsTemplate: false
      };

      await apiClient.post('/classes/class', disabledOverride);
    } else if (isTemplateClass(classToDisable.value) && !userStore.isAdmin) {
      // TEMPLATE (non-admin): Create an override with IsDisabled: true (soft-delete in this realm)
      const templateData = { ...classToDisable.value };

      // Remove fields that should not be in the override
      delete templateData.ID;  // New ID will be generated by backend
      delete templateData.IsTemplate;  // Override is not a template
      delete templateData.GamingSystemID;  // Override is realm-specific
      delete templateData.RealmID;  // Backend will set from user's ActiveRealm
      delete templateData.CreatedAt;  // Backend will set
      delete templateData.UpdatedAt;  // Backend will set
      delete templateData.IsDisabled;  // Ensure we set our own value

      // Create the disabled override
      const disabledOverride = {
        ...templateData,
        Replaces: classToDisable.value.ID,  // Reference the template
        IsDisabled: true,  // Mark as disabled
        IsTemplate: false  // Override is not a template
      };

      await apiClient.post('/classes/class', disabledOverride);
    } else {
      // ADMIN disabling TEMPLATE — update template directly (hides it in every realm without an override)
      // Otherwise (OVERRIDE or CUSTOM) — direct update on the class itself
      const updateData = { IsDisabled: true };
      if (!isTemplateClass(classToDisable.value)) {
        updateData.RealmID = props.realmId;
      }

      await apiClient.put(`/classes/class/${classToDisable.value.ID}`, updateData);
    }

    // Refresh the list
    await fetchClasses(true);

    // Close all dialogs
    cancelDisable();
    cancelForm();
  } catch (err) {
    console.error('Error disabling class:', err);
    error.value = err.response?.data?.message || 'Failed to disable class';
  } finally {
    disabling.value = false;
  }
};

const cancelDisable = () => {
  showDisableConfirm.value = false;
  classToDisable.value = null;
};

// Permanent Delete Methods
const confirmPermanentDelete = (classItem) => {
  error.value = null;
  classToDelete.value = classItem;
  deleteDialog.value?.show();
};

const permanentDeleteClass = async () => {
  if (!classToDelete.value || deleting.value) return;

  deleting.value = true;
  error.value = null;

  try {
    // Send DELETE request to permanently remove the class
    await apiClient.delete(`/classes/class/${classToDelete.value.ID}`);

    // Refresh the list
    await fetchClasses(true);

    // Close all dialogs
    cancelPermanentDelete();
    cancelForm();
  } catch (err) {
    console.error('Error deleting class:', err);
    error.value = err.response?.data?.message || 'Failed to delete class permanently';
  } finally {
    deleting.value = false;
  }
};

const cancelPermanentDelete = () => {
  deleteDialog.value?.close();
  classToDelete.value = null;
};

const restoreClass = async () => {
  if (!editingClass.value || saving.value) return;

  saving.value = true;
  error.value = null;

  try {
    // Update the class to set IsDisabled to false
    const updateData = {
      IsDisabled: false,
      RealmID: props.realmId
    };

    await apiClient.put(`/classes/class/${editingClass.value.ID}`, updateData);

    // Refresh the list
    await fetchClasses(true);
    cancelForm();
  } catch (err) {
    console.error('Error restoring class:', err);
    error.value = err.response?.data?.message || 'Failed to restore class';
  } finally {
    saving.value = false;
  }
};

const viewTemplate = async () => {
  if (!editingClass.value?.Replaces) {
    console.error('No template to view - Replaces field not set');
    return;
  }

  error.value = null;

  try {
    // Fetch the template class using the Replaces field
    const response = await apiClient.get(`/classes/class/${editingClass.value.Replaces}`);

    if (response.status >= 200 && response.status < 300) {
      templateClass.value = response.data;
      viewingTemplate.value = true;
    } else {
      error.value = 'Failed to load template class';
    }
  } catch (err) {
    console.error('Error fetching template class:', err);
    error.value = err.response?.data?.message || 'Failed to load template class';
  }
};

const cancelViewTemplate = () => {
  viewingTemplate.value = false;
  templateClass.value = null;
};

const confirmRevert = () => {
  showRevertConfirm.value = true;
};

const cancelRevert = () => {
  showRevertConfirm.value = false;
};

const revertToTemplate = async () => {
  if (!editingClass.value || reverting.value) return;

  reverting.value = true;
  error.value = null;

  try {
    // Delete the override class
    await apiClient.delete(`/classes/class/${editingClass.value.ID}`);

    // Refresh the list
    await fetchClasses(true);

    // Close all dialogs
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
onMounted(async () => {
  await fetchClasses();
  if (isTheGame.value) {
    await skillsStore.loadSkills();
  }
});

// Expose methods for parent components
defineExpose({
  refreshClasses: () => {
    classes.value = classesStore.getClassesForCurrentRealm;
  }
});
</script>

<style scoped>
.classes-crud {
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
.classes-list {
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

.classes-table {
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

.disabled-class {
  background: rgba(128, 128, 128, 0.15) !important;
  opacity: 0.7;
}

.disabled-class:hover {
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
.class-dialog {
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

.class-dialog[open] {
  display: grid;
  grid-template-rows: auto 1fr auto;
}

.class-dialog::backdrop {
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

.form-textarea {
  resize: vertical;
  min-height: 120px;
}

.form-hint {
  color: #999;
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

.form-hint a {
  color: var(--theme-accent);
  text-decoration: none;
}

.form-hint a:hover {
  text-decoration: underline;
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

/* Vue Multiselect Custom Styling */
.form-multiselect-vue {
  font-size: 1rem;
  font-family: inherit;
}

.form-multiselect-vue :deep(.multiselect__tags) {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  color: #ffffff;
  padding: 0.5rem 0.75rem;
  min-height: 42px;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.form-multiselect-vue :deep(.multiselect__tags:hover) {
  border-color: rgba(255, 255, 255, 0.2);
}

.form-multiselect-vue:focus-within :deep(.multiselect__tags) {
  outline: none;
  border-color: color-mix(in srgb, var(--theme-accent) 50%, transparent);
  background: rgba(255, 255, 255, 0.08) !important;
}

.form-multiselect-vue :deep(.multiselect__tag) {
  background: color-mix(in srgb, var(--theme-accent) 20%, transparent);
  color: var(--theme-accent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  margin-bottom: 0.25rem;
  margin-right: 0.5rem;
  padding: 0.5rem 1.75rem 0.5rem 0.75rem;
  font-size: 0.9rem;
  line-height: 1.4;
  position: relative;
}

.form-multiselect-vue :deep(.multiselect__tag-icon) {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 1.5rem;
  text-align: center;
  line-height: 1.4;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease;
}

.form-multiselect-vue :deep(.multiselect__tag-icon:hover) {
  background: color-mix(in srgb, var(--theme-accent) 40%, transparent);
}

.form-multiselect-vue :deep(.multiselect__tag-icon:after) {
  color: var(--theme-accent);
  font-size: 1.1rem;
  font-weight: bold;
}

.form-multiselect-vue :deep(.multiselect__input) {
  background: transparent !important;
  color: #ffffff;
  border: none;
  padding: 0.25rem 0;
  font-size: 1rem;
  font-family: inherit;
}

.form-multiselect-vue :deep(.multiselect__input)::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.form-multiselect-vue :deep(.multiselect__placeholder) {
  color: rgba(255, 255, 255, 0.5);
  padding: 0.25rem 0;
  margin-bottom: 0;
  font-size: 0.9rem;
}

.form-multiselect-vue :deep(.multiselect__content-wrapper) {
  background: #2F364E;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  margin-top: 0.25rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.form-multiselect-vue :deep(.multiselect__content) {
  background: #2F364E;
}

.form-multiselect-vue :deep(.multiselect__option) {
  color: #ffffff;
  padding: 0.75rem 1rem;
  min-height: auto;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.form-multiselect-vue :deep(.multiselect__option--highlight) {
  background: color-mix(in srgb, var(--theme-accent) 15%, transparent);
  color: var(--theme-accent);
}

.form-multiselect-vue :deep(.multiselect__option--selected) {
  background: color-mix(in srgb, var(--theme-accent) 25%, transparent);
  color: var(--theme-accent);
  font-weight: 600;
}

.form-multiselect-vue :deep(.multiselect__option--selected.multiselect__option--highlight) {
  background: color-mix(in srgb, var(--theme-accent) 35%, transparent);
  color: var(--theme-accent);
}

.form-multiselect-vue :deep(.multiselect__single) {
  background: transparent;
  color: #ffffff;
  padding: 0.25rem 0;
  margin-bottom: 0;
  font-size: 1rem;
}

.form-multiselect-vue :deep(.multiselect__spinner) {
  background: rgba(255, 255, 255, 0.05);
}

.form-multiselect-vue :deep(.multiselect__spinner:before),
.form-multiselect-vue :deep(.multiselect__spinner:after) {
  border-top-color: var(--theme-accent);
}

.form-multiselect-vue :deep(.multiselect__select) {
  background: transparent !important;
}

.form-multiselect-vue :deep(.multiselect__tags-wrap) {
  background: transparent !important;
}

.checkbox-label {
  display: flex !important;
  flex-direction: row !important;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  color: #D2B48C !important;
  font-weight: 500 !important;
}

.checkbox-label input[type="checkbox"] {
  width: 1.1rem;
  height: 1.1rem;
  accent-color: var(--theme-accent);
  cursor: pointer;
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
.disable-confirm-content {
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

.disable-confirm-content p {
  color: #ccc;
  font-size: 1rem;
  margin: 0 0 0.5rem 0;
}

.disable-confirm-content strong {
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

  .class-dialog {
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
