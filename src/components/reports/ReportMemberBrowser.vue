<template>
  <div class="member-browser">
    <!-- Member Selection -->
    <div class="member-selection">
      <div class="search-container">
        <input
          v-model="searchTerm"
          type="text"
          placeholder="Search for a member..."
          class="member-search"
          @input="filterMembers"
        />
        <i class="material-symbols-outlined search-icon">search</i>
      </div>
      
      <!-- Member Dropdown -->
      <div v-if="showDropdown && filteredMembers.length > 0" class="member-dropdown">
        <div
          v-for="member in filteredMembers"
          :key="member.id"
          @click="selectMember(member)"
          class="member-option"
        >
          <div class="member-avatar">
            <img 
              v-if="member.image"
              :src="getMemberImageUrl(member.image)"
              :alt="member.name"
              @error="handleImageError"
            />
            <i v-else class="material-symbols-outlined">person</i>
          </div>
          <div class="member-name">{{ member.name }}</div>
        </div>
      </div>
    </div>

    <!-- Selected Member Info -->
    <div v-if="selectedMember" class="selected-member">
      <div class="member-card">
        <div class="member-avatar large">
          <img 
            v-if="selectedMember.image"
            :src="getMemberImageUrl(selectedMember.image)"
            :alt="selectedMember.name"
            @error="handleImageError"
          />
          <i v-else class="material-symbols-outlined">person</i>
        </div>
        <div class="member-details">
          <h3>{{ selectedMember.name }}</h3>
          <p>{{ memberReports.length }} report{{ memberReports.length !== 1 ? 's' : '' }}</p>
        </div>
        <button @click="clearMember" class="clear-btn" title="Clear selection">
          <i class="material-symbols-outlined">close</i>
        </button>
      </div>
    </div>

    <!-- Reports List -->
    <div class="reports-list">
      <div v-if="loading" class="loading">
        <div class="loading-animation">
          <div v-for="n in 5" :key="n" class="loading-item"></div>
        </div>
      </div>
      
      <div v-else-if="!selectedMember" class="no-selection">
        <i class="material-symbols-outlined">person_search</i>
        <p>Select a member to view their reports</p>
      </div>
      
      <div v-else-if="memberReports.length === 0" class="no-reports">
        <i class="material-symbols-outlined">description</i>
        <p>No reports found for {{ selectedMember.name }}</p>
      </div>
      
      <div v-else class="reports-grid">
        <div
          v-for="report in memberReports"
          :key="report.id || report.ID"
          @click="selectReport(report)"
          :class="{ active: isSelected(report) }"
          class="report-item"
        >
          <!-- Date Display -->
          <div class="report-date">
            <div class="month">{{ getMonthName(report.Dates?.Start) }}</div>
            <div class="day">{{ report.Dates?.Start?.D || '??' }}</div>
            <div class="year">{{ report.Year || report.Dates?.Start?.Y }}</div>
          </div>
          
          <!-- Report Info -->
          <div class="report-info">
            <div class="report-title">
              {{ getMonthName(report.Dates?.Start) }} {{ report.Dates?.Start?.D }}, {{ report.Year || report.Dates?.Start?.Y }}
              <span v-if="hasEndDate(report)">
                - {{ getMonthName(report.Dates?.End) }} {{ report.Dates?.End?.D }}
              </span>
            </div>
            <div v-if="report.Members?.length" class="report-members">
              {{ report.Members.length }} member{{ report.Members.length !== 1 ? 's' : '' }}
            </div>
          </div>
          
          <!-- Preview -->
          <div class="report-preview">
            {{ getReportPreview(report) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useReportsStore } from '@shared/stores/reports';
import { useDateStore } from '@shared/stores/date';

const props = defineProps({
  selectedReportId: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['report-selected']);

const reportsStore = useReportsStore();
const dateStore = useDateStore();

// State
const searchTerm = ref('');
const selectedMember = ref(null);
const showDropdown = ref(false);
const loading = ref(false);

// Mock members data - in a real app, this would come from a members store
const allMembers = ref([
  { id: '1', name: 'Aelwyn Shadowmere', image: 'aelwyn.jpg' },
  { id: '2', name: 'Theron Brightblade', image: 'theron.jpg' },
  { id: '3', name: 'Lyra Moonwhisper', image: null },
  { id: '4', name: 'Gareth Stoneheart', image: 'gareth.jpg' },
  { id: '5', name: 'Seraphina Dawnlight', image: 'seraphina.jpg' }
]);

// Computed
const filteredMembers = computed(() => {
  if (!searchTerm.value) return [];
  
  const term = searchTerm.value.toLowerCase();
  return allMembers.value.filter(member => 
    member.name.toLowerCase().includes(term)
  ).slice(0, 10); // Limit to 10 results
});

const memberReports = computed(() => {
  if (!selectedMember.value) return [];
  return reportsStore.getReportsByAuthor(selectedMember.value.id) || [];
});

// Methods
const filterMembers = () => {
  showDropdown.value = searchTerm.value.length > 0;
};

const selectMember = async (member) => {
  selectedMember.value = member;
  searchTerm.value = member.name;
  showDropdown.value = false;
  
  // Load member's reports from API
  loading.value = true;
  try {
    await reportsStore.fetchReportsByAuthor(member.id);
  } catch (error) {
    console.error('Failed to load member reports:', error);
  } finally {
    loading.value = false;
  }
};

const clearMember = () => {
  selectedMember.value = null;
  searchTerm.value = '';
  showDropdown.value = false;
};

const selectReport = (report) => {
  const reportId = report.id || report.ID;
  emit('report-selected', reportId);
};

const isSelected = (report) => {
  const reportId = report.id || report.ID;
  return reportId === props.selectedReportId;
};

const getMemberImageUrl = (imageFile) => {
  // Construct the S3 URL - adjust this based on your actual S3 setup
  return `https://potp-gallery.s3.ca-central-1.amazonaws.com/${imageFile}`;
};

const handleImageError = (event) => {
  event.target.style.display = 'none';
};

const getMonthName = (dateObj) => {
  if (!dateObj || !dateObj.M) return 'Unknown';
  
  // Use the custom game world months from date store
  const monthIndex = dateObj.M - 1; // Convert from 1-based to 0-based
  return dateStore.arMonths[monthIndex]?.abbr || 'Unknown';
};

const hasEndDate = (report) => {
  return report.Dates?.End && 
         report.Dates.End.Y && 
         report.Dates.End.M && 
         report.Dates.End.D &&
         (report.Dates.Start.Y !== report.Dates.End.Y ||
          report.Dates.Start.M !== report.Dates.End.M ||
          report.Dates.Start.D !== report.Dates.End.D);
};

const getReportPreview = (report) => {
  const text = report.Sanitized || report.Report || '';
  return text.length > 100 ? text.substring(0, 100) + '...' : text;
};

// Event listeners
document.addEventListener('click', (event) => {
  if (!event.target.closest('.member-selection')) {
    showDropdown.value = false;
  }
});

onMounted(async () => {
  // Initialize any needed data
  await reportsStore.init();
});
</script>

<style scoped>
.member-browser {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1rem;
  background: var(--theme-bg-surface);
  padding: 1rem;
}

.member-selection {
  position: relative;
}

.search-container {
  position: relative;
  display: flex;
  align-items: center;
}

.member-search {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 1rem;
  border: 2px solid var(--theme-accent);
  border-radius: 0.5rem;
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #1a2742 100%);
  color: var(--theme-text-primary);
  font-size: 0.95rem;
  transition: all 0.3s ease;
}

.member-search:focus {
  outline: none;
  border-color: #e6b373;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--theme-accent) 20%, transparent);
  background: #1a2742;
}

.member-search::placeholder {
  color: var(--theme-text-secondary);
}

.search-icon {
  position: absolute;
  right: 0.75rem;
  color: var(--theme-accent);
  pointer-events: none;
}

.member-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #1a2742 100%);
  border: 2px solid var(--theme-accent);
  border-radius: 0.5rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
  margin-top: 0.25rem;
}

.member-option {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  gap: 0.75rem;
  border-bottom: 1px solid color-mix(in srgb, var(--theme-accent) 10%, transparent);
}

.member-option:last-child {
  border-bottom: none;
}

.member-option:hover {
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  color: var(--theme-accent);
}

.member-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 2px solid #d4a366;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.member-avatar.large {
  width: 48px;
  height: 48px;
}

