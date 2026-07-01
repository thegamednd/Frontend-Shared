<template>
  <div class="report-display">
    <!-- Mobile Header -->
    <div class="mobile-header">
      <button @click="$emit('close-report')" class="back-btn">
        <i class="material-symbols-outlined">arrow_back</i>
        Back
      </button>
      <button 
        v-if="canEdit && report && !isMobile"
        @click="$emit('edit-report')"
        class="edit-btn"
      >
        <i class="material-symbols-outlined">edit</i>
        Edit
      </button>
    </div>

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

    <!-- No Report Selected -->
    <div v-else-if="!reportId" class="no-report">
      <i class="material-symbols-outlined">description</i>
      <h3>No Report Selected</h3>
      <p>Select a report from the browser to view its details.</p>
    </div>

    <!-- Report Content -->
    <div v-else-if="report" class="report-content">
      <!-- Report Header -->
      <header class="report-header">
        <div class="report-meta">
          <div class="report-info">
            <div class="report-text-info">
              <div>Party report for {{ formatDateRange(report.Dates) }} submitted by {{ getAuthorName(report) }}.</div>
              <div v-if="report.EndingAt" class="ending-location-line">Ending at {{ report.EndingAt }}</div>
            </div>
            
            <div v-if="report.Characters?.length" class="report-members-images">
              <!-- Author (floated left, larger) -->
              <div 
                v-if="authorMember"
                class="member-avatar author-avatar"
                :title="getCharacterName(authorMember)"
              >
                <img 
                  v-if="getCharacterImage(authorMember)"
                  :src="getCharacterImage(authorMember)"
                  :alt="getCharacterName(authorMember)"
                  class="character-image"
                />
                <i v-else class="material-symbols-outlined">person</i>
              </div>
              
              <!-- Other members -->
              <div class="other-members">
                <div 
                  v-for="member in otherMembers" 
                  :key="member"
                  class="member-avatar"
                  :title="getCharacterName(member)"
                >
                  <img 
                    v-if="getCharacterImage(member)"
                    :src="getCharacterImage(member)"
                    :alt="getCharacterName(member)"
                    class="character-image"
                  />
                  <i v-else class="material-symbols-outlined">person</i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop Actions -->
        <div class="desktop-actions">
          <button 
            v-if="canEdit && !isMobile"
            @click="$emit('edit-report')"
            class="btn-icon"
            title="Edit Report"
          >
            <i class="material-symbols-outlined">edit</i>
          </button>
        </div>
      </header>

      <!-- Report Text -->
      <section class="report-text">
        <div class="text-content">
          <div v-if="report.Report" class="report-html" v-html="formatReportText(report.Report)"></div>
          <div v-else class="no-content">
            <i class="material-symbols-outlined">text_snippet</i>
            <p>No report content available.</p>
          </div>
        </div>
      </section>
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
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useReportsStore } from '@shared/stores/reports';
import { useUserStore } from '@shared/stores/user';
import { useDateStore } from '@shared/stores/date';
import { useCharacterStore } from '@shared/stores/character';
import { useRealmStore } from '@shared/stores/realm';

const props = defineProps({
  reportId: {
    type: String,
    default: null
  },
  isVeryNarrow: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['edit-report', 'close-report']);

const reportsStore = useReportsStore();
const userStore = useUserStore();
const dateStore = useDateStore();
const realmStore = useRealmStore();
const characterStore = useCharacterStore();

// State
const loading = ref(false);
const error = ref(null);

// Computed
const report = computed(() => {
  if (!props.reportId) return null;
  return reportsStore.getReportById(props.reportId);
});

const hasEndDate = computed(() => {
  const dates = report.value?.Dates;
  if (!dates?.End) return false;
  
  const start = dates.Start;
  const end = dates.End;
  
  return end.Y && end.M && end.D &&
         (start.Y !== end.Y || start.M !== end.M || start.D !== end.D);
});

const canEdit = computed(() => {
  if (!report.value || !userStore.user) return false;
  
  // User can edit if they're the author or have appropriate permissions
  return report.value.Author === userStore.userSub || 
         userStore.isAdministrator ||
         userStore.isDM ||
         userStore.isOwner;
});

const authorMember = computed(() => {
  if (!report.value?.Characters) return null;
  
  const authorId = report.value.Author;
  return report.value.Characters.find(member => member === authorId) || null;
});

const otherMembers = computed(() => {
  if (!report.value?.Characters) return [];
  
  const authorId = report.value.Author;
  return report.value.Characters.filter(member => member !== authorId);
});


// Methods
const loadReport = async () => {
  if (!props.reportId) return;
  
  // Check if we already have the full report
  const existingReport = reportsStore.getReportById(props.reportId);
  if (existingReport && existingReport.Report) {
    // Already have full report
    return;
  }
  
  loading.value = true;
  error.value = null;
  
  try {
    await reportsStore.fetchReportById(props.reportId);
  } catch (err) {
    console.error('Failed to load report:', err);
    error.value = 'Failed to load report. Please try again.';
  } finally {
    loading.value = false;
  }
};

// Detect mobile screen size
const isMobile = ref(window.innerWidth <= 768);

// Listen for window resize
onMounted(() => {
  const handleResize = () => {
    isMobile.value = window.innerWidth <= 768;
  };
  window.addEventListener('resize', handleResize);
  
  // Cleanup on unmount
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
  });
});

