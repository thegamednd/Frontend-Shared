<template>
  <div class="report-add">
    <!-- Header -->
    <div class="form-header">
      <h2>
        <i class="material-symbols-outlined">add</i>
        Create New Report
      </h2>
      <div class="header-actions">
        <button @click="$emit('cancel')" class="btn btn-secondary">
          <i class="material-symbols-outlined">close</i>
          Cancel
        </button>
        <button 
          @click="saveReport" 
          :disabled="!isValid || saving"
          class="btn btn-primary"
        >
          <i class="material-symbols-outlined" v-if="!saving">save</i>
          <div v-else class="saving-spinner"></div>
          {{ saving ? 'Saving...' : 'Save Report' }}
        </button>
      </div>
    </div>

    <!-- Form Content -->
    <div class="form-content">
      <form @submit.prevent="saveReport" class="report-form">
        <!-- Author Section (only show for users with elevated permissions) -->
        <section v-if="canSetAuthor" class="form-section">
          <h3>
            <i class="material-symbols-outlined">person</i>
            Report Author
          </h3>
          
          <div class="author-field">
            <label class="field-label">Author *</label>
            <Multiselect
              v-model="form.author"
              :options="authorOptions"
              :searchable="true"
              :close-on-select="true"
              :show-labels="false"
              :allow-empty="false"
              placeholder="Select author..."
              label="Name"
              track-by="ID"
              class="author-multiselect"
            />
            <div class="field-help">
              As an owner/DM/admin, you can create reports for any non-deceased character.
            </div>
          </div>
        </section>
        
        <!-- Author Info for Regular Users -->
        <section v-else class="form-section">
          <h3>
            <i class="material-symbols-outlined">person</i>
            Report Author
          </h3>
          
          <div class="author-info">
            <div class="auto-author">
              <i class="material-symbols-outlined">account_circle</i>
              <span v-if="userActiveCharacter">{{ userActiveCharacter.Name }}</span>
              <span v-else class="no-character">No active character set</span>
            </div>
            <div class="field-help">
              This report will be automatically authored by your active character.
            </div>
          </div>
        </section>

        <!-- Date Section -->
        <section class="form-section">
          <h3>
            <i class="material-symbols-outlined">calendar_today</i>
            Report Dates
          </h3>
          
          <div class="date-fields">
            <div class="date-group">
              <label class="field-label">Start Date *</label>
              <div class="date-inputs">
                <select v-model="form.startYear" required class="date-select">
                  <option value="">Year</option>
                  <option v-for="year in availableYears" :key="year" :value="year">
                    {{ year }}
                  </option>
                </select>
                <select v-model="form.startMonth" required class="date-select">
                  <option value="">Month</option>
                  <option v-for="(month, index) in months" :key="index" :value="index + 1">
                    {{ month }}
                  </option>
                </select>
                <select v-model="form.startDay" required class="date-select">
                  <option value="">Day</option>
                  <option v-for="day in daysInMonth(form.startYear, form.startMonth)" :key="day" :value="day">
                    {{ day }}
                  </option>
                </select>
              </div>
            </div>
            
            <div class="date-group">
              <label class="field-label">End Date *</label>
              <div class="date-inputs">
                <select v-model="form.endYear" class="date-select">
                  <option value="">Year</option>
                  <option v-for="year in availableYears" :key="year" :value="year">
                    {{ year }}
                  </option>
                </select>
                <select v-model="form.endMonth" class="date-select">
                  <option value="">Month</option>
                  <option v-for="(month, index) in months" :key="index" :value="index + 1">
                    {{ month }}
                  </option>
                </select>
                <select v-model="form.endDay" class="date-select">
                  <option value="">Day</option>
                  <option v-for="day in daysInMonth(form.endYear, form.endMonth)" :key="day" :value="day">
                    {{ day }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <!-- Party Members Section -->
        <section class="form-section">
          <h3>
            <i class="material-symbols-outlined">group</i>
            Party Members
          </h3>
          
          <div class="members-section">
            <div class="members-field">
              <label class="field-label">Party Members</label>
              <Multiselect
                v-model="form.members"
                :options="availableCharactersForMembers"
                :multiple="true"
                :searchable="true"
                :close-on-select="false"
                :show-labels="false"
                placeholder="Select party members..."
                label="Name"
                track-by="ID"
                class="members-multiselect"
              />
              <div class="field-help">
                Select multiple characters who participated in this report.
              </div>
            </div>
          </div>
        </section>

        <!-- Report Content Section -->
        <section class="form-section">
          <h3>
            <i class="material-symbols-outlined">description</i>
            Report Content
          </h3>
          
          <div class="content-field">
            <label class="field-label">Report Details</label>
            <InlineEditor
              v-model="form.content"
              :image-upload="true"
              :image-upload-locked="!realmStore.isPaidTier"
              placeholder="Describe the events, encounters, discoveries, and outcomes of this period..."
              @upgrade-required="showImageUpgradePrompt"
            />
            <div class="field-help">
              Describe the events, encounters, discoveries, and outcomes of this period.
            </div>
          </div>
          
          <div class="content-field">
            <label class="field-label">Ending at *</label>
            <textarea
              v-model="form.endingAt"
              placeholder="Describe where the party ended up at the conclusion of this report..."
              rows="3"
              required
              class="ending-textarea"
            ></textarea>
            <div class="field-help">
              Required: Describe the party's location and situation at the end of this report.
            </div>
          </div>
        </section>

        <!-- Validation Errors -->
        <div v-if="validationErrors.length > 0" class="validation-errors">
          <h4>
            <i class="material-symbols-outlined">error</i>
            Please fix the following errors:
          </h4>
          <ul>
            <li v-for="error in validationErrors" :key="error">{{ error }}</li>
          </ul>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useReportsStore } from '@shared/stores/reports';
