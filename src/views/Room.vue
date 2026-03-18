<template>
  <div class="room-view" v-if="userStore.loaded && realmStore.loaded">
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading room...</p>
    </div>
    
    <div v-else-if="room" class="room-container">
      <div class="room-header">
        <div class="room-title">
          <h1>{{ room.Name }}</h1>
          <span v-if="isArchived" class="archived-badge" title="This room is archived">
            <span class="material-symbols-outlined">archive</span>
          </span>
        </div>
        <div v-if="canEditRoom" class="room-actions">
          <button @click="editRoom" class="btn-edit" title="Edit Room">
            <span class="material-symbols-outlined">edit</span>
          </button>
        </div>
      </div>
      
      <div class="room-content" :class="{ 'room-content-collapsed': !isContentExpanded }">
        <!-- Content Toggle Button -->
        <button 
          @click="toggleContent" 
          class="content-toggle-btn" 
          :title="isContentExpanded ? 'Collapse content' : 'Expand content'"
          aria-label="Toggle room content visibility"
        >
          <span class="material-symbols-outlined">
            {{ isContentExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down' }}
          </span>
        </button>
        
        <div v-if="room.Description" class="room-description" v-html="room.Description"></div>
        <div v-else class="no-description">
          <p>No description provided for this room.</p>
        </div>
      </div>
      
      <!-- Add Content Button -->
      <div v-if="canEditRoom" class="add-content-section">
        <button @click="addContent" class="btn-add-content" title="Add Content">
          <span class="material-symbols-outlined">add</span>
          Add Content
        </button>
      </div>
      
      <!-- Content Articles Section -->
      <div v-if="filteredRoomContents.length > 0" class="room-contents-section">
        <div class="content-links">
          <template v-for="content in filteredRoomContents" :key="content.ID">
            <!-- If content has a Link, render as div with click handler -->
            <div 
              v-if="content.Link && content.Link.trim()"
              class="content-link"
              :class="{ 
                'inactive-content': !content.IsActive,
                'external-link': true
              }"
              @click="openExternalLink(content)"
            >
              <div class="content-link-info">
                <div class="content-link-header">
                  <span class="content-name">{{ content.Name }}</span>
                  <div class="content-link-icons">
                    <!-- External link icon -->
                    <span 
                      class="external-link-icon" 
                      title="Opens in new tab"
                    >
                      <span class="material-symbols-outlined">open_in_new</span>
                    </span>
                    <!-- Edit icon for users with edit permissions -->
                    <button 
                      v-if="canEditRoom" 
                      @click="editContent(content, $event)"
                      class="edit-content-btn"
                      title="Edit content"
                    >
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                  </div>
                </div>
                <span v-if="content.Intro" class="content-intro">{{ content.Intro }}</span>
                <span v-if="!content.IsActive && canEditRoom" class="inactive-badge">Inactive</span>
              </div>
            </div>
            
            <!-- If content has no Link, render as router-link -->
            <router-link 
              v-else
              :to="`/rooms/${content.Path.replace(/^\//, '')}`"
              class="content-link"
              :class="{ 
                'inactive-content': !content.IsActive
              }"
            >
              <div class="content-link-info">
                <div class="content-link-header">
                  <span class="content-name">{{ content.Name }}</span>
                  <div class="content-link-icons">
                    <!-- Edit icon for users with edit permissions -->
                    <button 
                      v-if="canEditRoom" 
                      @click="editContent(content, $event)"
                      class="edit-content-btn"
                      title="Edit content"
                    >
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                  </div>
                </div>
                <span v-if="content.Intro" class="content-intro">{{ content.Intro }}</span>
                <span v-if="!content.IsActive && canEditRoom" class="inactive-badge">Inactive</span>
              </div>
            </router-link>
          </template>
        </div>
      </div>
    </div>
    
    <div v-else class="room-not-found">
      <h2>Room Not Found</h2>
      <p>The room "{{ $route.params.path }}" could not be found.</p>
      <router-link to="/" class="btn btn-primary">Return to Hearth</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@shared/stores/user';
import { useRealmStore } from '@shared/stores/realm';
import { useContentStore } from '@shared/stores/content';
import { useConfigStore } from '@shared/stores/config';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const realmStore = useRealmStore();
const contentStore = useContentStore();
const configStore = useConfigStore();