const getMonthName = (dateObj, useShortForm = false) => {
  if (!dateObj || !dateObj.M) return 'Unknown';
  
  // Use the custom game world months from date store
  // Convert from 1-based to 0-based
  const month = dateStore.arMonths[dateObj.M - 1];
  if (!month) return 'Unknown';
  
  // Return abbreviated name for mobile or when explicitly requested
  if (useShortForm || isMobile.value) {
    return month.Abbr || month.Name || 'Unknown';
  }
  
  // Return full name for desktop
  return month.Name || 'Unknown';
};

const formatDateRange = (dates) => {
  if (!dates?.Start) return 'Unknown Date';
  
  const start = dates.Start;
  const end = dates.End;
  
  // Get the date suffix (abbreviated form for compactness)
  const dateSuffix = realmStore.activeRealm?.DateSuffix?.Abbr || '';
  
  // If no end date or same as start date, show single date
  if (!hasEndDate.value) {
    return `${getMonthName(start)} ${start.D}, ${start.Y}${dateSuffix ? ' ' + dateSuffix : ''}`;
  }
  
  // Check if years are the same
  const sameYear = start.Y === end.Y;
  
  // Format the date range
  if (sameYear) {
    // Same year - omit year from start date
    const startStr = `${getMonthName(start)} ${start.D}`;
    const endStr = `${getMonthName(end)} ${end.D}, ${end.Y}${dateSuffix ? ' ' + dateSuffix : ''}`;
    return `${startStr} - ${endStr}`;
  } else {
    // Different years - show both years with suffix
    const startStr = `${getMonthName(start)} ${start.D}, ${start.Y}${dateSuffix ? ' ' + dateSuffix : ''}`;
    const endStr = `${getMonthName(end)} ${end.D}, ${end.Y}${dateSuffix ? ' ' + dateSuffix : ''}`;
    return `${startStr} - ${endStr}`;
  }
};


const formatReportText = (text) => {
  if (!text) return '';

  // Reports authored in the rich-text editor are stored as HTML — render it
  // as-is so figures, image alignment, and captions survive. Only plain-text
  // content (e.g. legacy or AI-authored reports) gets newline-to-paragraph
  // wrapping.
  if (/<\/?[a-z][\s\S]*>/i.test(text)) {
    return text;
  }

  return text
    .split('\n\n')
    .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');
};

const getAuthorName = (report) => {
  const authorId = report.Author;
  if (!authorId) return 'Unknown';

  // Check if it's a character ID (UUID format) or a plain name string
  const character = characterStore.characters[authorId];
  if (character) return character.Name;

  // Not a character ID — treat as a name string (e.g. "The Scribe", "Lorekeeper")
  return authorId;
};

const getCharacterName = (characterId) => {
  if (!characterId) return 'Unknown';
  
  const character = characterStore.characters[characterId];
  return character?.Name || characterId;
};

const getCharacterImage = (characterId) => {
  if (!characterId) return null;
  
  const character = characterStore.characters[characterId];
  const characterImage = character?.Image;
  
  if (!characterImage) return null;
  
  const imagesCdnUrl = import.meta.env.VITE_IMAGES_CDN_URL;
  return `${imagesCdnUrl}/${characterImage}`;
};


