<template>
    <div class="account-dashboard">
        <!-- Header Section -->
        <header class="dashboard-header">
            <div class="user-profile">
                <div class="avatar-placeholder">
                    <span class="material-symbols-outlined">person</span>
                </div>
                <div class="user-info">
                    <h1>{{ userStore.fullName }}</h1>
                    <p>{{ userStore.email }}</p>
                </div>
            </div>
            <div class="header-actions">
                <router-link to="/account/invitations" class="invitations-btn" title="View Invitations">
                    <span class="material-symbols-outlined">mail</span>
                    <span class="btn-text">Invitations</span>
                </router-link>
                <a v-if="realmforgeSettingsUrl" :href="realmforgeSettingsUrl" class="settings-btn" title="Account Settings">
                    <span class="material-symbols-outlined">settings</span>
                </a>
                <router-link v-else to="/account/settings" class="settings-btn" title="Account Settings">
                    <span class="material-symbols-outlined">settings</span>
                </router-link>
            </div>
        </header>

        <!-- Quick Stats Dashboard -->
        <section class="stats-grid" v-if="accountStore.accountId">
            <div class="stat-card">
                <div class="stat-icon">
                    <span class="material-symbols-outlined">public</span>
                </div>
                <div class="stat-content">
                    <div class="stat-value">{{ realmStore.arOwnedRealms?.length || 0 }}</div>
                    <div class="stat-label">Owned Realms</div>
                    <div class="stat-meta">Free Realms: {{ realmStore.arOwnedFreeRealms?.length || 0 }}/{{ accountStore.account?.Realms || 3 }}</div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon">
                    <span class="material-symbols-outlined">group</span>
                </div>
                <div class="stat-content">
                    <div class="stat-value">{{ totalPlayers }}</div>
                    <div class="stat-label">Total Players</div>
                    <div class="stat-meta">Across all realms</div>
                </div>
            </div>

            <CreditBalance />

            <template v-if="features.hasShop">
                <router-link to="/account/purchased-items" class="stat-card stat-card-link">
                    <div class="stat-icon">
                        <span class="material-symbols-outlined">shopping_bag</span>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">{{ purchasedItemsCount }}</div>
                        <div class="stat-label">Purchased Items</div>
                        <div class="stat-meta">View all purchases</div>
                    </div>
                </router-link>
            </template>

        </section>

        <!-- Account Creation Section -->
        <section v-if="!accountStore.accountId" class="account-creation">
            <AccountCreate />
        </section>

        <!-- No Active Realm Warning -->
        <section v-if="accountStore.accountId && (realmStore.arRealms?.length || 0) > 0 && !realmStore.activeRealm" class="no-active-realm-warning">
            <div class="warning-card">
                <div class="warning-icon">
                    <span class="material-symbols-outlined">warning</span>
                </div>
                <div class="warning-content">
                    <h3>No Active Realm Selected</h3>
                    <p>You have access to {{ realmStore.arRealms?.length || 0 }} realm{{ (realmStore.arRealms?.length || 0) > 1 ? 's' : '' }}, but none is currently active. Please select a realm below to enter and begin your adventure.</p>
                </div>
                <div class="warning-actions">
                    <button @click="scrollToRealms" class="btn btn-primary">
                        <span class="material-symbols-outlined">arrow_downward</span>
                        Select a Realm
                    </button>
                </div>
            </div>
        </section>

        <!-- Active Realm Section -->
        <section v-if="realmStore.activeRealm" class="active-realm-section">
            <div class="section-header">
                <h2>
                    <span class="material-symbols-outlined">star</span>
                    Active Realm
                </h2>
            </div>
            <div class="active-realm-card">
                <ActiveRealm />
            </div>
        </section>

        <!-- Realms Section -->
        <section class="realms-section" v-if="accountStore.accountId">
            <div class="section-header">
                <h2>
                    <span class="material-symbols-outlined">public</span>
                    My Realms
                </h2>
                <div class="header-actions">
                    <button
                        v-if="(realmStore.arOwnedFreeRealms?.length || 0) < (accountStore.account?.Realms || 3)"
                        @click="$router.push('/realm/create')"
                        class="create-realm-btn"
                    >
                        <span class="material-symbols-outlined">add</span>
                        Create Realm
                    </button>
                </div>
            </div>

            <!-- Realms Grid -->
            <div v-if="filteredRealms.length" class="realms-grid">
                <div
                    v-for="realm in filteredRealms"
                    :key="realm.RealmID"
                    class="realm-card"
                    :class="{
                        active: userStore.activeRealmId === realm.RealmID,
                        deactivated: realm.UserActive === false
                    }"
                >
                    <div class="realm-header">
                        <div class="realm-icon">
                            <span class="material-symbols-outlined">public</span>
                        </div>
                        <div class="realm-badges">
                            <span
                                v-if="isRealmOwner(realm)"
                                class="ownership-badge owner"
                                title="You own this realm"
                            >
                                <span class="material-symbols-outlined">shield</span>
                            </span>
                            <span
                                v-else
                                class="ownership-badge player"
                                title="You are a player in this realm"
                            >
                                <span class="material-symbols-outlined">person</span>
                            </span>
                            <span
                                v-if="realm.UserActive === false"
                                class="status-badge deactivated"
                            >
                                Deactivated
                            </span>
                            <span
                                v-else-if="userStore.activeRealmId === realm.RealmID"
                                class="status-badge active"
                            >
                                Active
                            </span>
                        </div>
                    </div>

                    <div class="realm-content">
                        <h3 class="realm-name">{{ realm.Name }}</h3>
                        <p class="realm-description" v-html="realm.Description || 'No description provided'"></p>

                        <div class="realm-stats">
                            <div class="stat-item">
                                <span class="material-symbols-outlined">group</span>
                                <span>{{ getActiveRealmPlayerCount(realm.RealmID) }}/{{ realm.MaxPlayers || 5 }} players</span>
                            </div>
                            <div class="stat-item">
                                <span class="material-symbols-outlined">calendar_month</span>
                                <span>{{ formatDate(realm.CreatedAt) }}</span>
                            </div>
                            <div v-if="isRealmAtCapacity(realm)" class="stat-item capacity-warning">
                                <span class="material-symbols-outlined">warning</span>
                                <span>At capacity</span>
                            </div>
                        </div>
                    </div>

                    <div class="realm-actions">
                        <button
                            v-if="realm.UserActive === false"
                            class="action-btn deactivated"
                            disabled
                        >
                            <span class="material-symbols-outlined">block</span>
                            Deactivated
                        </button>
                        <button
                            v-else-if="userStore.activeRealmId !== realm.RealmID"
                            @click="activateRealm(realm.RealmID)"
                            class="action-btn primary"
                        >
                            <span class="material-symbols-outlined">play_arrow</span>
                            Enter Realm
                        </button>
                        <button
                            v-else
                            class="action-btn active"
                            disabled
                        >
                            <span class="material-symbols-outlined">check_circle</span>
                            Current Realm
                        </button>

                        <div class="secondary-actions">
                            <button class="action-btn secondary" title="Realm Settings">
                                <span class="material-symbols-outlined">settings</span>
                            </button>
                            <button class="action-btn secondary" title="Share Realm">
                                <span class="material-symbols-outlined">share</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- No Realms State -->
            <div v-else class="no-realms-state">
                <div class="empty-state">
                    <div class="empty-icon">
                        <span class="material-symbols-outlined">public_off</span>
                    </div>
                    <h3>No realms yet</h3>
                    <!-- Show different content based on realm limit -->
                    <div v-if="(realmStore.arOwnedFreeRealms?.length || 0) >= (accountStore.account?.Realms || 3)">
                        <p>You've reached your free realm limit ({{ accountStore.account?.Realms || 3 }}).</p>
                        <p>To create additional realms, consider upgrading your account or request an invitation to join an existing realm.</p>
                    </div>
                    <div v-else>
                        <p>Create your first realm to start building your world and inviting players</p>
                        <button
                            @click="$router.push('/realm/create')"
                            class="create-first-realm-btn"
                        >
                            <span class="material-symbols-outlined">add</span>
                            Create Your First Realm
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <!-- Realm Switch Confirmation Dialog -->
        <dialog ref="realmSwitchDialog" class="realm-switch-dialog">
                <div class="modal-header">
                    <h3>
                        <span class="material-symbols-outlined">swap_horiz</span>
                        Switch Realm
                    </h3>
                    <button @click="closeRealmSwitchModal" class="close-btn">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div class="modal-body">
                    <div class="switch-info">
                        <div class="info-icon">
                            <span class="material-symbols-outlined">info</span>
                        </div>
                        <div class="info-content">
                            <p><strong>Application Reload Required</strong></p>

                            <div class="realm-switch-details">
                                <div class="realm-change">
                                    <span class="from-realm">Current: <span id="currentRealmName"></span></span>
                                    <span class="switch-arrow material-symbols-outlined">arrow_forward</span>
                                    <span class="to-realm">Switch to: <span id="targetRealmName"></span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button @click="closeRealmSwitchModal" class="btn-cancel">
                        <span class="material-symbols-outlined">close</span>
                        Cancel
                    </button>
                    <button @click="confirmRealmSwitch" class="btn-switch" :disabled="switchingRealm">
                        <span v-if="switchingRealm" class="material-symbols-outlined loading">hourglass_empty</span>
                        <span v-else class="material-symbols-outlined">refresh</span>
                        {{ switchingRealm ? 'Switching...' : 'Switch & Reload' }}
                    </button>
                </div>
        </dialog>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

