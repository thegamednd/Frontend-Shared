<template>
  <div class="sessions-view">
    <!-- Breadcrumb Navigation -->
    <nav class="breadcrumb">
      <router-link to="/account" class="breadcrumb-link">
        <span class="material-symbols-outlined">arrow_back</span>
        Account
      </router-link>
      <span class="breadcrumb-separator">›</span>
      <router-link to="/account/active-realm" class="breadcrumb-link">
        Active Realm
      </router-link>
      <span class="breadcrumb-separator">›</span>
      <span class="breadcrumb-current">Sessions</span>
    </nav>

    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <h1>
          <span class="material-symbols-outlined">event</span>
          Game Sessions
        </h1>
        <p class="subtitle">Schedule and manage your gaming sessions</p>
      </div>
      <button
        v-if="canScheduleSessions"
        @click="openCreateDialog"
        class="btn-primary create-session-btn"
      >
        <span class="material-symbols-outlined">add</span>
        Schedule Session
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="sessionStore.loading" class="loading-state">
      <span class="material-symbols-outlined spinning">progress_activity</span>
      <p>Loading sessions...</p>
    </div>

    <!-- Content -->
    <div v-else class="sessions-content">
      <!-- Upcoming Sessions -->
      <section class="sessions-section">
        <h2 class="section-title">
          <span class="material-symbols-outlined">upcoming</span>
          Upcoming Sessions
        </h2>

        <div v-if="sessionStore.upcomingSessions.length > 0" class="sessions-grid">
          <div
            v-for="session in sessionStore.upcomingSessions"
            :key="session.SessionID"
            class="session-card"
            :class="{ locked: session.Status === 'locked' }"
          >
            <div class="session-header">
              <div class="session-title-row">
                <h3 class="session-title">{{ session.Title }}</h3>
                <span class="status-badge" :class="`status-badge-${session.Status}`">
                  <span v-if="session.Status === 'locked'" class="material-symbols-outlined badge-icon">lock</span>
                  {{ statusLabel(session.Status) }}
                </span>
              </div>
              <div class="session-actions" v-if="session.Status !== 'cancelled' && session.Status !== 'completed'">
                <button
                  v-if="canEditSession(session)"
                  @click="editSession(session)"
                  class="btn-icon"
                  title="Edit session"
                >
                  <span class="material-symbols-outlined">edit</span>
                </button>
                <button
                  v-if="canDeleteSession(session)"
                  @click="confirmDeleteSession(session)"
                  class="btn-icon btn-danger"
                  title="Cancel session"
                >
                  <span class="material-symbols-outlined">cancel</span>
                </button>
              </div>
            </div>

            <p v-if="session.Description" class="session-description">
              {{ session.Description }}
            </p>

            <div class="session-details">
              <div class="detail-item">
                <span class="material-symbols-outlined">schedule</span>
                <span>{{ formatDateTime(session.StartDateTime, session.Duration) }}</span>
              </div>
              <div class="detail-item">
                <span class="material-symbols-outlined">group</span>
                <span>{{ session.RSVPs?.filter(r => r.Status === 'accepted').length || 0 }} accepted</span>
              </div>
            </div>

            <!-- DM/Owner RSVP Management -->
            <div v-if="canEditSession(session) && session.RSVPs && session.RSVPs.length > 0" class="rsvp-management">
              <p class="players-label">Player RSVPs:</p>
              <div class="rsvp-list">
                <div
                  v-for="rsvp in getPlayerRSVPs(session)"
                  :key="rsvp.userId"
                  class="rsvp-row"
                >
                  <span class="rsvp-player-name">{{ rsvp.name }}</span>
                  <div class="rsvp-status-area">
                    <span
                      class="rsvp-badge"
                      :class="{
                        'rsvp-badge-accepted': rsvp.status === 'accepted',
                        'rsvp-badge-declined': rsvp.status === 'declined',
                        'rsvp-badge-pending': rsvp.status === 'pending'
                      }"
                    >
                      <span class="material-symbols-outlined">
                        {{ rsvp.status === 'accepted' ? 'check_circle' : rsvp.status === 'declined' ? 'cancel' : 'schedule' }}
                      </span>
                      {{ rsvp.status === 'accepted' ? 'Accepted' : rsvp.status === 'declined' ? 'Declined' : 'Pending' }}
                    </span>
                    <template v-if="session.Status !== 'cancelled' && session.Status !== 'completed'">
                      <button
                        v-if="rsvp.status !== 'accepted'"
                        @click="handleReviewRSVP(session.SessionID, rsvp.userId, 'accepted')"
                        class="review-btn review-accept"
                        title="Accept"
                        :disabled="reviewingRSVP"
                      >
                        <span class="material-symbols-outlined">check</span>
                      </button>
                      <button
                        v-if="rsvp.status !== 'declined'"
                        @click="handleReviewRSVP(session.SessionID, rsvp.userId, 'declined')"
                        class="review-btn review-decline"
                        title="Decline"
                        :disabled="reviewingRSVP"
                      >
                        <span class="material-symbols-outlined">close</span>
                      </button>
                    </template>
                  </div>
                </div>
              </div>

              <!-- Lock Session Button -->
              <button
                v-if="session.Status === 'scheduled' && getAcceptedCount(session) > 0"
                @click="confirmLockSession(session)"
                class="btn-lock"
                :disabled="lockingSession"
              >
                <span class="material-symbols-outlined">lock</span>
                Lock Roster ({{ getAcceptedCount(session) }} accepted)
              </button>

              <!-- Unlock Session Button -->
              <button
                v-if="session.Status === 'locked'"
                @click="handleUnlockSession(session)"
                class="btn-unlock"
                :disabled="unlockingSession"
              >
                <span v-if="unlockingSession" class="material-symbols-outlined spinning">progress_activity</span>
                <span v-else class="material-symbols-outlined">lock_open</span>
                {{ unlockingSession ? 'Unlocking...' : 'Unlock Roster' }}
              </button>
            </div>

            <!-- Player-only: Simple player list (non-DM view) -->
            <div v-else-if="session.InvitedUserSubs && session.InvitedUserSubs.length > 0 && !canEditSession(session)" class="invited-players">
              <p class="players-label">Invited Players:</p>
              <div class="players-list-inline">
                <div
                  v-for="player in getInvitedPlayersWithStatus(session)"
                  :key="player.userId"
                  class="player-status"
                >
                  <span class="player-name">{{ player.name }}</span>
                  <span
                    class="material-symbols-outlined status-icon"
                    :class="`status-${player.status}`"
                    :title="player.status"
                  >
                    {{ player.status === 'accepted' ? 'check_circle' : player.status === 'declined' ? 'cancel' : 'schedule' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Player RSVP Section -->
            <div v-if="getUserRSVP(session) && !canEditSession(session)" class="rsvp-section">
              <p class="rsvp-label">Your RSVP:</p>

              <!-- Session is locked - no changes allowed -->
              <div v-if="session.Status === 'locked'" class="rsvp-locked-status">
                <span
                  class="rsvp-badge"
                  :class="getUserRSVP(session).Status === 'accepted' ? 'rsvp-badge-accepted' : 'rsvp-badge-declined'"
                >
                  <span class="material-symbols-outlined">
                    {{ getUserRSVP(session).Status === 'accepted' ? 'check_circle' : 'cancel' }}
                  </span>
                  {{ getUserRSVP(session).Status === 'accepted' ? 'Accepted' : 'Declined' }}
                </span>
                <span class="locked-note">Roster is locked</span>
              </div>

              <!-- Session is scheduled - player can accept or decline -->
              <div v-else class="rsvp-player-actions">
                <!-- Pending — show accept/decline buttons -->
                <template v-if="getUserRSVP(session).Status === 'pending'">
                  <button
                    @click="updateRSVP(session.SessionID, 'accepted')"
                    class="btn-rsvp-accept"
                  >
                    <span class="material-symbols-outlined">check_circle</span>
                    Accept
                  </button>
                  <button
                    @click="updateRSVP(session.SessionID, 'declined')"
                    class="btn-rsvp-decline"
                  >
                    <span class="material-symbols-outlined">cancel</span>
                    Decline
                  </button>
                </template>

                <!-- Accepted — with option to change -->
                <template v-else-if="getUserRSVP(session).Status === 'accepted'">
                  <span class="rsvp-badge rsvp-badge-accepted">
                    <span class="material-symbols-outlined">check_circle</span>
                    Accepted
                  </span>
                  <button
                    @click="updateRSVP(session.SessionID, 'declined')"
                    class="btn-change-rsvp"
                  >
                    Change to decline
                  </button>
                </template>

                <!-- Declined — with option to change -->
                <template v-else-if="getUserRSVP(session).Status === 'declined'">
                  <span class="rsvp-badge rsvp-badge-declined">
                    <span class="material-symbols-outlined">cancel</span>
                    Declined
                  </span>
                  <button
                    @click="updateRSVP(session.SessionID, 'accepted')"
                    class="btn-change-rsvp"
                  >
                    Change to accept
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <span class="material-symbols-outlined">event_busy</span>
          <p>No upcoming sessions scheduled</p>
          <button
            v-if="canScheduleSessions"
            @click="openCreateDialog"
            class="btn-secondary"
          >
            Schedule Session
          </button>
        </div>
      </section>

      <!-- Past Sessions -->
      <section v-if="sessionStore.pastSessions.length > 0" class="sessions-section">
        <h2 class="section-title">
          <span class="material-symbols-outlined">history</span>
          Past Sessions
        </h2>

        <div class="sessions-grid">
          <div
            v-for="session in sessionStore.pastSessions.slice(0, 5)"
            :key="session.SessionID"
            class="session-card past"
          >
            <div class="session-header">
              <div class="session-title-row">
                <h3 class="session-title">{{ session.Title }}</h3>
                <span class="status-badge" :class="`status-badge-${session.Status}`">
                  {{ statusLabel(session.Status) }}
                </span>
              </div>
            </div>

            <p v-if="session.Description" class="session-description">
              {{ session.Description }}
            </p>

            <div class="session-details">
              <div class="detail-item">
                <span class="material-symbols-outlined">schedule</span>
                <span>{{ formatDateTime(session.StartDateTime) }}</span>
              </div>
              <div class="detail-item">
                <span class="material-symbols-outlined">group</span>
                <span>{{ session.RSVPs?.filter(r => r.Status === 'accepted').length || 0 }} players attended</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Create/Edit Session Dialog -->
    <dialog ref="createDialog" class="session-dialog">
      <div class="dialog-header">
        <h2>{{ editingSession ? 'Edit Session' : 'Schedule New Session' }}</h2>
        <button @click="closeCreateDialog" class="btn-close" type="button">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <form @submit.prevent="saveSession" class="dialog-form">
        <div class="dialog-body">
        <div class="form-group">
          <label for="session-title">Session Title *</label>
          <input
            id="session-title"
            v-model="sessionForm.title"
            type="text"
            class="form-control"
            placeholder="e.g., Weekly D&D Session"
            required
            maxlength="100"
            autocomplete="off"
          />
        </div>

        <div class="form-group">
          <label for="session-description">Description</label>
          <textarea
            id="session-description"
            v-model="sessionForm.description"
            class="form-control"
            placeholder="What will happen in this session?"
            rows="3"
            maxlength="500"
            autocomplete="off"
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="session-date">Date *</label>
            <input
              id="session-date"
              v-model="sessionForm.date"
              type="date"
              class="form-control"
              required
              :min="minDate"
              autocomplete="off"
            />
          </div>

          <div class="form-group">
            <label for="session-time">Time *</label>
            <input
              id="session-time"
              v-model="sessionForm.time"
              type="time"
              class="form-control"
              required
              autocomplete="off"
            />
          </div>
        </div>

        <div v-if="pastDateError" class="error-message">
          <span class="material-symbols-outlined">error</span>
          Cannot schedule a session in the past
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="session-duration">Duration (hours) *</label>
            <input
              id="session-duration"
              v-model.number="sessionForm.durationHours"
              type="number"
              class="form-control"
              min="1"
              max="12"
              step="0.5"
              required
              autocomplete="off"
            />
          </div>

        </div>

        <!-- Email Invitations Section -->
        <div class="invitations-section">
          <h3 class="section-subtitle">Session Invitations</h3>

          <div class="invitation-options">
            <button
              type="button"
              @click="selectAllPlayers"
              class="btn-select-players"
            >
              <span class="material-symbols-outlined">groups</span>
              All Players
            </button>

            <button
              type="button"
              @click="openPlayerSelector"
              class="btn-select-players"
            >
              <span class="material-symbols-outlined">person_search</span>
              Select Players
            </button>
          </div>

          <div v-if="sessionForm.selectedPlayers.length > 0" class="selected-players">
            <p class="selected-count">
              {{ sessionForm.selectedPlayers.length }} / {{ maxInvitations }} player(s) selected
              <span v-if="isAtInvitationLimit" class="limit-reached">(limit reached)</span>
            </p>
            <div class="player-chips">
              <div
                v-for="player in getSelectedPlayerDetails()"
                :key="player.UserID"
                class="player-chip"
              >
                <span>{{ player.Name }}</span>
                <button
                  type="button"
                  @click="removePlayer(player.UserID)"
                  class="remove-chip"
                >
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>

        <div class="dialog-footer">
          <button type="button" @click="closeCreateDialog" class="btn-secondary">
            Cancel
          </button>
          <button type="submit" class="btn-primary" :disabled="isSaving || pastDateError">
            <span v-if="isSaving" class="material-symbols-outlined spinning">progress_activity</span>
            {{ isSaving ? 'Saving...' : editingSession ? 'Update Session' : 'Create Session' }}
          </button>
        </div>
      </form>
    </dialog>

    <!-- Player Selector Dialog -->
    <dialog ref="playerSelectorDialog" class="player-selector-dialog">
      <div class="dialog-header">
        <h2>Select Players to Invite</h2>
        <button @click="closePlayerSelector" class="btn-close" type="button">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="dialog-body">
        <div v-if="availablePlayers.length > 0" class="players-list">
          <label
            v-for="player in availablePlayers"
            :key="player.UserID"
            class="player-option"
          >
            <input
              type="checkbox"
              :value="player.UserID"
              v-model="tempSelectedPlayers"
              :disabled="isPlayerDisabled(player.UserID)"
            />
            <div class="player-info">
              <span class="player-name">{{ player.Name }}</span>
              <span class="player-role">{{ player.Role }}</span>
            </div>
          </label>
        </div>
        <div v-else class="no-players">
          <span class="material-symbols-outlined">group_off</span>
          <p>No players available to invite</p>
        </div>

        <div class="dialog-footer">
          <button type="button" @click="closePlayerSelector" class="btn-secondary">
            Cancel
          </button>
          <button type="button" @click="confirmPlayerSelection" class="btn-primary">
            Confirm Selection
          </button>
        </div>
      </div>
    </dialog>

    <!-- Delete Confirmation Dialog -->
    <dialog ref="deleteDialog" class="delete-dialog">
      <div class="dialog-header">
        <h2>Cancel Session?</h2>
        <button @click="closeDeleteDialog" class="btn-close" type="button">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="dialog-body">
        <p>Are you sure you want to cancel "{{ sessionToDelete?.Title }}"?</p>
        <p class="warning-text">This action cannot be undone. All players will be notified.</p>

        <div class="dialog-footer">
          <button @click="closeDeleteDialog" class="btn-secondary">
            Keep Session
          </button>
          <button @click="deleteSession" class="btn-danger" :disabled="isDeleting">
            <span v-if="isDeleting" class="material-symbols-outlined spinning">progress_activity</span>
            {{ isDeleting ? 'Canceling...' : 'Cancel Session' }}
          </button>
        </div>
      </div>
    </dialog>

    <!-- Lock Confirmation Dialog -->
    <dialog ref="lockDialog" class="delete-dialog">
      <div class="dialog-header">
        <h2>Lock Session Roster?</h2>
        <button @click="closeLockDialog" class="btn-close" type="button">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="dialog-body">
        <p>Lock the roster for "{{ sessionToLock?.Title }}"?</p>
        <p class="info-text">All {{ getAcceptedCount(sessionToLock) }} accepted players will be notified. No further RSVP changes will be allowed.</p>

        <div class="dialog-footer">
          <button @click="closeLockDialog" class="btn-secondary">
            Cancel
          </button>
          <button @click="handleLockSession" class="btn-primary" :disabled="lockingSession">
            <span v-if="lockingSession" class="material-symbols-outlined spinning">progress_activity</span>
            <span v-else class="material-symbols-outlined">lock</span>
            {{ lockingSession ? 'Locking...' : 'Lock Roster' }}
          </button>
        </div>
      </div>
    </dialog>

    <!-- Too Many Players Warning Dialog -->
    <dialog ref="tooManyPlayersDialog" class="delete-dialog too-many-players-dialog">
      <div class="dialog-header">
        <h2>Too Many Players</h2>
        <button @click="closeTooManyPlayersDialog" class="btn-close" type="button">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="dialog-body">
        <p>
          Your realm has <strong>{{ availablePlayers.length }}</strong> players,
          but only <strong>{{ maxInvitations }}</strong> invitation slots are available for this session.
        </p>
        <p class="info-text">
          Select players individually, or upgrade your realm for more invitation slots.
        </p>

        <div class="dialog-footer">
          <router-link
            to="/account/active-realm"
            class="btn-secondary"
            @click="closeTooManyPlayersDialog"
          >
            <span class="material-symbols-outlined">upgrade</span>
            Upgrade Realm
          </router-link>
          <button @click="switchToSelectPlayers" class="btn-primary" type="button">
            <span class="material-symbols-outlined">person_search</span>
            Select Players
          </button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useSessionStore } from '@shared/stores/session';
import { useRealmStore } from '@shared/stores/realm';
import { useUserStore } from '@shared/stores/user';
import { useNotifications } from '@shared/composables/useNotifications';

const sessionStore = useSessionStore();
const realmStore = useRealmStore();
const userStore = useUserStore();
const { notifySuccess, notifyError } = useNotifications();

// Dialog refs
const createDialog = ref(null);
const playerSelectorDialog = ref(null);
const deleteDialog = ref(null);
const lockDialog = ref(null);
const tooManyPlayersDialog = ref(null);

// Dialog states
const editingSession = ref(null);
const sessionToDelete = ref(null);
const sessionToLock = ref(null);
const isSaving = ref(false);
const isDeleting = ref(false);
const lockingSession = ref(false);
const unlockingSession = ref(false);
const reviewingRSVP = ref(false);

// Form data
const sessionForm = ref({
  title: '',
  description: '',
  date: '',
  time: '19:00',
  durationHours: 4,
  selectedPlayers: [],
});

// Temp state for player selection
const tempSelectedPlayers = ref([]);

// Computed
const canScheduleSessions = computed(() => {
  return userStore.isDM || userStore.isOwner;
});

const minDate = computed(() => {
  const today = new Date();
  return today.toISOString().split('T')[0];
});

const pastDateError = computed(() => {
  if (!sessionForm.value.date || !sessionForm.value.time) {
    return false;
  }

  const selectedDateTime = new Date(`${sessionForm.value.date}T${sessionForm.value.time}`);
  const now = new Date();

  return selectedDateTime < now;
});

const availablePlayers = computed(() => {
  return realmStore.arActivePlayers || [];
});

const maxInvitations = computed(() => {
  return realmStore.activeRealm?.MaxPlayers || 4;
});

const isAtInvitationLimit = computed(() => {
  return sessionForm.value.selectedPlayers.length >= maxInvitations.value;
});

// Methods
const statusLabel = (status) => {
  const labels = {
    scheduled: 'Scheduled',
    locked: 'Locked',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled'
  };
  return labels[status] || status;
};

const canEditSession = (session) => {
  return userStore.isDM || userStore.isOwner || session.CreatedBy === userStore.user?.UserID;
};

const canDeleteSession = (session) => {
  return canEditSession(session);
};

const formatDateTime = (timestamp, duration = null) => {
  const date = typeof timestamp === 'number'
    ? new Date(timestamp * 1000)
    : new Date(timestamp);

  const dateString = date.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (duration) {
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    const durationStr = mins === 0
      ? `${hours} ${hours === 1 ? 'hour' : 'hours'}`
      : `${hours}h ${mins}m`;
    return `${dateString} - ${durationStr}`;
  }

  return dateString;
};

const getUserRSVP = (session) => {
  if (!session.RSVPs || !userStore.user) return null;
  return session.RSVPs.find(rsvp => rsvp.UserID === userStore.user.UserID);
};

const getPlayerRSVPs = (session) => {
  if (!session.RSVPs) return [];
  // Exclude the session creator from the RSVP management list
  return session.RSVPs
    .filter(rsvp => rsvp.UserID !== session.CreatedBy)
    .map(rsvp => {
      const player = availablePlayers.value.find(p => p.UserID === rsvp.UserID);
      return {
        userId: rsvp.UserID,
        name: player?.Name || 'Unknown Player',
        status: rsvp.Status
      };
    });
};

const getAcceptedCount = (session) => {
  if (!session?.RSVPs) return 0;
  return session.RSVPs.filter(r => r.Status === 'accepted').length;
};

const getInvitedPlayersWithStatus = (session) => {
  if (!session.InvitedUserSubs || session.InvitedUserSubs.length === 0) {
    return [];
  }

  return session.InvitedUserSubs.map(userId => {
    const player = availablePlayers.value.find(p => p.UserID === userId);
    const rsvp = session.RSVPs?.find(r => r.UserID === userId);
    const status = rsvp?.Status || 'pending';

    return {
      userId,
      name: player?.Name || 'Unknown Player',
      status
    };
  });
};

const openCreateDialog = () => {
  createDialog.value?.showModal();
};

const closeCreateDialog = () => {
  createDialog.value?.close();
  editingSession.value = null;
  sessionForm.value = {
    title: '',
    description: '',
    date: '',
    time: '19:00',
    durationHours: 4,
    selectedPlayers: [],
  };
};

const editSession = (session) => {
  editingSession.value = session;

  const scheduledDate = new Date(session.StartDateTime * 1000);
  const invitedPlayers = session.InvitedUserSubs || [];

  sessionForm.value = {
    title: session.Title,
    description: session.Description || '',
    date: scheduledDate.toISOString().split('T')[0],
    time: scheduledDate.toTimeString().slice(0, 5),
    durationHours: session.Duration / 60,
    selectedPlayers: invitedPlayers,
  };

  openCreateDialog();
};

const selectAllPlayers = () => {
  if (availablePlayers.value.length > maxInvitations.value) {
    tooManyPlayersDialog.value?.showModal();
    return;
  }
  sessionForm.value.selectedPlayers = availablePlayers.value.map(p => p.UserID);
};

const closeTooManyPlayersDialog = () => {
  tooManyPlayersDialog.value?.close();
};

const switchToSelectPlayers = () => {
  closeTooManyPlayersDialog();
  openPlayerSelector();
};

const openPlayerSelector = () => {
  tempSelectedPlayers.value = [...sessionForm.value.selectedPlayers];
  playerSelectorDialog.value?.showModal();
};

const closePlayerSelector = () => {
  playerSelectorDialog.value?.close();
  tempSelectedPlayers.value = [];
};

const confirmPlayerSelection = () => {
  sessionForm.value.selectedPlayers = [...tempSelectedPlayers.value];
  closePlayerSelector();
};

const removePlayer = (userId) => {
  sessionForm.value.selectedPlayers = sessionForm.value.selectedPlayers.filter(id => id !== userId);
};

const getSelectedPlayerDetails = () => {
  return sessionForm.value.selectedPlayers
    .map(userId => availablePlayers.value.find(p => p.UserID === userId))
    .filter(p => p);
};

const isPlayerDisabled = (playerId) => {
  return tempSelectedPlayers.value.length >= maxInvitations.value &&
         !tempSelectedPlayers.value.includes(playerId);
};

const saveSession = async () => {
  if (pastDateError.value) {
    notifyError('Cannot schedule a session in the past');
    return;
  }

  isSaving.value = true;
  try {
    const scheduledTime = new Date(`${sessionForm.value.date}T${sessionForm.value.time}`).toISOString();

    const sessionData = {
      title: sessionForm.value.title,
      description: sessionForm.value.description,
      scheduledTime: scheduledTime,
      duration: sessionForm.value.durationHours * 60,
      invitedPlayers: sessionForm.value.selectedPlayers,
    };

    if (editingSession.value) {
      await sessionStore.updateSession(editingSession.value.SessionID, sessionData);

      if (sessionForm.value.selectedPlayers.length > 0) {
        await sessionStore.sendInvitations(editingSession.value.SessionID, {
          UserSubs: sessionForm.value.selectedPlayers
        });
        notifySuccess(`Session updated and ${sessionForm.value.selectedPlayers.length} invitation(s) reset to pending`);
      } else {
        notifySuccess('Session updated successfully');
      }
    } else {
      await sessionStore.createSession(sessionData);

      if (sessionForm.value.selectedPlayers.length > 0) {
        notifySuccess(`Session created and ${sessionForm.value.selectedPlayers.length} invitation(s) sent`);
      } else {
        notifySuccess('Session scheduled successfully');
      }
    }

    closeCreateDialog();
  } catch (error) {
    console.error('Error saving session:', error);
    notifyError('Failed to save session. Please try again.');
  } finally {
    isSaving.value = false;
  }
};

const confirmDeleteSession = (session) => {
  sessionToDelete.value = session;
  deleteDialog.value?.showModal();
};

const closeDeleteDialog = () => {
  deleteDialog.value?.close();
  sessionToDelete.value = null;
};

const deleteSession = async () => {
  if (!sessionToDelete.value) return;

  isDeleting.value = true;
  try {
    await sessionStore.deleteSession(sessionToDelete.value.SessionID);
    notifySuccess('Session cancelled successfully');
    closeDeleteDialog();
  } catch (error) {
    console.error('Error deleting session:', error);
    notifyError('Failed to cancel session. Please try again.');
  } finally {
    isDeleting.value = false;
  }
};

const updateRSVP = async (sessionId, status) => {
  try {
    await sessionStore.updateRSVP(sessionId, status);
    if (status === 'pending') {
      notifySuccess('RSVP submitted - awaiting DM review');
    } else {
      notifySuccess('RSVP withdrawn');
    }
  } catch (error) {
    console.error('Error updating RSVP:', error);
    notifyError('Failed to update RSVP. Please try again.');
  }
};

const handleReviewRSVP = async (sessionId, userSub, status) => {
  reviewingRSVP.value = true;
  try {
    await sessionStore.reviewRSVP(sessionId, userSub, status);
    notifySuccess(`RSVP ${status}`);
  } catch (error) {
    console.error('Error reviewing RSVP:', error);
    notifyError('Failed to review RSVP. Please try again.');
  } finally {
    reviewingRSVP.value = false;
  }
};

const confirmLockSession = (session) => {
  sessionToLock.value = session;
  lockDialog.value?.showModal();
};

const closeLockDialog = () => {
  lockDialog.value?.close();
  sessionToLock.value = null;
};

const handleLockSession = async () => {
  if (!sessionToLock.value) return;

  lockingSession.value = true;
  try {
    await sessionStore.lockSession(sessionToLock.value.SessionID);
    notifySuccess('Session roster locked. Players have been notified.');
    closeLockDialog();
  } catch (error) {
    console.error('Error locking session:', error);
    notifyError('Failed to lock session. Please try again.');
  } finally {
    lockingSession.value = false;
  }
};

const handleUnlockSession = async (session) => {
  unlockingSession.value = true;
  try {
    await sessionStore.unlockSession(session.SessionID);
    notifySuccess('Session roster unlocked.');
  } catch (error) {
    console.error('Error unlocking session:', error);
    notifyError('Failed to unlock session. Please try again.');
  } finally {
    unlockingSession.value = false;
  }
};

// Load sessions on mount
onMounted(async () => {
  if (realmStore.activeRealm) {
    try {
      await sessionStore.loadRealmSessions(realmStore.activeRealm.RealmID);
    } catch (error) {
      console.error('Error loading sessions:', error);
      notifyError('Failed to load sessions');
    }
  }
});
</script>

<style scoped>
.sessions-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
  font-size: 0.9rem;
}

