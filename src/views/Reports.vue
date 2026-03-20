<template>
  <div class="reports-container">
    <!-- Header -->
    <div class="reports-header">
      <h2 id="reports-title">Party Reports</h2>
      
      <div class="header-actions" v-if="!isAdding && !isEditing && !isVeryNarrow">
        <!-- Record Session Button -->
        <router-link
          v-if="canCreateReports"
          :to="scribeRoute"
          class="btn btn-secondary"
          title="Record a session with the Lorekeeper"
          aria-label="Record a session"
        >
          <i class="material-symbols-outlined" aria-hidden="true">mic</i>
          Record Session
        </router-link>
        <!-- Add Report Button -->
        <button
          v-if="canCreateReports"
          @click="startAddReport"
          class="btn btn-primary"
          title="Add a new report"
          aria-label="Add a new party report"
        >
          <i class="material-symbols-outlined" aria-hidden="true">add</i>
          Add Report
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="reports-content" :class="{ 'show-report': showReportPanel, 'hide-nav': isAdding || isEditing }">
      <!-- Loading State -->
      <div v-if="reportsStore.isLoading && !reportsStore.isLoaded" class="loading-container">
        <LoadingState message="Loading reports..." />
      </div>

      <!-- Content (when not loading) -->
      <template v-else>
        <!-- Navigation Panel -->
        <div v-if="!isAdding && !isEditing" class="reports-nav">
        <!-- Tab Navigation -->
        <div class="tab-navigation" role="tablist" aria-labelledby="reports-title">
          <button 
            @click="activeTab = 'browse'" 
            :class="{ active: activeTab === 'browse' }"
            class="tab-button"
            role="tab"
            :aria-selected="activeTab === 'browse'"
            :tabindex="activeTab === 'browse' ? 0 : -1"
            aria-controls="browse-panel"
            id="browse-tab"
          >
            Year
          </button>
          <button 
            :class="{ active: activeTab === 'member' }"
            class="tab-button tab-disabled"
            role="tab"
            aria-disabled="true"
            :tabindex="-1"
            aria-controls="member-panel"
            id="member-tab"
            disabled
          >
            Member
          </button>
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          <!-- Year Browse Tab -->
          <div 
            v-if="activeTab === 'browse'" 
            class="tab-panel"
            role="tabpanel"
            id="browse-panel"
            aria-labelledby="browse-tab"
          >
            <ReportYearBrowser 
              @report-selected="selectReport"
              :selected-report-id="selectedReportId"
              :initial-year="activeReportYear"
            />
          </div>

          <!-- Member Browse Tab -->
          <div 
            v-if="activeTab === 'member'" 
            class="tab-panel"
            role="tabpanel"
            id="member-panel"
            aria-labelledby="member-tab"
          >
            <ReportMemberBrowser 
              @report-selected="selectReport"
              :selected-report-id="selectedReportId"
            />
          </div>
        </div>
      </div>

      <!-- Report Display Panel -->
      <div class="reports-display">
        <!-- Very Narrow Screen - Editing Not Available -->
        <div v-if="isVeryNarrow && (isAdding || isEditing)" class="narrow-screen-editing-blocked">
          <div class="blocked-message">
            <i class="material-symbols-outlined">block</i>
            <h3>Screen Too Narrow</h3>
            <p>Report editing is not available on screens narrower than 450px for optimal user experience.</p>
            <p>Please use a wider screen or rotate your device to landscape mode.</p>
            <button @click="isAdding ? cancelAdd() : cancelEdit()" class="btn btn-secondary">
              <i class="material-symbols-outlined">arrow_back</i>
              Back to Reports
            </button>
          </div>
        </div>
        
        <!-- Add Report Form -->
        <div v-else-if="isAdding" class="report-form-container">
          <ReportAdd 
            @report-saved="onReportSaved"
            @cancel="cancelAdd"
          />
        </div>

        <!-- Edit Report Form -->
        <div v-else-if="isEditing" class="report-form-container">
          <ReportEdit 
            :report-id="selectedReportId"
            @report-saved="onReportSaved"
            @cancel="cancelEdit"
          />
        </div>

        <!-- Report Display -->
        <div v-else class="report-display-container">
          <ReportDisplay 
            :report-id="selectedReportId"
            :is-very-narrow="isVeryNarrow"
            @edit-report="startEditReport"
            @close-report="closeReport"
          />
        </div>
      </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useReportsStore } from '@shared/stores/reports';
import { useUserStore } from '@shared/stores/user';
import { useRealmStore } from '@shared/stores/realm';
import ReportYearBrowser from '@shared/components/reports/ReportYearBrowser.vue';
import ReportMemberBrowser from '@shared/components/reports/ReportMemberBrowser.vue';
import ReportDisplay from '@shared/components/reports/ReportDisplay.vue';
import ReportAdd from '@shared/components/reports/ReportAdd.vue';
import ReportEdit from '@shared/components/reports/ReportEdit.vue';
import LoadingState from '@shared/components/LoadingState.vue';
import { useNotifications } from '@shared/composables/useNotifications';

