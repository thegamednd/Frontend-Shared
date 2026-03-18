<template>
  <section class="active-realm-overview">
    <div v-if="realmStore.activeRealm" class="realm-summary">
      <!-- Realm Header -->
      <div class="realm-header">
        <div class="realm-info">
          <h3 class="realm-name">{{ realmStore.activeRealm.Name }}</h3>
          <div class="realm-description" v-html="realmStore.activeRealm.Description"></div>
        </div>
        <div v-if="hasManagementPermissions" class="realm-tier">
          <span class="tier-value" :class="`tier-${realmTier.toLowerCase()}`">{{ realmTierName }}</span>
          <span v-if="hasPatreonBenefit" class="patreon-badge" title="Patreon Subscription">&#x1F17F;&#xFE0F;</span>
        </div>
      </div>

      <!-- Realm Stats (only visible to DM/Owner) -->
      <div v-if="hasManagementPermissions" class="realm-stats">
        <div class="stat-item">
          <span class="material-symbols-outlined">calendar_today</span>
          <div class="stat-content">
            <span class="stat-label">Realm Date</span>
            <span class="stat-value">{{ formatRealmDate() }}</span>
          </div>
        </div>
        <div class="stat-item">
          <span class="material-symbols-outlined">group</span>
          <div class="stat-content">
            <span class="stat-label">Active Players</span>
            <span class="stat-value" :class="{ 'at-capacity': realmStore.isRealmAtCapacity }">
              {{ realmStore.activePlayersCount }}/{{ realmStore.maxPlayersLimit }} players
            </span>
          </div>
        </div>
      </div>

      <!-- Action Button or Player List -->
      <div v-if="hasManagementPermissions" class="realm-actions">
        <router-link to="/account/active-realm" class="manage-realm-btn">
          <span class="material-symbols-outlined">settings</span>
          Manage Realm & Players
        </router-link>
      </div>
      
      <!-- Player List for non-DM/non-owner users -->
      <div v-else class="player-list-view">
        <!-- Upcoming Sessions -->
        <div v-if="upcomingSessionInvitations.length > 0" class="upcoming-sessions-section">
          <div class="sessions-header">
            <h4>
              <span class="material-symbols-outlined">event</span>
              Upcoming Sessions
            </h4>
          </div>

          <div class="sessions-list">
            <div v-for="invitation in upcomingSessionInvitations"
                 :key="invitation.SessionID"
                 class="session-row"
            >
              <div class="session-info">
                <div class="session-title">{{ invitation.Session.Title }}</div>
                <div class="session-datetime">{{ formatSessionDateTime(invitation.Session.StartDateTime) }}</div>
              </div>

              <div v-if="invitation.Status === 'pending'" class="session-actions">
                <button
                  @click="acceptSession(invitation.SessionID)"
                  :disabled="updatingRSVP"
                  class="rsvp-btn accept"
                  title="Accept"
                >
                  <span class="material-symbols-outlined">check_circle</span>
                </button>
                <button
                  @click="declineSession(invitation.SessionID)"
                  :disabled="updatingRSVP"
                  class="rsvp-btn decline"
                  title="Decline"
                >
                  <span class="material-symbols-outlined">cancel</span>
                </button>
              </div>

              <div v-else-if="invitation.Status === 'accepted'" class="session-actions">
                <span class="session-status accepted">
                  <span class="material-symbols-outlined">check_circle</span>
                  Accepted
                </span>
                <button
                  @click="declineSession(invitation.SessionID)"
                  :disabled="updatingRSVP"
                  class="rsvp-btn-sm decline"
                  title="Change to decline"
                >
                  <span class="material-symbols-outlined">cancel</span>
                </button>
              </div>

              <div v-else-if="invitation.Status === 'declined'" class="session-actions">
                <span class="session-status declined">
                  <span class="material-symbols-outlined">cancel</span>
                  Declined
                </span>
                <button
                  @click="acceptSession(invitation.SessionID)"
                  :disabled="updatingRSVP"
                  class="rsvp-btn-sm accept"
                  title="Change to accept"
                >
                  <span class="material-symbols-outlined">check_circle</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="player-list-header">
          <h4>
            <span class="material-symbols-outlined">group</span>
            Active Players
          </h4>
        </div>
        
        <div v-if="sortedActivePlayers.length > 0" class="players-grid">
          <div v-for="player in sortedActivePlayers"
               :key="player.UserID" 
               class="player-card"
               :class="{ 'is-dm': player.Role === 'DM' }"
          >
            <div class="player-avatar">
              <span class="role-icon" :class="`role-${player.Role?.toLowerCase()}`">
                <span v-if="player.Role === 'DM'" class="material-symbols-outlined" title="Dungeon Master">shield_person</span>
                <span v-else class="material-symbols-outlined" title="Player">person</span>
              </span>
              <div class="status-indicator" :class="player.Active ? 'online' : 'offline'"></div>
            </div>
            <div class="player-info">
              <div class="player-name">{{ getPlayerDisplayName(player) }}</div>
              <div v-if="player.Role === 'DM'" class="dm-badge">DM</div>
              <div v-else class="character-name">
                {{ getActiveCharacterName(player.ActiveCharacter) || 'No character' }}
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="no-players">
          <span class="material-symbols-outlined">group_off</span>
          <p>No active players</p>
        </div>
      </div>
    </div>

    <!-- No Active Realm State -->
    <div v-else class="no-realm">
      <div class="no-realm-icon">
        <span class="material-symbols-outlined">public_off</span>
      </div>
      <h3>No Active Realm</h3>
      <p>Select a realm from your realm list below to activate it and begin your adventure.</p>
    </div>

  </section>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { useRealmStore } from '@shared/stores/realm';