import { features } from '@shared/config/features';

import AccountCreate from '@shared/components/account/Create.vue';
import ActiveRealm from '@shared/components/account/ActiveRealm.vue';
import CreditBalance from '@shared/components/account/CreditBalance.vue';

import { useAccountStore } from '@shared/stores/account';
import { useRealmStore } from '@shared/stores/realm';
import { useUserStore } from '@shared/stores/user';

const accountStore = useAccountStore();
const realmStore = useRealmStore();
const userStore = useUserStore();

// If VITE_REGISTER_URL is set, this is a gaming system app — link settings to RealmForge-Vue
const realmforgeSettingsUrl = computed(() => {
    const registerUrl = import.meta.env.VITE_REGISTER_URL;
    return registerUrl ? registerUrl.replace('/register', '/account') : null;
});

// Emit events
const emits = defineEmits(['set-room']);

onMounted(async () => {
    emits('set-room', 'hrth');
});

// Realm switch dialog state
const realmSwitchDialog = ref(null);
const targetRealmId = ref(null);
const switchingRealm = ref(false);

const totalPlayers = computed(() => {
    if (!realmStore.arRealms) return 0;
    return realmStore.arRealms.reduce((total, realm) => {
        return total + getRealmPlayerCount(realm.RealmID);
    }, 0);
});

