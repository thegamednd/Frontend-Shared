<template>
  <div class="content-article" v-if="userStore.loaded && realmStore.loaded">
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading content...</p>
    </div>
    
    <div v-else-if="content" class="content-container">
      <!-- Breadcrumb Navigation -->
      <nav class="breadcrumb-nav" aria-label="Content breadcrumb">
        <div class="breadcrumb-list">
          <router-link 
            v-for="(crumb, index) in breadcrumbs" 
            :key="index"
            :to="crumb.path"
            class="breadcrumb-item"
            :class="{ 'current': index === breadcrumbs.length - 1 }"
          >
            {{ crumb.name }}
          </router-link>
        </div>
      </nav>
      
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
      
      <!-- Add Child Content Button -->
      <div v-if="canAddChildContent" class="add-content-section">
        <button @click="addChildContent" class="btn-add-content" title="Add Child Content">
          <span class="material-symbols-outlined">add</span>
          Add Content
        </button>
      </div>
      
      <!-- Child Content Section -->
      <div v-if="childContents.length > 0" class="child-contents-section">
        <h3>Sub-Content</h3>
        <div class="content-links">
          <router-link 
            v-for="childContent in childContents" 
            :key="childContent.ID"
            :to="`/rooms/${childContent.Path.replace(/^\//, '')}`"
            class="content-link"
            :class="{ 'inactive-content': !childContent.IsActive }"
          >
            <div class="content-link-info">
              <span class="content-name">{{ childContent.Name }}</span>
              <span v-if="childContent.Intro" class="content-intro">{{ childContent.Intro }}</span>
              <span v-if="!childContent.IsActive && canEditContent" class="inactive-badge">Inactive</span>
            </div>
          </router-link>
        </div>
      </div>
      
      <div v-if="content.Link" class="content-link">
        <a :href="content.Link" target="_blank" rel="noopener noreferrer" class="external-link">
          <span class="material-symbols-outlined">open_in_new</span>
          Related Link
        </a>
      </div>
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
import { ref, computed, onMounted, watch } from 'vue';
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
  
  // Check if user is in the content's editors list
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
  
  // Split the path and calculate content depth
  const pathSegments = content.value.Path.split('/').filter(segment => segment.length > 0);
  const contentDepth = pathSegments.length - 1; // First segment is room
  const MAX_CONTENT_DEPTH = 4;
  
  return contentDepth >= MAX_CONTENT_DEPTH;
});

// Check if user can add child content (must have edit permission, not be at max depth, and content must not have a Link)
const canAddChildContent = computed(() => {
  // Don't allow adding child content if this content has an external link
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
  
  // Start with the room
  crumbs.push({
    name: room.value.Name,
    path: `/rooms/${room.value.Path}`
  });
  
  // Build path segments from content path
  const contentPath = content.value.Path;
  const pathSegments = contentPath.split('/');
  
  // Remove the room segment (first segment) since we already have it
  const contentSegments = pathSegments.slice(1);
  
  // Build breadcrumbs for each content level
  let currentPath = room.value.Path;
  for (let i = 0; i < contentSegments.length; i++) {
    currentPath += '/' + contentSegments[i];
    
    // Find the content item for this path to get the display name
    const contentItem = contentStore.arContents.find(c => c.Path === currentPath);
    
    crumbs.push({
      name: contentItem ? contentItem.Name : contentSegments[i],
      path: `/rooms/${currentPath}`
    });
  }
  
  return crumbs;
});

// Get child contents for this content
const childContents = computed(() => {
  if (!content.value) {
    return [];
  }
  
  // Find all contents where the Parent matches this content's Path
  const allContents = contentStore.arContents;
  const currentContentPath = content.value.Path;
  
  // Get child contents
  const childContentItems = allContents.filter(c => c.Parent === currentContentPath);
  
  // Filter based on user permissions
  if (canEditContent.value) {
    // Users with edit permission can see all child content (active and inactive)
    return childContentItems;
  } else {
    // Normal users can only see active child content
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
    
    // Load all contents to support child content display
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
// immediate: true will call loadContent on mount, so we don't need onMounted
watch(() => [props.roomPath, props.contentName, props.fullContentPath], loadContent, { immediate: true });

// Removed onMounted since the watcher with immediate: true handles initial load
</script>

<style scoped>
.content-article {
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

/* Breadcrumb Navigation */
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
  position: relative;
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

.content-container {
  max-width: 800px;
  margin: 0 auto;
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

/* Clear floats after content */
.content-html::after {
  content: "";
  display: table;
  clear: both;
}

/* CKEditor image captions */
.content-html figure {
  margin: 0;
  display: table;
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

.content-link {
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

/* Add Content Button */
.add-content-section {
  text-align: right;
  margin: 2rem 0;
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

/* Child Content Section */
.child-contents-section {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid var(--theme-accent);
  border-radius: 1rem;
  padding: 2rem;
  margin-top: 2rem;
}

.child-contents-section h3 {
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
  .content-article {
    padding: 1rem;
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
  
  .content-header h1 {
    font-size: 2rem;
  }
  
  .content-actions {
    justify-content: center;
  }
  
  .breadcrumb-nav {
    padding: 0.5rem 1rem;
    margin-bottom: 1rem;
  }
  
  .breadcrumb-list {
    font-size: 0.9rem;
  }
}
</style>