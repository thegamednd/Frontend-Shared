<template>
  <div class="report-edit">
    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner">
        <div v-for="n in 8" :key="n" class="spinner-dot"></div>
      </div>
      <p>Loading report...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <i class="material-symbols-outlined">error</i>
      <h3>Failed to Load Report</h3>
      <p>{{ error }}</p>
      <button @click="loadReport" class="retry-btn">
        <i class="material-symbols-outlined">refresh</i>
        Try Again
      </button>
    </div>

    <!-- Edit Form -->
    <div v-else-if="report" class="edit-form">
      <!-- Header -->
      <div class="form-header">
        <h2>
          <i class="material-symbols-outlined">edit</i>
          Edit Report
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
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>

      <!-- Form Content -->
      <div class="form-content">
        <form @submit.prevent="saveReport" class="report-form">
          <!-- Author Section -->
          <section class="form-section">
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
                label="name"
                track-by="id"
                class="author-multiselect"
              />
              <div v-if="!canSetAuthor" class="field-help">
                You can only edit reports as your active character.
              </div>
              <div v-else class="field-help">
                As an owner/DM, you can edit reports for any non-deceased character.
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
                  label="name"
                  track-by="id"
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

    <!-- Report Not Found -->
    <div v-else class="not-found">
      <i class="material-symbols-outlined">search_off</i>
      <h3>Report Not Found</h3>
      <p>The requested report could not be found or may have been deleted.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useReportsStore } from '@shared/stores/reports';
import { useUserStore } from '@shared/stores/user';
import { useDateStore } from '@shared/stores/date';
import { useCharacterStore } from '@shared/stores/character';
import { useRealmStore } from '@shared/stores/realm';
import { useNotifications } from '@shared/composables/useNotifications';
import Multiselect from 'vue-multiselect';
import InlineEditor from '@shared/components/cms/InlineEditor.vue';

