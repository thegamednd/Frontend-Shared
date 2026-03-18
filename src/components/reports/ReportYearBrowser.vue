<template>
  <div class="year-browser">
    <!-- Year Navigation -->
    <div class="year-controls">
      <button 
        @click="changeYear(-10)" 
        :disabled="!canGoBack(10)"
        class="year-btn"
        title="Previous 10 years"
      >
        <i class="material-symbols-outlined">keyboard_double_arrow_left</i>
      </button>
      <button 
        @click="changeYear(-1)" 
        :disabled="!canGoBack(1)"
        class="year-btn"
        title="Previous year"
      >
        <i class="material-symbols-outlined">chevron_left</i>
      </button>
      
      <div class="current-year">
        {{ currentYear }}
      </div>
      
      <button 
        @click="changeYear(1)" 
        :disabled="!canGoForward(1)"
        class="year-btn"
        title="Next year"
      >
        <i class="material-symbols-outlined">chevron_right</i>
      </button>
      <button 
        @click="changeYear(10)" 
        :disabled="!canGoForward(10)"
        class="year-btn"
        title="Next 10 years"
      >
        <i class="material-symbols-outlined">keyboard_double_arrow_right</i>
      </button>
    </div>

    <!-- Reports List -->
    <div class="reports-list">
      <div v-if="loading" class="loading">
        <div class="loading-animation">
          <div v-for="n in 5" :key="n" class="loading-item"></div>
        </div>
      </div>
      
      <div v-else-if="currentYearReports.length === 0" class="no-reports">
        <i class="material-symbols-outlined">description</i>
        <p>No reports found for {{ currentYear }}</p>
      </div>
      
      <div v-else>
        <div
          v-for="report in currentYearReports"
          :key="report.ID"
          @click="selectReport(report)"
          :class="{ active: isSelected(report) }"
          :title="getFullDateRange(report)"
          class="report-item"
        >
          <!-- Author Avatar -->
          <div class="report-author-avatar">
            <img 
              :src="getAuthorImage(report)" 
              :alt="getAuthorName(report)"
              class="author-image"
              @error="handleImageError"
            />
          </div>
          
          <!-- Report Info -->
          <div class="report-info">
            <div class="report-title">
              {{ getMonthName(report.Dates?.Start) }} {{ report.Dates?.Start?.D }}
              <span v-if="hasEndDate(report)">
                - {{ getMonthName(report.Dates?.End) }} {{ report.Dates?.End?.D }}
              </span>
            </div>
            <div class="report-author">by {{ getAuthorName(report) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useReportsStore } from '@shared/stores/reports';
import { useDateStore } from '@shared/stores/date';
import { useCharacterStore } from '@shared/stores/character';

const props = defineProps({
  selectedReportId: {
    type: String,
    default: null
  },
  initialYear: {
    type: Number,
    default: null
  }
});

const emit = defineEmits(['report-selected']);

// Stores
const reportsStore = useReportsStore();
const dateStore = useDateStore();
const characterStore = useCharacterStore();

// State
const currentYear = ref(props.initialYear || dateStore.date.y); // Use initial year prop or game world year
const loading = ref(false);

// Computed
const availableYears = computed(() => reportsStore.availableYears);
const currentYearReports = computed(() => {
  return reportsStore.getReportsByYear(currentYear.value) || [];
});

const minYear = computed(() => {
  // Use the oldest report year from the store if available
  const oldestYear = reportsStore.getOldestReportYear;
  if (oldestYear !== null) {
    return oldestYear;
  }
  
  // Fallback to available years
  const years = availableYears.value;
  return years.length > 0 ? Math.min(...years) : Math.max(1, currentYear.value - 50);
});

const maxYear = computed(() => {
  // Users should not be able to navigate past the current game year
  return dateStore.date.y;
});

// Methods
const changeYear = async (offset) => {
  const newYear = currentYear.value + offset;
  
  // Bounds checking
  if (newYear < minYear.value || newYear > maxYear.value) {
    return;
  }
  
  currentYear.value = newYear;
  await loadReportsForYear(newYear);
};

const canGoBack = (offset) => {
  return currentYear.value - offset >= minYear.value;
};

const canGoForward = (offset) => {
  return currentYear.value + offset <= maxYear.value;
};

const loadReportsForYear = async (year) => {
  // Check if we already have reports for this year
  const existingReports = reportsStore.getReportsByYear(year);
  if (existingReports && existingReports.length > 0) {
    return;
  }
  
  // Prevent duplicate calls for the same year from this component
  if (loading.value) {
    return;
  }
  
  loading.value = true;
  try {
    await reportsStore.fetchReportsByYear(year);
  } catch (error) {
    console.error('Error loading reports for year:', year, error);
  } finally {
    loading.value = false;
  }
};

const selectReport = (report) => {
  const reportId = report.ID;
  emit('report-selected', reportId);
};

const isSelected = (report) => {
  const reportId = report.ID;
  return reportId === props.selectedReportId;
};

const getMonthName = (date) => {
  if (!date || !date.M) return '???';
  
  // Use the custom game world month abbreviations from date store
  const monthIndex = date.M - 1; // Convert from 1-based to 0-based
  return dateStore.arMonths[monthIndex]?.Abbr || '???';
};

const getFullMonthName = (date) => {
  if (!date || !date.M) return '???';
  
  // Use the full month names for tooltips
  const monthIndex = date.M - 1; // Convert from 1-based to 0-based
  return dateStore.arMonths[monthIndex]?.Name || '???';
};

const getFullDateRange = (report) => {
  const start = report.Dates?.Start;
  const end = report.Dates?.End;
  
  if (!start) return 'No date information';
  
  const startDate = `${getFullMonthName(start)} ${start.D}`;
  
  if (!hasEndDate(report)) {
    return startDate;
  }
  
  const endDate = `${getFullMonthName(end)} ${end.D}`;
  return `${startDate} - ${endDate}`;
};

const hasEndDate = (report) => {
  const start = report.Dates?.Start;
  const end = report.Dates?.End;
  
  if (!start || !end) return false;
  
  return !(start.Y === end.Y && start.M === end.M && start.D === end.D);
};


const getAuthorName = (report) => {
  const authorId = report.Author;
  if (!authorId) return 'Unknown';
  
  const character = characterStore.characters[authorId];
  return character?.Name || 'Unknown';
};

const getAuthorImage = (report) => {
  const authorId = report.Author;
  if (!authorId) return '/images/default-avatar.png';
  
  const character = characterStore.characters[authorId];
  const characterImage = character?.Image;
  
  if (!characterImage) return '/images/default-avatar.png';
  
  const imagesCdnUrl = import.meta.env.VITE_IMAGES_CDN_URL;
  return `${imagesCdnUrl}/${characterImage}`;
};

const handleImageError = (event) => {
  event.target.src = '/images/default-avatar.png';
};

// Lifecycle
onMounted(async () => {
  // Load reports for current year
  //await loadReportsForYear(currentYear.value);
});

// Watch for initialYear prop changes
watch(() => props.initialYear, (newYear) => {
  if (newYear && newYear !== currentYear.value) {
    currentYear.value = newYear;
    loadReportsForYear(newYear);
  }
}, { immediate: true });

// Watch for store changes
watch(() => reportsStore.availableYears, (newYears, oldYears) => {
  // Only proceed if this is a real change and we're not already loading
  if (loading.value || JSON.stringify(newYears) === JSON.stringify(oldYears)) {
    return;
  }
  
  if (newYears.length > 0 && !newYears.includes(currentYear.value)) {
    // If current year has no reports, go to most recent year with reports
    const mostRecentYear = Math.max(...newYears);
    console.log(`🔄 Year browser switching from ${currentYear.value} to ${mostRecentYear}`);
    currentYear.value = mostRecentYear;
    // Don't call loadReportsForYear here - the data should already be in the store
  }
});
</script>

<style scoped>
.year-browser {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--theme-bg-surface);
  overflow: hidden;
}

