<template>
  <div class="realm-invitations-container">
    <div class="card">
      <h2>Welcome to RealmForge!</h2>
      <p>To begin your adventure, you need access to a realm.</p>
      <div v-if="loading" class="loading">
        <p>Loading realm invitations...</p>
      </div>
      <div v-else-if="error" class="error">
        <p>{{ error }}</p>
        <button @click="checkUserRealmStatus" class="btn btn-primary">Try Again</button>
      </div>
      <div v-else-if="invitations.length > 0" class="invitations">
        <h3>You have realm invitations!</h3>
        <p>You can manage your invitations or create your own realm:</p>
        <div v-for="invitation in invitations" :key="invitation.invitationId" class="invitation-card">
          <h4>{{ invitation.realmName }}</h4>
          <p>Invited by: <strong>{{ invitation.inviterName }}</strong></p>
          <p class="expiration">Expires: {{ formatExpirationDate(invitation.ttl) }}</p>
        </div>
        <div class="actions">
          <button @click="goToInvitations" class="btn btn-outline">
            <span class="material-symbols-outlined">settings</span>
            Manage Invitations
          </button>
          <button @click="createNewRealm" class="btn btn-primary">
            <span class="material-symbols-outlined">add_circle</span>
            Create Your Own Realm
          </button>
        </div>
      </div>
      <div v-else class="no-invitations">
        <!-- User has reached realm limit -->
        <div v-if="realmLimitReached" class="realm-limit-reached">
          <h3>Realm Limit Reached</h3>
          <p>You've reached your realm limit ({{ freeRealmLimit }} realm{{ freeRealmLimit > 1 ? 's' : '' }}).</p>
          <p>To create additional realms, consider upgrading your account or request an invitation to join an existing realm.</p>
          <div class="actions">
            <button @click="checkUserRealmStatus" class="btn btn-secondary">
              <span class="material-symbols-outlined">refresh</span>
              Check Status Again
            </button>
            <button @click="requestAccess" class="btn btn-primary">
              <span class="material-symbols-outlined">mail</span>
              Request Invitation
            </button>
            <button @click="redirectToAccount" class="btn btn-outline">
              <span class="material-symbols-outlined">account_circle</span>
              Go to Account
            </button>
          </div>
        </div>
        <!-- User can create realms -->
        <div v-else>
          <h3>Ready to Begin Your Adventure?</h3>
          <p>You don't have access to any realms yet, but that's okay!</p>
          <p>Let's get you started by creating your first realm where you can build your world and invite friends.</p>
          <div class="actions">
            <button @click="checkUserRealmStatus" class="btn btn-secondary">
              <span class="material-symbols-outlined">refresh</span>
              Check Status Again
            </button>
            <button @click="createNewRealm" class="btn btn-primary">
              <span class="material-symbols-outlined">add_circle</span>
              Create Your First Realm
            </button>
            <button @click="requestAccess" class="btn btn-outline">
              <span class="material-symbols-outlined">mail</span>
              Request Invitation Instead
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { getActivePinia } from 'pinia';
import { useUserStore } from '@shared/stores/user.js';
import { useRealmStore } from '@shared/stores/realm.js';
import { useAccountStore } from '@shared/stores/account.js';
import apiClient from '@shared/utils/api';

const userStore = useUserStore();
const realmStore = useRealmStore();
const accountStore = useAccountStore();
const router = useRouter();

const loading = ref(true);
const error = ref(null);
const invitations = ref([]);
const userRealms = ref([]);

// Free realm limit — prefer per-gaming-system FreeRealms (set by app's gamingSystems store at init).
// Falls back to account.Realms in apps that don't register a gamingSystems store.
const freeRealmLimit = computed(() => {
  const gsId = import.meta.env.VITE_GAMING_SYSTEM_ID;
  if (gsId) {
    const pinia = getActivePinia();
    const gsStore = pinia?._s?.get('gamingSystems');
    const gs = gsStore?.getSystemById?.(gsId);
    if (gs?.FreeRealms !== undefined) return gs.FreeRealms;
  }
  return accountStore.account?.Realms || 3;
});