// Stores
const reportsStore = useReportsStore();
const userStore = useUserStore();
const realmStore = useRealmStore();

// Notifications
const { notifySuccess, notifyError, notifyInfo } = useNotifications();

// Router
const route = useRoute();
const router = useRouter();

// Emit event to set background class
const emits = defineEmits(['set-room']);

// State
const activeTab = ref('browse');
const isAdding = ref(false);
const isEditing = ref(false);
const selectedReportId = ref(null);
const showReportPanel = ref(false);
const activeReportYear = ref(null);
const explicitlyClosedReport = ref(false);

// Computed
const isMobile = ref(window.innerWidth < 768);
const isVeryNarrow = ref(window.innerWidth < 450);

// Resolve scribe route
const scribeRoute = computed(() => {
  return { name: 'RealmScribe' };
});

// Check if user can create reports
const canCreateReports = computed(() => {
  // Admin or realm owner can always create reports
  if (userStore.isAdministrator || userStore.isOwner) {
    return true;
  }

  // DM can always create reports
  if (userStore.isDM) {
    return true;
  }

  // Check if realm is on free tier
  const isFreeTier = !realmStore.activeRealm?.SubscriptionPlan ||
                     realmStore.activeRealm?.SubscriptionPlan === 'free';

  // On free tier, only DM or Owner can post reports (already checked above)
  if (isFreeTier) {
    return false;
  }

  // For paid tiers: check if user has write access in this realm (from UserXRealm table)
  const currentUserPlayer = realmStore.arActivePlayers?.find(player => player.UserID === userStore.userSub);
  if (currentUserPlayer?.WriteAccess) {
    return true;
  }

  // For regular users without write access, they must have an active character set
  const hasActiveCharacter = currentUserPlayer?.ActiveCharacter;

  return !!hasActiveCharacter;
});

// Methods
const setActiveReportAndFetch = async (reportId) => {
  try {
    // Get report from store
    let report = reportsStore.getReportById(reportId);
    
    if (!report) {
      // Report not in store, fetch it
      report = await reportsStore.fetchReportById(reportId);
      
      if (!report) {
        notifyError('Report not found');
        return;
      }
    } else if (!report.Report) {
      // Report exists in store but doesn't have full content, fetch full report
      report = await reportsStore.fetchReportById(reportId);
      
      if (!report) {
        notifyError('Failed to load full report');
        return;
      }
    }
    
    // Set as active report in store
    reportsStore.setActiveReport(report);
    
    // Update active report year for year browser synchronization
    activeReportYear.value = report.Year || report.Dates?.Start?.Y;
    
  } catch (error) {
    console.error('Error setting active report:', error);
    notifyError('Failed to load report');
  }
};

const selectReport = async (reportId, { replace = false } = {}) => {
  selectedReportId.value = reportId;
  showReportPanel.value = true;
  explicitlyClosedReport.value = false; // Reset flag when selecting a report

  // Set active report in store and fetch if needed
  await setActiveReportAndFetch(reportId);

  // Update active report year for year browser synchronization
  const report = reportsStore.getReportById(reportId);
  if (report) {
    activeReportYear.value = report.Year || report.Dates?.Start?.Y;
  }

  // Update URL — replace when auto-selecting to avoid polluting history
  const dest = { name: 'ReportView', params: { id: reportId } };
  replace ? router.replace(dest) : router.push(dest);
};

const closeReport = () => {
  selectedReportId.value = null;
  showReportPanel.value = false;
  explicitlyClosedReport.value = true; // Set flag when user explicitly closes report
  
  // Clear active report
  reportsStore.clearActiveReport();
  
  // Update URL
  router.push({ name: 'Reports' });
};

const startAddReport = () => {
  // Check permissions before allowing report creation
  if (!canCreateReports.value) {
    notifyError('You do not have permission to create reports. You need write access, be a realm owner/admin, or have an active character set.');
    return;
  }
  
  isAdding.value = true;
  isEditing.value = false;
  showReportPanel.value = true;
};

const startEditReport = () => {
  isEditing.value = true;
  isAdding.value = false;
};

const cancelAdd = () => {
  isAdding.value = false;
  if (!selectedReportId.value) {
    showReportPanel.value = false;
  }
};

const cancelEdit = () => {
  isEditing.value = false;
};

const onReportSaved = (report) => {
  const wasAdding = isAdding.value;
  const wasEditing = isEditing.value;
  
  isAdding.value = false;
  isEditing.value = false;
  
  // Show success notification only for adding (editing shows its own notification)
  if (wasAdding) {
    notifySuccess('Report added successfully!');
  }
  
  // No need to manually refresh year data - the store methods now handle cache updates automatically
  
  // Select the newly saved/updated report
  selectReport(report.ID);
};