.year-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  border-bottom: 2px solid var(--theme-accent);
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #1a2742 100%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.year-btn {
  background: transparent;
  border: 2px solid var(--theme-accent);
  padding: 0.5rem;
  margin: 0 0.25rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  color: var(--theme-accent);
}

.year-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px color-mix(in srgb, var(--theme-accent) 20%, transparent);
}

.year-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  border-color: #666;
  color: #666;
}

.current-year {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--theme-accent);
  min-width: 4rem;
  text-align: center;
  margin: 0 1rem;
  font-family: var(--theme-font-display);
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.reports-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.1);
  min-height: 0;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 2rem;
}

.loading-animation {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.loading-item {
  height: 3rem;
  background: linear-gradient(90deg, var(--theme-bg-surface) 25%, #1a2742 50%, var(--theme-bg-surface) 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 0.5rem;
  border: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.no-reports {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--theme-text-secondary);
}

.no-reports i {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
  color: var(--theme-accent);
}


.report-item {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #1a2742 100%);
  border: 2px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 0.5rem;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: grid;
  grid-template-columns: 30% 1fr;
  gap: 0.75rem;
  position: relative;
  overflow: hidden;
  margin-bottom: 0.375rem;
}

.report-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.05;
  pointer-events: none;
}

.report-item > * {
  position: relative;
  z-index: 1;
}

.report-item:hover {
  border-color: var(--theme-accent);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--theme-accent) 20%, transparent);
  transform: translateY(-2px);
}

