<template>
  <div class="edit-room" v-if="userStore.loaded && realmStore.loaded">
    <div class="room-container">
      <h2 class="room-header">
        <span>Edit Room</span>
        <span class="header-actions">
          <button @click="cancel" class="btn-cancel" title="Cancel">
            <span class="material-symbols-outlined">cancel</span>
          </button>
          <button v-if="!roomData.isActive" @click="deleteRoom" class="btn-delete" title="Delete Room Permanently">
            <span class="material-symbols-outlined">delete_forever</span>
          </button>
          <button @click="save" ref="btnSave" class="btn-save" title="Save Changes" :disabled="isSaving">
            <span class="material-symbols-outlined" v-if="!isSaving">save</span>
            <span class="loading-spinner" v-else></span>
          </button>
        </span>
      </h2>
      
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading room...</p>
      </div>
      
      <div v-else-if="room" class="room-edit-content">
        <div class="room-edit-form">
          <div class="form-section">
            <h3>Room Information</h3>
            <div class="form-grid">
              <div class="form-field">
                <label for="roomName">Name <span class="required">*</span></label>
                <input
                  ref="elName"
                  autocomplete="off"
                  type="text"
                  id="roomName"
                  v-model="roomData.name"
                  maxlength="100"
                  required
                  placeholder="Enter room name..."
                />
              </div>
              
              <div class="form-field">
                <label for="roomStatus">Status</label>
                <select id="roomStatus" v-model="roomData.isActive">
                  <option :value="true">Enabled</option>
                  <option :value="false">Disabled</option>
                </select>
              </div>
              
              <div class="form-field full-width">
                <label for="roomDescription">Description</label>
                <InlineEditor 
                  v-model="roomData.description"
                  placeholder="Enter the content to be displayed when entering the room..."
                />
              </div>
            </div>
          </div>
          
          <div class="form-section">
            <h3>Background Image <span class="optional">(Optional)</span></h3>
            <div class="image-upload-section">
              <div class="image-upload-area" @click="triggerFileInput" @dragover.prevent @drop="handleDrop">
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*"
                  @change="handleFileSelect"
                  style="display: none;"
                />
                
                <div v-if="!imagePreview && !currentBackgroundImage" class="upload-placeholder">
                  <span class="material-symbols-outlined upload-icon">cloud_upload</span>
                  <p>Click to upload or drag and drop</p>
                  <small>Supports JPG, PNG, GIF. Max size: 5MB</small>
                </div>
                
                <div v-else-if="imagePreview" class="image-preview">
                  <img :src="imagePreview" alt="Room background preview" />
                  <div class="image-overlay">
                    <button @click.stop="removeImage" class="remove-image-btn" title="Remove image">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
                
                <div v-else-if="currentBackgroundImage" class="image-preview">
                  <img :src="currentBackgroundImage" alt="Current room background" />
                  <div class="image-overlay">
                    <button @click.stop="removeCurrentImage" class="remove-image-btn" title="Remove current image">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                  <div class="current-image-label">Current Background</div>
                </div>
              </div>
              
              <div v-if="imageError" class="error-message">
                <span class="material-symbols-outlined">error</span>
                {{ imageError }}
              </div>
            </div>
          </div>
          
        </div>
      </div>
      
      <div v-else class="room-not-found">
        <h2>Room Not Found</h2>
        <p>The room "{{ $route.params.path }}" could not be found or you don't have permission to edit it.</p>
        <router-link to="/" class="btn btn-primary">Return to Hearth</router-link>
      </div>
    </div>
    
    <!-- Delete Room Confirmation Dialog -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="closeDeleteDialog">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>
            <span class="material-symbols-outlined">warning</span>
            Delete Room
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
              <p>You are about to permanently delete the room <strong>{{ room?.Name || 'Unknown' }}</strong>.</p>
              <p>This will:</p>
              <ul>
                <li>Remove the room from the database</li>
                <li>Delete the room's background image from storage</li>
                <li>Remove all associated content and data</li>
                <li>Delete any child resources connected to this room</li>
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
                Delete all content within this room <span class="required">*</span> (permanently removes all articles and sub-content)
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
            {{ isDeleting ? 'Deleting...' : 'Delete Room' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Error Modal Dialog -->
    <div v-if="showErrorModal" class="modal-overlay" @click="closeErrorDialog">
      <div class="modal-content error-modal" @click.stop>
        <div class="modal-header">
          <h3>
            <span class="material-symbols-outlined">error</span>
            Operation Failed
          </h3>
          <button @click="closeErrorDialog" class="close-btn">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="error-content">
            <div class="error-icon">
              <span class="material-symbols-outlined">error</span>
            </div>
            <div class="error-message">
              <p>{{ errorMessage }}</p>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeErrorDialog" class="btn-error-ok">
            <span class="material-symbols-outlined">check</span>
            OK
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
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

const emits = defineEmits(['set-room']);

// Component state
const loading = ref(true);
const isSaving = ref(false);
const showDeleteModal = ref(false);
const deleteConfirmed = ref(false);
const deleteChildContent = ref(false); // User must explicitly check this
const isDeleting = ref(false);
const showErrorModal = ref(false);
const errorMessage = ref('');

// Form data
const roomData = ref({
  name: '',
  description: '<p></p>', // Initialize with empty paragraph for CKEditor
  isActive: true
});

// UI state
const imagePreview = ref(null);
const imageFile = ref(null);
const imageError = ref(null);
const removeCurrentImageFlag = ref(false);

// Form refs
const elName = ref(null);
const btnSave = ref(null);
const fileInput = ref(null);

// Get room by path from the content store
const room = computed(() => {
  const roomPath = route.params.path;
  return contentStore.arRooms.find(r => r.Path === roomPath) || null;
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

// Current background image URL
const currentBackgroundImage = computed(() => {
  if (!room.value || !room.value.Image || removeCurrentImageFlag.value) {
    return null;
  }
  
  if (realmStore.activeRealm?.RealmID && room.value.Path) {
    return `${import.meta.env.VITE_IMAGES_CONTENT_CDN_URL}/${realmStore.activeRealm.RealmID}/${room.value.Path}/background.jpg`;
  }
  
  return null;
});

// Methods
const cancel = () => {
  router.back();
};


const save = async () => {
  if (!roomData.value.name.trim()) {
    elName.value?.focus();
    return;
  }

  // Check for reserved room names
  const reservedNames = ['edit', 'add'];
  const roomName = roomData.value.name.trim().toLowerCase();
  if (reservedNames.includes(roomName)) {
    errorMessage.value = `Room name "${roomData.value.name.trim()}" is reserved. Please choose a different name.`;
    showErrorModal.value = true;
    elName.value?.focus();
    return;
  }

  try {
    isSaving.value = true;

    const payload = {
      name: roomData.value.name.trim(),
      description: roomData.value.description.trim() === '<p></p>' ? '' : roomData.value.description.trim(),
      isActive: roomData.value.isActive
    };

    // Add image data if present
    if (imageFile.value) {
      payload.imageBase64 = imageFile.value.base64;
      payload.imageFilename = imageFile.value.name;
      payload.imageType = imageFile.value.type;
    } else if (removeCurrentImageFlag.value) {
      payload.removeImage = true;
    }

    console.log('📤 Updating room...', payload);
    
    const result = await contentStore.updateRoom(room.value.ID, payload);
    
    if (result.success) {
      console.log('✅ Room updated successfully');
      router.back();
    } else {
      console.error('❌ Failed to update room:', result.error);
      errorMessage.value = result.error;
      showErrorModal.value = true;
    }

  } catch (error) {
    console.error('Error updating room:', error);
    errorMessage.value = 'An unexpected error occurred while updating the room. Please try again.';
    showErrorModal.value = true;
  } finally {
    isSaving.value = false;
  }
};

const deleteRoom = () => {
  if (!room.value) return;
  showDeleteModal.value = true;
};

const closeDeleteDialog = () => {
  showDeleteModal.value = false;
  deleteConfirmed.value = false;
  deleteChildContent.value = false; // Reset to unchecked
};


const closeErrorDialog = () => {
  showErrorModal.value = false;
  errorMessage.value = '';
};

const confirmArchive = async () => {
  if (!room.value || !archiveConfirmed.value) return;
  
  try {
    isArchiving.value = true;
    const newActiveState = !room.value.IsActive;
    const actionText = newActiveState ? 'unarchive' : 'archive';
    
    console.log(`📦 ${actionText === 'archive' ? 'Archiving' : 'Unarchiving'} room...`, room.value.ID);
    
    const result = await contentStore.updateRoom(room.value.ID, {
      isActive: newActiveState
    });
    
    if (result.success) {
      console.log(`✅ Room ${actionText}d successfully`);
      
      // Close dialog
      closeArchiveDialog();
    } else {
      console.error(`❌ Failed to ${actionText} room:`, result.error);
      
      // Close archive dialog first, then show error modal
      closeArchiveDialog();
      errorMessage.value = result.error;
      showErrorModal.value = true;
    }
    
  } catch (error) {
    console.error('Error toggling room archive state:', error);
    
    // Close archive dialog first, then show error modal
    closeArchiveDialog();
    errorMessage.value = 'An unexpected error occurred. Please try again.';
    showErrorModal.value = true;
  } finally {
    isArchiving.value = false;
  }
};

const confirmDelete = async () => {
  if (!room.value || !deleteConfirmed.value || !deleteChildContent.value) return;
  
  try {
    isDeleting.value = true;
    console.log('🗑️ Deleting room...', room.value.ID);
    console.log('Delete child content:', deleteChildContent.value);
    
    // Always pass true for cascade deletion since it's mandatory
    const result = await contentStore.deleteRoom(room.value.ID, true);
    
    if (result.success) {
      console.log('✅ Room deleted successfully');
      
      // Close dialog and navigate away
      closeDeleteDialog();
      router.push('/');
    } else {
      console.error('❌ Failed to delete room:', result.error);
      closeDeleteDialog();
      errorMessage.value = result.error;
      showErrorModal.value = true;
    }

  } catch (error) {
    console.error('Error deleting room:', error);
    closeDeleteDialog();
    errorMessage.value = 'An unexpected error occurred while deleting the room. Please try again.';
    showErrorModal.value = true;
  } finally {
    isDeleting.value = false;
  }
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (file) {
    processImageFile(file);
  }
};

const handleDrop = (event) => {
  event.preventDefault();
  const file = event.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    processImageFile(file);
  }
};

const processImageFile = (file) => {
  imageError.value = null;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    imageError.value = 'Please select a valid image file.';
    return;
  }

  // Validate file size (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    imageError.value = 'Image file must be smaller than 5MB.';
    return;
  }

  const reader = new FileReader();
  
  reader.onload = (e) => {
    imagePreview.value = e.target.result;
    
    // Convert to base64 for API
    const base64Data = e.target.result.split(',')[1];
    imageFile.value = {
      name: file.name,
      type: file.type,
      base64: base64Data
    };
    
    // Clear the remove current image flag since we're uploading a new one
    removeCurrentImageFlag.value = false;
  };
  
  reader.onerror = () => {
    imageError.value = 'Failed to read the image file.';
  };
  
  reader.readAsDataURL(file);
};

const removeImage = () => {
  imagePreview.value = null;
  imageFile.value = null;
  imageError.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

const removeCurrentImage = () => {
  removeCurrentImageFlag.value = true;
};

// Load room data when component mounts
const loadRoom = async () => {
  loading.value = true;
  
  try {
    // Ensure rooms are loaded
    if (contentStore.arRooms.length === 0) {
      await contentStore.loadRooms();
    }
    
    // Check if user has permission to edit this room
    if (!canEditRoom.value) {
      console.warn('User does not have permission to edit this room');
      return;
    }
    
    // Populate form with room data
    if (room.value) {
      roomData.value.name = room.value.Name || '';
      roomData.value.description = room.value.Description || '<p></p>';
      roomData.value.isActive = room.value.IsActive !== false; // Default to true if undefined
      
      // Emit set-room event for background
      emits('set-room', room.value);
    }
  } catch (error) {
    console.error('Failed to load room:', error);
  } finally {
    loading.value = false;
  }
};

// Lifecycle
onMounted(async () => {
  await loadRoom();
  await nextTick();
  elName.value?.focus();
});
</script>

<style scoped>
.edit-room {
  padding: 2rem;
  background: linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 100%);
  color: #ffffff;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.room-container {
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.room-header {
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

.btn-cancel, .btn-save, .btn-delete {
  padding: 0.5rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
  color: white;
}

.btn-cancel:hover {
  background: linear-gradient(135deg, #5a6268 0%, #545b62 100%);
  transform: translateY(-1px);
}

.btn-delete {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  color: white;
}

.btn-delete:hover {
  background: linear-gradient(135deg, #c82333 0%, #bd2130 100%);
  transform: translateY(-1px);
}

.btn-save {
  background: linear-gradient(135deg, #28a745 0%, #20803d 100%);
  color: white;
}

.btn-save:hover:not(:disabled) {
  background: linear-gradient(135deg, #218838 0%, #1e7e34 100%);
  transform: translateY(-1px);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

/* Form Styles */
.room-edit-content {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
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
}

.optional {
  font-size: 0.8em;
  color: #aaa;
  font-weight: normal;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-field.full-width {
  grid-column: 1 / -1;
}

.form-field label {
  display: block;
  margin-bottom: 0.5rem;
  color: #ffffff;
  font-weight: 500;
}

.required {
  color: #dc3545;
}

.form-field input[type="text"],
.form-field select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #444;
  border-radius: 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  color: #ffffff;
  font-size: 1rem;
}

.form-field select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 12px;
  padding-right: 2.5rem;
}

.form-field select option {
  background: var(--theme-bg-surface);
  color: #ffffff;
}

.form-field input:focus,
.form-field select:focus {
  outline: none;
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme-accent) 20%, transparent);
}

/* Image Upload Styles */
.image-upload-section {
  max-width: 400px;
}

.image-upload-area {
  border: 2px dashed #444;
  border-radius: 0.5rem;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  background: rgba(0, 0, 0, 0.2);
}

.image-upload-area:hover {
  border-color: var(--theme-accent);
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
}

.upload-placeholder {
  color: #aaa;
}

.upload-icon {
  font-size: 3rem;
  color: #666;
  margin-bottom: 1rem;
}

.image-preview {
  position: relative;
}

.image-preview img {
  max-width: 100%;
  max-height: 200px;
  border-radius: 0.5rem;
}

.image-overlay {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
}

.remove-image-btn {
  background: rgba(220, 53, 69, 0.9);
  color: white;
  border: none;
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease;
}

.remove-image-btn:hover {
  background: rgba(220, 53, 69, 1);
}

.current-image-label {
  position: absolute;
  bottom: 0.5rem;
  left: 0.5rem;
  background: rgba(0, 0, 0, 0.8);
  color: var(--theme-accent);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.8rem;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #dc3545;
  margin-top: 0.5rem;
  font-size: 0.9rem;
}

/* Room not found styles */
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

/* New Room Info Styles */
.new-room-info {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(33, 150, 243, 0.05) 100%);
  border: 1px solid #2196F3;
  border-radius: 0.5rem;
}

.new-room-info .info-icon {
  color: #2196F3;
  font-size: 1.5rem;
  flex-shrink: 0;
  margin-top: 0.2rem;
}

.new-room-info .info-content {
  flex: 1;
}

.new-room-info .info-content p {
  margin: 0 0 0.5rem 0;
  color: #fff;
  line-height: 1.4;
}

.new-room-info .info-content p:last-child {
  margin-bottom: 0;
}

.new-room-info .info-content strong {
  color: #2196F3;
}

.new-room-info .info-content em {
  color: #bbdefb;
  font-style: normal;
  font-weight: 500;
}

/* Archive Styles */
.btn-archive {
  padding: 0.5rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
  color: white;
  transition: all 0.2s ease;
}

.btn-archive:hover {
  background: linear-gradient(135deg, #5a6268 0%, #495057 100%);
  transform: translateY(-1px);
}

.archive-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 0.5rem;
  border: 1px solid #444;
}

.archive-info {
  flex: 1;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.status-indicator .material-symbols-outlined {
  color: #28a745;
}

.status-indicator.archived .material-symbols-outlined {
  color: #6c757d;
}

.status-text {
  font-weight: 600;
  color: #28a745;
}

.status-indicator.archived .status-text {
  color: #6c757d;
}

.status-description {
  margin: 0;
  color: #ccc;
  font-size: 0.9rem;
  line-height: 1.4;
}

.archive-toggle-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
  color: white;
  transition: all 0.2s ease;
}

.archive-toggle-btn:hover {
  background: linear-gradient(135deg, #5a6268 0%, #495057 100%);
  transform: translateY(-1px);
}

.archive-toggle-btn.archived {
  background: linear-gradient(135deg, #28a745 0%, #20803d 100%);
}

.archive-toggle-btn.archived:hover {
  background: linear-gradient(135deg, #218838 0%, #1e7e34 100%);
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--theme-bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid #dc3545;
  border-radius: 1rem;
  padding: 0;
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
  border-bottom: 1px solid #444;
}

.modal-header h3 {
  margin: 0;
  color: #dc3545;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.close-btn {
  background: transparent;
  border: none;
  color: #aaa;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: color 0.2s ease;
}

.close-btn:hover {
  color: #fff;
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

.warning-content {
  flex: 1;
}

.warning-content p {
  margin: 0 0 1rem 0;
  color: #fff;
}

.warning-content ul {
  margin: 0;
  padding-left: 1.5rem;
  color: #ccc;
}

.warning-content li {
  margin-bottom: 0.5rem;
}

.confirmation-section {
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid #dc3545;
  border-radius: 0.5rem;
  padding: 1rem;
}

.confirmation-checkbox {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  margin: 0;
}

.confirmation-checkbox input[type="checkbox"] {
  width: 1.25rem;
  height: 1.25rem;
  accent-color: #dc3545;
  cursor: pointer;
  flex-shrink: 0;
}

.checkbox-text {
  color: #fff;
  font-size: 0.9rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #444;
}

.btn-cancel {
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.btn-cancel:hover:not(:disabled) {
  background: linear-gradient(135deg, #5a6268 0%, #545b62 100%);
  transform: translateY(-1px);
}

.btn-cancel:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
  transition: all 0.2s ease;
}

.btn-delete-confirm:hover:not(:disabled) {
  background: linear-gradient(135deg, #c82333 0%, #bd2130 100%);
  transform: translateY(-1px);
}

.btn-delete-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading {
  animation: spin 1s linear infinite;
}

/* Archive Modal Styles */
.modal-content.archive-modal {
  border-color: #6c757d;
}

.modal-content.archive-modal .modal-header h3 {
  color: #6c757d;
}

.archive-warning {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.archive-warning .warning-icon {
  font-size: 3rem;
  color: #6c757d;
  flex-shrink: 0;
}

.archive-info,
.unarchive-info {
  margin-top: 1rem;
}

.archive-info ul,
.unarchive-info ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
  color: #ccc;
}

.archive-info li,
.unarchive-info li {
  margin-bottom: 0.5rem;
}

.archive-info em,
.unarchive-info em {
  color: #aaa;
  font-size: 0.9rem;
}

.confirmation-section {
  background: rgba(108, 117, 125, 0.1);
  border: 1px solid #6c757d;
  border-radius: 0.5rem;
  padding: 1rem;
}

.btn-archive-confirm {
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.btn-archive-confirm:hover:not(:disabled) {
  background: linear-gradient(135deg, #5a6268 0%, #495057 100%);
  transform: translateY(-1px);
}

.btn-archive-confirm.unarchive {
  background: linear-gradient(135deg, #28a745 0%, #20803d 100%);
}

.btn-archive-confirm.unarchive:hover:not(:disabled) {
  background: linear-gradient(135deg, #218838 0%, #1e7e34 100%);
}

.btn-archive-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Error Modal Styles */
.modal-content.error-modal {
  border-color: #dc3545;
}

.modal-content.error-modal .modal-header h3 {
  color: #dc3545;
}

.error-content {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.error-content .error-icon {
  font-size: 3rem;
  color: #dc3545;
  flex-shrink: 0;
}

.error-content .error-message {
  flex: 1;
}

.error-content .error-message p {
  margin: 0;
  color: #fff;
  line-height: 1.5;
  font-size: 1rem;
}

.btn-error-ok {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-error-ok:hover {
  background: linear-gradient(135deg, #c82333 0%, #bd2130 100%);
  transform: translateY(-1px);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive Design */
@media (max-width: 768px) {
  .edit-room {
    padding: 1rem;
  }
  
  .room-header {
    font-size: 1.5rem;
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .form-field.full-width {
    grid-column: 1;
  }
  
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
</style>