// Auto-load latest report when no active report
const loadLatestReportIfNeeded = async () => {
  try {
    // Get the latest report from the getter (which returns cached value)
    let latestReport = reportsStore.getLatestReport;
    
    // If no cached latest report, try to fetch it
    if (!latestReport) {
      latestReport = await reportsStore.fetchLatestReport();
    }
    
    if (latestReport) {
      const reportId = latestReport.ID;
      const reportYear = latestReport.Year || latestReport.Dates?.Start?.Y;
      
      
      // First, ensure we have reports for that year loaded
      if (reportYear) {
        await reportsStore.fetchReportsByYear(reportYear);
      }
      
      // Set the active report year for year browser synchronization
      activeReportYear.value = reportYear;
      
      // Select the latest report (replace URL to avoid back-button loop)
      await selectReport(reportId, { replace: true });
      
      notifyInfo(`Latest report loaded: ${reportYear || 'Unknown Year'}`);
    }
  } catch (error) {
    console.error('Error auto-loading latest report:', error);
    // Don't show error notification for auto-load failure - it's not critical
  }
};

// Handle route changes
const updateFromRoute = async () => {
  // Ensure reports store is initialized before proceeding
  if (!reportsStore.isLoaded && !reportsStore.isLoading) {
    await reportsStore.init();
  }
  
  const reportId = route.params.id;
  if (reportId) {
    selectedReportId.value = reportId;
    showReportPanel.value = true;
    explicitlyClosedReport.value = false; // Reset flag when selecting a report
    
    // Set active report and fetch if needed
    await setActiveReportAndFetch(reportId);
  } else {
    selectedReportId.value = null;
    showReportPanel.value = false;
    
    // Clear active report
    reportsStore.clearActiveReport();
    
    // Only auto-load latest report if user hasn't explicitly closed a report
    if (!explicitlyClosedReport.value) {
      await loadLatestReportIfNeeded();
    }
  }
};

// Handle window resize for mobile detection
const handleResize = () => {
  isMobile.value = window.innerWidth < 768;
  isVeryNarrow.value = window.innerWidth < 450;
};

// Lifecycle
onMounted(async () => {
  try {
    // Set background class to 'reports' for all reports routes
    emits('set-room', 'reports');
    
    // Initialize reports store first
    await reportsStore.init();
    
    // Handle route params after store is initialized
    await updateFromRoute();
    
    // Show welcome info
    notifyInfo('I have gathered the requested reports.');
  } catch (error) {
    console.error('Error initializing reports:', error);
    notifyError('Failed to load reports. Please try refreshing the page.');
  }
  
  // Add resize listener
  window.addEventListener('resize', handleResize);
});

// Cleanup on unmount
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

// Watch route changes
watch(() => route.params, updateFromRoute);
</script>

<style scoped>
.reports-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--theme-bg-primary);
  color: var(--theme-text-primary);
}

.reports-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #1a2742 100%);
  border-bottom: 2px solid var(--theme-accent);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  position: relative;
}

.reports-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.1;
  pointer-events: none;
}

.reports-header h2 {
  margin: 0;
  color: var(--theme-accent);
  font-family: var(--theme-font-display);
  font-size: 2.2rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  position: relative;
  z-index: 1;
}

.reports-content {
  flex: 1;
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 0;
  overflow: hidden;
}

.reports-content.hide-nav {
  grid-template-columns: 1fr;
}

