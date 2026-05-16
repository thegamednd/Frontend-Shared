<template>
  <div class="content-article" v-if="userStore.loaded && realmStore.loaded">
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading content...</p>
    </div>

    <div v-else-if="content" class="room-layout">
      <!-- Sidebar -->
      <aside class="room-sidebar">
        <div class="sidebar-inner">
          <!-- Breadcrumb -->
          <nav class="sidebar-breadcrumb" aria-label="Content breadcrumb">
            <router-link
              v-for="(crumb, index) in breadcrumbs"
              :key="index"
              :to="crumb.path"
              class="crumb"
              :class="{ 'current': index === breadcrumbs.length - 1 }"
              @click="sidebarOpen = false"
            >
              {{ crumb.name }}
            </router-link>
          </nav>

          <!-- Room's direct children (sibling navigation) -->
          <div v-if="roomChildContents.length > 0" class="children-section">
            <h4 class="sidebar-label">Contents</h4>
            <nav class="children-list">
              <router-link
                v-for="sibling in roomChildContents"
                :key="sibling.ID"
                :to="`/rooms/${sibling.Path.replace(/^\//, '')}`"
                class="child-link"
                :class="{
                  'active-child': sibling.Path === activeRoomChildPath,
                  'inactive-child': !sibling.IsActive
                }"
                @click="sidebarOpen = false"
              >
                <div class="child-info">
                  <span class="child-name">{{ sibling.Name }}</span>
                </div>
              </router-link>
            </nav>
          </div>

          <!-- Current article's children -->
          <div v-if="childContents.length > 0" class="children-section">
            <h4 class="sidebar-label">Sub-Content</h4>
            <nav class="children-list">
              <router-link
                v-for="child in childContents"
                :key="child.ID"
                :to="`/rooms/${child.Path.replace(/^\//, '')}`"
                class="child-link"
                :class="{ 'inactive-child': !child.IsActive }"
                @click="sidebarOpen = false"
              >
                <div class="child-info">
                  <span class="child-name">{{ child.Name }}</span>
                </div>
              </router-link>
            </nav>
          </div>

          <!-- Add child content -->
          <div v-if="canAddChildContent" class="children-section">
            <button @click="addChildContent" class="btn-sidebar-add">
              <span class="material-symbols-outlined">add</span>
              Add Content
            </button>
          </div>
        </div>
      </aside>

      <!-- Mobile contents accordion -->
      <div v-if="roomChildContents.length > 0 || childContents.length > 0" class="mobile-contents-accordion">
        <button class="accordion-toggle" @click="sidebarOpen = !sidebarOpen">
          <span class="material-symbols-outlined">menu_book</span>
          <span>Contents</span>
          <span class="material-symbols-outlined accordion-arrow">{{ sidebarOpen ? 'expand_less' : 'expand_more' }}</span>
        </button>
        <nav v-if="sidebarOpen" class="accordion-list">
          <!-- Breadcrumb -->
          <div class="accordion-breadcrumb">
            <a
              v-for="(crumb, index) in breadcrumbs"
              :key="index"
              :href="crumb.path"
              class="accordion-crumb"
              @click.prevent="router.push(crumb.path)"
            >{{ crumb.name }}<span v-if="index < breadcrumbs.length - 1"> &rsaquo; </span></a>
          </div>
          <!-- Room siblings -->
          <template v-for="sibling in roomChildContents" :key="sibling.ID">
            <a
              :href="`/rooms/${sibling.Path.replace(/^\//, '')}`"
              class="accordion-item"
              :class="{ 'accordion-active': sibling.Path === activeRoomChildPath }"
              @click.prevent="router.push(`/rooms/${sibling.Path.replace(/^\//, '')}`)"
            >{{ sibling.Name }}</a>
          </template>
          <!-- Current article's children -->
          <template v-if="childContents.length > 0">
            <div class="accordion-divider"></div>
            <a
              v-for="child in childContents"
              :key="child.ID"
              :href="`/rooms/${child.Path.replace(/^\//, '')}`"
              class="accordion-item accordion-child"
              @click.prevent="router.push(`/rooms/${child.Path.replace(/^\//, '')}`)"
            >{{ child.Name }}</a>
          </template>
        </nav>
      </div>

      <!-- Main Content -->
      <main class="room-main">
        <div class="content-header">
          <div class="content-title">
            <h1>{{ content.Name }}</h1>
            <span v-if="!content.IsActive" class="inactive-badge" title="This content is inactive">
              <span class="material-symbols-outlined">visibility_off</span>
              Inactive
            </span>
          </div>
          <div class="content-actions">
            <button v-if="canEditContent" @click="editContent" class="btn-edit" title="Edit Content">
              <span class="material-symbols-outlined">edit</span>
            </button>
          </div>
        </div>

        <div class="content-body">
          <div v-if="content.Content" class="content-html" v-html="content.Content"></div>
          <div v-else class="no-content">
            <p>No content provided for this article.</p>
          </div>
        </div>

        <div v-if="content.Link" class="content-external-link">
          <a :href="content.Link" target="_blank" rel="noopener noreferrer" class="external-link">
            <span class="material-symbols-outlined">open_in_new</span>
            Related Link
          </a>
        </div>
      </main>
    </div>

    <div v-else class="content-not-found">
      <!-- Breadcrumb for not found page -->
      <nav class="breadcrumb-nav" aria-label="Content breadcrumb" v-if="room">
        <div class="breadcrumb-list">
          <router-link :to="`/rooms/${roomPath}`" class="breadcrumb-item">
            {{ room.Name }}
          </router-link>
          <span class="breadcrumb-item current">Content Not Found</span>
        </div>
      </nav>

      <h2>Content Not Found</h2>
      <p>The content article could not be found or you don't have permission to view it.</p>
      <router-link :to="`/rooms/${roomPath}`" class="btn btn-primary">Return to Room</router-link>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@shared/stores/user';
