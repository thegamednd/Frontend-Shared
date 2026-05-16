<template>
  <div class="add-content" v-if="userStore.loaded && realmStore.loaded">
    <div class="content-container">
      <h2 class="content-header">
        <span>Create New Content</span>
        <span class="header-actions">
          <button @click="cancel" class="btn-cancel" title="Cancel">
            <span class="material-symbols-outlined">cancel</span>
          </button>
          <button @click="save" ref="btnSave" class="btn-save" title="Create Content" :disabled="isCreating">
            <span class="material-symbols-outlined" v-if="!isCreating">save</span>
            <span class="loading-spinner" v-else></span>
          </button>
        </span>
      </h2>
      
      <div class="content-create-content">
        <div class="content-create-form">
          <div class="form-section">
            <h3>Content Information</h3>
            <div class="form-grid">
              <div class="form-field">
                <label for="contentName">Name <span class="required">*</span></label>
                <div class="input-with-error">
                  <input
                    ref="elName"
                    autocomplete="off"
                    type="text"
                    id="contentName"
                    v-model="contentData.name"
                    @input="validateContentName"
                    @blur="validateContentName"
                    maxlength="100"
                    required
                    placeholder="Enter content name..."
                    :class="{ 'error-input': nameError }"
                  />
                  <div v-if="nameError" class="field-error">
                    <span class="material-symbols-outlined">error</span>
                    {{ nameError }}
                  </div>
                </div>
              </div>
              
              <div class="form-field full-width">
                <label for="contentIntro">Introduction</label>
                <textarea
                  id="contentIntro"
                  v-model="contentData.intro"
                  placeholder="Brief introduction or summary..."
                  rows="3"
                />
              </div>
              
              <div class="form-field">
                <label for="contentLink">Link <span class="optional">(Optional)</span></label>
                <input
                  type="url"
                  id="contentLink"
                  v-model="contentData.link"
                  placeholder="https://example.com"
                />
              </div>
              
              <div class="form-field full-width">
                <label for="contentDescription">Content <span class="required">*</span></label>
                <InlineEditor 
                  v-model="contentData.content"
                  placeholder="Enter the main content..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@shared/stores/user';
import { useRealmStore } from '@shared/stores/realm';
import { useContentStore } from '@shared/stores/content';
import InlineEditor from '@shared/components/cms/InlineEditor.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const realmStore = useRealmStore();
const contentStore = useContentStore();

// Define props for route parameters
const props = defineProps({
  path: String,          // For room-level content (from /rooms/:path/add-content)
  roomPath: String,      // For child content (from route props)
  parentPath: String,    // For child content (from route props)
  isChildContent: Boolean // For child content (from route props)
});

const elName = ref(null);
const btnSave = ref(null);
const isCreating = ref(false);
const nameError = ref(null);

// Get the room path (handle both route patterns)
const roomPath = computed(() => props.roomPath || props.path || route.params.path);

// Get the room for this content
const room = computed(() => {
  return contentStore.arRooms.find(r => r.Path === roomPath.value) || null;
});

// Get the parent content if this is child content
const parentContent = computed(() => {
  if (!props.isChildContent || !props.parentPath) {
    return null;
  }
  
  // Find content by matching path
  const allContents = contentStore.arContents;
  return allContents.find(c => c.Path === props.parentPath) || null;
});

// Content form data
const contentData = ref({
  name: '',
  intro: '',
  link: '',
  content: ''
});

