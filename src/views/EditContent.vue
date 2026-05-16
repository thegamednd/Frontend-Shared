<template>
  <div class="edit-content" v-if="userStore.loaded && realmStore.loaded">
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading content...</p>
    </div>
    
    <div v-else-if="content" class="content-container">
      <h2 class="content-header">
        <span>Edit Content</span>
        <span class="header-actions">
          <button @click="cancel" class="btn-cancel" title="Cancel">
            <span class="material-symbols-outlined">cancel</span>
          </button>
          <button v-if="!contentData.isActive" @click="deleteContent" class="btn-delete" title="Delete Content Permanently">
            <span class="material-symbols-outlined">delete_forever</span>
          </button>
          <button @click="save" class="btn-save" title="Save Changes" :disabled="isSaving">
            <span class="material-symbols-outlined" v-if="!isSaving">save</span>
            <span class="loading-spinner" v-else></span>
          </button>
        </span>
      </h2>
      
      <div class="content-edit-form">
        <div class="form-section">
          <h3>Content Information</h3>
          <div class="form-grid">
            <div class="form-field">
              <label for="contentName">Name <span class="required">*</span></label>
              <input
                ref="elName"
                autocomplete="off"
                type="text"
                id="contentName"
                v-model="contentData.name"
                maxlength="100"
                required
                placeholder="Enter content name..."
              />
            </div>
            
            <div class="form-field">
              <label for="contentStatus">Status</label>
              <select id="contentStatus" v-model="contentData.isActive">
                <option :value="true">Enabled</option>
                <option :value="false">Disabled</option>
              </select>
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
            
            <div class="form-field full-width">
              <label for="contentLink">
                Link <span class="optional">(Optional)</span>
                <span v-if="hasChildContent" class="field-disabled-note">- Disabled: Content has children</span>
              </label>
              <input
                type="url"
                id="contentLink"
                v-model="contentData.link"
                placeholder="https://example.com"
                :disabled="hasChildContent"
                :class="{ 'disabled-field': hasChildContent }"
              />
              <div v-if="hasChildContent" class="field-note">
                <span class="material-symbols-outlined">info</span>
                Content items with child content cannot be converted to external links. 
                Remove all child content first to enable this feature.
              </div>
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
    
    <div v-else class="content-not-found">
      <h2>Content Not Found</h2>
      <p>The content article could not be found or you don't have permission to edit it.</p>
      <router-link :to="`/rooms/${roomPath}`" class="btn btn-primary">Return to Room</router-link>
    </div>
    
    <!-- Delete Content Confirmation Dialog -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="closeDeleteDialog">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>
            <span class="material-symbols-outlined">warning</span>
            Delete Content
          </h3>
          <button @click="closeDeleteDialog" class="close-btn">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="delete-warning">
            <div class="warning-icon">
              <span class="material-symbols-outlined">delete_forever</span>
            </div>
            <div class="warning-content">
              <p><strong>This action cannot be undone!</strong></p>
              <p>You are about to permanently delete the content <strong>{{ content?.Name || 'Unknown' }}</strong>.</p>
              <p>This will:</p>
              <ul>
                <li>Remove the content from the database</li>
                <li>Delete all associated data</li>
                <li>Make the content permanently inaccessible</li>
              </ul>
            </div>
          </div>
          
          <div class="confirmation-section">
            <label class="confirmation-checkbox">
              <input 
                type="checkbox" 
                v-model="deleteConfirmed"
                :disabled="isDeleting"
              />
              <span class="checkbox-text">
                I understand this action cannot be undone
              </span>
            </label>
            
            <label class="confirmation-checkbox" style="margin-top: 0.75rem;">
              <input 
                type="checkbox" 
                v-model="deleteChildContent"
                :disabled="isDeleting"
                required
              />
              <span class="checkbox-text">
                Delete all child content <span class="required">*</span> (permanently removes all sub-articles and nested content)
              </span>
            </label>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeDeleteDialog" class="btn-cancel" :disabled="isDeleting">
            <span class="material-symbols-outlined">close</span>
            Cancel
          </button>
          <button 
            @click="confirmDelete" 
            class="btn-delete-confirm" 
            :disabled="!deleteConfirmed || !deleteChildContent || isDeleting"
          >
            <span v-if="isDeleting" class="material-symbols-outlined loading">hourglass_empty</span>
            <span v-else class="material-symbols-outlined">delete_forever</span>
            {{ isDeleting ? 'Deleting...' : 'Delete Content' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
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

const props = defineProps({
  roomPath: String,
  contentName: String,
  fullContentPath: String
});

const loading = ref(true);
const isSaving = ref(false);
const showDeleteModal = ref(false);
const deleteConfirmed = ref(false);
const deleteChildContent = ref(false); // User must explicitly check this
const isDeleting = ref(false);
const elName = ref(null);

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
  
  // Find content by matching against the normalized path
  return roomContents.find(c => c.Path === normalizedExpectedPath) || null;
});