const emits = defineEmits(['set-room']);

const loading = ref(true);

// Get room by path from the content store
const room = computed(() => {
  const roomPath = route.params.path;
  return contentStore.arRooms.find(r => r.Path === roomPath) || null;
});

// Check if room is archived
const isArchived = computed(() => {
  return room.value ? !room.value.IsActive : false;
});

// Check if user can edit this room
const canEditRoom = computed(() => {
  // Admin (check if user is member of Administrators group)
  if (userStore.groups.includes('Administrators')) {
    return true;
  }
  
  // Realm owner
  if (realmStore.isOwner) {
    return true;
  }
  
  // Check if user has write access in this realm (from UserXRealm table)
  const currentUserPlayer = realmStore.arActivePlayers?.find(player => player.UserID === userStore.userSub);
  if (currentUserPlayer?.WriteAccess) {
    return true;
  }
  
  return false;
});

// Get filtered room contents based on user permissions
const filteredRoomContents = computed(() => {
  if (!room.value) {
    return [];
  }
  
  // Get all content items for this room
  const allRoomContents = room.value.contents 
    ? room.value.contents.map(contentId => contentStore.contents[contentId]).filter(Boolean)
    : [];
  
  // Filter to only show direct children (Parent equals room path)
  const directChildren = allRoomContents.filter(content => content.Parent === room.value.Path);
  
  // Filter based on user permissions
  if (canEditRoom.value) {
    // Users with edit permission can see all direct children (active and inactive)
    return directChildren;
  } else {
    // Normal users can only see active direct children
    return directChildren.filter(content => content.IsActive);
  }
});

// Load room data when component mounts or route changes
const loadRoom = async () => {
  loading.value = true;
  
  try {
    // Ensure rooms are loaded
    if (contentStore.arRooms.length === 0) {
      await contentStore.loadRooms();
    }
    
    // Load room contents if room exists and doesn't have contents loaded
    if (room.value && room.value.ID) {
      if (!room.value.contents) {
        await contentStore.loadRoomContents(room.value.ID);
      }
    }
  } catch (error) {
    console.error('Failed to load room:', error);
  } finally {
    loading.value = false;
  }
};

// Navigate to edit room page
const editRoom = () => {
  if (room.value) {
    router.push(`/rooms/${room.value.Path}/edit`);
  }
};

// Navigate to add content page
const addContent = () => {
  if (room.value) {
    router.push(`/rooms/${room.value.Path}/add-content`);
  }
};

// Watch for route changes
// immediate: true will call loadRoom on mount, so we don't need onMounted
watch(() => route.params.path, loadRoom, { immediate: true });

// Computed property for content expansion state
const isContentExpanded = computed(() => {
  if (!room.value?.ID) {
    return true; // Default to expanded
  }
  return configStore.isRoomContentExpanded(room.value.ID);
});

// Method to toggle content visibility
const toggleContent = async () => {
  if (!room.value?.ID) {
    console.warn('No room ID available for toggle');
    return;
  }
  await configStore.toggleRoomContent(room.value.ID);
};

// Open external link in new tab
const openExternalLink = (content) => {
  if (content.Link && content.Link.trim()) {
    window.open(content.Link, '_blank');
  }
};

// Navigate to edit content page
const editContent = (content, event) => {
  event.preventDefault();
  event.stopPropagation();
  router.push(`/rooms/${content.Path.replace(/^\//, '')}/edit-content`);
};

// Watch for room changes and emit set-room event
watch(room, (newRoom) => {
  if (newRoom) {
    emits('set-room', newRoom);
  }
}, { immediate: true });

// Removed onMounted since the watcher with immediate: true handles initial load
</script>

