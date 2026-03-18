<template>
  <div class="account-invitations">
    <div class="page-header">
      <h1>Realm Invitations</h1>
      <p>Manage your pending realm invitations</p>
    </div>

    <div v-if="loading" class="loading-container">
      <div class="loading-spinner">
        <span class="material-symbols-outlined rotating">hourglass_empty</span>
        <p>Loading your invitations...</p>
      </div>
    </div>

    <div v-else-if="error" class="error-container">
      <div class="error-message">
        <span class="material-symbols-outlined">error</span>
        <h3>Error Loading Invitations</h3>
        <p>{{ error }}</p>
        <button @click="loadInvitations" class="btn btn-primary">
          <span class="material-symbols-outlined">refresh</span>
          Try Again
        </button>
      </div>
    </div>

    <div v-else class="invitations-content">
      <div v-if="invitations.length === 0" class="no-invitations">
        <div class="empty-state">
          <span class="material-symbols-outlined">mail_outline</span>
          <h3>No Pending Invitations</h3>
          <p>You don't have any pending realm invitations at the moment.</p>
          <p>When someone invites you to join their realm, you'll see the invitation here.</p>
          <router-link to="/account" class="btn btn-primary">
            <span class="material-symbols-outlined">arrow_back</span>
            Back to Account
          </router-link>
        </div>
      </div>

      <div v-else class="invitations-list">
        <div class="list-header">
          <h2>Pending Invitations ({{ pendingInvitations.length }})</h2>
          <button @click="loadInvitations" class="refresh-btn" :disabled="loading">
            <span class="material-symbols-outlined" :class="{ rotating: loading }">refresh</span>
            Refresh
          </button>
        </div>

        <div class="invitation-cards">
          <div 
            v-for="invitation in pendingInvitations" 
            :key="invitation.invitationId"
            class="invitation-card"
          >
            <div class="card-header">
              <div class="realm-info">
                <h3 class="realm-name">{{ invitation.realmName }}</h3>
                <p class="inviter-name">
                  <span class="material-symbols-outlined">person</span>
                  Invited by {{ invitation.inviterName }}
                </p>
              </div>
              <div class="invitation-status">
                <span class="status-badge pending">{{ invitation.status }}</span>
              </div>
            </div>

            <div class="card-body">
              <div class="invitation-details">
                <div class="detail-item">
                  <span class="material-symbols-outlined">schedule</span>
                  <span>Expires {{ formatExpiration(invitation.ttl) }}</span>
                </div>
                <div class="detail-item">
                  <span class="material-symbols-outlined">calendar_add_on</span>
                  <span>Invited {{ formatDate(invitation.createdAt) }}</span>
                </div>
              </div>

              <div class="invitation-actions">
                <button 
                  @click="declineInvitation(invitation)"
                  :disabled="processingInvitation === invitation.invitationId"
                  class="btn btn-decline"
                >
                  <span class="material-symbols-outlined">close</span>
                  Decline
                </button>
                <button 
                  @click="acceptInvitation(invitation)"
                  :disabled="processingInvitation === invitation.invitationId"
                  class="btn btn-accept"
                >
                  <span v-if="processingInvitation === invitation.invitationId" class="material-symbols-outlined rotating">hourglass_empty</span>
                  <span v-else class="material-symbols-outlined">check</span>
                  {{ processingInvitation === invitation.invitationId ? 'Accepting...' : 'Accept' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Show processed invitations if any -->
        <div v-if="processedInvitations.length > 0" class="processed-invitations">
          <h3>Recently Processed</h3>
          <div class="processed-list">
            <div 
              v-for="invitation in processedInvitations" 
              :key="invitation.invitationId"
              class="processed-item"
              :class="`status-${invitation.status.toLowerCase()}`"
            >
              <div class="processed-info">
                <strong>{{ invitation.realmName }}</strong>
                <span>by {{ invitation.inviterName }}</span>
              </div>
              <div class="processed-status">
                <span class="status-badge" :class="invitation.status.toLowerCase()">
                  {{ invitation.status }}
                </span>
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
import { useRouter } from 'vue-router';
import { useUserStore } from '@shared/stores/user';
import { useRealmStore } from '@shared/stores/realm';
import apiClient from '@shared/utils/api';

const router = useRouter();
const userStore = useUserStore();
const realmStore = useRealmStore();

const loading = ref(true);
const error = ref(null);
const invitations = ref([]);
const processingInvitation = ref(null);

// Filter invitations by status
const pendingInvitations = computed(() => 
  invitations.value.filter(inv => inv.status === 'PENDING')
);

const processedInvitations = computed(() => 
  invitations.value.filter(inv => inv.status === 'ACCEPTED' || inv.status === 'DECLINED')
);

const loadInvitations = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    console.log('📋 Loading user invitations...');
    
    // Call the API-Invitations /invitations/user endpoint to get user's invitations
    const response = await apiClient.get('/invitations/user', {
      headers: {
        'Authorization': `Bearer ${userStore.user.auth.idToken}`
      }
    });

    if (response.data?.invitations) {
      invitations.value = response.data.invitations;
      console.log('✅ Loaded invitations:', invitations.value);
    } else {
      invitations.value = [];
      console.log('ℹ️ No invitations found');
    }
    
  } catch (err) {
    console.error('❌ Error loading invitations:', err);
    
    if (err.response?.status === 404) {
      // No invitations found - this is normal
      invitations.value = [];
    } else {
      error.value = err.response?.data?.message || 'Failed to load invitations. Please try again.';
    }
  } finally {
    loading.value = false;
  }
};