// Content form data
const contentData = ref({
  name: '',
  intro: '',
  link: '',
  content: '',
  isActive: false
});

// Check if this content has child content (which prevents it from being a link)
const hasChildContent = computed(() => {
  if (!content.value || !room.value?.contents) {
    return false;
  }
  
  // Get all content items for this room
  const allRoomContents = room.value.contents
    .map(contentId => contentStore.contents[contentId])
    .filter(Boolean);
  
  // Check if any content has this content's path as parent
  return allRoomContents.some(child => child.Parent === content.value.Path);
});

// Check if user can edit this content
const canEditContent = computed(() => {
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
  
  // Check if user is in the content's editors list
  if (content.value && content.value.Editors && content.value.Editors.includes(userStore.userSub)) {
    return true;
  }
  
  return false;
});

// Load content data
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
    
    // Populate form with existing content data
    if (content.value) {
      contentData.value = {
        name: content.value.Name || '',
        intro: content.value.Intro || '',
        link: content.value.Link || '',
        content: content.value.Content || '',
        isActive: content.value.IsActive || false
      };
    }
  } catch (error) {
    console.error('Failed to load content:', error);
  } finally {
    loading.value = false;
  }
};

// Save content changes
const save = async () => {
  if (!contentData.value.name.trim()) {
    alert('Please enter a content name.');
    elName.value?.focus();
    return;
  }
  
  if (!contentData.value.content.trim()) {
    alert('Please enter content.');
    return;
  }
  
  if (!content.value) {
    alert('Content not found.');
    return;
  }
  
  if (!canEditContent.value) {
    alert('You do not have permission to edit this content.');
    return;
  }
  
  isSaving.value = true;
  
  try {
    const updates = {
      Name: contentData.value.name.trim(),
      Intro: contentData.value.intro.trim(),
      Link: hasChildContent.value ? '' : contentData.value.link.trim(), // Clear link if has children
      Content: contentData.value.content.trim(),
      IsActive: contentData.value.isActive
    };
    
    // Update content through store (passing roomId as well)
    const result = await contentStore.updateContent(content.value.ID, updates, room.value.ID);
    
    if (result.success) {
      // Navigate back to the content article
      // Remove leading slash from fullContentPath to avoid double slash
      const contentPath = props.fullContentPath?.startsWith('/') ? props.fullContentPath.substring(1) : props.fullContentPath;
      router.push(`/rooms/${contentPath}`);
    } else {
      alert(result.error || 'Failed to update content. Please try again.');
    }
  } catch (error) {
    console.error('Error updating content:', error);
    alert('Failed to update content. Please try again.');
  } finally {
    isSaving.value = false;
  }
};

// Delete content
const deleteContent = () => {
  if (!content.value) return;
  showDeleteModal.value = true;
};

const closeDeleteDialog = () => {
  showDeleteModal.value = false;
  deleteConfirmed.value = false;
  deleteChildContent.value = false; // Reset to unchecked
};

const confirmDelete = async () => {
  if (!content.value || !deleteConfirmed.value || !deleteChildContent.value) return;
  
  try {
    isDeleting.value = true;
    console.log('🗑️ Deleting content...', content.value.ID);
    console.log('Delete child content:', deleteChildContent.value);
    
    // Always pass true for cascade deletion since it's mandatory
    const result = await contentStore.deleteContent(content.value.ID, room.value.ID, true);
    
    if (result.success) {
      console.log('✅ Content deleted successfully');
      
      // Close dialog and navigate back to room
      closeDeleteDialog();
      const contentPath = room.value.Path;
      router.push(`/rooms/${contentPath}`);
    } else {
      console.error('❌ Failed to delete content:', result.error);
      alert(`Failed to delete content: ${result.error}`);
    }
    
  } catch (error) {
    console.error('Error deleting content:', error);
    alert('Failed to delete content. Please try again.');
  } finally {
    isDeleting.value = false;
  }
};

