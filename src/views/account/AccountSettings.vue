<template>
  <div class="account-settings">
    <!-- Header -->
    <div class="settings-header">
      <div class="header-content">
        <div class="back-button">
          <router-link to="/account" class="btn-back">
            <span class="material-symbols-outlined">arrow_back</span>
            Back to Account
          </router-link>
        </div>
        <div class="header-info">
          <h1>Account Settings</h1>
          <p>Manage your profile and account preferences</p>
        </div>
      </div>
    </div>

    <!-- Settings Content -->
    <div class="settings-content">
      <!-- Profile Section -->
      <section class="settings-section">
        <div class="section-header">
          <h2>
            <span class="material-symbols-outlined">person</span>
            Profile Information
          </h2>
          <p class="section-description">Update your personal information</p>
        </div>
        
        <div class="section-content">
          <form @submit.prevent="saveProfile" class="profile-form">
            <!-- Email (Read-only) -->
            <div class="form-group">
              <label for="email">Email Address</label>
              <input
                id="email"
                type="email"
                :value="userStore.email"
                readonly
                class="readonly-field"
              />
              <small class="field-note">Email cannot be changed. Contact support if you need to update your email.</small>
            </div>

            <!-- First Name -->
            <div class="form-group">
              <label for="firstName">First Name</label>
              <input
                id="firstName"
                v-model="profileForm.firstName"
                type="text"
                placeholder="Enter your first name"
                maxlength="50"
                :disabled="saving"
              />
              <small class="field-note">Your first name as you'd like it to appear</small>
            </div>

            <!-- Last Name -->
            <div class="form-group">
              <label for="lastName">Last Name</label>
              <input
                id="lastName"
                v-model="profileForm.lastName"
                type="text"
                placeholder="Enter your last name"
                maxlength="50"
                :disabled="saving"
              />
              <small class="field-note">Your family name or surname</small>
            </div>

            <!-- Save Button -->
            <div class="form-actions">
              <button 
                type="submit" 
                class="btn-save" 
                :disabled="saving || !hasProfileChanges"
              >
                <span v-if="saving" class="material-symbols-outlined loading">hourglass_empty</span>
                <span v-else class="material-symbols-outlined">save</span>
                {{ saving ? 'Saving...' : 'Save Profile' }}
              </button>
              
              <button 
                type="button" 
                @click="resetProfileForm" 
                class="btn-reset"
                :disabled="saving || !hasProfileChanges"
              >
                <span class="material-symbols-outlined">undo</span>
                Reset
              </button>
            </div>
          </form>
        </div>
      </section>

      <!-- Account Information Section -->
      <section class="settings-section">
        <div class="section-header">
          <h2>
            <span class="material-symbols-outlined">info</span>
            Account Information
          </h2>
          <p class="section-description">View your account details</p>
        </div>
        
        <div class="section-content">
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Account Created</div>
              <div class="info-value">{{ formatDate(userStore.user?.signInDetails?.loginTime) }}</div>
            </div>
            
            <div class="info-item">
              <div class="info-label">User ID</div>
              <div class="info-value">{{ userStore.userSub }}</div>
            </div>
            
            <div class="info-item">
              <div class="info-label">Authentication Method</div>
              <div class="info-value">
                <span class="auth-method" :class="authMethodClass">
                  {{ authMethod }}
                </span>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      <!-- Security Section -->
      <section class="settings-section">
        <div class="section-header">
          <h2>
            <span class="material-symbols-outlined">security</span>
            Security
          </h2>
          <p class="section-description">Manage your account security</p>
        </div>

        <div class="section-content">
          <div class="security-options">
            <div v-if="authMethod === 'Email & Password'" class="security-item">
              <div class="security-info">
                <h3>Change Password</h3>
                <p>Update your account password for better security</p>
              </div>
              <div class="security-action">
                <button @click="showPasswordChange = true" class="btn-secondary">
                  <span class="material-symbols-outlined">key</span>
                  Change Password
                </button>
              </div>
            </div>

            <!-- Info for Google OAuth users -->
            <div v-if="authMethod === 'Google OAuth'" class="security-item info-only">
              <div class="security-info">
                <h3>Password Management</h3>
                <p>Your password is managed through your Google account. Visit your Google Account settings to update your password.</p>
              </div>
              <div class="security-action">
                <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" class="btn-outline">
                  <span class="material-symbols-outlined">open_in_new</span>
                  Google Account Security
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- Patreon Integration Section -->
      <section class="settings-section">
        <PatreonConnection />
      </section>
    </div>

    <!-- Password Change Modal (only for email/password users) -->
    <dialog v-if="authMethod === 'Email & Password'" ref="passwordDialog" class="password-modal">
      <div class="modal-header">
        <h3>Change Password</h3>
        <button @click="closePasswordDialog" class="close-btn">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      
      <div class="modal-body">
        <form @submit.prevent="changePassword" class="password-form">
          <div class="form-group">
            <label for="currentPassword">Current Password</label>
            <input
              id="currentPassword"
              v-model="passwordForm.currentPassword"
              type="password"
              placeholder="Enter your current password"
              required
              :disabled="changingPassword"
            />
          </div>
          
          <div class="form-group">
            <label for="newPassword">New Password</label>
            <input
              id="newPassword"
              v-model="passwordForm.newPassword"
              type="password"
              placeholder="Enter your new password"
              minlength="8"
              required
              :disabled="changingPassword"
            />
            <small class="field-note">Password must be at least 8 characters long</small>
          </div>
          
          <div class="form-group">
            <label for="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              v-model="passwordForm.confirmPassword"
              type="password"
              placeholder="Confirm your new password"
              minlength="8"
              required
              :disabled="changingPassword"
            />
          </div>
          
          <div class="modal-actions">
            <button type="button" @click="closePasswordDialog" class="btn-cancel">
              Cancel
            </button>
            <button type="submit" class="btn-save" :disabled="changingPassword">
              <span v-if="changingPassword" class="material-symbols-outlined loading">hourglass_empty</span>
              <span v-else class="material-symbols-outlined">key</span>
              {{ changingPassword ? 'Changing...' : 'Change Password' }}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { updateUserAttributes, updatePassword } from '@aws-amplify/auth';