.breadcrumb-link {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--theme-accent);
  text-decoration: none;
  transition: opacity 0.2s;
}

.breadcrumb-link:hover {
  opacity: 0.8;
}

.breadcrumb-separator {
  color: #666;
}

.breadcrumb-current {
  color: var(--theme-text-primary);
}

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
}

.header-content h1 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 2rem;
  color: var(--theme-accent);
  margin: 0 0 0.5rem 0;
}

.header-content h1 .material-symbols-outlined {
  font-size: 2rem;
}

.subtitle {
  color: #ccc;
  margin: 0;
}

.create-session-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}

/* Loading State */
.loading-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #ccc;
}

.loading-state .material-symbols-outlined {
  font-size: 3rem;
  color: var(--theme-accent);
  margin-bottom: 1rem;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Sessions Content */
.sessions-content {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.sessions-section {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  padding: 1.5rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.3rem;
  color: var(--theme-accent);
  margin: 0 0 1.5rem 0;
}

/* Sessions Grid */
.sessions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.session-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 1rem;
  transition: all 0.3s ease;
}

.session-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: color-mix(in srgb, var(--theme-accent) 30%, transparent);
  transform: translateY(-2px);
}

.session-card.locked {
  border-color: rgba(212, 175, 55, 0.4);
}

.session-card.past {
  opacity: 0.7;
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
  gap: 0.5rem;
}