import { useDateStore } from '@shared/stores/date';
import { useUserStore } from '@shared/stores/user';
import { useCharacterStore } from '@shared/stores/character';
import { useSessionStore } from '@shared/stores/session';
import { useSubscriptionStore } from '@shared/stores/subscription';

const realmStore = useRealmStore();
const dateStore = useDateStore();
const userStore = useUserStore();
const characterStore = useCharacterStore();
const sessionStore = useSessionStore();
const subscriptionStore = useSubscriptionStore();

// Format the actual realm date using the date store
const formatRealmDate = () => {
  // Use the date store's formatted date string
  return dateStore.strDate;
};

// Get the realm's subscription tier, defaulting to 'Free' if not set
const realmTier = computed(() => {
  const tier = realmStore.activeRealm?.SubscriptionPlan;
  if (!tier || tier === 'free') {
    return 'Free';
  }
  // Capitalize first letter of tier name
  return tier.charAt(0).toUpperCase() + tier.slice(1);
});

// Get the subscription name for display (uses Name field from subscription store)
const realmTierName = computed(() => {
  const tier = realmStore.activeRealm?.SubscriptionPlan;
  if (!tier || tier === 'free') {
    return 'Free';
  }
  const subscription = subscriptionStore.getSubscriptionByTier(tier);
  return subscription?.Name || tier;
});

// Check if realm has Patreon benefit
const hasPatreonBenefit = computed(() => {
  return realmStore.activeRealm?.HasPatreonBenefit === true;
});

// Check if user has management permissions (DM or Owner)
const hasManagementPermissions = computed(() => {
  return userStore.isDM || userStore.isOwner;
});

// Helper function to get formatted player name
const getPlayerDisplayName = (player) => {
  if (player.NameFirst && player.NameLast) {
    return `${player.NameFirst} ${player.NameLast}`;
  }
  if (player.NameFirst) {
    return player.NameFirst;
  }
  return player.Name || 'Unknown';
};

// Get active character name by ID
const getActiveCharacterName = (characterId) => {
  if (!characterId || !characterStore.characterList) return null;
  
  const character = characterStore.characterList.find(char => char.ID === characterId);
  return character?.Name || null;
};

// Computed property to sort players with DM first (for display to non-DM/non-owner users)
const sortedActivePlayers = computed(() => {
  if (!realmStore.arActivePlayers || realmStore.arActivePlayers.length === 0) {
    return [];
  }

  return [...realmStore.arActivePlayers].sort((a, b) => {
    // DM comes first
    if (a.Role === 'DM' && b.Role !== 'DM') return -1;
    if (b.Role === 'DM' && a.Role !== 'DM') return 1;

    // If both are DM or both are not DM, sort alphabetically by display name
    const aName = getPlayerDisplayName(a);
    const bName = getPlayerDisplayName(b);
    return aName.localeCompare(bName);
  });
});

// Session invitations (for non-DM/non-owner users)
const updatingRSVP = ref(false);

// Get next 3 upcoming session invitations
// Note: API already filters by active realm and future sessions
const upcomingSessionInvitations = computed(() => {
  return sessionStore.myInvitations
    .filter(invitation => {
      if (invitation.Status === 'declined') return false;
      if (!invitation.Session) return false;
      if (invitation.Session.Status === 'cancelled') return false;
      return true;
    })
    .sort((a, b) => a.Session.StartDateTime - b.Session.StartDateTime)
    .slice(0, 3);
});

// Format session date/time
const formatSessionDateTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Accept session invitation
const acceptSession = async (sessionId) => {
  if (updatingRSVP.value) return;
  updatingRSVP.value = true;
  try {
    await sessionStore.updateRSVP(sessionId, 'accepted');
    await sessionStore.loadMyInvitations();
  } catch (error) {
    console.error('Error accepting session:', error);
  } finally {
    updatingRSVP.value = false;
  }
};