import { useUserStore } from '@shared/stores/user';
import { useDateStore } from '@shared/stores/date';
import { useCharacterStore } from '@shared/stores/character';
import { useRealmStore } from '@shared/stores/realm';
import { useNotifications } from '@shared/composables/useNotifications';
import Multiselect from 'vue-multiselect';
import 'vue-multiselect/dist/vue-multiselect.css';
import InlineEditor from '@shared/components/cms/InlineEditor.vue';

const emit = defineEmits(['report-saved', 'cancel']);

// Components
defineOptions({
  components: {
    Multiselect,
    InlineEditor
  }
});

const reportsStore = useReportsStore();
const userStore = useUserStore();
const dateStore = useDateStore();
const characterStore = useCharacterStore();
const realmStore = useRealmStore();

// Notifications
const { notifyError, notifyInfo } = useNotifications();

// Free-tier users see the image button but are prompted to upgrade on click.
function showImageUpgradePrompt() {
  notifyInfo('Adding images to reports is a paid feature. Upgrade your realm to unlock image uploads.');
}

// Form state
const form = ref({
  author: null, // Will be set to active character or selected character
  startYear: dateStore.date.y, // Initialize with current game world year
  startMonth: dateStore.date.m + 1, // Convert from 0-based to 1-based
  startDay: dateStore.date.d,
  endYear: dateStore.date.y,
  endMonth: dateStore.date.m + 1, // Convert from 0-based to 1-based
  endDay: dateStore.date.d,
  members: [],
  content: '<p></p>', // Initialize with empty paragraph for CKEditor
  endingAt: '' // Required ending location field
});

const saving = ref(false);

// Constants
const months = computed(() => dateStore.arMonths.map(month => month.Name));

// Character-related computed properties
const availableCharacters = computed(() => {
  return Object.values(characterStore.characters).filter(char => char.Group !== 'Deceased');
});

const canSetAuthor = computed(() => {
  // Check if user has elevated permissions (admin, owner, DM, or write access)
  if (userStore.isAdministrator || userStore.isOwner || realmStore.isRealmDM) {
    return true;
  }
  
  // Check if user has write access in this realm
  const currentUserPlayer = realmStore.arActivePlayers?.find(player => player.UserID === userStore.userSub);
  return !!currentUserPlayer?.WriteAccess;
});

// Get the user's active character from the realm players list
const userActiveCharacter = computed(() => {
  const currentUserPlayer = realmStore.arActivePlayers?.find(player => player.UserID === userStore.userSub);
  const activeCharacterId = currentUserPlayer?.ActiveCharacter;
  
  if (!activeCharacterId) return null;
  
  // Find the character in the character store
  return characterStore.characterList?.find(char => char.ID === activeCharacterId) || null;
});