const acceptInvitation = async (invitation) => {
  if (processingInvitation.value || !confirm(`Accept invitation to join "${invitation.realmName}"?`)) {
    return;
  }
  
  processingInvitation.value = invitation.invitationId;
  
  try {
    console.log('✅ Accepting invitation:', invitation);
    
    // Call the API-Invitations POST /invitations/invitation/{id}/accept endpoint
    const response = await apiClient.post(`/invitations/invitation/${invitation.invitationId}/accept`, null, {
      headers: {
        'Authorization': `Bearer ${userStore.user.auth.idToken}`
      }
    });

    // Check if response is successful (200 status means success)
    console.log('✅ Invitation accepted successfully');
    
    // Update the local invitation status
    const invitationIndex = invitations.value.findIndex(inv => inv.invitationId === invitation.invitationId);
    if (invitationIndex !== -1) {
      invitations.value[invitationIndex].status = 'ACCEPTED';
      invitations.value[invitationIndex].acceptedAt = Math.floor(Date.now() / 1000); // Unix timestamp
    }
    
    // Show success message
    alert(`Successfully joined "${invitation.realmName}"! Welcome to the realm.`);
    
    // Refresh the realm store to include the new realm
    await realmStore.init();
    
    // If this was the user's first realm, redirect to account page
    if (realmStore.arRealms.length === 1) {
      router.push('/account');
    }
    
  } catch (err) {
    console.error('❌ Error accepting invitation:', err);
    
    let errorMessage = 'Failed to accept invitation. Please try again.';
    if (err.response?.data?.message) {
      errorMessage = err.response.data.message;
    }
    
    alert(errorMessage);
  } finally {
    processingInvitation.value = null;
  }
};

const declineInvitation = async (invitation) => {
  if (processingInvitation.value || !confirm(`Decline invitation to join "${invitation.realmName}"? This action cannot be undone.`)) {
    return;
  }
  
  processingInvitation.value = invitation.invitationId;
  
  try {
    console.log('❌ Declining invitation:', invitation);
    
    // Call the API-Invitations POST /invitations/invitation/{id}/decline endpoint
    const response = await apiClient.post(`/invitations/invitation/${invitation.invitationId}/decline`, null, {
      headers: {
        'Authorization': `Bearer ${userStore.user.auth.idToken}`
      }
    });

    // Check if response is successful (200 status means success)
    console.log('✅ Invitation declined successfully');
    
    // Update the local invitation status
    const invitationIndex = invitations.value.findIndex(inv => inv.invitationId === invitation.invitationId);
    if (invitationIndex !== -1) {
      invitations.value[invitationIndex].status = 'DECLINED';
    }
    
    alert(`Invitation to "${invitation.realmName}" has been declined.`);
    
  } catch (err) {
    console.error('❌ Error declining invitation:', err);
    
    let errorMessage = 'Failed to decline invitation. Please try again.';
    if (err.response?.data?.message) {
      errorMessage = err.response.data.message;
    }
    
    alert(errorMessage);
  } finally {
    processingInvitation.value = null;
  }
};