.member-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-avatar i {
  color: var(--theme-bg-surface);
  font-size: 1.25rem;
}

.member-name {
  color: var(--theme-text-primary);
  font-weight: 500;
}

.selected-member {
  padding: 1rem;
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #1a2742 100%);
  border-radius: 0.5rem;
  border: 2px solid var(--theme-accent);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--theme-accent) 10%, transparent);
}

.member-card {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.member-details {
  flex: 1;
}

.member-details h3 {
  margin: 0;
  color: var(--theme-accent);
  font-size: 1.1rem;
  font-family: var(--theme-font-display);
}

.member-details p {
  margin: 0.25rem 0 0 0;
  color: var(--theme-text-secondary);
  font-size: 0.9rem;
}

.clear-btn {
  background: none;
  border: 2px solid transparent;
  color: var(--theme-text-secondary);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.3s ease;
}

.clear-btn:hover {
  color: #dc3545;
  border-color: #dc3545;
  background: rgba(220, 53, 69, 0.1);
}

.reports-list {
  flex: 1;
  overflow-y: auto;
}

.loading, .no-selection, .no-reports {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: var(--theme-text-secondary);
  text-align: center;
}

.loading-animation {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.loading-item {
  width: 12px;
  height: 12px;
  background-color: var(--theme-accent);
  border-radius: 50%;
  animation: loading-bounce 1.4s ease-in-out both infinite;
}

.loading-item:nth-child(1) { animation-delay: -0.32s; }
.loading-item:nth-child(2) { animation-delay: -0.16s; }

@keyframes loading-bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.no-selection i, .no-reports i {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
  color: var(--theme-accent);
}

.reports-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.5rem 0;
}

.report-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #1a2742 100%);
  border: 2px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
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
  transform: translateY(-2px);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--theme-accent) 20%, transparent);
}