const purchasedItemsCount = computed(() => {
    const access = accountStore.account?.Access;
    if (!access) return 0;

    let count = 0;
    for (const shopItemIds of Object.values(access)) {
        if (Array.isArray(shopItemIds)) {
            count += shopItemIds.length;
        }
    }
    return count;
});

const filteredRealms = computed(() => {
    const realms = realmStore.arRealms || [];
    return [...realms].sort((a, b) => {
        // Deactivated realms go last
        const aDeactivated = a.UserActive === false;
        const bDeactivated = b.UserActive === false;
        if (aDeactivated && !bDeactivated) return 1;
        if (!aDeactivated && bDeactivated) return -1;

        // Then sort alphabetically by name
        const nameA = (a.Name || '').toLowerCase();
        const nameB = (b.Name || '').toLowerCase();
        return nameA.localeCompare(nameB);
    });
});

// Methods
const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return 'Unknown';
    }
};

const getRealmPlayerCount = (realmId) => {
    // This would ideally come from realm data with player counts
    // For now, return a placeholder count
    if (!realmStore.arRealms) return 0;
    const realm = realmStore.arRealms.find(r => r.RealmID === realmId);
    return realm?.Players ? Object.keys(realm.Players).length : 0;
};

// New method to get active player count (only players with Active=true)
const getActiveRealmPlayerCount = (realmId) => {
    if (!realmStore.arRealms) return 0;
    const realm = realmStore.arRealms.find(r => r.RealmID === realmId);
    if (!realm?.Players) return 0;

    // Count only active players
    return Object.values(realm.Players).filter(player => player.Active === true).length;
};