const props = defineProps({
  reportId: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['report-saved', 'cancel']);

const reportsStore = useReportsStore();
const userStore = useUserStore();
const dateStore = useDateStore();
const characterStore = useCharacterStore();
const realmStore = useRealmStore();

// Notifications
const { notifySuccess, notifyError, notifyInfo } = useNotifications();

// Free-tier users see the image button but are prompted to upgrade on click.
function showImageUpgradePrompt() {
  notifyInfo('Adding images to reports is a paid feature. Upgrade your realm to unlock image uploads.');
}

// State
const loading = ref(false);
const saving = ref(false);
const error = ref(null);

// Form state
const form = ref({
  author: null,
  startYear: '',
  startMonth: '',
  startDay: '',
  endYear: '',
  endMonth: '',
  endDay: '',
  members: [],
  content: '',
  endingAt: ''
});

// Computed
const report = computed(() => {
  if (!props.reportId) return null;
  return reportsStore.getReportById(props.reportId);
});

const months = computed(() => dateStore.arMonths.map(month => month.Name));

const availableYears = computed(() => {
  const currentYear = dateStore.date.y;
  const oldestYear = reportsStore.getOldestReportYear || currentYear - 10;
  const years = [];
  for (let year = oldestYear; year <= currentYear + 1; year++) {
    years.push(year);
  }
  return years.reverse();
});

const canSetAuthor = computed(() => {
  return userStore.isDM || userStore.isOwner || userStore.isAdministrator;
});

const authorOptions = computed(() => {
  if (!canSetAuthor.value) {
    // Only allow current user's active character
    const activeCharacter = characterStore.characters[userStore.userSub];
    return activeCharacter ? [{ id: activeCharacter.ID, name: activeCharacter.Name }] : [];
  }
  
  // Allow any non-deceased character for DMs/owners
  return Object.values(characterStore.characters)
    .filter(char => char.Group !== 'Deceased')
    .map(char => ({
      id: char.ID,
      name: char.Name || 'Unknown'
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
});

const availableCharactersForMembers = computed(() => {
  return Object.values(characterStore.characters)
    .filter(char => char.Group !== 'Deceased')
    .map(char => ({
      id: char.ID,
      name: char.Name || 'Unknown'
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
});

const isValid = computed(() => {
  return form.value.author && 
         form.value.startYear && 
         form.value.startMonth && 
         form.value.startDay &&
         form.value.endingAt.trim().length > 0;
});

const validationErrors = computed(() => {
  const errors = [];
  
  if (!form.value.author) {
    errors.push('Author is required');
  }
  
  if (!form.value.startYear || !form.value.startMonth || !form.value.startDay) {
    errors.push('Start date is required');
  }
  
  if (!form.value.endingAt?.trim()) {
    errors.push('Ending location is required');
  }
  
  // Date validation logic (same as ReportAdd)
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

// Methods
const loadReport = async () => {
  if (!props.reportId) return;
  
  // Check if we already have the report data in the store
  const existingReport = reportsStore.getReportById(props.reportId);
  if (existingReport && existingReport.Report) {
    // Report already loaded, just populate the form
    populateForm();
    return;
  }
  
  // Only fetch if we don't have the full report data
  loading.value = true;
  error.value = null;
  
  try {
    await reportsStore.fetchReportById(props.reportId);
    populateForm();
  } catch (err) {
    console.error('Failed to load report:', err);
    error.value = 'Failed to load report. Please try again.';
  } finally {
    loading.value = false;
  }
};

const populateForm = () => {
  if (!report.value) return;
  
  // Author
  const authorId = report.value.Author;
  const authorChar = characterStore.characters[authorId];
  if (authorChar) {
    form.value.author = {
      id: authorChar.ID,
      name: authorChar.Name
    };
  }
  
  // Dates
  const startDate = report.value.Dates?.Start;
  if (startDate) {
    form.value.startYear = startDate.Y;
    form.value.startMonth = startDate.M;
    form.value.startDay = startDate.D;
  }
  
  const endDate = report.value.Dates?.End;
  if (endDate) {
    form.value.endYear = endDate.Y;
    form.value.endMonth = endDate.M;
    form.value.endDay = endDate.D;
  }
  
  // Members
  const memberIds = report.value.Characters || [];
  form.value.members = memberIds.map(memberId => {
    const memberChar = characterStore.characters[memberId];
    return memberChar ? {
      id: memberChar.ID,
      name: memberChar.Name
    } : null;
  }).filter(Boolean);
  
  // Content
  form.value.content = report.value.Report || '';
  form.value.endingAt = report.value.EndingAt || '';
};

const daysInMonth = (year, month) => {
  if (!year || !month) return Array.from({ length: 31 }, (_, i) => i + 1);
  
  // Use date store calendar data if available
  const monthData = dateStore.arMonths[month - 1];
  if (monthData && monthData.days) {
    return Array.from({ length: monthData.days }, (_, i) => i + 1);
  }
  
  // Fallback to 30 days
  return Array.from({ length: 30 }, (_, i) => i + 1);
};


const saveReport = async () => {
  if (!isValid.value || saving.value) return;
  
  saving.value = true;
  
  try {
    const reportData = {
      Author: form.value.author.id,
      Dates: {
        Start: {
          Y: parseInt(form.value.startYear),
          M: parseInt(form.value.startMonth),
          D: parseInt(form.value.startDay)
        }
      },
      Characters: form.value.members.map(member => member.id),
      Report: form.value.content,
      EndingAt: form.value.endingAt.trim(),
      Year: parseInt(form.value.startYear)
    };
    
    // Add end date if provided
    if (form.value.endYear && form.value.endMonth && form.value.endDay) {
      reportData.Dates.End = {
        Y: parseInt(form.value.endYear),
        M: parseInt(form.value.endMonth),
        D: parseInt(form.value.endDay)
      };
    }
    
    const updatedReport = await reportsStore.updateReport(props.reportId, reportData);
    
    notifySuccess('Report updated successfully!');
    emit('report-saved', updatedReport);
    
  } catch (err) {
    console.error('Failed to save report:', err);
    notifyError('Failed to save report. Please try again.');
  } finally {
    saving.value = false;
  }
};

// Watchers
watch(() => props.reportId, (newId) => {
  if (newId) {
    loadReport();
  }
}, { immediate: true });

// Lifecycle - removed duplicate onMounted call since watcher handles it with immediate: true
</script>

<style scoped>
.report-edit {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--theme-bg-surface);
  color: var(--theme-text-primary);
}

.loading-container, .error-container, .not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 3rem 1rem;
  text-align: center;
}

.loading-spinner {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 1rem;
}

.spinner-dot {
  width: 8px;
  height: 8px;
  background-color: var(--theme-accent);
  border-radius: 50%;
  animation: spinner-bounce 1.4s ease-in-out both infinite;
}

.spinner-dot:nth-child(1) { animation-delay: -0.32s; }
.spinner-dot:nth-child(2) { animation-delay: -0.16s; }
.spinner-dot:nth-child(3) { animation-delay: -0.08s; }

@keyframes spinner-bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.error-container i, .not-found i {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
  color: var(--theme-accent);
}

.error-container {
  color: #dc3545;
}

.error-container i {
  color: #dc3545;
}

.retry-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  border: none;
  border-radius: 0.5rem;
  color: var(--theme-bg-surface);
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
}

.retry-btn:hover {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.edit-form {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #1a2742 100%);
  border-bottom: 2px solid var(--theme-accent);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.form-header h2 {
  margin: 0;
  color: var(--theme-accent);
  font-family: var(--theme-font-display);
  font-size: 2rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.form-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  background: rgba(0, 0, 0, 0.1);
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
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Form styles */
.report-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-section {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #1a2742 100%);
  border-radius: 0.75rem;
  padding: 2rem;
  border: 2px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.form-section h3 {
  margin: 0 0 1.5rem 0;
  color: var(--theme-accent);
  font-size: 1.25rem;
  font-weight: 600;
  font-family: var(--theme-font-display);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.form-section h3 i {
  color: var(--theme-success);
  font-size: 1.5rem;
}

.field-label {
  font-weight: 600;
  color: #cbd5e0;
  font-size: 0.95rem;
  display: block;
  margin-bottom: 0.5rem;
}

.field-help {
  font-size: 0.875rem;
  color: #a0aec0;
  margin-top: 0.5rem;
  font-style: italic;
}

/* Date fields */
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

/* Author and Members fields */
.author-field, .members-field {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.author-multiselect, .members-multiselect {
  background-color: #1a202c;
  border-radius: 6px;
  color: #e2e8f0;
}

/* Content fields */
.content-field {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.ending-textarea {
  width: 100%;
  padding: 1rem;
  background-color: #1a202c;
  border: 2px solid #4a5568;
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 0.95rem;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.2s ease;
}

.ending-textarea:focus {
  outline: none;
  border-color: #4299e1;
}

/* Buttons */
.btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: 2px solid transparent;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.btn-primary {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  border-color: #d4a366;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  background: transparent;
  border-color: var(--theme-accent);
  color: var(--theme-accent);
}

.btn-secondary:hover {
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

/* Validation errors */
.validation-errors {
  background: rgba(220, 53, 69, 0.1);
  border: 2px solid #dc3545;
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-top: 1rem;
}

.validation-errors h4 {
  margin: 0 0 1rem 0;
  color: #dc3545;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.validation-errors ul {
  margin: 0;
  padding-left: 1.5rem;
  color: #dc3545;
}

.validation-errors li {
  margin-bottom: 0.5rem;
}
</style>