<template>
  <div class="add-room" v-if="userStore.loaded && realmStore.loaded">
    <div class="room-container">
      <h2 class="room-header">
        <span>Create New Room</span>
        <span class="header-actions">
          <button @click="cancel" class="btn-cancel" title="Cancel">
            <span class="material-symbols-outlined">cancel</span>
          </button>
          <button @click="save" ref="btnSave" class="btn-save" title="Create Room" :disabled="isCreating">
            <span class="material-symbols-outlined" v-if="!isCreating">save</span>
            <span class="loading-spinner" v-else></span>
          </button>
        </span>
      </h2>
      
      <!-- Room Limit Warning -->
      <div v-if="hasReachedRoomLimit" class="room-limit-warning">
        <div class="warning-icon">
          <span class="material-symbols-outlined">warning</span>
        </div>
        <div class="warning-content">
          <h3>Archived Room Limit Reached</h3>
          <p>You've reached your realm's archived room limit ({{ roomLimit }} room{{ roomLimit > 1 ? 's' : '' }}). New rooms are created as archived by default. To create additional rooms, delete some archived rooms first.</p>
          <button @click="cancel" class="btn btn-primary">
            <span class="material-symbols-outlined">arrow_back</span>
            Return to Previous Page
          </button>
        </div>
      </div>
      
      <div v-else class="room-create-content">
        <div class="room-create-form">
          <div class="form-section">
            <h3>Room Information</h3>
            <div class="form-grid">
              <div class="form-field">
                <label for="roomName">Name <span class="required">*</span></label>
                <div class="input-with-error">
                  <input
                    ref="elName"
                    autocomplete="off"
                    type="text"
                    id="roomName"
                    v-model="roomData.name"
                    @input="validateRoomName"
                    @blur="validateRoomName"
                    maxlength="100"
                    required
                    placeholder="Enter room name..."
                    :class="{ 'error-input': nameError }"
                  />
                  <div v-if="nameError" class="field-error">
                    <span class="material-symbols-outlined">error</span>
                    {{ nameError }}
                  </div>
                </div>
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
                
                <div v-if="!imagePreview" class="upload-placeholder">
                  <span class="material-symbols-outlined upload-icon">cloud_upload</span>
                  <p>Click to upload or drag and drop</p>
                  <small>Supports JPG, PNG, GIF. Max size: 5MB</small>
                </div>
                
                <div v-else class="image-preview">
                  <img :src="imagePreview" alt="Room background preview" />
                  <div class="image-overlay">
                    <button @click.stop="removeImage" class="remove-image-btn" title="Remove image">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@shared/stores/user';
import { useRealmStore } from '@shared/stores/realm';
import { useContentStore } from '@shared/stores/content';
import InlineEditor from '@shared/components/cms/InlineEditor.vue';

const router = useRouter();
const userStore = useUserStore();
const realmStore = useRealmStore();
const contentStore = useContentStore();

// Form data
const roomData = ref({
  name: '',
  description: '<p></p>' // Initialize with empty paragraph for CKEditor
});

// UI state
const isCreating = ref(false);
const imagePreview = ref(null);
const imageFile = ref(null);
const imageError = ref(null);
const nameError = ref(null);

// Form refs
const elName = ref(null);
const btnSave = ref(null);
const fileInput = ref(null);

// Computed properties
const roomLimit = computed(() => {
  return realmStore.activeRealm?.Content?.Rooms || 5;
});

const currentRoomCount = computed(() => {
  // Since new rooms are created archived, count only archived rooms against the limit
  return contentStore.arRooms.filter(room => room.IsActive === false).length;
});

const hasReachedRoomLimit = computed(() => {
  return currentRoomCount.value >= roomLimit.value;
});

// Methods
const cancel = () => {
  router.back();
};