// Decline session invitation
const declineSession = async (sessionId) => {
  if (updatingRSVP.value) return;
  updatingRSVP.value = true;
  try {
    await sessionStore.updateRSVP(sessionId, 'declined');
    await sessionStore.loadMyInvitations();
  } catch (error) {
    console.error('Error declining session:', error);
  } finally {
    updatingRSVP.value = false;
  }
};

// Load session invitations on mount
onMounted(async () => {
  // Load session invitations for non-DM/non-owner users
  if (!hasManagementPermissions.value && realmStore.activeRealm) {
    await sessionStore.loadMyInvitations();
  }
});
</script>

<style scoped>
.active-realm-overview {
  background: transparent;
}

.realm-summary {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Realm Header */
.realm-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: color-mix(in srgb, var(--theme-accent) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-radius: 0.75rem;
  position: relative;
}


.realm-info {
  flex: 1;
}

/* Tier Badge */
.realm-tier {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
}

.patreon-badge {
  font-size: 1.2em;
}

.tier-label {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.tier-value {
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tier-value.tier-free {
  color: var(--theme-text-primary);
}

.tier-value.tier-premium {
  color: var(--theme-accent);
  text-shadow: 0 0 10px color-mix(in srgb, var(--theme-accent) 50%, transparent);
}

.tier-value.tier-pro {
  color: #9b59b6;
  text-shadow: 0 0 10px rgba(155, 89, 182, 0.5);
}

.tier-value.tier-enterprise {
  color: #3498db;
  text-shadow: 0 0 10px rgba(52, 152, 219, 0.5);
}

.realm-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--theme-accent);
  margin: 0 0 0.5rem 0;
  font-family: var(--default-font);
}

.realm-description {
  color: var(--theme-text-primary);
  font-size: 1rem;
  line-height: 1.5;
  margin: 0;
  opacity: 0.9;
}


/* Realm Stats */
.realm-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  transition: all 0.3s ease;
}

.stat-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: color-mix(in srgb, var(--theme-accent) 20%, transparent);
}

.stat-item .material-symbols-outlined {
  font-size: 1.5rem;
  color: var(--theme-accent);
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  padding: 0.5rem;
  border-radius: 0.5rem;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.8rem;
  color: #ccc;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.stat-value {
  font-size: 1rem;
  color: var(--theme-text-primary);
  font-weight: 600;
}

.stat-value.at-capacity {
  color: #dc3545;
}

/* Action Button */
.realm-actions {
  display: flex;
  justify-content: center;
  padding-top: 0.5rem;
}

/* Player List View for non-DM/non-owner users */
.player-list-view {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  padding: 1rem;
  margin-top: 1rem;
}

/* Upcoming Sessions Section */
.upcoming-sessions-section {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.sessions-header h4 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1rem 0;
  color: var(--theme-accent);
  font-size: 1rem;
  font-weight: 600;
}

.sessions-header .material-symbols-outlined {
  font-size: 1.2rem;
}

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.session-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  transition: all 0.3s ease;
}

.session-row:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: color-mix(in srgb, var(--theme-accent) 20%, transparent);
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-title {
  font-weight: 600;
  color: var(--theme-text-primary);
  font-size: 0.95rem;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-datetime {
  color: #b8b8b8;
  font-size: 0.85rem;
}

.session-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.rsvp-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.rsvp-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.rsvp-btn .material-symbols-outlined {
  font-size: 1.2rem;
}

.rsvp-btn.accept {
  background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
  color: white;
}

.rsvp-btn.accept:hover:not(:disabled) {
  background: linear-gradient(135deg, #66bb6a 0%, #4caf50 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.4);
}

.rsvp-btn.decline {
  background: linear-gradient(135deg, #f44336 0%, #e57373 100%);
  color: white;
}

.rsvp-btn.decline:hover:not(:disabled) {
  background: linear-gradient(135deg, #e57373 0%, #f44336 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(244, 67, 54, 0.4);
}

.session-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #b8b8b8;
  flex-shrink: 0;
}

.session-status.accepted {
  color: #4caf50;
}

.session-status.declined {
  color: #f44336;
}

.session-status.pending {
  color: #ff9800;
}

.session-status .material-symbols-outlined {
  font-size: 1rem;
}

.rsvp-btn-sm {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  opacity: 0.5;
  transition: opacity 0.2s;
  background: transparent;
}

.rsvp-btn-sm:hover:not(:disabled) {
  opacity: 1;
}

.rsvp-btn-sm.decline .material-symbols-outlined {
  color: #f44336;
  font-size: 1rem;
}

.rsvp-btn-sm.accept .material-symbols-outlined {
  color: #4caf50;
  font-size: 1rem;
}

.player-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
}

.player-list-header h4 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  color: var(--theme-accent);
  font-size: 1rem;
  font-weight: 600;
}

.player-count {
  color: var(--theme-text-primary);
  font-size: 0.9rem;
  opacity: 0.8;
}

.players-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  max-height: 300px;
  overflow-y: auto;
}