// Check if user can create more realms based on gaming system limit
const canCreateMoreRealms = computed(() => {
  if (!accountStore.account) return false;
  return realmStore.arRealms.length < freeRealmLimit.value;
});

const realmLimitReached = computed(() => {
  if (!accountStore.account) return false;
  return realmStore.arRealms.length >= freeRealmLimit.value;
});

const checkUserRealmStatus = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    console.log('Checking user realm associations...');
    
    // First, check what realms the user has access to
    // This calls the same endpoint that realm store uses
    const userRealmsResponse = await apiClient.get('/realms/user');
    
    if (userRealmsResponse.data && Object.keys(userRealmsResponse.data).length > 0) {
      userRealms.value = Object.values(userRealmsResponse.data);
      console.log('User has realms:', userRealms.value);
      
      // User has realms but no active realm - send them to account page
      console.log('Redirecting to /account for realm selection...');
      await router.push('/account');
      return;
    }
    
    // User has no realms, check for invitations
    await checkInvitations();
    
  } catch (err) {
    console.error('Error checking user realm status:', err);
    
    if (err.response?.status === 404 || err.response?.status === 403) {
      // No realms found, check for invitations
      await checkInvitations();
    } else {
      error.value = 'Failed to check your realm status. Please try again.';
      loading.value = false;
    }
  }
};

const checkInvitations = async () => {
  try {
    console.log('Checking for realm invitations...');
    
    // Check for invitations from the Invitations table
    const response = await apiClient.get('/invitations/user');
    
    if (response.data && response.data.invitations && Array.isArray(response.data.invitations)) {
      invitations.value = response.data.invitations;
      console.log('Found invitations:', invitations.value);
    } else {
      invitations.value = [];
    }
    
  } catch (err) {
    console.error('Error checking invitations:', err);
    
    // If it's a 404 or similar, just assume no invitations
    if (err.response?.status === 404 || err.response?.status === 403) {
      invitations.value = [];
      console.log('No invitations found or endpoint not available');
    } else {
      error.value = 'Failed to load realm invitations. Please try again.';
    }
  } finally {
    loading.value = false;
  }
};

const formatExpirationDate = (ttl) => {
  const expirationDate = new Date(ttl * 1000);
  return expirationDate.toLocaleDateString() + ' at ' + expirationDate.toLocaleTimeString();
};


const createNewRealm = async () => {
  // Double-check realm limit before allowing creation
  if (!canCreateMoreRealms.value) {
    error.value = `You've reached your account's realm limit (${accountStore.account?.Realms || 1} realm${(accountStore.account?.Realms || 1) > 1 ? 's' : ''}). Please upgrade your account to create more realms.`;
    return;
  }

  console.log('Redirecting to realm creation page...');
  try {
    await router.push('/realm/create');
  } catch (err) {
    console.error('Error navigating to realm creation:', err);
    error.value = 'Failed to navigate to realm creation. Please try again.';
  }
};

const redirectToAccount = async () => {
  try {
    await router.push('/account');
  } catch (err) {
    console.error('Error navigating to account page:', err);
    error.value = 'Failed to navigate to account page. Please try again.';
  }
};

const goToInvitations = async () => {
  try {
    await router.push('/account/invitations');
  } catch (err) {
    console.error('Error navigating to invitations page:', err);
    error.value = 'Failed to navigate to invitations page. Please try again.';
  }
};

const requestAccess = () => {
  console.log('Requesting access to realms...');
  
  const message = 
    'To request access to an existing realm:\n\n' +
    '1. Contact a friend who already has a realm\n' +
    '2. Ask them to send you an invitation\n' +
    '3. They can find the invitation feature in their realm settings\n' +
    '4. Once invited, you\'ll see the invitation here\n\n' +
    'Alternatively, you can create your own realm and invite others to join!';
    
  alert(message);
};

onMounted(async () => {
  // Lazy-load gamingSystems store if the app exposes one but hasn't preloaded it.
  const gsId = import.meta.env.VITE_GAMING_SYSTEM_ID;
  if (gsId) {
    try {
      const mod = await import(/* @vite-ignore */ '@/stores/gamingSystems');
      const store = mod.useGamingSystemsStore?.();
      if (store && !store.isLoaded) await store.fetchGamingSystems();
    } catch {
      // App doesn't expose a gamingSystems store — fall back to account.Realms.
    }
  }

  checkUserRealmStatus();
});
</script>