// Check if a realm is at player capacity
const isRealmAtCapacity = (realm) => {
    const activePlayerCount = getActiveRealmPlayerCount(realm.RealmID);
    const maxPlayers = realm.MaxPlayers || 5;
    return activePlayerCount >= maxPlayers;
};

// Get remaining player slots for a realm
const getRemainingSlots = (realm) => {
    const activePlayerCount = getActiveRealmPlayerCount(realm.RealmID);
    const maxPlayers = realm.MaxPlayers || 5;
    return Math.max(0, maxPlayers - activePlayerCount);
};

// Check if user owns a realm
const isRealmOwner = (realm) => {
    return realm.AccountID === accountStore.account?.AccountID;
};

const activateRealm = async (realmId) => {
    // Check if switching to a different realm
    if (realmStore.activeRealmId === realmId) {
        console.log('Already in realm:', realmId);
        return;
    }

    // Store target realm and show dialog
    targetRealmId.value = realmId;

    // Set static realm names to avoid reactive updates
    const currentRealmNameEl = document.getElementById('currentRealmName');
    const targetRealmNameEl = document.getElementById('targetRealmName');

    if (currentRealmNameEl) {
        currentRealmNameEl.textContent = realmStore.activeRealm?.Name || 'No active realm';
    }

    if (targetRealmNameEl) {
        const targetRealm = realmStore.arRealms.find(realm => realm.RealmID === realmId);
        targetRealmNameEl.textContent = targetRealm?.Name || 'Unknown Realm';
    }

    // Show the dialog
    realmSwitchDialog.value?.showModal();
};

// Dialog methods
const closeRealmSwitchModal = () => {
    realmSwitchDialog.value?.close();
    targetRealmId.value = null;
    switchingRealm.value = false;
};

const confirmRealmSwitch = async () => {
    if (!targetRealmId.value || switchingRealm.value) return;

    switchingRealm.value = true;

    try {
        console.log('Switching realm to:', targetRealmId.value, '- Reloading application...');

        // Update the active realm preference via API without updating local store
        // This avoids the UI flicker before reload
        await userStore.setPref('ActiveRealm', targetRealmId.value);

        // Reload the page to ensure clean state
        window.location.reload();

    } catch (error) {
        console.error('Error activating realm:', error);
        alert('Failed to activate realm. Please try again.');
        switchingRealm.value = false;
    }
};


const scrollToRealms = () => {
    const realmsSection = document.querySelector('.realms-section');
    if (realmsSection) {
        realmsSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
};

onMounted(async () => {
    // Component is ready
});
</script>

<style scoped>
.account-dashboard {
  height: 100%;
  overflow-y: auto;
  padding: 2rem;
  background: linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 100%);
  color: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Header Section */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid var(--theme-accent);
  border-radius: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar-placeholder {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--theme-bg-surface);
  font-size: 2rem;
}

.user-info h1 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--theme-accent);
  font-weight: 600;
}

.user-info p {
  margin: 0;
  color: #ccc;
  font-size: 0.9rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.invitations-btn {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  text-decoration: none;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.invitations-btn:hover {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-1px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
}

.settings-btn {
  background: transparent;
  border: 1px solid var(--theme-accent);
  color: var(--theme-accent);
  border-radius: 0.5rem;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}

.settings-btn:hover {
  background: var(--theme-accent);
  color: var(--theme-bg-surface);
  transform: translateY(-1px);
  text-decoration: none;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid #444;
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.stat-card:hover {
  border-color: var(--theme-accent);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--theme-accent) 10%, transparent);
}

.stat-card-link {
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.stat-card-link:hover {
  border-color: var(--theme-accent);
}

.stat-icon {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--theme-bg-surface);
  font-size: 1.5rem;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--theme-accent);
  line-height: 1;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.9rem;
  color: #ccc;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.stat-meta {
  font-size: 0.8rem;
  color: #888;
}