import { useRealmStore } from '@shared/stores/realm';
import { useContentStore } from '@shared/stores/content';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const realmStore = useRealmStore();
const contentStore = useContentStore();

const props = defineProps({
  roomPath: String,
  contentName: String,
  fullContentPath: String
});

const loading = ref(true);
const sidebarOpen = ref(false);

// Collapse accordion on route change (same component, different params)
watch(() => route.params, () => {
  sidebarOpen.value = false;
});

// Get the room by path
const room = computed(() => {
  return contentStore.arRooms.find(r => r.Path === props.roomPath) || null;
});

// Get the content article by path
const content = computed(() => {
  if (!room.value || !room.value.contents) {
    return null;
  }

  // Use the fullContentPath passed from the router, but normalize it
  const expectedPath = props.fullContentPath;
  const normalizedExpectedPath = expectedPath.startsWith('/') ? expectedPath.substring(1) : expectedPath;

  // Look through all content items for this room
  const roomContents = room.value.contents.map(contentId => contentStore.contents[contentId]).filter(Boolean);

  // Find content by matching against the normalized path (without leading slash)
  return roomContents.find(c => c.Path === normalizedExpectedPath) || null;
});

// Check if user can edit this content
const canEditContent = computed(() => {
  if (userStore.isAdmin) {
    return true;
  }

  if (realmStore.isOwner) {
    return true;
  }

  const currentUserPlayer = realmStore.arActivePlayers?.find(player => player.UserID === userStore.userSub);
  if (currentUserPlayer?.WriteAccess) {
    return true;
  }

  if (content.value && content.value.Editors && content.value.Editors.includes(userStore.userSub)) {
    return true;
  }

  return false;
});

// Check if content is at maximum depth (4 levels below room)
const isAtMaxDepth = computed(() => {
  if (!content.value) {
    return false;
  }

  const pathSegments = content.value.Path.split('/').filter(segment => segment.length > 0);
  const contentDepth = pathSegments.length - 1;
  const MAX_CONTENT_DEPTH = 4;

  return contentDepth >= MAX_CONTENT_DEPTH;
});

// Check if user can add child content
const canAddChildContent = computed(() => {
  if (content.value?.Link && content.value.Link.trim()) {
    return false;
  }

  return canEditContent.value && !isAtMaxDepth.value;
});

// Generate breadcrumb navigation
const breadcrumbs = computed(() => {
  if (!content.value || !room.value) {
    return [];
  }

  const crumbs = [];

  crumbs.push({
    name: room.value.Name,
    path: `/rooms/${room.value.Path}`
  });

  const contentPath = content.value.Path;
  const pathSegments = contentPath.split('/');
  const contentSegments = pathSegments.slice(1);

  let currentPath = room.value.Path;
  for (let i = 0; i < contentSegments.length; i++) {
    currentPath += '/' + contentSegments[i];

    const contentItem = contentStore.arContents.find(c => c.Path === currentPath);

    crumbs.push({
      name: contentItem ? contentItem.Name : contentSegments[i],
      path: `/rooms/${currentPath}`
    });
  }

  return crumbs;
});

