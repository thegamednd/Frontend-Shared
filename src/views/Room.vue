<template>
  <div class="room-view" v-if="userStore.loaded && realmStore.loaded">
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading room...</p>
    </div>

    <div v-else-if="room" class="room-layout">
      <!-- Sidebar -->
      <aside class="room-sidebar">
        <div class="sidebar-inner">
          <div class="sidebar-header">
            <router-link :to="`/rooms/${room.Path}`" class="sidebar-room-link" @click="sidebarOpen = false">
              <span class="sidebar-room-name">{{ room.Name }}</span>
            </router-link>
            <span v-if="isArchived" class="sidebar-archived-dot" title="Archived"></span>
          </div>

          <div v-if="filteredRoomContents.length > 0 || canEditRoom" class="children-section">
            <h4 class="sidebar-label">Contents</h4>
            <nav class="children-list">
              <template v-for="content in filteredRoomContents" :key="content.ID">
                <!-- External link -->
                <div
                  v-if="content.Link && content.Link.trim()"
                  class="child-link external-child"
                  :class="{ 'inactive-child': !content.IsActive }"
                  @click="openExternalLink(content); sidebarOpen = false"
                >
                  <div class="child-info">
                    <button
                      v-if="canEditRoom"
                      @click.prevent.stop="editContent(content, $event)"
                      class="child-edit-btn child-edit-left"
                      title="Edit"
                    >
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                    <span class="child-name">{{ content.Name }}</span>
                  </div>
                  <span class="material-symbols-outlined child-external-icon">open_in_new</span>
                </div>

                <!-- Internal link -->
                <router-link
                  v-else
                  :to="`/rooms/${content.Path.replace(/^\//, '')}`"
                  class="child-link"
                  :class="{ 'inactive-child': !content.IsActive }"
                  @click="sidebarOpen = false"
                >
                  <div class="child-info">
                    <button
                      v-if="canEditRoom"
                      @click.prevent.stop="editContent(content, $event)"
                      class="child-edit-btn child-edit-left"
                      title="Edit"
                    >
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                    <span class="child-name">{{ content.Name }}</span>
                  </div>
                </router-link>
              </template>
            </nav>

            <button v-if="canEditRoom" @click="addContent" class="btn-sidebar-add">
              <span class="material-symbols-outlined">add</span>
              Add Content
            </button>
          </div>
        </div>
      </aside>

      <!-- Mobile contents accordion (visible only on mobile) -->
      <div v-if="filteredRoomContents.length > 0" class="mobile-contents-accordion">
        <button class="accordion-toggle" @click="sidebarOpen = !sidebarOpen">
          <span class="material-symbols-outlined">menu_book</span>
          <span>Contents ({{ filteredRoomContents.length }})</span>
          <span class="material-symbols-outlined accordion-arrow">{{ sidebarOpen ? 'expand_less' : 'expand_more' }}</span>
        </button>
        <nav v-if="sidebarOpen" class="accordion-list">
          <template v-for="content in filteredRoomContents" :key="content.ID">
            <div
              v-if="content.Link && content.Link.trim()"
              class="accordion-item"
              @click="openExternalLink(content); sidebarOpen = false"
            >
              <span>{{ content.Name }}</span>
              <span class="material-symbols-outlined" style="font-size: 14px;">open_in_new</span>
            </div>
            <a
              v-else
              :href="`/rooms/${content.Path.replace(/^\//, '')}`"
              class="accordion-item"
              @click.prevent="navigateToContent(content)"
            >
              {{ content.Name }}
            </a>
          </template>
          <router-link v-if="canEditRoom" to="/rooms/add" class="accordion-item accordion-add">
            <span class="material-symbols-outlined" style="font-size: 16px;">add</span>
            Add Content
          </router-link>
        </nav>
      </div>

      <!-- Main Content -->
      <main class="room-main">
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

        <div class="room-content">
          <div v-if="room.Description" class="room-description" v-html="room.Description"></div>
          <div v-else class="no-description">
            <p>No description provided for this room.</p>
          </div>
        </div>
      </main>
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
const sidebarOpen = ref(false);

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
  if (userStore.isAdmin) {
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

const navigateToContent = (content) => {
  const path = `/rooms/${content.Path.replace(/^\//, '')}`;
  router.push(path);
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
</script>

<style scoped>
.room-view {
  color: #ffffff;
}

/* Loading */
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

/* ── Two-Column Layout ── */
.room-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100%;
}

/* ═══════════════════════════════════════
   SIDEBAR
   ═══════════════════════════════════════ */

.room-sidebar {
  position: relative;
}

/* Mobile contents accordion — hidden on desktop, shown on mobile */
.mobile-contents-accordion {
  display: none;
  border: 1px solid color-mix(in srgb, var(--theme-accent) 15%, transparent);
  border-radius: 0.5rem;
  overflow: hidden;
  margin-bottom: 1rem;
  background: color-mix(in srgb, var(--theme-bg-surface) 60%, transparent);
}

.accordion-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  color: var(--theme-accent);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.accordion-toggle .material-symbols-outlined {
  font-size: 18px;
}

.accordion-arrow {
  margin-left: auto;
}

.accordion-list {
  border-top: 1px solid color-mix(in srgb, var(--theme-accent) 10%, transparent);
}

.accordion-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem 0.6rem 2.5rem;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-size: 0.85rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  cursor: pointer;
}