// Watchers
watch(() => props.reportId, async (newId) => {
  if (newId) {
    await loadReport();
    // Wait for next tick to ensure template updates
    await nextTick();
  } else {
    error.value = null;
  }
}, { immediate: true });

onMounted(async () => {
  if (props.reportId) {
    await loadReport();
    await nextTick();
  }
});
</script>

<style scoped>
.report-display {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--theme-bg-surface);
  color: var(--theme-text-primary);
}

.mobile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 2px solid var(--theme-accent);
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #1a2742 100%);
}

@media (min-width: 768px) {
  .mobile-header {
    display: none;
  }
}

.back-btn, .edit-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid var(--theme-accent);
  border-radius: 0.5rem;
  color: var(--theme-text-primary);
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.back-btn:hover, .edit-btn:hover {
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  color: var(--theme-accent);
  transform: translateY(-1px);
}

.edit-btn {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  border-color: #d4a366;
  color: var(--theme-bg-surface);
}

.edit-btn:hover {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.loading-container, .error-container, .no-report, .not-found {
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

.error-container i, .no-report i, .not-found i {
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

.report-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  background-attachment: local;
  position: relative;
}

.report-content::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--theme-bg-surface);
  opacity: 0.9;
  pointer-events: none;
}

.report-content > * {
  position: relative;
  z-index: 1;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid var(--theme-accent);
}

.report-meta {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

.report-info {
  flex: 1;
}

.report-text-info {
  margin-bottom: 1rem;
  font-size: 1rem;
  color: var(--theme-text-primary);
  line-height: 1.5;
}

.report-text-info > div:first-child {
  font-size: 150%;
}

.ending-location-line {
  margin-top: 0.5rem;
  color: var(--theme-text-secondary);
  font-style: italic;
}

.report-members-images {
  margin-bottom: 0.5rem;
  overflow: hidden; /* Clear floats */
}

.report-members-images .other-members {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.report-members-images .member-avatar {
  width: calc(5.4rem * .8);
  height: calc(9rem * .8);
  border-radius: 0.25rem;
  background: #8B4513;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #8B4513;
  transition: all 0.3s ease;
  position: relative;
  box-shadow: 
    0 0 0 1px #654321,
    0 2px 8px rgba(0, 0, 0, 0.3),
    inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  padding: 2px;
}

.report-members-images .member-avatar.author-avatar {
  width: 7.2rem;
  height: 12rem;
  float: left;
  margin-right: 0.75rem;
}

.report-members-images .member-avatar i {
  color: var(--theme-bg-surface);
  font-size: 1.25rem;
}

.report-members-images .member-avatar.author-avatar i {
  font-size: 1.875rem;
}

.report-members-images .member-avatar .character-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0.25rem;
}

.report-members-images .member-avatar.author-avatar .character-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0.25rem;
  border: none; /* Remove any inherited borders since the container handles it */
  box-shadow: none; /* Remove any inherited shadows since the container handles it */
  padding: 0; /* Remove any inherited padding since the container handles it */
}

.desktop-actions {
  display: none;
}

@media (min-width: 768px) {
  .desktop-actions {
    display: flex;
    gap: 1rem;
  }
}

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

.btn-icon {
  width: 36px;
  height: 36px;
  padding: 6px;
  border: 1px solid var(--theme-accent);
  border-radius: 50%;
  background: transparent;
  color: var(--theme-accent);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--theme-accent) 20%, transparent);
}

.btn-icon i {
  font-size: 1rem;
}

.party-members, .report-text, .ending-location, .report-metadata {
  margin-bottom: 2rem;
}

.party-members h3, .report-text h3, .ending-location h3, .report-metadata h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1rem 0;
  color: var(--theme-accent);
  font-size: 1.1rem;
  font-weight: 600;
  font-family: var(--theme-font-display);
}

.party-members h3 i, .report-text h3 i, .ending-location h3 i, .report-metadata h3 i {
  color: var(--theme-success);
}

.members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.member-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #1a2742 100%);
  border-radius: 0.5rem;
  border: 1px solid var(--theme-accent);
  transition: all 0.3s ease;
}

.member-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--theme-accent) 20%, transparent);
}

.member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #d4a366;
}