<style scoped>
.realm-invitations-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: 2rem;
  background: transparent;
}

.card {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid var(--theme-accent);
  border-radius: 1rem;
  padding: 2rem;
  max-width: 700px;
  width: 100%;
  text-align: center;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.card h2 {
  color: var(--theme-accent);
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  font-weight: 600;
}

.card p {
  color: #ccc;
  font-size: 1rem;
  line-height: 1.5;
  margin-bottom: 1.5rem;
}

.loading, .error, .no-invitations {
  padding: 1rem;
}

.loading {
  color: #ccc;
}

.error {
  color: #dc3545;
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.3);
  border-radius: 0.5rem;
  padding: 1rem;
  margin: 1rem 0;
}

.invitations {
  text-align: left;
}

.invitation-card {
  background: linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 100%);
  border: 1px solid #444;
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin: 1rem 0;
  transition: all 0.2s ease;
}

.invitation-card:hover {
  border-color: var(--theme-accent);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--theme-accent) 10%, transparent);
}

.invitation-card h4 {
  color: var(--theme-accent);
  margin-bottom: 0.75rem;
  font-size: 1.2rem;
  font-weight: 600;
}

.invitation-card p {
  margin-bottom: 0.5rem;
  color: #ccc;
  font-size: 0.9rem;
}

.invitation-card .expiration {
  color: #ff9800;
  font-size: 0.85rem;
  font-style: italic;
  opacity: 0.9;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
  margin-top: 1.5rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
  font-size: 0.9rem;
  text-decoration: none;
}

.btn .material-symbols-outlined {
  font-size: 1.1rem;
}

.btn-primary {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-1px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
}

.btn-secondary {
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
  color: white;
}

.btn-secondary:hover {
  background: linear-gradient(135deg, #5a6268 0%, #495057 100%);
  transform: translateY(-1px);
}

.btn-success {
  background: linear-gradient(135deg, #28a745 0%, #20803d 100%);
  color: white;
}

.btn-success:hover {
  background: linear-gradient(135deg, #20803d 0%, #1e7e34 100%);
  transform: translateY(-1px);
}

.btn-outline {
  background: transparent;
  color: var(--theme-accent);
  border: 1px solid var(--theme-accent);
}

.btn-outline:hover {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  transform: translateY(-1px);
}

.realm-limit-reached {
  text-align: center;
  padding: 1.5rem;
  border: 2px solid #ff9800;
  border-radius: 0.75rem;
  background: rgba(255, 152, 0, 0.1);
  margin: 1rem 0;
}

.realm-limit-reached h3 {
  color: #ff9800;
  margin-bottom: 1rem;
  font-size: 1.2rem;
  font-weight: 600;
}

.realm-limit-reached p {
  color: #ccc;
  margin-bottom: 0.75rem;
  line-height: 1.6;
  font-size: 0.95rem;
}

/* No invitations section styling */
.no-invitations > div:not(.realm-limit-reached) {
  background: color-mix(in srgb, var(--theme-accent) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-radius: 0.75rem;
  padding: 2rem;
  margin: 1rem 0;
}

.no-invitations h3 {
  color: var(--theme-accent);
  margin-bottom: 1rem;
  font-size: 1.2rem;
  font-weight: 600;
}

.no-invitations p {
  color: #ccc;
  margin-bottom: 1rem;
  line-height: 1.6;
}

/* Responsive Design */
@media (max-width: 768px) {
  .realm-invitations-container {
    padding: 1rem;
  }
  
  .card {
    padding: 1.5rem;
    max-width: 100%;
  }
  
  .invitation-card {
    padding: 1rem;
  }
  
  .actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .card {
    padding: 1rem;
  }
  
  .card h2 {
    font-size: 1.3rem;
  }
  
  .invitation-card h4 {
    font-size: 1.1rem;
  }
}
</style>