.accordion-item:last-child {
  border-bottom: none;
}

.accordion-item:hover,
.accordion-item.router-link-active {
  color: var(--theme-accent);
  background: color-mix(in srgb, var(--theme-accent) 6%, transparent);
}

.accordion-add {
  color: color-mix(in srgb, var(--theme-accent) 50%, transparent);
  font-style: italic;
}

.sidebar-inner {
  position: sticky;
  top: 0;
  max-height: 100vh;
  overflow-y: auto;
  padding: 1.25rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  border-right: 1px solid color-mix(in srgb, var(--theme-accent) 10%, transparent);
  background: linear-gradient(180deg, rgba(14, 18, 32, 0.5) 0%, rgba(14, 18, 32, 0.7) 100%);
}

.sidebar-inner::-webkit-scrollbar { width: 3px; }
.sidebar-inner::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--theme-accent) 15%, transparent);
  border-radius: 3px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sidebar-room-link {
  text-decoration: none;
  color: var(--theme-accent);
  transition: color 0.15s;
}

.sidebar-room-link:hover {
  color: #fff;
}

.sidebar-room-name {
  font-family: 'Pirata One', cursive;
  font-size: 1.1rem;
}

.sidebar-archived-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6c757d;
  flex-shrink: 0;
}

.sidebar-label {
  font-family: 'Pirata One', cursive;
  font-size: 0.9rem;
  color: var(--theme-accent);
  margin: 0 0 0.6rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid color-mix(in srgb, var(--theme-accent) 12%, transparent);
  letter-spacing: 0.03em;
}

/* ── Child Content Navigation ── */
.children-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.child-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.5rem;
  border-radius: 5px;
  text-decoration: none;
  color: #D2B48C;
  transition: all 0.15s ease;
  cursor: pointer;
  border-left: 2px solid transparent;
}

.child-link:hover {
  color: var(--theme-accent);
  background: color-mix(in srgb, var(--theme-accent) 6%, transparent);
}

.child-link.inactive-child {
  opacity: 0.5;
}

.child-info {
  display: flex;
  align-items: center;
  gap: 1px;
  overflow: visible;
  min-width: 0;
  flex: 1;
}

.child-name {
  font-size: 0.82rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.child-external-icon {
  font-size: 0.85rem;
  color: #4a90e2;
  flex-shrink: 0;
}

.child-edit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: color-mix(in srgb, var(--theme-accent) 40%, transparent);
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  opacity: 0;
  transition: all 0.15s;
  margin-left: -12px;
}

.child-link:hover .child-edit-btn {
  opacity: 1;
}

.child-edit-btn:hover {
  color: var(--theme-accent);
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
}

.child-edit-btn .material-symbols-outlined {
  font-size: 0.85rem;
}

.btn-sidebar-add {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.75rem;
  padding: 0.4rem 0.6rem;
  border: 1px dashed color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 5px;
  background: transparent;
  color: color-mix(in srgb, var(--theme-accent) 60%, transparent);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  width: 100%;
}

.btn-sidebar-add:hover {
  border-color: var(--theme-accent);
  color: var(--theme-accent);
  background: color-mix(in srgb, var(--theme-accent) 5%, transparent);
}

.btn-sidebar-add .material-symbols-outlined {
  font-size: 1rem;
}

/* ═══════════════════════════════════════
   MAIN CONTENT
   ═══════════════════════════════════════ */

.room-main {
  padding: 2rem 2.5rem 4rem;
  max-width: 780px;
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

.room-content {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid var(--theme-accent);
  border-radius: 1rem;
  padding: 1rem;
  position: relative;
  transition: all 0.3s ease;
}

@media (min-width: 901px) {
  .room-content {
    padding: 2rem;
  }
}

.room-description {
  line-height: 1.6;
}

.no-description {
  color: #aaa;
  font-style: italic;
}

/* Not Found */
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

/* ── Mobile sidebar backdrop ── */
.sidebar-backdrop {
  display: none;
}

/* ═══════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════ */

@media (max-width: 900px) {
  .room-layout {
    grid-template-columns: 1fr;
  }

  .room-main {
    padding: 1.25rem 1rem 3rem;
    max-width: 100%;
  }

  .room-header h1 {
    font-size: 2rem;
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

  .room-actions,
  .archived-badge,
  .accordion-add {
    display: none;
  }

  /* Hide desktop sidebar on mobile */
  .room-sidebar {
    display: none;
  }

  /* Show mobile accordion */
  .mobile-contents-accordion {
    display: block;
  }

  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 999;
  }
}

@media (max-width: 480px) {
  .room-main {
    padding: 1rem 0.75rem 3rem;
  }

  .room-header h1 {
    font-size: 1.75rem;
  }
}
</style>