import { useUserStore } from '@shared/stores/user';
import { useNotifications } from '@shared/composables/useNotifications';
import PatreonConnection from '@shared/components/account/PatreonConnection.vue';

const userStore = useUserStore();
const { notifySuccess, notifyError, notifyWarning } = useNotifications();

// Form states
const saving = ref(false);
const changingPassword = ref(false);
const showPasswordChange = ref(false);

// Form data
const profileForm = ref({
  firstName: '',
  lastName: ''
});

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

// Modal refs
const passwordDialog = ref(null);

// Computed properties
const hasProfileChanges = computed(() => {
  return profileForm.value.firstName !== (userStore.firstName || '') ||
         profileForm.value.lastName !== (userStore.user?.attributes?.family_name || '');
});

const authMethod = computed(() => {
  // Check if user has social identities
  if (userStore.user?.attributes?.identities) {
    const identities = userStore.user.attributes.identities;
    
    // Handle case where identities is already an array
    if (Array.isArray(identities)) {
      if (identities.some(identity => identity.providerName === 'Google')) {
        return 'Google OAuth';
      }
    } else {
      // Handle case where identities is a JSON string (fallback)
      try {
        const parsedIdentities = JSON.parse(identities);
        if (parsedIdentities.some(identity => identity.providerName === 'Google')) {
          return 'Google OAuth';
        }
      } catch (e) {
        // Parse error, fall back to email
      }
    }
  }
  return 'Email & Password';
});

const authMethodClass = computed(() => {
  return authMethod.value === 'Google OAuth' ? 'google' : 'email';
});


// Methods
const initializeForm = () => {
  profileForm.value.firstName = userStore.firstName || '';
  profileForm.value.lastName = userStore.user?.attributes?.family_name || '';
};

const resetProfileForm = () => {
  initializeForm();
};

const saveProfile = async () => {
  saving.value = true;
  
  try {
    const updates = {};
    
    if (profileForm.value.firstName !== (userStore.firstName || '')) {
      updates.given_name = profileForm.value.firstName;
    }
    
    if (profileForm.value.lastName !== (userStore.user?.attributes?.family_name || '')) {
      updates.family_name = profileForm.value.lastName;
    }
    
    if (Object.keys(updates).length === 0) {
      notifyWarning('No changes to save');
      return;
    }
    
    await updateUserAttributes({
      userAttributes: updates
    });
    
    // Refresh user data to reflect changes
    await userStore.getUser();
    
    notifySuccess('Profile updated successfully!');
    
  } catch (error) {
    console.error('Error updating profile:', error);
    notifyError('Failed to update profile. Please try again.');
  } finally {
    saving.value = false;
  }
};

const changePassword = async () => {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    notifyError('New passwords do not match');
    return;
  }
  
  if (passwordForm.value.newPassword.length < 8) {
    notifyError('Password must be at least 8 characters long');
    return;
  }
  
  changingPassword.value = true;
  
  try {
    await updatePassword({
      oldPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword
    });
    
    notifySuccess('Password changed successfully!');
    closePasswordDialog();
    
  } catch (error) {
    console.error('Error changing password:', error);
    
    if (error.name === 'NotAuthorizedException') {
      notifyError('Current password is incorrect');
    } else if (error.name === 'InvalidPasswordException') {
      notifyError('New password does not meet requirements');
    } else {
      notifyError('Failed to change password. Please try again.');
    }
  } finally {
    changingPassword.value = false;
  }
};

const closePasswordDialog = () => {
  passwordDialog.value?.close();
  passwordForm.value = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
};

const formatDate = (dateString) => {
  if (!dateString) return 'Unknown';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return 'Unknown';
  }
};

// Watchers
watch(() => showPasswordChange.value, (show) => {
  if (show) {
    passwordDialog.value?.showModal();
    showPasswordChange.value = false;
  }
});