// Validate room name for duplicates and reserved words
const validateRoomName = () => {
  nameError.value = null;
  
  const name = roomData.value.name.trim();
  if (!name) {
    return false;
  }
  
  // Check for reserved room names
  const reservedNames = ['edit', 'add', 'edit-content', 'add-content'];
  const roomName = name.toLowerCase();
  if (reservedNames.includes(roomName)) {
    nameError.value = `"${name}" is a reserved name. Please choose a different name.`;
    return false;
  }
  
  // Generate the path that would be created
  const potentialPath = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  // Check if a room with this path already exists
  const existingRoom = contentStore.arRooms.find(r => r.Path === potentialPath);
  if (existingRoom) {
    nameError.value = `A room with the path "${potentialPath}" already exists.`;
    return false;
  }
  
  // Check if any content item has this path
  const allContents = Object.values(contentStore.contents);
  const existingContent = allContents.find(c => c.Path === potentialPath);
  if (existingContent) {
    nameError.value = `A content item with the path "${potentialPath}" already exists.`;
    return false;
  }
  
  return true;
};

const save = async () => {
  if (!roomData.value.name.trim()) {
    nameError.value = 'Room name is required.';
    elName.value?.focus();
    return;
  }

  // Validate the room name
  if (!validateRoomName()) {
    elName.value?.focus();
    return;
  }

  if (hasReachedRoomLimit.value) {
    return;
  }

  try {
    isCreating.value = true;

    const payload = {
      name: roomData.value.name.trim(),
      description: roomData.value.description.trim() === '<p></p>' ? '' : roomData.value.description.trim()
    };

    // Add image data if present
    if (imageFile.value) {
      payload.imageBase64 = imageFile.value.base64;
      payload.imageFilename = imageFile.value.name;
      payload.imageType = imageFile.value.type;
    }

    console.log('📤 Creating room...', payload);

    const result = await contentStore.createRoom(payload);

    if (result.success) {
      console.log('✅ Room created successfully', result.data);
      
      // Navigate to edit the newly created room (since it's archived by default)
      const roomPath = result.data.Path;
      if (roomPath) {
        router.push(`/rooms/${roomPath}/edit`);
      } else {
        console.warn('Room created but no path found, going back to previous page');
        router.back();
      }
    } else {
      console.error('❌ Failed to create room:', result.error);
      alert(`Failed to create room: ${result.error}`);
    }
  } catch (error) {
    console.error('Error creating room:', error);
    alert('An unexpected error occurred while creating the room. Please try again.');
  } finally {
    isCreating.value = false;
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

// Lifecycle
onMounted(async () => {
  await nextTick();
  elName.value?.focus();
});
</script>

<style scoped>
.add-room {
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

.btn-cancel, .btn-save {
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
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  color: white;
}

.btn-cancel:hover {
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

/* Room Limit Warning */
.room-limit-warning {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  border: 1px solid #dc3545;
  border-radius: 1rem;
  padding: 2rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 2rem;
}

.warning-icon {
  font-size: 2rem;
  color: white;
}

.warning-content h3 {
  margin: 0 0 0.5rem 0;
  color: white;
  font-size: 1.2rem;
}

.warning-content p {
  margin: 0 0 1rem 0;
  color: rgba(255, 255, 255, 0.9);
}

/* Form Styles */
.room-create-content {
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
.form-field input[type="number"] {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #444;
  border-radius: 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  color: #ffffff;
  font-size: 1rem;
}

.form-field input:focus {
  outline: none;
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme-accent) 20%, transparent);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  margin-bottom: 0.5rem;
}

.checkbox-input {
  width: 1.2rem;
  height: 1.2rem;
  accent-color: var(--theme-accent);
}

.field-help {
  display: block;
  margin-top: 0.25rem;
  color: #aaa;
  font-size: 0.85rem;
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

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #dc3545;
  margin-top: 0.5rem;
  font-size: 0.9rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .add-room {
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
}

/* Button Styles */
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  transition: all 0.2s ease;
  text-decoration: none;
}

.btn-primary {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #e6b373 0%, #d4a566 100%);
  transform: translateY(-1px);
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