// Check if user has write permission
const canCreate = computed(() => {
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

// Check if content depth would exceed maximum (4 levels below room)
const validateContentDepth = (contentPath) => {
  const pathSegments = contentPath.split('/').filter(segment => segment.length > 0);
  const contentDepth = pathSegments.length - 1; // First segment is room
  const MAX_CONTENT_DEPTH = 4;
  
  return {
    isValid: contentDepth <= MAX_CONTENT_DEPTH,
    depth: contentDepth,
    message: contentDepth > MAX_CONTENT_DEPTH 
      ? `Content cannot be nested deeper than ${MAX_CONTENT_DEPTH} levels below the room. Current depth would be ${contentDepth}.`
      : null
  };
};

// Generate content path from name
const generatePath = (name) => {
  if (!name) return '';
  
  const cleanName = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except hyphens and spaces
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  
  // If this is child content, use parent path as base
  if (props.isChildContent && props.parentPath) {
    return `${props.parentPath}/${cleanName}`;
  }
  
  // Otherwise, use room path as base
  if (room.value) {
    return `${room.value.Path}/${cleanName}`;
  }
  
  return cleanName;
};

// Save content
const save = async () => {
  if (!contentData.value.name.trim()) {
    nameError.value = 'Content name is required.';
    elName.value?.focus();
    return;
  }
  
  if (!contentData.value.content.trim()) {
    alert('Please enter content.');
    return;
  }
  
  if (!room.value) {
    alert('Room not found.');
    return;
  }
  
  if (!canCreate.value) {
    alert('You do not have permission to create content.');
    return;
  }
  
  // Validate the content name
  if (!validateContentName()) {
    elName.value?.focus();
    return;
  }
  
  isCreating.value = true;
  
  try {
    const contentPath = generatePath(contentData.value.name);
    
    // Validate content depth before creating
    const depthValidation = validateContentDepth(contentPath);
    if (!depthValidation.isValid) {
      nameError.value = depthValidation.message;
      elName.value?.focus();
      isCreating.value = false;
      return;
    }
    
    // Determine the parent path based on content type
    const parentPath = props.isChildContent && props.parentPath 
      ? props.parentPath 
      : room.value.Path;

    const newContent = {
      Name: contentData.value.name.trim(),
      Intro: contentData.value.intro.trim(),
      Link: contentData.value.link.trim(),
      Content: contentData.value.content.trim(),
      RoomID: room.value.ID,
      RealmID: realmStore.activeRealmId,
      Path: contentPath,
      Parent: parentPath,
      IsActive: false // Content starts as inactive
    };
    
    // Create content through store
    await contentStore.createContent(newContent);
    
    // Navigate back to the appropriate place
    if (props.isChildContent && props.parentPath) {
      // Navigate back to the parent content
      router.push(`/rooms/${props.parentPath}`);
    } else {
      // Navigate back to room
      router.push(`/rooms/${room.value.Path}`);
    }
    
  } catch (error) {
    console.error('Error creating content:', error);
    alert('Failed to create content. Please try again.');
  } finally {
    isCreating.value = false;
  }
};

// Cancel and go back
const cancel = () => {
  if (props.isChildContent && props.parentPath) {
    // Go back to parent content
    router.push(`/rooms/${props.parentPath}`);
  } else if (room.value) {
    // Go back to room
    router.push(`/rooms/${room.value.Path}`);
  } else {
    router.push('/');
  }
};

// Validate content name for duplicates
const validateContentName = () => {
  nameError.value = null;
  
  const name = contentData.value.name.trim();
  if (!name) {
    return false;
  }
  
  const contentPath = generatePath(name);
  
  // Check if a room with this path already exists
  const existingRoom = contentStore.arRooms.find(r => r.Path === contentPath);
  if (existingRoom) {
    nameError.value = `A room with the path "${contentPath}" already exists.`;
    return false;
  }
  
  // Check if any content item has this path
  const allContents = Object.values(contentStore.contents);
  const existingContent = allContents.find(c => c.Path === contentPath);
  if (existingContent) {
    nameError.value = `A content item with the path "${contentPath}" already exists.`;
    return false;
  }
  
  return true;
};

// Check permissions on mount
onMounted(async () => {
  if (!canCreate.value) {
    alert('You do not have permission to create content.');
    cancel();
    return;
  }
  
  // Ensure rooms are loaded
  if (contentStore.arRooms.length === 0) {
    await contentStore.loadRooms();
  }
  
  // Load all contents for child content support
  await contentStore.loadAllContents();
  
  // Check if room exists
  if (!room.value) {
    alert('Room not found.');
    cancel();
    return;
  }
  
  // If this is child content, check if parent content exists
  if (props.isChildContent && props.parentPath && !parentContent.value) {
    alert('Parent content not found.');
    cancel();
    return;
  }
  
  // Focus on name field
  setTimeout(() => {
    elName.value?.focus();
  }, 100);
});
</script>

<style scoped>
.add-content {
  padding: 2rem;
  color: #ffffff;
  min-height: 100vh;
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
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
  font-family: 'Pirata One', cursive;
  font-size: 2rem;
  color: var(--theme-accent);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-cancel,
.btn-save {
  padding: 0.5rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  min-width: 2.5rem;
  min-height: 2.5rem;
}

.btn-cancel {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  color: white;
}

.btn-cancel:hover {
  background: linear-gradient(135deg, #c82333 0%, #a71e2a 100%);
  transform: translateY(-1px);
}

.btn-save {
  background: linear-gradient(135deg, #28a745 0%, #20923a 100%);
  color: white;
}

.btn-save:hover:not(:disabled) {
  background: linear-gradient(135deg, #20923a 0%, #1e7e34 100%);
  transform: translateY(-1px);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.content-create-content {
  background: linear-gradient(135deg, #1e2a3e 0%, #2d3a52 100%);
  border: 1px solid var(--theme-accent);
  border-radius: 1rem;
  padding: 2rem;
}

.form-section {
  margin-bottom: 2rem;
}

.form-section:last-child {
  margin-bottom: 0;
}

.form-section h3 {
  color: var(--theme-accent);
  margin-bottom: 1rem;
  font-size: 1.2rem;
  font-weight: 600;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
}

.form-field.full-width {
  grid-column: 1 / -1;
}

.form-field label {
  margin-bottom: 0.5rem;
  color: var(--theme-text-primary);
  font-weight: 500;
}

.required {
  color: #dc3545;
}

.optional {
  color: #6c757d;
  font-weight: normal;
  font-size: 0.9em;
}

.form-field input,
.form-field textarea {
  padding: 0.75rem;
  border: 1px solid #444;
  border-radius: 0.5rem;
  background: #1a1a2e;
  color: #ffffff;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.form-field input:focus,
.form-field textarea:focus {
  outline: none;
  border-color: var(--theme-accent);
}

.form-field textarea {
  resize: vertical;
  min-height: 80px;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .add-content {
    padding: 1rem;
  }
  
  .content-header {
    font-size: 1.5rem;
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .content-create-content {
    padding: 1rem;
  }
}

/* Field validation errors */
.input-with-error {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  width: 100%;
}

.input-with-error input {
  flex: 1;
  min-width: 200px;
}

.field-error {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: #ff6b6b;
  font-size: 0.85rem;
  padding-top: 0.5rem;
  flex-shrink: 0;
  max-width: 300px;
  animation: slideIn 0.2s ease-out;
}

.field-error .material-symbols-outlined {
  font-size: 1rem;
  flex-shrink: 0;
}

.error-input {
  border-color: #ff6b6b !important;
  background: rgba(255, 107, 107, 0.05) !important;
}

.error-input:focus {
  outline-color: #ff6b6b !important;
  box-shadow: 0 0 0 2px rgba(255, 107, 107, 0.2) !important;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>