.report-item.active {
  border-color: var(--theme-accent);
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--theme-accent) 40%, transparent);
}

.report-item.active .report-author-avatar {
  background: var(--theme-bg-surface);
}

.report-item.active .report-title {
  color: var(--theme-bg-surface);
}

.report-item.active .report-author {
  color: color-mix(in srgb, var(--theme-bg-surface) 80%, transparent);
}

.report-author-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
}

.author-image {
  width: 2rem;
  height: 3.2rem;
  border-radius: 0.25rem;
  object-fit: cover;
  border: 2px solid #8B4513;
  box-shadow: 
    0 0 0 1px #654321,
    0 2px 8px rgba(0, 0, 0, 0.3),
    inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  background: #8B4513;
  padding: 2px;
}

.report-info {
  flex: 1;
  min-width: 0;
}

.report-title {
  font-weight: 600;
  color: var(--theme-text-primary);
  margin-bottom: 0.125rem;
  font-size: 0.9rem;
}

.report-author {
  font-size: 0.8rem;
  color: var(--theme-accent);
  margin-bottom: 0.125rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.report-author::before {
  content: "✦";
  font-size: 0.6rem;
}


/* Custom scrollbar */
.reports-list::-webkit-scrollbar {
  width: 8px;
}

.reports-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.reports-list::-webkit-scrollbar-thumb {
  background: var(--theme-accent);
  border-radius: 4px;
}

.reports-list::-webkit-scrollbar-thumb:hover {
  background: #e6b373;
}

/* Mobile adjustments */
@media (max-width: 767px) {
  .year-controls {
    padding: 0.75rem;
  }
  
  .year-btn {
    width: 2rem;
    height: 2rem;
    padding: 0.25rem;
  }
  
  .current-year {
    font-size: 1.1rem;
    margin: 0 0.5rem;
  }
  
  .reports-list {
    padding: 0.75rem;
  }
  
  .report-author-avatar {
    align-self: flex-start;
    padding: 0.375rem;
  }
  
  .author-image {
    width: 1.8rem;
    height: 3rem;
  }
  
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .report-item {
    border-width: 3px;
  }
  
  .year-btn {
    border-width: 3px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .report-item:hover,
  .year-btn:hover {
    transform: none;
  }
  
  .loading-item {
    animation: none;
  }
}
</style>