.report-item.active {
  border-color: var(--theme-accent);
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--theme-accent) 40%, transparent);
}

.report-item.active .report-title,
.report-item.active .member-name {
  color: var(--theme-bg-surface);
}

.report-item.active .report-members,
.report-item.active .report-preview {
  color: color-mix(in srgb, var(--theme-bg-surface) 80%, transparent);
}

.report-item.active .report-date {
  background: var(--theme-bg-surface);
  color: var(--theme-accent);
}

.report-item.active .report-date .month {
  color: var(--theme-accent);
}

.report-item.active .report-date .day {
  color: var(--theme-accent);
}

.report-item.active .report-date .year {
  color: #e6b373;
}

.report-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 80px;
  padding: 0.5rem;
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  border-radius: 0.5rem;
  text-align: center;
  border: 1px solid #d4a366;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.report-date .month {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--theme-bg-surface);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.report-date .day {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--theme-bg-surface);
  line-height: 1;
  font-family: var(--theme-font-display);
}

.report-date .year {
  font-size: 0.75rem;
  color: color-mix(in srgb, var(--theme-bg-surface) 70%, transparent);
  margin-top: 0.25rem;
}

.report-info {
  flex: 1;
  min-width: 0;
}

.report-title {
  font-weight: 600;
  color: var(--theme-text-primary);
  margin-bottom: 0.5rem;
  line-height: 1.4;
  font-size: 1rem;
}

.report-members {
  font-size: 0.85rem;
  color: var(--theme-accent);
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.report-members::before {
  content: "👥";
  font-size: 0.7rem;
}

.report-preview {
  font-size: 0.85rem;
  color: #cbd5e0;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* Custom scrollbar */
.member-dropdown::-webkit-scrollbar,
.reports-list::-webkit-scrollbar {
  width: 6px;
}

.member-dropdown::-webkit-scrollbar-track,
.reports-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.member-dropdown::-webkit-scrollbar-thumb,
.reports-list::-webkit-scrollbar-thumb {
  background: var(--theme-accent);
  border-radius: 3px;
}

.member-dropdown::-webkit-scrollbar-thumb:hover,
.reports-list::-webkit-scrollbar-thumb:hover {
  background: #e6b373;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .member-browser {
    padding: 0.75rem;
  }
  
  .report-item {
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem;
  }
  
  .report-date {
    flex-direction: row;
    justify-content: space-between;
    min-width: auto;
    width: 100%;
    padding: 0.375rem 0.75rem;
  }
  
  .report-date .day {
    font-size: 1.25rem;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .report-item,
  .selected-member,
  .member-search {
    border-width: 3px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .report-item:hover {
    transform: none;
  }
  
  .loading-item {
    animation: none;
  }
}
</style>