<style scoped>
.room-view {
  padding: 2rem;
  color: #ffffff;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  gap: 1rem;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid transparent;
  border-top: 3px solid var(--theme-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.room-container {
  max-width: 800px;
  margin: 0 auto;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--theme-accent);
}

.room-title {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.room-header h1 {
  font-family: 'Pirata One', cursive;
  font-size: 2.5rem;
  color: var(--theme-accent);
  margin: 0;
}

.archived-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  background: rgba(108, 117, 125, 0.2);
  border: 1px solid #6c757d;
  border-radius: 1rem;
  color: #6c757d;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.archived-badge .material-symbols-outlined {
  font-size: 1rem;
}

.room-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-add-content {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
  color: white;
  font-weight: 500;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.btn-add-content:hover {
  background: linear-gradient(135deg, #357abd 0%, #2968a3 100%);
  transform: translateY(-1px);
}

.btn-edit {
  padding: 0.5rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  transition: all 0.2s ease;
}

.btn-edit:hover {
  background: linear-gradient(135deg, #e6b373 0%, #d4a566 100%);
  transform: translateY(-1px);
}

.add-content-section {
  text-align: right;
  margin-bottom: 2rem;
}


.room-content {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid var(--theme-accent);
  border-radius: 1rem;
  padding: 2rem;
  margin-bottom: 2rem;
  position: relative;
  transition: all 0.3s ease;
}

.room-content-collapsed {
  max-height: 8em;
  overflow: hidden;
  position: relative;
}

.room-content-collapsed::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2em;
  background: linear-gradient(transparent, var(--theme-bg-surface));
  pointer-events: none;
}

.content-toggle-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 50%, transparent);
  border-radius: 50%;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--theme-accent);
  transition: all 0.2s ease;
  z-index: 10;
}

.content-toggle-btn:hover {
  background: color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-color: var(--theme-accent);
  transform: scale(1.1);
}

.content-toggle-btn .material-symbols-outlined {
  font-size: 1.25rem;
}

.room-description {
  line-height: 1.6;
}

.no-description {
  color: #aaa;
  font-style: italic;
}


.room-not-found {
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
  padding: 3rem;
}

.room-not-found h2 {
  color: var(--theme-accent);
  font-family: 'Pirata One', cursive;
  font-size: 2rem;
  margin-bottom: 1rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
  text-decoration: none;
  transition: all 0.2s ease;
  margin-top: 1rem;
}

.btn-primary {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #e6b373 0%, #d4a566 100%);
  transform: translateY(-1px);
}

/* Content Articles Section */
.room-contents-section {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid var(--theme-accent);
  border-radius: 1rem;
  padding: 2rem;
  margin-top: 2rem;
}

.room-contents-section h3 {
  color: var(--theme-accent);
  font-family: 'Pirata One', cursive;
  font-size: 1.5rem;
  margin: 0 0 1.5rem 0;
  border-bottom: 1px solid var(--theme-accent);
  padding-bottom: 0.5rem;
}

.content-links {
  display: grid;
  gap: 1rem;
}

.content-link {
  display: block;
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 0.5rem;
  padding: 1rem;
  text-decoration: none;
  transition: all 0.2s ease;
  color: #ffffff;
  cursor: pointer;
}

.content-link:hover {
  background: color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-color: var(--theme-accent);
  transform: translateY(-1px);
}

.content-link.inactive-content {
  opacity: 0.7;
  border-style: dashed;
}

.content-link-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.content-link-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.content-link-icons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.external-link-icon {
  display: flex;
  align-items: center;
  color: #4a90e2;
  font-size: 0.9rem;
}

.external-link-icon .material-symbols-outlined {
  font-size: 1rem;
}

.edit-content-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 50%, transparent);
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  cursor: pointer;
  color: var(--theme-accent);
  transition: all 0.2s ease;
  padding: 0;
}

.edit-content-btn:hover {
  background: color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-color: var(--theme-accent);
  transform: scale(1.1);
}

.edit-content-btn .material-symbols-outlined {
  font-size: 1rem;
}

.content-link.external-link {
  position: relative;
}

.content-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--theme-accent);
}

.content-intro {
  font-size: 0.9rem;
  color: #cccccc;
  line-height: 1.4;
}

.inactive-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: rgba(255, 107, 107, 0.2);
  border: 1px solid rgba(255, 107, 107, 0.5);
  border-radius: 0.25rem;
  color: #ff6b6b;
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  width: fit-content;
}

/* Responsive Design */
@media (max-width: 768px) {
  .room-view {
    padding: 1rem;
  }
  
  .room-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
    text-align: center;
  }
  
  .room-title {
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }
  
  .room-header h1 {
    font-size: 2rem;
  }
  
  .room-actions {
    display: none; /* Hide edit button on mobile */
  }
}
</style>