const formatExpiration = (ttl) => {
  const expirationDate = new Date(ttl * 1000);
  const now = new Date();
  const diffMs = expirationDate - now;
  
  if (diffMs <= 0) {
    return 'Expired';
  }
  
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  
  if (diffHours < 24) {
    return `in ${diffHours} hour${diffHours === 1 ? '' : 's'}`;
  } else {
    const diffDays = Math.ceil(diffHours / 24);
    return `in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
  }
};

const formatDate = (timestamp) => {
  const date = new Date(timestamp * 1000); // Convert Unix timestamp to Date
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

onMounted(() => {
  loadInvitations();
});
</script>

<style scoped>
.account-invitations {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  text-align: center;
  margin-bottom: 3rem;
}

.page-header h1 {
  color: var(--theme-accent);
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.page-header p {
  color: #ccc;
  font-size: 1.1rem;
}

/* Loading States */
.loading-container, .error-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.loading-spinner, .error-message {
  text-align: center;
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid #444;
  border-radius: 1rem;
  padding: 3rem;
  max-width: 400px;
}

.loading-spinner .material-symbols-outlined,
.error-message .material-symbols-outlined {
  font-size: 3rem;
  color: var(--theme-accent);
  margin-bottom: 1rem;
}

.error-message h3 {
  color: #dc3545;
  margin-bottom: 1rem;
}

/* Empty State */
.no-invitations {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.empty-state {
  text-align: center;
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid #444;
  border-radius: 1rem;
  padding: 3rem;
  max-width: 500px;
}

.empty-state .material-symbols-outlined {
  font-size: 4rem;
  color: #666;
  margin-bottom: 1rem;
}

.empty-state h3 {
  color: var(--theme-accent);
  margin-bottom: 1rem;
}

.empty-state p {
  color: #ccc;
  margin-bottom: 1rem;
  line-height: 1.6;
}

/* Invitations List */
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #444;
}

.list-header h2 {
  color: var(--theme-accent);
  margin: 0;
}

.refresh-btn {
  background: transparent;
  border: 1px solid #666;
  color: #ccc;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.refresh-btn:hover:not(:disabled) {
  border-color: var(--theme-accent);
  color: var(--theme-accent);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Invitation Cards */
.invitation-cards {
  display: grid;
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.invitation-card {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid #444;
  border-radius: 1rem;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.invitation-card:hover {
  border-color: var(--theme-accent);
  box-shadow: 0 4px 20px color-mix(in srgb, var(--theme-accent) 10%, transparent);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.realm-info h3 {
  color: var(--theme-accent);
  font-size: 1.5rem;
  margin: 0 0 0.5rem 0;
}

.inviter-name {
  color: #ccc;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.pending {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
  border: 1px solid #ffc107;
}

.status-badge.accepted {
  background: rgba(40, 167, 69, 0.2);
  color: #28a745;
  border: 1px solid #28a745;
}

.status-badge.declined {
  background: rgba(220, 53, 69, 0.2);
  color: #dc3545;
  border: 1px solid #dc3545;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.invitation-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #ccc;
  font-size: 0.9rem;
}

.detail-item .material-symbols-outlined {
  font-size: 1.1rem;
  color: #888;
}

.invitation-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  border: none;
}

.btn-primary {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-1px);
}

.btn-accept {
  background: linear-gradient(135deg, #28a745 0%, #20803d 100%);
  color: white;
}

.btn-accept:hover:not(:disabled) {
  background: linear-gradient(135deg, #20803d 0%, #1c6e34 100%);
  transform: translateY(-1px);
}

.btn-decline {
  background: transparent;
  border: 1px solid #dc3545;
  color: #dc3545;
}

.btn-decline:hover:not(:disabled) {
  background: #dc3545;
  color: white;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Processed Invitations */
.processed-invitations {
  border-top: 1px solid #444;
  padding-top: 2rem;
}

.processed-invitations h3 {
  color: #888;
  margin-bottom: 1rem;
}

.processed-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.processed-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 0.5rem;
  border-left: 3px solid transparent;
}

.processed-item.status-accepted {
  border-left-color: #28a745;
}

.processed-item.status-declined {
  border-left-color: #dc3545;
}

.processed-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.processed-info strong {
  color: var(--theme-accent);
}

.processed-info span {
  color: #888;
  font-size: 0.9rem;
}

/* Animations */
.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Responsive Design */
@media (max-width: 768px) {
  .account-invitations {
    padding: 1rem;
  }
  
  .page-header h1 {
    font-size: 2rem;
  }
  
  .list-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .card-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .invitation-actions {
    flex-direction: column;
  }
  
  .btn {
    justify-content: center;
  }
  
  .invitation-details {
    gap: 0.5rem;
  }
  
  .detail-item {
    font-size: 0.8rem;
  }
}
</style>