const authorOptions = computed(() => {
  if (canSetAuthor.value) {
    return availableCharacters.value;
  } else {
    // Regular users can only use their active character
    return userActiveCharacter.value ? [userActiveCharacter.value] : [];
  }
});

const availableCharactersForMembers = computed(() => {
  // All non-deceased characters are available for party members
  return availableCharacters.value;
});

// Computed
const availableYears = computed(() => {
  const currentYear = dateStore.date.y; // Use game world year
  const years = [];
  for (let year = currentYear; year >= Math.max(1, currentYear - 50); year--) {
    years.push(year);
  }
  return years;
});

const validationErrors = computed(() => {
  const errors = [];
  
  // Check author - for regular users, use their active character automatically
  const authorToCheck = canSetAuthor.value ? form.value.author : userActiveCharacter.value;
  if (!authorToCheck || !authorToCheck.ID) {
    errors.push('Author is required');
  }
  
  if (!form.value.startYear || !form.value.startMonth || !form.value.startDay) {
    errors.push('Start date is required');
  }
  
  if (!form.value.endYear || !form.value.endMonth || !form.value.endDay) {
    errors.push('End date is required');
  }
  
  if (!form.value.endingAt || form.value.endingAt.trim() === '') {
    errors.push('Ending location is required');
  }
  
  if (form.value.startYear && form.value.startMonth && form.value.startDay &&
      form.value.endYear && form.value.endMonth && form.value.endDay) {
    
    const startDate = new Date(form.value.startYear, form.value.startMonth - 1, form.value.startDay);
    const endDate = new Date(form.value.endYear, form.value.endMonth - 1, form.value.endDay);
    const currentDate = new Date(dateStore.date.y, dateStore.date.m, dateStore.date.d);
    
    if (endDate < startDate) {
      errors.push('End date cannot be before start date');
    }
    
    if (endDate > currentDate) {
      errors.push('End date cannot be in the future');
    }
    
    if (startDate > currentDate) {
      errors.push('Start date cannot be in the future');
    }
  }
  
  
  return errors;
});

const isValid = computed(() => {
  return validationErrors.value.length === 0;
});

// Methods
const daysInMonth = (year, month) => {
  if (!year || !month) return [];
  
  const daysCount = new Date(year, month, 0).getDate();
  const days = [];
  for (let day = 1; day <= daysCount; day++) {
    days.push(day);
  }
  return days;
};



const saveReport = async () => {
  if (!isValid.value || saving.value) return;
  
  saving.value = true;
  
  try {
    // Determine the author - for regular users, use their active character
    const author = canSetAuthor.value ? form.value.author : userActiveCharacter.value;
    
    // Prepare report data
    const reportData = {
      Author: author.ID,
      Year: Number(form.value.startYear),
      Dates: {
        Start: {
          Y: Number(form.value.startYear),
          M: Number(form.value.startMonth),
          D: Number(form.value.startDay)
        },
        End: {
          Y: Number(form.value.endYear),
          M: Number(form.value.endMonth),
          D: Number(form.value.endDay)
        }
      },
      Characters: form.value.members.map(member => member.ID || member.id),
      Report: form.value.content.trim(),
      Sanitized: form.value.content.trim(), // In a real app, you'd sanitize this
      EndingAt: form.value.endingAt.trim()
    };
    
    // Save the report
    const savedReport = await reportsStore.createReport(reportData);
    
    emit('report-saved', savedReport);
    
  } catch (error) {
    console.error('Failed to save report:', error);
    
    // Show user-friendly error message
    if (error.response?.status === 400) {
      notifyError('Please check your report data. Some fields may be invalid.');
    } else if (error.response?.status === 403) {
      notifyError('You do not have permission to create reports.');
    } else if (error.response?.status >= 500) {
      notifyError('Server error occurred. Please try again later.');
    } else {
      notifyError('Failed to save report. Please try again.');
    }
  } finally {
    saving.value = false;
  }
};