// Get room's direct child contents for sidebar navigation
const roomChildContents = computed(() => {
  if (!room.value || !room.value.contents) return [];
  const allRoomContents = room.value.contents
    .map(contentId => contentStore.contents[contentId])
    .filter(Boolean);
  const directChildren = allRoomContents.filter(c => c.Parent === room.value.Path);
  if (canEditContent.value) {
    return directChildren;
  }
  return directChildren.filter(c => c.IsActive);
});

// Compute which room child is the ancestor of the current content (for highlighting)
const activeRoomChildPath = computed(() => {
  if (!content.value || !room.value) return null;
  const contentPath = content.value.Path;
  const roomPath = room.value.Path;
  if (!contentPath.startsWith(roomPath + '/')) return contentPath;
  const relativePath = contentPath.substring(roomPath.length + 1);
  const firstSegment = relativePath.split('/')[0];
  return roomPath + '/' + firstSegment;
});

// Get child contents for this content
const childContents = computed(() => {
  if (!content.value) {
    return [];
  }

  const allContents = contentStore.arContents;
  const currentContentPath = content.value.Path;

  const childContentItems = allContents.filter(c => c.Parent === currentContentPath);

  if (canEditContent.value) {
    return childContentItems;
  } else {
    return childContentItems.filter(c => c.IsActive);
  }
});

// Navigate to add child content page
const addChildContent = () => {
  if (content.value && props.fullContentPath) {
    router.push(`/rooms${props.fullContentPath}/add-content`);
  }
};

// Load room and content data
const loadContent = async () => {
  loading.value = true;

  try {
    if (contentStore.arRooms.length === 0) {
      await contentStore.loadRooms();
    }

    if (room.value && room.value.ID) {
      if (!room.value.contents) {
        await contentStore.loadRoomContents(room.value.ID);
      }
    }

    await contentStore.loadAllContents();
  } catch (error) {
    console.error('Failed to load content:', error);
  } finally {
    loading.value = false;
  }
};

// Navigate to edit content page
const editContent = () => {
  if (content.value && props.fullContentPath) {
    router.push(`/rooms${props.fullContentPath}/edit-content`);
  }
};

// Watch for route changes
watch(() => [props.roomPath, props.contentName, props.fullContentPath], loadContent, { immediate: true });
</script>