.reports-nav {
  background: linear-gradient(180deg, var(--theme-bg-surface) 0%, #1a2742 100%);
  border-right: 2px solid var(--theme-accent);
  display: flex;
  flex-direction: column;
  height: 100%;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.tab-navigation {
  display: flex;
  border-bottom: 2px solid var(--theme-accent);
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  flex-shrink: 0;
}

.tab-button {
  flex: 1;
  padding: 0.75rem;
  border: none;
  background: transparent;
  color: var(--theme-text-secondary);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  font-weight: 500;
  position: relative;
  border-bottom: 3px solid transparent;
}

.tab-button:hover {
  background: color-mix(in srgb, var(--theme-accent) 15%, transparent);
  color: var(--theme-accent);
  transform: translateY(-1px);
}

.tab-button.active {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  font-weight: 600;
  border-bottom-color: #d4a366;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tab-button.active::before {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 8px solid var(--theme-accent);
}

.tab-button.tab-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tab-button.tab-disabled:hover {
  background: transparent;
  color: var(--theme-text-secondary);
  transform: none;
  cursor: not-allowed;
}

.tab-content {
  flex: 1;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.1);
  min-height: 0;
}

.tab-panel {
  height: 100%;
  overflow: hidden;
  padding: 0;
}

.reports-display {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #1a2742 100%);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

.reports-display::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.05;
  pointer-events: none;
}

.report-form-container,
.report-display-container {
  flex: 1;
  overflow-y: auto;
  position: relative;
  z-index: 1;
  padding: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: 2px solid transparent;
  border-radius: 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 1;
}

.btn-primary {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  border-color: #d4a366;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* Custom scrollbar for dark theme */
.tab-panel::-webkit-scrollbar,
.report-form-container::-webkit-scrollbar,
.report-display-container::-webkit-scrollbar {
  width: 8px;
}

.tab-panel::-webkit-scrollbar-track,
.report-form-container::-webkit-scrollbar-track,
.report-display-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.tab-panel::-webkit-scrollbar-thumb,
.report-form-container::-webkit-scrollbar-thumb,
.report-display-container::-webkit-scrollbar-thumb {
  background: var(--theme-accent);
  border-radius: 4px;
}

.tab-panel::-webkit-scrollbar-thumb:hover,
.report-form-container::-webkit-scrollbar-thumb:hover,
.report-display-container::-webkit-scrollbar-thumb:hover {
  background: #e6b373;
}

/* Loading state overlay */
.reports-container .loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: color-mix(in srgb, var(--theme-bg-primary) 80%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  min-height: 400px;
  background: var(--theme-bg-primary);
}

/* Mobile Responsive */
@media (max-width: 767px) {
  .reports-content {
    grid-template-columns: 1fr;
    position: relative;
  }
  
  .reports-nav {
    border-right: none;
    border-bottom: 2px solid var(--theme-accent);
  }
  
  .reports-display {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    z-index: 10;
  }
  
  .reports-content.show-report .reports-display {
    transform: translateX(0);
  }
  
  .tab-button {
    text-align: left;
    padding: 1.25rem;
    border-bottom: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
    border-radius: 0;
  }
  
  .tab-button:last-child {
    border-bottom: none;
  }
  
  .tab-button.active::before {
    display: none;
  }
  
  .reports-header {
    padding: 1rem;
  }
  
  .reports-header h2 {
    font-size: 1.8rem;
  }
}

/* Desktop Responsive */
@media (min-width: 1200px) {
  .reports-content {
    grid-template-columns: 400px 1fr;
  }
  
  .reports-content.hide-nav {
    grid-template-columns: 1fr;
  }
  
  .reports-header {
    padding: 2rem;
  }
  
  .reports-header h2 {
    font-size: 2.5rem;
  }
}

/* High contrast mode for better accessibility */
@media (prefers-contrast: high) {
  .reports-header {
    border-bottom-width: 3px;
  }
  
  .tab-button {
    border: 1px solid transparent;
  }
  
  .tab-button.active {
    border-color: var(--theme-bg-surface);
  }
  
  .btn-primary {
    border-width: 3px;
  }
}


/* Narrow Screen Editing Blocked */
.narrow-screen-editing-blocked {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #1a2742 100%);
}

.blocked-message {
  text-align: center;
  max-width: 400px;
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  border: 2px solid var(--theme-accent);
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.blocked-message i {
  font-size: 3rem;
  color: var(--theme-accent);
  margin-bottom: 1rem;
}

.blocked-message h3 {
  color: var(--theme-accent);
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  font-family: var(--theme-font-display);
}

.blocked-message p {
  color: var(--theme-text-primary);
  margin: 0 0 1rem 0;
  line-height: 1.5;
}

.blocked-message p:last-of-type {
  margin-bottom: 2rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  position: relative;
  z-index: 1;
}

.btn-secondary {
  background: linear-gradient(135deg, var(--theme-bg-surface-alt, #333) 0%, var(--theme-bg-surface, #222) 100%);
  color: var(--theme-text-primary);
  border-color: var(--theme-border-accent, #777);
}

.btn-secondary:hover {
  background: linear-gradient(135deg, var(--theme-bg-surface-hover, #444) 0%, var(--theme-bg-surface-alt, #333) 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1);
}

/* Very Narrow Screen Specific Styles */
@media (max-width: 449px) {
  .reports-header {
    padding: 1rem 0.5rem;
  }
  
  .reports-header h2 {
    font-size: 1.5rem;
  }
  
  .blocked-message {
    padding: 1.5rem;
    margin: 1rem;
  }
  
  .blocked-message h3 {
    font-size: 1.3rem;
  }
  
  .blocked-message p {
    font-size: 0.9rem;
  }
}

/* Reduced motion for accessibility */
@media (prefers-reduced-motion: reduce) {
  .tab-button,
  .btn,
  .reports-display {
    transition: none;
  }
  
  .tab-button:hover,
  .btn-primary:hover {
    transform: none;
  }
}
</style>