// Watch for author changes to auto-populate party members
watch(() => form.value.author, (newAuthor, oldAuthor) => {
  if (!canSetAuthor.value) return; // Only for users who can set authors
  
  if (newAuthor && newAuthor.ID) {
    // Add new author to party members if not already there
    const isAlreadyMember = form.value.members.some(member => 
      (member.ID || member.id) === (newAuthor.ID || newAuthor.id)
    );
    
    if (!isAlreadyMember) {
      form.value.members = [...form.value.members, newAuthor];
    }
  }
  
  // Remove old author from party members if they changed
  if (oldAuthor && oldAuthor.ID && newAuthor?.ID !== oldAuthor?.ID) {
    form.value.members = form.value.members.filter(member => 
      (member.ID || member.id) !== (oldAuthor.ID || oldAuthor.id)
    );
  }
});

// Watch for active character changes for regular users
watch(() => userActiveCharacter.value, (newActiveCharacter) => {
  if (canSetAuthor.value) return; // Only for regular users
  
  if (newActiveCharacter) {
    // For regular users, ensure their active character is always in party members
    const isAlreadyMember = form.value.members.some(member => 
      (member.ID || member.id) === newActiveCharacter.ID
    );
    
    if (!isAlreadyMember) {
      form.value.members = [newActiveCharacter, ...form.value.members];
    }
  }
});

onMounted(() => {
  // Initialize with current game world date
  const currentDate = dateStore.date;
  form.value.startYear = currentDate.y;
  form.value.startMonth = currentDate.m + 1; // Convert from 0-based to 1-based
  form.value.startDay = currentDate.d;
  
  // Initialize end date to same as start date
  form.value.endYear = currentDate.y;
  form.value.endMonth = currentDate.m + 1; // Convert from 0-based to 1-based
  form.value.endDay = currentDate.d;
  
  // Set default author to active character for regular users
  if (!canSetAuthor.value && userActiveCharacter.value) {
    form.value.author = userActiveCharacter.value;
    // For regular users, pre-populate their active character in party members
    form.value.members = [userActiveCharacter.value];
  }
});
</script>

<style scoped>
.report-add {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #1a1f2e;
  color: #e2e8f0;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 2px solid #3a4a5c;
  background-color: #2d3748;
}

.form-header h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  color: #4299e1;
  font-size: 1.5rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.form-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.report-form {
  max-width: 800px;
  margin: 0 auto;
}

.form-section {
  margin-bottom: 2.5rem;
  padding: 1.5rem;
  background-color: #2d3748;
  border-radius: 12px;
  border: 1px solid #4a5568;
}

.form-section h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1.5rem 0;
  color: #4299e1;
  font-size: 1.2rem;
  font-weight: 600;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #4a5568;
}

.date-fields {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.date-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.field-label {
  font-weight: 600;
  color: #cbd5e0;
  font-size: 0.95rem;
}

.date-inputs {
  display: flex;
  gap: 1rem;
}

.date-select {
  flex: 1;
  padding: 0.75rem;
  background-color: #1a202c;
  border: 2px solid #4a5568;
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 0.95rem;
  transition: border-color 0.2s ease;
}

.date-select:focus {
  outline: none;
  border-color: #4299e1;
}


.members-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}