.stat-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #333;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--theme-accent) 0%, #e6b373 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.8rem;
  color: #ccc;
  white-space: nowrap;
}

.status-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 1rem;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.active {
  background: linear-gradient(135deg, #28a745 0%, #20803d 100%);
  color: white;
}

.status-badge.deactivated {
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
  color: #ccc;
}

/* Deactivated realm card styling */
.realm-card.deactivated {
  filter: grayscale(0.7);
  opacity: 0.7;
  border-color: #555;
}

.realm-card.deactivated:hover {
  border-color: #777;
  transform: none;
  box-shadow: none;
}

.realm-card.deactivated .realm-name {
  color: #999;
}

.realm-card.deactivated .realm-icon {
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
}

.action-btn.deactivated {
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
  color: #ccc;
  cursor: not-allowed;
}

/* Account Creation Section */
.account-creation {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid var(--theme-accent);
  border-radius: 1rem;
  padding: 2rem;
}

/* No Active Realm Warning */
.no-active-realm-warning {
  margin: 1rem 0;
}

.warning-card {
  background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
  border: 2px solid #DAA520;
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 4px 15px rgba(218, 165, 32, 0.3);
}

.warning-icon {
  width: 60px;
  height: 60px;
  background: rgba(218, 165, 32, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.warning-icon .material-symbols-outlined {
  font-size: 2rem;
  color: #DAA520;
}

.warning-content {
  flex: 1;
}

.warning-content h3 {
  color: #F5DEB3;
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
}

.warning-content p {
  color: #F5DEB3;
  margin: 0;
  opacity: 0.9;
}

.warning-actions {
  flex-shrink: 0;
}

.warning-actions .btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.warning-actions .btn-primary {
  background: #DAA520;
  color: #8B4513;
}

.warning-actions .btn-primary:hover {
  background: #F5DEB3;
  transform: translateY(-2px);
}

/* Section Headers */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  color: var(--theme-accent);
  font-size: 1.5rem;
  font-weight: 600;
}

.create-realm-btn {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  color: var(--theme-accent);
  border: 1px solid var(--theme-accent);
  border-radius: 0.5rem;
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.create-realm-btn:hover {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  transform: translateY(-1px);
}

/* Active Realm Section */
.active-realm-section {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 2px solid var(--theme-accent);
  border-radius: 1rem;
  padding: 2rem;
}

.active-realm-card {
  background: transparent;
}

/* Realms Grid */
.realms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.realm-card {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid #444;
  border-radius: 1rem;
  padding: 1.5rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.realm-card:hover {
  border-color: var(--theme-accent);
  transform: translateY(-4px);
  box-shadow: 0 8px 25px color-mix(in srgb, var(--theme-accent) 15%, transparent);
}

.realm-card.active {
  border-color: #28a745;
  background: linear-gradient(135deg, #1a2a1a 0%, #2a3a2a 100%);
}

.realm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.realm-badges {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ownership-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 1rem;
}

.ownership-badge.owner {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
}

.ownership-badge.player {
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
  color: #ffffff;
}

.ownership-badge .material-symbols-outlined {
  font-size: 18px;
}

.realm-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--theme-bg-surface);
  font-size: 1.2rem;
}

.realm-card.active .realm-icon {
  background: linear-gradient(135deg, #28a745 0%, #20803d 100%);
  color: white;
}

.realm-status .status-badge {
  font-size: 0.7rem;
}

.realm-content {
  margin-bottom: 1.5rem;
}

.realm-name {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--theme-accent);
  margin: 0 0 0.5rem 0;
}

.realm-card.active .realm-name {
  color: #28a745;
}

.realm-description {
  color: #ccc;
  font-size: 0.9rem;
  line-height: 1.4;
  margin: 0 0 1rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.realm-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #888;
}

.stat-item .material-symbols-outlined {
  font-size: 16px;
  color: var(--theme-accent);
}

.realm-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  font-size: 0.9rem;
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
}

.action-btn.primary:hover {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-1px);
}

.action-btn.active {
  background: linear-gradient(135deg, #28a745 0%, #20803d 100%);
  color: white;
  cursor: not-allowed;
}

.action-btn.secondary {
  background: transparent;
  border: 1px solid #666;
  color: #ccc;
  padding: 0.5rem;
}

.action-btn.secondary:hover {
  border-color: var(--theme-accent);
  color: var(--theme-accent);
}

.secondary-actions {
  display: flex;
  gap: 0.5rem;
}

/* Empty States */
.no-realms-state,
.no-results-state {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 2px dashed #444;
  border-radius: 1rem;
  padding: 3rem 2rem;
}

.empty-state {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.empty-icon {
  font-size: 4rem;
  color: #666;
}

.empty-state h3 {
  color: var(--theme-accent);
  margin: 0;
  font-size: 1.5rem;
}

.empty-state p {
  color: #ccc;
  margin: 0;
  font-size: 1rem;
  max-width: 400px;
  line-height: 1.5;
}

.create-first-realm-btn,
.clear-search-btn {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  border: none;
  border-radius: 0.5rem;
  padding: 1rem 2rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  text-decoration: none;
}

.create-first-realm-btn:hover,
.clear-search-btn:hover {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-2px);
  text-decoration: none;
}

/* Responsive Design */
@media (max-width: 768px) {
  .account-dashboard {
    padding: 1rem;
    gap: 1.5rem;
  }

  .dashboard-header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .realms-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .realm-card {
    padding: 1rem;
  }

  .dashboard-header {
    padding: 1rem;
  }

  .stat-card {
    padding: 1rem;
  }
}

/* Capacity Warning Styles */
.capacity-warning {
  color: #dc3545 !important;
  font-weight: bold;
}

.capacity-warning .material-symbols-outlined {
  color: #dc3545 !important;
}

.stat-item.capacity-warning {
  background: rgba(220, 53, 69, 0.1);
  padding: 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid rgba(220, 53, 69, 0.3);
}

/* Realm Switch Dialog Styles */
.realm-switch-dialog {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid var(--theme-accent);
  border-radius: 1rem;
  padding: 0;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  color: #ffffff;
}

.realm-switch-dialog::backdrop {
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
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

.switch-info {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.info-icon {
  color: var(--theme-accent);
  margin-top: 0.25rem;
}

.info-content {
  flex: 1;
}

.info-content p {
  margin: 0 0 1rem 0;
  color: var(--theme-text-primary);
  line-height: 1.5;
}

.info-content strong {
  color: var(--theme-accent);
}

.realm-switch-details {
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 0.5rem;
  padding: 1rem;
  margin-top: 1rem;
}

.realm-change {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
}

.from-realm, .to-realm {
  color: var(--theme-accent);
  font-weight: 600;
  padding: 0.5rem 0.75rem;
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  border-radius: 0.25rem;
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.switch-arrow {
  color: var(--theme-text-secondary);
  font-size: 1.25rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #444;
}

.btn-cancel,
.btn-switch {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-cancel {
  background: transparent;
  border: 1px solid #666;
  color: #ccc;
}

.btn-cancel:hover {
  border-color: var(--theme-accent);
  color: var(--theme-accent);
}

.btn-switch {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  border: none;
  color: var(--theme-bg-surface);
}

.btn-switch:hover:not(:disabled) {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-1px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
}

.btn-switch:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.loading {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Mobile responsive dialog */
@media (max-width: 768px) {
  .realm-switch-dialog {
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

  .btn-cancel,
  .btn-switch {
    width: 100%;
    justify-content: center;
  }

  .realm-change {
    flex-direction: column;
    text-align: center;
  }

  .switch-arrow {
    transform: rotate(90deg);
  }
}
</style>