// Lifecycle
onMounted(() => {
  initializeForm();
});
</script>

<style scoped>
.account-settings {
  min-height: 100%;
  background: linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 100%);
  color: #ffffff;
  padding: 2rem;
}

/* Header */
.settings-header {
  margin-bottom: 2rem;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--theme-accent);
  text-decoration: none;
  padding: 0.5rem 1rem;
  border: 1px solid var(--theme-accent);
  border-radius: 0.5rem;
  transition: all 0.2s ease;
  background: transparent;
}

.btn-back:hover {
  background: var(--theme-accent);
  color: var(--theme-bg-surface);
  text-decoration: none;
}

.header-info h1 {
  margin: 0;
  color: var(--theme-accent);
  font-size: 2rem;
  font-weight: 600;
}

.header-info p {
  margin: 0.5rem 0 0 0;
  color: #ccc;
  font-size: 1rem;
}

/* Settings Content */
.settings-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Section Styling */
.settings-section {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid #444;
  border-radius: 1rem;
  overflow: hidden;
}

.section-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #444;
  background: linear-gradient(135deg, #1a2441 0%, #2c3e63 100%);
}

.section-header h2 {
  margin: 0 0 0.5rem 0;
  color: var(--theme-accent);
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-description {
  margin: 0;
  color: #ccc;
  font-size: 0.9rem;
}

.section-content {
  padding: 2rem;
}

/* Form Styling */
.profile-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 600px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  color: var(--theme-accent);
  font-weight: 500;
  font-size: 0.9rem;
}

.form-group input {
  padding: 0.75rem;
  background: linear-gradient(135deg, #0f1629 0%, #1a2441 100%);
  border: 1px solid #444;
  border-radius: 0.5rem;
  color: #ffffff;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.form-group input:focus {
  outline: none;
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme-accent) 20%, transparent);
}

.form-group input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.readonly-field {
  background: #2a3a5a !important;
  color: #ccc !important;
  cursor: not-allowed;
}

.field-note {
  color: #888;
  font-size: 0.8rem;
  margin-top: 0.25rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.btn-save,
.btn-reset,
.btn-secondary,
.btn-cancel {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  border: none;
}

.btn-save {
  background: linear-gradient(135deg, var(--theme-success) 0%, #27ae60 100%);
  color: white;
}

.btn-save:hover:not(:disabled) {
  background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
  transform: translateY(-1px);
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-reset,
.btn-cancel {
  background: transparent;
  border: 1px solid #666;
  color: #ccc;
}

.btn-reset:hover:not(:disabled),
.btn-cancel:hover {
  border-color: var(--theme-accent);
  color: var(--theme-accent);
}

.btn-secondary {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
}

.btn-secondary:hover:not(:disabled) {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-1px);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Info Grid */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-label {
  color: var(--theme-accent);
  font-weight: 500;
  font-size: 0.9rem;
}

.info-value {
  color: #ffffff;
  font-size: 1rem;
  font-family: monospace;
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  padding: 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.auth-method {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

.auth-method.google {
  background: #4285f4;
  color: white;
}

.auth-method.email {
  background: #28a745;
  color: white;
}


/* Security Options */
.security-options {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.security-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: color-mix(in srgb, var(--theme-accent) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-radius: 0.5rem;
}


.security-info h3 {
  margin: 0 0 0.5rem 0;
  color: var(--theme-accent);
  font-size: 1.1rem;
}

.security-info p {
  margin: 0;
  color: #ccc;
  font-size: 0.9rem;
}

/* Password Modal */
.password-modal {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid var(--theme-accent);
  border-radius: 1rem;
  padding: 0;
  width: 90%;
  max-width: 500px;
  color: #ffffff;
}

.password-modal::backdrop {
  background: var(--theme-bg-overlay);
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
  color: var(--theme-accent);
  font-size: 1.25rem;
}

.close-btn {
  background: transparent;
  border: none;
  color: #ccc;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: color 0.2s ease;
}

.close-btn:hover {
  color: var(--theme-accent);
}

.modal-body {
  padding: 1.5rem;
}

.password-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

/* Loading Animation */
.loading {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Info-only security items */
.security-item.info-only {
  background: color-mix(in srgb, var(--theme-success) 5%, transparent);
  border-color: color-mix(in srgb, var(--theme-success) 20%, transparent);
}

.security-item.info-only .security-info h3 {
  color: var(--theme-success);
}

/* Button styles */
.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: transparent;
  color: var(--theme-accent);
  border: 1px solid var(--theme-accent);
  border-radius: 0.5rem;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
  cursor: pointer;
}

.btn-outline:hover {
  background: var(--theme-accent);
  color: var(--theme-bg-surface);
  transform: translateY(-1px);
}

/* Responsive Design */
@media (max-width: 768px) {
  .account-settings {
    padding: 1rem;
  }
  
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .section-content {
    padding: 1.5rem;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .security-item {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .form-actions,
  .modal-actions {
    flex-direction: column;
  }
  
  .password-modal {
    width: 95%;
    margin: 1rem;
  }
}


</style>