.session-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
}

.session-title {
  color: var(--theme-text-primary);
  font-size: 1.1rem;
  margin: 0;
}

.session-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* Status Badges */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.15rem 0.5rem;
  border-radius: 1rem;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.badge-icon {
  font-size: 0.8rem;
}

.status-badge-scheduled {
  background: rgba(255, 165, 0, 0.15);
  color: #ffa500;
  border: 1px solid rgba(255, 165, 0, 0.3);
}

.status-badge-locked {
  background: rgba(212, 175, 55, 0.15);
  color: #d4af37;
  border: 1px solid rgba(212, 175, 55, 0.4);
}

.status-badge-in_progress {
  background: rgba(23, 162, 184, 0.15);
  color: #17a2b8;
  border: 1px solid rgba(23, 162, 184, 0.3);
}

.status-badge-completed {
  background: rgba(40, 167, 69, 0.15);
  color: #28a745;
  border: 1px solid rgba(40, 167, 69, 0.3);
}

.status-badge-cancelled {
  background: rgba(220, 53, 69, 0.15);
  color: #dc3545;
  border: 1px solid rgba(220, 53, 69, 0.3);
}

.session-description {
  color: #ccc;
  margin: 0 0 0.75rem 0;
  font-size: 0.85rem;
  line-height: 1.4;
}