.player-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  transition: all 0.3s ease;
}

.player-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: color-mix(in srgb, var(--theme-accent) 20%, transparent);
}

.player-card.is-dm {
  background: linear-gradient(135deg, rgba(220, 53, 69, 0.05) 0%, rgba(220, 53, 69, 0.02) 100%);
  border-left: 2px solid #dc3545;
}

.player-avatar {
  position: relative;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.role-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.role-icon.role-dm {
  background: rgba(220, 53, 69, 0.2);
  color: #dc3545;
}

.role-icon.role-player {
  background: color-mix(in srgb, var(--theme-success) 20%, transparent);
  color: var(--theme-success);
}

.status-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid var(--theme-bg-surface);
}

.status-indicator.online {
  background: #28a745;
}

.status-indicator.offline {
  background: #6c757d;
}

.player-info {
  flex: 1;
  min-width: 0;
}

.player-name {
  font-weight: 600;
  color: var(--theme-text-primary);
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dm-badge {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  color: white;
  font-size: 0.6rem;
  font-weight: bold;
  padding: 0.15rem 0.4rem;
  border-radius: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  width: fit-content;
}

.character-name {
  color: #ccc;
  font-style: italic;
  font-size: 0.8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-players {
  text-align: center;
  padding: 2rem 1rem;
  color: #6c757d;
}

.no-players .material-symbols-outlined {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: #444;
}

.no-players p {
  margin: 0;
  font-style: italic;
}

/* Gaming System Card */
.gaming-system-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  overflow: hidden;
  transition: all 0.3s ease;
}

.gaming-system-card:hover {
  border-color: color-mix(in srgb, var(--theme-accent) 20%, transparent);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.card-header h4 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  color: var(--theme-accent);
  font-size: 1.1rem;
  font-weight: 600;
}

.card-header .material-symbols-outlined {
  font-size: 1.3rem;
}

.manage-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  text-decoration: none;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.manage-btn:hover {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--theme-accent) 30%, transparent);
  text-decoration: none;
}

.manage-btn .material-symbols-outlined {
  font-size: 1.1rem;
}

.card-content {
  padding: 1.5rem;
}

.gaming-system-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--theme-accent);
  margin-bottom: 0.75rem;
}

.gaming-system-description {
  color: var(--theme-text-primary);
  line-height: 1.6;
  font-size: 0.95rem;
}

.gaming-system-description :deep(h1),
.gaming-system-description :deep(h2),
.gaming-system-description :deep(h3),
.gaming-system-description :deep(h4) {
  color: var(--theme-accent);
  margin-top: 1em;
  margin-bottom: 0.5em;
}

.gaming-system-description :deep(p) {
  margin-bottom: 0.75em;
}

.gaming-system-description :deep(ul),
.gaming-system-description :deep(ol) {
  margin-left: 1.5em;
  margin-bottom: 0.75em;
}

.gaming-system-description :deep(strong) {
  color: #fff;
  font-weight: 600;
}

.manage-realm-btn {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  text-decoration: none;
  border: none;
  border-radius: 0.75rem;
  padding: 1rem 2rem;
  font-weight: 700;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.manage-realm-btn:hover {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--theme-accent) 40%, transparent);
  text-decoration: none;
}

.manage-realm-btn .material-symbols-outlined {
  font-size: 1.2rem;
}

/* No Realm State */
.no-realm {
  text-align: center;
  padding: 3rem 2rem;
  background: rgba(255, 255, 255, 0.02);
  border: 2px dashed rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
}

.no-realm-icon {
  font-size: 4rem;
  color: #666;
  margin-bottom: 1rem;
}

.no-realm h3 {
  color: var(--theme-accent);
  font-size: 1.5rem;
  margin: 0 0 1rem 0;
  font-weight: 600;
}

.no-realm p {
  color: #ccc;
  font-size: 1rem;
  line-height: 1.5;
  margin: 0;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

/* Responsive Design */
@media (max-width: 768px) {
  .realm-header {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }
  
  .realm-tier {
    position: static;
    margin-top: 0.5rem;
  }
  
  .realm-stats {
    grid-template-columns: 1fr;
  }
  
  .stat-item {
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }
  
  .manage-realm-btn {
    width: 100%;
    justify-content: center;
  }
  
  .realm-tier {
    position: static;
    margin-top: 0.5rem;
  }
  
  .players-grid {
    grid-template-columns: 1fr;
  }
  
  .player-card {
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
  }
  
  .player-info {
    text-align: center;
  }
}
</style>