// Cancel and go back
const cancel = () => {
  if (props.fullContentPath) {
    // Remove leading slash from fullContentPath to avoid double slash
    const contentPath = props.fullContentPath.startsWith('/') ? props.fullContentPath.substring(1) : props.fullContentPath;
    router.push(`/rooms/${contentPath}`);
  } else if (room.value) {
    router.push(`/rooms/${room.value.Path}`);
  } else {
    router.push('/');
  }
};

// Watch for route changes
watch(() => [props.roomPath, props.contentName, props.fullContentPath], loadContent, { immediate: true });

// Check permissions on mount
onMounted(async () => {
  await loadContent();
  
  if (!canEditContent.value) {
    alert('You do not have permission to edit this content.');
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
.edit-content {
  padding: 2rem;
  color: #ffffff;
  min-height: 100vh;
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
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

.btn-delete {
  padding: 0.5rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  color: white;
  transition: all 0.2s ease;
  min-width: 2.5rem;
  min-height: 2.5rem;
}

.btn-delete:hover {
  background: linear-gradient(135deg, #c82333 0%, #a71e2a 100%);
  transform: translateY(-1px);
}

.btn-save .loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
}

.content-edit-form {
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
.form-field textarea,
.form-field select {
  padding: 0.75rem;
  border: 1px solid #444;
  border-radius: 0.5rem;
  background: #1a1a2e;
  color: #ffffff;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.form-field input:focus,
.form-field textarea:focus,
.form-field select:focus {
  outline: none;
  border-color: var(--theme-accent);
}

.form-field textarea {
  resize: vertical;
  min-height: 80px;
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

/* Mobile responsiveness */
@media (max-width: 768px) {
  .edit-content {
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
  
  .content-edit-form {
    padding: 1rem;
  }
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--theme-bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 2px solid #dc3545;
  border-radius: 1rem;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(220, 53, 69, 0.3);
}

.modal-header h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  color: #dc3545;
  font-size: 1.25rem;
}

.close-btn {
  background: none;
  border: none;
  color: #ccc;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.modal-body {
  padding: 1.5rem;
}

.delete-warning {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.warning-icon {
  font-size: 3rem;
  color: #dc3545;
  flex-shrink: 0;
}

.warning-content p {
  margin: 0 0 1rem 0;
  color: var(--theme-text-primary);
  line-height: 1.5;
}

.warning-content ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
  color: #ccc;
}

.warning-content li {
  margin-bottom: 0.5rem;
}

.confirmation-section {
  border-top: 1px solid rgba(220, 53, 69, 0.3);
  padding-top: 1.5rem;
}

.confirmation-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
}

.confirmation-checkbox input[type="checkbox"] {
  width: 1.25rem;
  height: 1.25rem;
  accent-color: #dc3545;
  cursor: pointer;
  flex-shrink: 0;
}

.checkbox-text {
  color: var(--theme-text-primary);
  font-size: 0.95rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid rgba(220, 53, 69, 0.3);
}

.btn-delete-confirm {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-delete-confirm:hover:not(:disabled) {
  background: linear-gradient(135deg, #c82333 0%, #a71e2a 100%);
  transform: translateY(-1px);
}

.btn-delete-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-delete-confirm .loading {
  animation: spin 1s linear infinite;
}

@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    margin: 1rem;
  }
  
  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 1rem;
  }
  
  .modal-footer {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .delete-warning {
    flex-direction: column;
    gap: 1rem;
  }
  
  .warning-icon {
    font-size: 2rem;
    text-align: center;
  }
}

/* Field disabling styles */
.field-disabled-note {
  color: #ff6b6b;
  font-size: 0.8rem;
  font-weight: normal;
  font-style: italic;
}

.disabled-field {
  background-color: #2a2a2a !important;
  color: #888 !important;
  cursor: not-allowed;
  opacity: 0.6;
}

.disabled-field:focus {
  outline: none;
  box-shadow: none;
}

.field-note {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: rgba(74, 144, 226, 0.1);
  border: 1px solid rgba(74, 144, 226, 0.3);
  border-radius: 0.5rem;
  color: #4a90e2;
  font-size: 0.9rem;
  line-height: 1.4;
}

.field-note .material-symbols-outlined {
  font-size: 1.1rem;
  margin-top: 0.1rem;
  flex-shrink: 0;
}
</style>