.member-avatar i {
  color: var(--theme-bg-surface);
  font-size: 1.25rem;
}

.member-name {
  font-weight: 500;
  color: var(--theme-text-primary);
}

.text-content {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #1a2742 100%);
  border-radius: 0.5rem;
  padding: 1.5rem;
  border: 2px solid var(--theme-accent);
  line-height: 1.6;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.2);
}

.text-content :deep(p) {
  margin: 0 0 1rem 0;
  color: var(--theme-text-primary);
}

.text-content :deep(p:last-child) {
  margin-bottom: 0;
}

/* Contain floated figures so they don't spill past the report body. */
.report-html {
  display: flow-root;
}

/* Framed illustration: a thin accent frame that hugs the image (width:
   fit-content), echoing the character-avatar frames elsewhere in the report. */
.report-html :deep(figure.image) {
  display: block;
  width: fit-content;
  max-width: 100%;
  margin: 0.25rem 0 1rem;
  border: 3px solid color-mix(in srgb, var(--theme-accent) 65%, #000);
  border-radius: 3px;
  background: var(--theme-bg-surface);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}

.report-html :deep(figure.image img) {
  display: block;
  width: auto;
  max-width: 100%;
  height: auto;
}

/* Float alignment. The frame sits inset from the text on its wrap side. */
.report-html :deep(figure.image.image-style-align-left),
.report-html :deep(figure.image.image-style-block-align-left) {
  float: left;
  margin-right: 1rem;
}

.report-html :deep(figure.image.image-style-align-right),
.report-html :deep(figure.image.image-style-side),
.report-html :deep(figure.image.image-style-block-align-right) {
  float: right;
  margin-left: 1rem;
}

.report-html :deep(figure.image.image-style-align-center) {
  margin-left: auto;
  margin-right: auto;
}

/* Engraved caption plaque beneath the image. width:0 + min-width:100% keeps
   the caption from widening the frame past the image while still filling it. */
.report-html :deep(figure.image figcaption) {
  display: block;
  box-sizing: border-box;
  width: 0;
  min-width: 100%;
  padding: 0.35em 0.6em;
  font-size: 80%;
  font-style: italic;
  line-height: 1.4;
  color: var(--theme-text-primary);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--theme-accent) 22%, var(--theme-bg-surface)),
    var(--theme-bg-surface)
  );
  border-top: 1px solid var(--theme-accent);
  overflow-wrap: break-word;
}

.no-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: var(--theme-text-secondary);
  text-align: center;
}

.no-content i {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
  color: var(--theme-accent);
}

.ending-content {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #1a2742 100%);
  border-radius: 0.5rem;
  padding: 1.5rem;
  border: 2px solid var(--theme-accent);
  line-height: 1.6;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.2);
}

.ending-content p {
  margin: 0;
  color: var(--theme-text-primary);
  font-size: 1rem;
}

.metadata-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.metadata-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem;
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #1a2742 100%);
  border-radius: 0.5rem;
  border: 1px solid var(--theme-accent);
  transition: all 0.3s ease;
}

.metadata-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px color-mix(in srgb, var(--theme-accent) 10%, transparent);
}

.metadata-item label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--theme-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metadata-item span {
  color: var(--theme-text-primary);
  font-weight: 500;
}

/* Custom scrollbar */
.report-content::-webkit-scrollbar {
  width: 8px;
}

.report-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.report-content::-webkit-scrollbar-thumb {
  background: var(--theme-accent);
  border-radius: 4px;
}

.report-content::-webkit-scrollbar-thumb:hover {
  background: #e6b373;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .report-content {
    padding: 0.5em;
  }
  
  .text-content {
    padding: 0.5em;
  }

  /* On phones a floated 300px image crowds the text, so center figures
     full-width and let the body text flow above and below them. */
  .report-html :deep(figure.image) {
    float: none !important;
    margin-left: auto;
    margin-right: auto;
  }

  .report-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .report-meta {
    flex-direction: column;
    gap: 1rem;
    width: 100%;
  }
  
  .members-grid {
    grid-template-columns: 1fr;
  }
  
  .metadata-grid {
    grid-template-columns: 1fr;
  }
}


/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .member-card:hover,
  .metadata-item:hover,
  .btn-secondary:hover,
  .retry-btn:hover {
    transform: none;
  }
}
</style>