<style scoped>
.content-article {
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

/* Mobile contents accordion — hidden on desktop */
.mobile-contents-accordion { display: none; }

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

.accordion-toggle .material-symbols-outlined { font-size: 18px; }
.accordion-arrow { margin-left: auto; }

.accordion-list {
  border-top: 1px solid color-mix(in srgb, var(--theme-accent) 10%, transparent);
}

.accordion-breadcrumb {
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
}

.accordion-crumb {
  color: rgba(255, 255, 255, 0.4);
  text-decoration: none;
}

.accordion-crumb:hover { color: var(--theme-accent); }

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

.accordion-item:last-child { border-bottom: none; }

.accordion-item:hover,
.accordion-item.router-link-active,
.accordion-item.accordion-active {
  color: var(--theme-accent);
  background: color-mix(in srgb, var(--theme-accent) 6%, transparent);
}

.accordion-child { padding-left: 3.5rem; }

.accordion-divider {
  height: 1px;
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  margin: 0.25rem 1rem;
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

/* Breadcrumb in sidebar */
.sidebar-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  font-size: 0.78rem;
}

.crumb {
  color: color-mix(in srgb, var(--theme-accent) 60%, transparent);
  text-decoration: none;
  transition: color 0.15s;
}

.crumb:not(.current):hover { color: var(--theme-accent); }

.crumb:not(:last-child)::after {
  content: '\203A';
  margin-left: 0.35rem;
  color: color-mix(in srgb, var(--theme-accent) 25%, transparent);
}

.crumb.current {
  color: rgba(255, 255, 255, 0.85);
  font-weight: 600;
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

.child-link.active-child {
  color: var(--theme-accent);
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  border-left-color: var(--theme-accent);
}

.child-link.inactive-child {
  opacity: 0.5;
}

.child-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow: hidden;
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

.btn-sidebar-add {
  display: flex;
  align-items: center;
  gap: 0.4rem;
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

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--theme-accent);
}

.content-title {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.content-header h1 {
  font-family: 'Pirata One', cursive;
  font-size: 2.5rem;
  color: var(--theme-accent);
  margin: 0;
}

.inactive-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  background: rgba(255, 107, 107, 0.2);
  border: 1px solid rgba(255, 107, 107, 0.5);
  border-radius: 1rem;
  color: #ff6b6b;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.inactive-badge .material-symbols-outlined {
  font-size: 1rem;
}

.content-actions {
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

.content-body {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid var(--theme-accent);
  border-radius: 1rem;
  padding: 2rem;
  margin-bottom: 2rem;
}

.content-html {
  line-height: 1.6;
}

.content-html h1, .content-html h2, .content-html h3, .content-html h4, .content-html h5, .content-html h6 {
  color: var(--theme-accent);
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}

.content-html h1:first-child, .content-html h2:first-child, .content-html h3:first-child {
  margin-top: 0;
}

.content-html p {
  margin-bottom: 1rem;
}

.content-html ul, .content-html ol {
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}

.content-html blockquote {
  border-left: 4px solid var(--theme-accent);
  padding-left: 1rem;
  margin: 1rem 0;
  font-style: italic;
  background: color-mix(in srgb, var(--theme-accent) 5%, transparent);
  padding: 1rem;
  border-radius: 0.5rem;
}

/* CKEditor image styles */
.content-html .image-style-inline {
  display: inline-block;
  max-width: 100%;
}

.content-html .image-style-block {
  display: block;
  margin: 1rem auto;
  max-width: 100%;
}

.content-html .image-style-side {
  float: right;
  margin-left: 1rem;
  margin-bottom: 1rem;
  max-width: 50%;
}

.content-html::after {
  content: "";
  display: table;
  clear: both;
}

.content-html figure {
  margin: 0;
  display: table;
}

.content-html figure.table {
  display: block;
  width: 100%;
  overflow-x: auto;
}

.content-html table {
  table-layout: fixed;
  width: 100%;
}

.content-html figure.image-style-side {
  float: right;
  margin-left: 1rem;
  margin-bottom: 1rem;
  max-width: 50%;
}

.content-html figure.image-style-block {
  margin: 1rem auto;
  max-width: 100%;
}

.content-html figure figcaption {
  display: table-caption;
  caption-side: bottom;
  font-size: 0.9em;
  color: #888;
  font-style: italic;
  padding: 0.5rem 0;
  text-align: center;
  background: transparent;
  border: none;
}

.no-content {
  color: #aaa;
  font-style: italic;
  text-align: center;
  padding: 2rem;
}

.content-external-link {
  text-align: center;
}

.external-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
  color: white;
  text-decoration: none;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.external-link:hover {
  background: linear-gradient(135deg, #357abd 0%, #2968a3 100%);
  transform: translateY(-1px);
}

/* Not Found */
.content-not-found {
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
  padding: 3rem;
}

.content-not-found h2 {
  color: var(--theme-accent);
  font-family: 'Pirata One', cursive;
  font-size: 2rem;
  margin-bottom: 1rem;
}

/* Breadcrumb for not-found page */
.breadcrumb-nav {
  margin-bottom: 1.5rem;
  padding: 0.75rem 1.5rem;
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 0.5rem;
}

.breadcrumb-list {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.breadcrumb-item {
  color: var(--theme-accent);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.breadcrumb-item:not(.current):hover {
  color: #ffffff;
}

.breadcrumb-item:not(:last-child)::after {
  content: '>';
  margin-left: 0.5rem;
  color: #8a9ba8;
  font-weight: normal;
}

.breadcrumb-item.current {
  color: #ffffff;
  font-weight: 600;
  cursor: default;
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

  .content-header h1 {
    font-size: 2rem;
  }

  .content-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
    text-align: center;
  }

  .content-title {
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }

  .content-actions,
  .inactive-badge {
    display: none;
  }

  /* Hide desktop sidebar on mobile */
  .room-sidebar {
    display: none;
  }

  /* Show mobile accordion */
  .mobile-contents-accordion {
    display: block;
    border: 1px solid color-mix(in srgb, var(--theme-accent) 15%, transparent);
    border-radius: 0.5rem;
    overflow: hidden;
    margin-bottom: 1rem;
    background: color-mix(in srgb, var(--theme-bg-surface) 60%, transparent);
  }

  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 999;
  }

  .content-html :deep(table) {
    display: block;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .content-html :deep(figure) {
    float: none;
    max-width: 100%;
    margin-left: 0;
  }
}

@media (max-width: 480px) {
  .room-main {
    padding: 1rem 0.75rem 3rem;
  }

  .content-header h1 {
    font-size: 1.75rem;
  }

  .content-body {
    padding: 1rem;
  }
}
</style>