.author-field {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.author-multiselect {
  background-color: #1a202c;
  border-radius: 6px;
  color: #e2e8f0;
}

.author-multiselect :deep(.multiselect__tags) {
  background-color: #1a202c;
  border: 2px solid #4a5568;
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 0.95rem;
  min-height: 3rem;
}

.author-multiselect :deep(.multiselect__single) {
  color: #e2e8f0;
  background-color: transparent;
}

.author-multiselect :deep(.multiselect__placeholder) {
  color: #a0aec0;
}

.author-multiselect :deep(.multiselect__input) {
  background-color: transparent;
  color: #e2e8f0;
}

.author-multiselect :deep(.multiselect__content-wrapper) {
  background-color: #2d3748;
  border: 1px solid #4a5568;
  border-radius: 6px;
}

.author-multiselect :deep(.multiselect__option) {
  color: #e2e8f0;
  background-color: #2d3748;
}

.author-multiselect :deep(.multiselect__option--highlight) {
  background-color: #4299e1;
  color: white;
}

.author-multiselect :deep(.multiselect__option--selected) {
  background-color: #3182ce;
  color: white;
}

.members-field {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.members-multiselect {
  background-color: #1a202c;
  border-radius: 6px;
  color: #e2e8f0;
}

.members-multiselect :deep(.multiselect__tags) {
  background-color: #1a202c;
  border: 2px solid #4a5568;
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 0.95rem;
  min-height: 3rem;
}

.members-multiselect :deep(.multiselect__tag) {
  background-color: #4299e1;
  color: white;
  border-radius: 4px;
  margin-bottom: 0.25rem;
  padding: 0.25rem 2rem 0.25rem 0.5rem;
  font-weight: 500;
  border: 1px solid #3182ce;
  position: relative;
}

.members-multiselect :deep(.multiselect__tag-icon) {
  background-color: transparent;
  color: white;
  font-weight: bold;
  position: absolute;
  right: 0.25rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.25rem;
  height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  font-size: 0.875rem;
  line-height: 1;
}

.members-multiselect :deep(.multiselect__tag-icon:hover) {
  background-color: #2c5aa0;
  color: white;
}

.members-multiselect :deep(.multiselect__tag-icon:after) {
  color: white;
  font-size: 0.875rem;
}

.members-multiselect :deep(.multiselect__single) {
  color: #e2e8f0;
  background-color: transparent;
}

.members-multiselect :deep(.multiselect__placeholder) {
  color: #a0aec0;
}

.members-multiselect :deep(.multiselect__input) {
  background-color: transparent;
  color: #e2e8f0;
}

.members-multiselect :deep(.multiselect__content-wrapper) {
  background-color: #2d3748;
  border: 1px solid #4a5568;
  border-radius: 6px;
}

.members-multiselect :deep(.multiselect__option) {
  color: #e2e8f0;
  background-color: #2d3748;
}

.members-multiselect :deep(.multiselect__option--highlight) {
  background-color: #4299e1;
  color: white;
}

.members-multiselect :deep(.multiselect__option--selected) {
  background-color: #3182ce;
  color: white;
}


.content-field {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.ending-textarea {
  padding: 0.75rem;
  background-color: #1a202c;
  border: 2px solid #4a5568;
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 0.95rem;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.2s ease;
}

.ending-textarea:focus {
  outline: none;
  border-color: #4299e1;
}

.ending-textarea::placeholder {
  color: #a0aec0;
}


.field-help {
  font-size: 0.85rem;
  color: #a0aec0;
  font-style: italic;
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  font-size: 0.95rem;
}

.btn-primary {
  background-color: #4299e1;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #3182ce;
}

.btn-primary:disabled {
  background-color: #4a5568;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #4a5568;
  color: #e2e8f0;
}

.btn-secondary:hover {
  background-color: #2d3748;
}

.saving-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.validation-errors {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #742a2a;
  border: 1px solid #f56565;
  border-radius: 8px;
  color: #fed7d7;
}

.validation-errors h4 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.75rem 0;
  color: #f56565;
}

.validation-errors ul {
  margin: 0;
  padding-left: 1.5rem;
}

.validation-errors li {
  margin-bottom: 0.25rem;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .form-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .form-header h2 {
    font-size: 1.25rem;
  }
  
  .header-actions {
    justify-content: flex-end;
  }
  
  .form-content {
    padding: 1rem;
  }
  
  .form-section {
    padding: 1rem;
  }
  
  .date-inputs {
    flex-direction: column;
  }
  
  .add-member {
    flex-direction: column;
  }
  
  .add-member-btn {
    align-self: flex-start;
  }
}

/* Author Info Styles */
.author-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.auto-author {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background-color: rgba(66, 153, 225, 0.1);
  border: 1px solid rgba(66, 153, 225, 0.3);
  border-radius: 8px;
  color: #4299e1;
  font-weight: 500;
}

.auto-author .material-symbols-outlined {
  font-size: 1.5rem;
}

.no-character {
  color: #f56565;
  font-style: italic;
}

.field-help {
  font-size: 0.875rem;
  color: #94a3b8;
  margin-top: 0.5rem;
  line-height: 1.4;
}
</style>