.session-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #ccc;
  font-size: 0.85rem;
}

.detail-item .material-symbols-outlined {
  font-size: 1.2rem;
  color: var(--theme-accent);
}

/* DM RSVP Management */
.rsvp-management {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.players-label {
  color: #ccc;
  font-size: 0.85rem;
  margin: 0 0 0.5rem 0;
  font-weight: 600;
}

.rsvp-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.rsvp-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 0.6rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 0.35rem;
  gap: 0.5rem;
}

.rsvp-player-name {
  color: var(--theme-text-primary);
  font-size: 0.85rem;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rsvp-status-area {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.review-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.review-btn .material-symbols-outlined {
  font-size: 1rem;
}

.review-accept {
  background: rgba(40, 167, 69, 0.2);
  color: #28a745;
  border: 1px solid rgba(40, 167, 69, 0.4);
}

.review-accept:hover:not(:disabled) {
  background: rgba(40, 167, 69, 0.35);
}

.review-decline {
  background: rgba(220, 53, 69, 0.2);
  color: #dc3545;
  border: 1px solid rgba(220, 53, 69, 0.4);
}

.review-decline:hover:not(:disabled) {
  background: rgba(220, 53, 69, 0.35);
}

/* RSVP Badges */
.rsvp-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.5rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.rsvp-badge .material-symbols-outlined {
  font-size: 0.9rem;
}

.rsvp-badge-accepted {
  background: rgba(40, 167, 69, 0.15);
  color: #28a745;
}

.rsvp-badge-declined {
  background: rgba(220, 53, 69, 0.15);
  color: #dc3545;
}

.rsvp-badge-pending {
  background: rgba(255, 165, 0, 0.15);
  color: #ffa500;
}

/* Lock Button */
.btn-lock {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  justify-content: center;
  margin-top: 0.75rem;
  padding: 0.6rem 1rem;
  background: rgba(212, 175, 55, 0.12);
  color: #d4af37;
  border: 1px solid rgba(212, 175, 55, 0.35);
  border-radius: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-lock:hover:not(:disabled) {
  background: rgba(212, 175, 55, 0.22);
  border-color: #d4af37;
}

.btn-lock .material-symbols-outlined {
  font-size: 1.1rem;
}

/* Unlock Button */
.btn-unlock {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  justify-content: center;
  margin-top: 0.75rem;
  padding: 0.6rem 1rem;
  background: rgba(23, 162, 184, 0.12);
  color: #17a2b8;
  border: 1px solid rgba(23, 162, 184, 0.35);
  border-radius: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-unlock:hover:not(:disabled) {
  background: rgba(23, 162, 184, 0.22);
  border-color: #17a2b8;
}

.btn-unlock .material-symbols-outlined {
  font-size: 1.1rem;
}

/* Invited Players (player-only view) */
.invited-players {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.players-list-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.player-status {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.85rem;
}

.player-name {
  color: var(--theme-text-primary);
}

.status-icon {
  font-size: 1.1rem;
}

.status-icon.status-accepted {
  color: #28a745;
}

.status-icon.status-declined {
  color: #dc3545;
}

.status-icon.status-pending {
  color: #ffa500;
}

/* Player RSVP Section */
.rsvp-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.rsvp-label {
  color: #ccc;
  font-size: 0.85rem;
  margin: 0 0 0.75rem 0;
  font-weight: 600;
}

.rsvp-locked-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.locked-note {
  color: #888;
  font-size: 0.8rem;
  font-style: italic;
}

.rsvp-player-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn-rsvp-accept,
.btn-rsvp-decline {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border: 1px solid;
  border-radius: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-rsvp-accept {
  background: rgba(76, 175, 80, 0.12);
  color: #4caf50;
  border-color: rgba(76, 175, 80, 0.35);
}

.btn-rsvp-accept:hover {
  background: rgba(76, 175, 80, 0.25);
  border-color: #4caf50;
}

.btn-rsvp-decline {
  background: rgba(244, 67, 54, 0.12);
  color: #f44336;
  border-color: rgba(244, 67, 54, 0.35);
}

.btn-rsvp-decline:hover {
  background: rgba(244, 67, 54, 0.25);
  border-color: #f44336;
}

.btn-rsvp-accept .material-symbols-outlined,
.btn-rsvp-decline .material-symbols-outlined {
  font-size: 1.1rem;
}

.btn-change-rsvp {
  background: none;
  border: none;
  color: #888;
  font-size: 0.8rem;
  cursor: pointer;
  text-decoration: underline;
  transition: color 0.2s;
  padding: 0.25rem;
}

.btn-change-rsvp:hover {
  color: #b8b8b8;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: #666;
}

.empty-state .material-symbols-outlined {
  font-size: 4rem;
  margin-bottom: 1rem;
  color: #444;
}

.empty-state p {
  margin: 0 0 1.5rem 0;
  font-size: 1.1rem;
}

/* Buttons */
.btn-primary,
.btn-secondary,
.btn-danger {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
}

.btn-primary {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-1px);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: var(--theme-text-primary);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
}

.btn-danger {
  background: rgba(220, 53, 69, 0.2);
  color: #dc3545;
  border: 1px solid #dc3545;
}

.btn-danger:hover:not(:disabled) {
  background: rgba(220, 53, 69, 0.3);
}

.btn-icon {
  background: none;
  border: none;
  color: #ccc;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--theme-accent);
}

.btn-icon.btn-danger:hover {
  color: #dc3545;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Dialog Elements */
dialog {
  background: #1a2332;
  border: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-radius: 0.75rem;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  padding: 0;
  color: var(--theme-text-primary);
  overflow: hidden;
}

dialog[open] {
  display: flex;
  flex-direction: column;
}

dialog::backdrop {
  background: var(--theme-bg-overlay);
  backdrop-filter: blur(4px);
}

.player-selector-dialog,
.delete-dialog {
  max-width: 500px;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
  background: #1a2332;
  position: sticky;
  top: 0;
  z-index: 10;
}

.dialog-header h2 {
  color: var(--theme-accent);
  margin: 0;
  font-size: 1.5rem;
}

.btn-close {
  background: none;
  border: none;
  color: #ccc;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--theme-text-primary);
}

.dialog-form {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.dialog-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.session-dialog .dialog-body {
  max-height: calc(90vh - 160px);
}

.dialog-footer {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding: 1.5rem;
  flex-shrink: 0;
  background: #1a2332;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

/* Form */
.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  color: var(--theme-text-primary);
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.form-control {
  width: 100%;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  color: var(--theme-text-primary);
  font-size: 1rem;
  font-family: inherit;
  transition: all 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: var(--theme-accent);
  background: rgba(255, 255, 255, 0.08);
}

.form-control::placeholder {
  color: #666;
}

textarea.form-control {
  resize: vertical;
  min-height: 80px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #dc3545;
  background: rgba(220, 53, 69, 0.1);
  padding: 0.75rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.error-message .material-symbols-outlined {
  font-size: 1.2rem;
}

.info-text {
  color: #c8a870;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.warning-text {
  color: #dc3545;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

/* Invitations Section */
.invitations-section {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.section-subtitle {
  color: var(--theme-accent);
  font-size: 1.1rem;
  margin: 0 0 1rem 0;
}

.invitation-options {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.btn-select-players {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  color: var(--theme-accent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-select-players:hover {
  background: color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-color: var(--theme-accent);
}

.selected-players {
  margin-top: 1rem;
}

.selected-count {
  color: #ccc;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.limit-reached {
  color: #ffc107;
  font-weight: 600;
}

.player-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.player-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 1rem;
  padding: 0.25rem 0.75rem;
  color: var(--theme-accent);
  font-size: 0.85rem;
}

.remove-chip {
  background: none;
  border: none;
  color: var(--theme-accent);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  transition: color 0.2s;
}

.remove-chip:hover {
  color: #dc3545;
}

.remove-chip .material-symbols-outlined {
  font-size: 1rem;
}

/* Player Selector */
.players-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 400px;
  overflow-y: auto;
}

.player-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.player-option:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.05);
  border-color: color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.player-option:has(input:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}

.player-option input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.player-option input[type="checkbox"]:disabled {
  cursor: not-allowed;
}

.player-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.player-name {
  color: var(--theme-text-primary);
  font-weight: 600;
}

.player-role {
  color: #ccc;
  font-size: 0.85rem;
}

.no-players {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.no-players .material-symbols-outlined {
  font-size: 3rem;
  margin-bottom: 0.5rem;
  color: #444;
}

/* Responsive */
@media (max-width: 768px) {
  .sessions-view {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    gap: 1rem;
  }

  .create-session-btn {
    width: 100%;
    justify-content: center;
  }

  .sessions-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .invitation-options {
    flex-direction: column;
    align-items: flex-start;
  }

  dialog {
    max-width: 95vw;
  }

  .rsvp-row {
    flex-wrap: wrap;
  }
}
</style>
