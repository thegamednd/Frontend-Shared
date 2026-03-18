<template>
  <div class="active-realm-details">
    <!-- Breadcrumb Navigation -->
    <nav class="breadcrumb">
      <router-link to="/account" class="breadcrumb-link">
        <span class="material-symbols-outlined">arrow_back</span>
        Account
      </router-link>
      <span class="breadcrumb-separator">›</span>
      <span class="breadcrumb-current">Active Realm</span>
    </nav>

    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="realm-info">
          <h1 class="realm-name">{{ realmStore.activeRealm?.Name || 'Active Realm' }}</h1>
          
          <!-- Editable Description for Realm Owners and DMs -->
          <div v-if="realmStore.isOwner || realmStore.isRealmDM" class="realm-description-container">
            <!-- Display Mode -->
            <div v-if="!isEditingDescription" class="description-display" @click="startEditingDescription">
              <button type="button" class="edit-hint">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <p class="realm-description" v-html="realmStore.activeRealm?.Description || 'Click to add a realm description'"></p>
            </div>
            
            <!-- Edit Mode -->
            <div v-else class="description-edit">
              <textarea 
                v-model="editingDescriptionValue"
                ref="descriptionTextarea"
                class="description-textarea"
                placeholder="Enter a description for your realm..."
                rows="5"
                maxlength="500"
                @keydown.escape="cancelEditingDescription"
                @keydown.ctrl.enter="saveDescription"
              ></textarea>
              <div class="edit-actions">
                <div class="char-count">{{ editingDescriptionValue?.length || 0 }}/500</div>
                <button @click="cancelEditingDescription" class="btn-cancel">Cancel</button>
                <button 
                  @click="saveDescription" 
                  :disabled="isSavingDescription"
                  class="btn-save"
                >
                  <span v-if="isSavingDescription" class="material-symbols-outlined loading">hourglass_empty</span>
                  {{ isSavingDescription ? 'Saving...' : 'Save' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Read-only Description for Non-owners -->
          <p v-else class="realm-description" v-html="realmStore.activeRealm?.Description || 'Manage your realm and players'"></p>

          <div class="subscription-info">
            <div class="realm-tier">
              <span class="tier-value" :class="`tier-${realmTier.toLowerCase()}`">{{ realmTierName }}</span>
              <span v-if="hasPatreonBenefit" class="patreon-badge" title="Patreon Subscription">&#x1F17F;&#xFE0F;</span>
            </div>
            <div class="action-buttons">
              <button @click="openSubscriptionDialog" class="manage-subscription-btn">
                Manage Subscription
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sessions Section -->
    <div class="sessions-section">
      <div class="section-header">
        <h2>
          <span class="material-symbols-outlined">event</span>
          Upcoming Sessions
        </h2>
        <router-link
          to="/account/active-realm/sessions"
          class="view-all-sessions-link"
        >
          Manage sessions
          <span class="material-symbols-outlined">arrow_forward</span>
        </router-link>
      </div>

      <div v-if="upcomingSessionsList.length > 0" class="sessions-list">
        <div
          v-for="session in upcomingSessionsList"
          :key="session.SessionID"
          class="session-card"
        >
          <div class="session-header">
            <h3 class="session-title">{{ session.Title }}</h3>
            <span class="session-status" :class="`status-${session.Status}`">
              {{ session.Status }}
            </span>
          </div>
          <div class="session-details">
            <div class="session-datetime">
              <span class="material-symbols-outlined">schedule</span>
              {{ formatSessionDateTime(session.StartDateTime) }}
            </div>
            <div v-if="session.Duration" class="session-duration">
              <span class="material-symbols-outlined">timer</span>
              {{ session.Duration }} min
            </div>
          </div>
          <p v-if="session.Description" class="session-description">
            {{ session.Description }}
          </p>
        </div>
      </div>

      <div v-else class="no-sessions">
        <span class="material-symbols-outlined">event_busy</span>
        <p>No upcoming sessions scheduled</p>
      </div>
    </div>

    <!-- Player Management Section -->
    <div class="player-management">
      <div class="section-header">
        <h2>
          <span class="material-symbols-outlined">group</span>
          Player Management
        </h2>
        <div class="section-actions" v-if="userStore.isOwner">
          <button 
            @click="showInviteModal = true"
            class="invite-btn"
            title="Invite players to your realm"
          >
            <span class="material-symbols-outlined">person_add</span>
            Invite Players
          </button>
        </div>
      </div>

      <!-- Player List Widget -->
      <div class="player-list-widget">
        <div class="widget-header">
          <h3>Active Players</h3>
          <div class="player-count-info">
            {{ realmStore.activePlayersCount }} players online
            <span v-if="realmStore.remainingPlayerSlots > 0" class="slots-remaining">
              • {{ realmStore.remainingPlayerSlots }} slots available
            </span>
            <span v-else class="at-capacity">
              • At capacity
            </span>
          </div>
        </div>
        
        <div v-if="sortedActivePlayers.length > 0" class="players-list">
          <!-- Header Row -->
          <div class="players-header-row">
            <div class="header-player">Player</div>
            <div class="header-character">Active Character</div>
            <div class="header-status">Status</div>
            <div class="header-actions">Actions</div>
          </div>
          
          <!-- Player Rows -->
          <div v-for="player in sortedActivePlayers"
            :key="player.UserID" 
            class="player-item"
            :class="{ 'is-dm': player.Role === 'DM' }"
          >
            
            <!-- Column 1: Player Name with Role Icon -->
            <div class="player-info">
              <div class="player-avatar">
                <span class="role-icon" :class="`role-${player.Role?.toLowerCase()}`">
                  <span v-if="player.Role === 'DM'" class="material-symbols-outlined" title="Dungeon Master">shield_person</span>
                  <span v-else class="material-symbols-outlined" title="Player">person</span>
                </span>
                <div class="status-indicator" :class="player.Active ? 'online' : 'offline'"></div>
              </div>
              <div class="player-details">
                <span class="player-name">{{ getPlayerDisplayName(player) }}</span>
                <span v-if="player.Role === 'DM'" class="dm-badge">Dungeon Master</span>
              </div>
            </div>
            
            <!-- Column 2: Active Character -->
            <div class="player-character">
              <!-- Show N/A for DMs -->
              <span v-if="player.Role === 'DM'" class="character-name dm-na">N/A</span>
              
              <!-- Show dropdown if user has write access and is not a DM -->
              <select 
                v-else-if="hasWriteAccess"
                :value="player.ActiveCharacter || ''"
                @change="updateActiveCharacter(player.UserID, $event.target.value)"
                class="character-select"
                :disabled="isUpdatingCharacter"
              >
                <option value="">No character selected</option>
                <option 
                  v-for="character in getPlayerCharacters(player.UserID)" 
                  :key="character.ID"
                  :value="character.ID"
                >
                  {{ character.Name }}
                </option>
              </select>
              
              <!-- Show text for users without write access and not DMs -->
              <span v-else class="character-name">
                {{ getActiveCharacterName(player.ActiveCharacter) || 'No character selected' }}
              </span>
            </div>
            
            <!-- Column 3: Player Status -->
            <div class="player-status">
              <span v-if="player.Active" class="status-active">
                <span class="material-symbols-outlined">circle</span>
                Active
              </span>
              <span v-else class="status-inactive">
                <span class="material-symbols-outlined">radio_button_unchecked</span>
                Inactive
              </span>
            </div>

            <!-- Column 4: Actions -->
            <div class="player-actions">
              <button
                v-if="canViewCharacterSheet(player)"
                @click="viewCharacterSheet(player)"
                class="action-btn view-btn"
                :disabled="!player.ActiveCharacter"
                :title="player.ActiveCharacter ? 'View character sheet' : 'No active character selected'"
              >
                <span class="material-symbols-outlined">description</span>
              </button>
              <!-- Activate/Deactivate Toggle -->
              <button 
                v-if="player.Role !== 'DM' && userStore.isOwner"
                @click="togglePlayerActive(player.UserID, player.Active)" 
                class="action-btn"
                :class="player.Active ? 'deactivate-btn' : 'activate-btn'"
                :title="player.Active ? 'Deactivate player' : 'Activate player'"
                :disabled="isUpdatingPlayerStatus"
              >
                <span class="material-symbols-outlined">
                  {{ player.Active ? 'person_off' : 'person_add' }}
                </span>
              </button>
              <!-- Remove Button (only for inactive players) -->
              <button 
                v-if="player.Role !== 'DM' && userStore.isOwner && !player.Active"
                @click="removePlayer(player.UserID)" 
                class="action-btn remove-btn"
                title="Remove player from realm"
              >
                <span class="material-symbols-outlined">person_remove</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-player-list">
          <div class="empty-icon">
            <span class="material-symbols-outlined">group_off</span>
          </div>
          <h3>No Active Players</h3>
          <p>Invite players to join your realm and start your adventure!</p>
          <button 
            v-if="userStore.isOwner"
            @click="showInviteModal = true" 
            class="invite-btn-large"
          >
            <span class="material-symbols-outlined">person_add</span>
            Invite First Player
          </button>
        </div>
      </div>

      <!-- Pending Invitations -->
      <div v-if="userStore.isOwner && pendingInvitations.length > 0" class="pending-invitations">
        <h4>
          <span class="material-symbols-outlined">mail</span>
          Pending Invitations
          <span v-if="pendingInvitations.length > 0" class="invitation-count">{{ pendingInvitations.length }}</span>
        </h4>
        
        <div v-if="pendingInvitations.length > 0" class="invitation-list">
          <div 
            v-for="invitation in pendingInvitations" 
            :key="invitation.invitationId"
            class="invitation-item"
          >
            <div class="invitation-info">
              <span class="email">{{ invitation.email }}</span>
              <span class="expires">Expires {{ formatExpiration(invitation.ttl) }}</span>
            </div>
            <button 
              @click="cancelInvitation(invitation.invitationId)"
              class="cancel-btn"
              title="Cancel invitation"
            >
              <span class="material-symbols-outlined">cancel</span>
            </button>
          </div>
        </div>
        
        <div v-else class="no-pending-invitations">
          <span class="material-symbols-outlined">check_circle</span>
          <p>No pending invitations at the moment</p>
        </div>
      </div>
    </div>

    <!-- Calendar Section -->
    <div class="calendar-section">
      <div class="section-header">
        <h2>
          <span class="material-symbols-outlined">calendar_today</span>
          Calendar
        </h2>
        <button v-if="realmStore.isOwner" @click="openCalendarEditor" class="edit-calendar-btn">
          <span class="material-symbols-outlined">edit</span>
          Edit Calendar
        </button>
      </div>

      <div class="calendar-panel">
        <div class="current-date">
          <div class="date-icon">
            <span class="material-symbols-outlined">today</span>
          </div>
          <div class="date-info">
            <div class="date-display">{{ formatCurrentDate() }}</div>
            <div class="date-details">Current realm date</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Gaming System Section -->
    <template v-if="features.hasGamingSystems">
      <div class="gaming-system-section">
        <div class="section-header">
          <h2>
            <span class="material-symbols-outlined">extension</span>
            Gaming System
          </h2>
          <div class="header-actions">
            <router-link v-if="realmStore.isOwner || realmStore.isDM" to="/account/gaming-system" class="manage-gaming-system-btn">
              <span class="material-symbols-outlined">settings</span>
              Manage
            </router-link>
          </div>
        </div>
      </div>
    </template>

    <!-- Display Preferences Section -->
    <div class="display-prefs-section">
      <div class="section-header">
        <h2>
          <span class="material-symbols-outlined">palette</span>
          Display Preferences
        </h2>
        <template v-if="features.hasGamingSystems">
          <div class="header-actions">
            <router-link to="/account/active-realm/theme" class="manage-theme-btn">
              <span class="material-symbols-outlined">settings</span>
              Manage
            </router-link>
          </div>
        </template>
      </div>
      <template v-if="features.hasGamingSystems">
        <p class="section-desc">Theme: <strong>{{ configStore.currentTheme }}</strong></p>
      </template>
      <template v-else>
        <div class="theme-selector">
          <label class="theme-label-text">Theme</label>
          <div class="theme-options">
            <button
              v-for="theme in configStore.availableThemes"
              :key="theme.id"
              class="theme-option"
              :class="{ active: configStore.currentTheme === theme.id }"
              @click="configStore.setTheme(theme.id)"
            >
              <span class="theme-preview" :class="'preview-' + theme.id"></span>
              <span class="theme-name">{{ theme.label }}</span>
              <span v-if="configStore.currentTheme === theme.id" class="material-symbols-outlined theme-check">check_circle</span>
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- Delete Realm Section (Owner Only) -->
    <div v-if="realmStore.isOwner" class="delete-realm-section">
      <div class="danger-card">
        <div class="danger-card-header">
          <span class="material-symbols-outlined danger-icon">warning</span>
          <h2>Delete This Realm</h2>
        </div>
        <p class="danger-description">
          Permanently delete this realm and all its data. A backup will be stored before deletion.
        </p>
        <button @click="showDeleteRealmDialog = true" class="btn-delete-realm">
          <span class="material-symbols-outlined">delete_forever</span>
          Delete Realm
        </button>
      </div>
    </div>

    <!-- Delete Realm Confirmation Dialog -->
    <dialog ref="deleteRealmDialogRef" class="delete-realm-dialog">
      <div class="modal-header">
        <h3>
          <span class="material-symbols-outlined danger-icon">warning</span>
          Delete Realm
        </h3>
        <button @click="showDeleteRealmDialog = false" class="close-btn">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <div class="delete-realm-name">{{ realmStore.activeRealm?.Name }}</div>

        <div class="removal-warning">
          <span class="material-symbols-outlined">warning</span>
          <div class="warning-content">
            <strong>This action is permanent</strong>
            <p>All realm data will be permanently deleted, including characters, articles, maps, sessions, reports, invitations, and custom content. A backup will be saved before deletion.</p>
          </div>
        </div>

        <div class="delete-confirm-fields">
          <label class="delete-acknowledge">
            <input
              type="checkbox"
              v-model="deleteRealmAcknowledged"
            />
            <span>I understand this will permanently delete <strong>{{ realmStore.activeRealm?.Name }}</strong> and all its data</span>
          </label>

          <div class="delete-confirm-input">
            <label>Type the realm name to confirm:</label>
            <input
              type="text"
              v-model="deleteRealmConfirmName"
              :placeholder="realmStore.activeRealm?.Name"
              autocomplete="off"
            />
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="showDeleteRealmDialog = false" class="btn-cancel">Cancel</button>
        <button
          @click="confirmDeleteRealm"
          :disabled="!canConfirmDelete || isDeletingRealm"
          class="btn-confirm btn-remove"
        >
          <span v-if="isDeletingRealm" class="material-symbols-outlined loading">hourglass_empty</span>
          <span v-else class="material-symbols-outlined">delete_forever</span>
          {{ isDeletingRealm ? 'Deleting...' : 'Delete Realm' }}
        </button>
      </div>
    </dialog>

    <!-- Invitation Modal -->
    <dialog ref="inviteDialog" class="invite-dialog">
      <div class="modal-header">
        <h3>Invite Players to {{ realmStore.activeRealm?.Name }}</h3>
        <button @click="closeModal" class="close-btn">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
          <!-- Capacity Warning -->
          <div v-if="realmStore.isRealmAtCapacity" class="capacity-warning-banner">
            <span class="material-symbols-outlined">warning</span>
            <div class="warning-content">
              <strong>Realm at Capacity</strong>
              <p>This realm has reached its maximum of {{ realmStore.maxPlayersLimit }} players. 
              To invite new players, you'll need to either:</p>
              <ul>
                <li>Deactivate some existing players</li>
                <li>Increase the MaxPlayers limit for this realm</li>
              </ul>
            </div>
          </div>
          
          <!-- Available Slots Info -->
          <div v-else-if="realmStore.remainingPlayerSlots <= 2" class="capacity-info-banner">
            <span class="material-symbols-outlined">info</span>
            <div class="info-content">
              <strong>Limited Slots Available</strong>
              <p>Only {{ realmStore.remainingPlayerSlots }} player slot{{ realmStore.remainingPlayerSlots === 1 ? '' : 's' }} remaining 
              ({{ realmStore.activePlayersCount }}/{{ realmStore.maxPlayersLimit }} used)</p>
            </div>
          </div>
          
          <div class="invite-form" :class="{ disabled: realmStore.isRealmAtCapacity }">
            <div class="form-field">
              <label for="inviteEmail">Player Email Address</label>
              <input 
                type="email" 
                id="inviteEmail"
                v-model="inviteForm.email"
                placeholder="player@example.com"
                class="email-input"
              >
              <small class="field-hint">Enter the email address of the player you want to invite</small>
            </div>
            
            <div class="form-field">
              <label for="inviteMessage">Personal Message (Optional)</label>
              <textarea 
                id="inviteMessage"
                v-model="inviteForm.message"
                placeholder="Join me in this epic adventure..."
                rows="3"
                class="message-input"
              ></textarea>
            </div>
            
            <div class="form-field">
              <label for="expirationHours">Invitation Expires In</label>
              <select v-model="inviteForm.expirationHours" class="expiration-select">
                <option value="24">24 hours</option>
                <option value="72">3 days</option>
                <option value="168">1 week</option>
                <option value="720">1 month</option>
              </select>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeModal" class="btn-cancel">Cancel</button>
          <button 
            @click="sendInvitation" 
            :disabled="!inviteForm.email || isSending || realmStore.isRealmAtCapacity"
            class="btn-send"
            :class="{ 'disabled-capacity': realmStore.isRealmAtCapacity }"
          >
            <span v-if="isSending" class="material-symbols-outlined loading">hourglass_empty</span>
            <span v-else-if="realmStore.isRealmAtCapacity" class="material-symbols-outlined">block</span>
            <span v-else class="material-symbols-outlined">send</span>
            {{ 
              realmStore.isRealmAtCapacity ? 'Realm at Capacity' :
              isSending ? 'Sending...' : 'Send Invitation' 
            }}
          </button>
        </div>
    </dialog>

    <!-- Player Status Confirmation Modal -->
    <dialog ref="statusDialog" class="status-dialog">
      <div class="modal-header">
        <h3>{{ statusModalData.title }}</h3>
        <button @click="closeStatusModal" class="close-btn">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
          <div class="status-confirmation">
            <div class="player-info-display">
              <div class="player-avatar-display">
                <span class="role-icon" :class="`role-${statusModalData.player?.Role?.toLowerCase()}`">
                  <span class="material-symbols-outlined">person</span>
                </span>
              </div>
              <div class="player-details-display">
                <div class="player-name-display">{{ statusModalData.playerName }}</div>
                <div class="current-status">
                  Currently: <span :class="statusModalData.currentActive ? 'status-active' : 'status-inactive'">
                    {{ statusModalData.currentActive ? 'Active' : 'Inactive' }}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="action-description">
              <p>{{ statusModalData.description }}</p>
              
              <!-- Capacity Warning for Activation -->
              <div v-if="statusModalData.atCapacity" class="capacity-warning">
                <span class="material-symbols-outlined">block</span>
                <div class="warning-content">
                  <strong>Realm at Maximum Capacity</strong>
                  <p>Your realm currently has {{ realmStore.activePlayersCount }}/{{ realmStore.maxPlayersLimit }} active players. 
                  To activate more players, you need to:</p>
                  <ul>
                    <li><strong>Deactivate other players</strong> to make room, or</li>
                    <li><strong>Upgrade your account</strong> to increase the player limit</li>
                  </ul>
                </div>
              </div>
              
              <!-- Normal Activation Note -->
              <div v-else-if="!statusModalData.currentActive" class="activation-note">
                <span class="material-symbols-outlined">info</span>
                <span>This player will be able to participate in the realm again.</span>
              </div>
              
              <!-- Deactivation Note -->
              <div v-else class="deactivation-note">
                <span class="material-symbols-outlined">warning</span>
                <span>This player will no longer be able to access realm content, but can be reactivated later.</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeStatusModal" class="btn-cancel">Cancel</button>
          <button 
            @click="confirmStatusChange" 
            :disabled="isUpdatingPlayerStatus || statusModalData.atCapacity"
            class="btn-confirm"
            :class="{
              'btn-deactivate': statusModalData.currentActive,
              'btn-activate': !statusModalData.currentActive && !statusModalData.atCapacity,
              'btn-blocked': statusModalData.atCapacity
            }"
          >
            <span v-if="isUpdatingPlayerStatus" class="material-symbols-outlined loading">hourglass_empty</span>
            <span v-else-if="statusModalData.atCapacity" class="material-symbols-outlined">block</span>
            <span v-else class="material-symbols-outlined">
              {{ statusModalData.currentActive ? 'person_off' : 'person_add' }}
            </span>
            {{ 
              isUpdatingPlayerStatus ? 'Updating...' : 
              statusModalData.atCapacity ? 'Realm at Capacity' :
              statusModalData.confirmText 
            }}
          </button>
        </div>
    </dialog>

    <!-- Player Removal Confirmation Modal -->
    <dialog ref="removeDialog" class="remove-dialog">
      <div class="modal-header">
        <h3>Remove {{ removeModalData.playerName }}</h3>
        <button @click="closeRemoveModal" class="close-btn">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
          <div class="status-confirmation">
            <div class="player-info-display">
              <div class="player-avatar-display">
                <span class="role-icon" :class="`role-${removeModalData.player?.Role?.toLowerCase()}`">
                  <span class="material-symbols-outlined">person</span>
                </span>
              </div>
              <div class="player-details-display">
                <div class="player-name-display">{{ removeModalData.playerName }}</div>
                <div class="current-status">
                  Status: <span class="status-inactive">Inactive</span>
                </div>
              </div>
            </div>
            
            <div class="action-description">
              <p>Are you sure you want to permanently remove {{ removeModalData.playerName }} from this realm?</p>
              
              <div class="removal-warning">
                <span class="material-symbols-outlined">warning</span>
                <div class="warning-content">
                  <strong>This action cannot be undone</strong>
                  <p>{{ removeModalData.playerName }} will lose access to this realm and all associated data. They would need a new invitation to rejoin.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeRemoveModal" class="btn-cancel">Cancel</button>
          <button 
            @click="confirmPlayerRemoval" 
            :disabled="isRemovingPlayer"
            class="btn-confirm btn-remove"
          >
            <span v-if="isRemovingPlayer" class="material-symbols-outlined loading">hourglass_empty</span>
            <span v-else class="material-symbols-outlined">person_remove</span>
            {{ isRemovingPlayer ? 'Removing...' : 'Remove Player' }}
          </button>
        </div>
    </dialog>

    <!-- Calendar Editor Modal -->
    <dialog ref="calendarDialog" class="calendar-dialog">
      <div class="modal-header">
        <h3>Edit Calendar for {{ realmStore.activeRealm?.Name }}</h3>
        <button @click="closeCalendarEditor" class="close-btn">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
          <div class="calendar-customization">
            <div class="customization-header">
              <p>Customize your realm's calendar. Edit month names, abbreviations, and days, or start from a preset.</p>
              <div class="calendar-preset-buttons">
                <button @click="resetToCustom" class="reset-btn custom-btn">
                  <span class="material-symbols-outlined">edit_note</span>
                  Create Custom
                </button>
                <button @click="resetToTheGameDnD" class="reset-btn thegamednd-btn">
                  <span class="material-symbols-outlined">casino</span>
                  TheGameDnD
                </button>
                <button @click="resetToGregorian" class="reset-btn gregorian-btn">
                  <span class="material-symbols-outlined">calendar_month</span>
                  Gregorian
                </button>
                <button @click="resetToGreyhawk" class="reset-btn greyhawk-btn">
                  <span class="material-symbols-outlined">brightness_7</span>
                  Greyhawk
                </button>
              </div>
            </div>

            <div class="calendar-summary">
              <span>{{ editableCalendar.Months.length }} months</span>
              <span class="separator">•</span>
              <span>{{ totalCalendarDays }} days/year</span>
            </div>

            <div class="month-grid">
              <div v-for="(month, index) in editableCalendar.Months" :key="index" class="month-field">
                <div class="month-header">
                  <label :for="`edit-month-${index}`">Month {{ index + 1 }}</label>
                  <button
                    @click="removeMonth(index)"
                    class="remove-month-btn"
                    :disabled="editableCalendar.Months.length <= 3"
                    title="Remove month"
                  >
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </div>
                <div class="month-inputs">
                  <input
                    :id="`edit-month-${index}`"
                    type="text"
                    v-model="month.Name"
                    placeholder="Month name"
                    maxlength="32"
                    class="month-name-input"
                  />
                  <input
                    type="text"
                    v-model="month.Abbr"
                    placeholder="Abbr"
                    maxlength="3"
                    class="month-abbr-input"
                  />
                  <input
                    type="number"
                    v-model.number="month.Days"
                    min="7"
                    max="99"
                    class="month-days-input"
                    title="Days in month (min 7)"
                  />
                </div>
              </div>
            </div>

            <div class="add-month-container">
              <button
                @click="addMonth"
                class="add-month-btn"
                :disabled="editableCalendar.Months.length >= 50"
              >
                <span class="material-symbols-outlined">add</span>
                Add Month
              </button>
            </div>

            <!-- Zodiac Configuration -->
            <div class="zodiac-section">
              <div class="zodiac-header">
                <h4>Zodiac Signs</h4>
                <button type="button" @click="showZodiacConfig = !showZodiacConfig" class="btn-toggle-zodiac">
                  <span class="material-symbols-outlined">{{ showZodiacConfig ? 'expand_less' : 'tune' }}</span>
                  {{ showZodiacConfig ? 'Hide' : 'Configure' }}
                </button>
              </div>

              <div v-if="showZodiacConfig" class="zodiac-config-panel">
                <p class="zodiac-hint">
                  Define your zodiac signs. Click "Recalculate" to evenly distribute them across your {{ totalCalendarDays }}-day year.
                </p>

                <div class="zodiac-actions">
                  <button type="button" @click="addZodiac" class="btn-add-zodiac" :disabled="editableCalendar.Zodiac.length >= 20">
                    <span class="material-symbols-outlined">add</span>
                    Add Zodiac
                  </button>
                  <button type="button" @click="recalculateZodiacs" class="btn-recalculate">
                    <span class="material-symbols-outlined">autorenew</span>
                    Recalculate
                  </button>
                </div>

                <div class="zodiac-grid">
                  <div v-for="(zodiac, index) in editableCalendar.Zodiac" :key="index" class="zodiac-field">
                    <div class="zodiac-field-header">
                      <label :for="`zodiac-${index}`">Zodiac {{ index + 1 }}</label>
                      <button
                        v-if="editableCalendar.Zodiac.length > 1"
                        type="button"
                        @click="removeZodiac(index)"
                        class="btn-remove-zodiac"
                        title="Remove this zodiac"
                      >
                        <span class="material-symbols-outlined">close</span>
                      </button>
                    </div>
                    <div class="zodiac-inputs">
                      <input
                        :id="`zodiac-${index}`"
                        type="text"
                        v-model="zodiac.Name"
                        placeholder="Name"
                        maxlength="32"
                        class="zodiac-name-input"
                      />
                      <div class="zodiac-end-display">
                        <span class="end-label">Ends day</span>
                        <input
                          type="number"
                          v-model.number="zodiac.End"
                          min="1"
                          :max="totalCalendarDays"
                          class="zodiac-end-input"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closeCalendarEditor" class="btn btn-secondary">Cancel</button>
          <button
            @click="saveCalendarChanges"
            class="btn btn-primary"
            :disabled="isSavingCalendar || !hasCalendarChanged"
          >
            <span v-if="isSavingCalendar" class="material-symbols-outlined loading">hourglass_empty</span>
            <span v-else class="material-symbols-outlined">save</span>
            {{ isSavingCalendar ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
    </dialog>

    <!-- Calendar Save Confirmation Dialog -->
    <dialog ref="calendarConfirmDialog" v-if="showCalendarConfirmDialog" class="calendar-confirm-dialog">
      <div class="confirm-dialog-content">
        <div class="confirm-dialog-header">
          <span class="material-symbols-outlined warning-icon">warning</span>
          <h3>Confirm Calendar Change</h3>
        </div>
        <div class="confirm-dialog-body">
          <p>Changing your calendar will automatically update the dates on <strong>all submitted reports</strong> in this realm to preserve their position in time.</p>
          <p class="warning-text">This action cannot be automatically undone. You would need to manually change your calendar again to revert the dates.</p>
          <label class="acknowledge-checkbox">
            <input
              type="checkbox"
              v-model="calendarConfirmAcknowledged"
            />
            <span>I understand this is a permanent change that will affect all report dates</span>
          </label>
        </div>
        <div class="confirm-dialog-footer">
          <button @click="cancelCalendarConfirm" class="btn btn-secondary">Cancel</button>
          <button
            @click="confirmSaveCalendar"
            class="btn btn-danger"
            :disabled="!calendarConfirmAcknowledged || isSavingCalendar"
          >
            <span v-if="isSavingCalendar" class="material-symbols-outlined loading">hourglass_empty</span>
            <span v-else class="material-symbols-outlined">check</span>
            {{ isSavingCalendar ? 'Saving...' : 'Confirm Changes' }}
          </button>
        </div>
      </div>
    </dialog>

    <!-- Subscription Management Dialog -->
    <dialog ref="subscriptionDialog" v-if="showSubscriptionDialog" class="subscription-dialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>Manage Subscription</h3>
          <button @click="closeSubscriptionDialog" class="close-btn">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="dialog-body">
          <div class="current-plan">
            <h4>Current Plan</h4>
            <div v-if="currentPlan" class="current-plan-card">
              <div class="plan-header">
                <strong>{{ currentPlan.Name || subscriptionStore.formatTierName(currentPlan.Tier) }}</strong>
                <span class="plan-cost">{{ subscriptionStore.formatCost(currentPlan.Cost) }}</span>
              </div>
              <div class="plan-features">
                <div class="feature">{{ currentPlan.Articles }} Articles</div>
                <div class="feature">{{ currentPlan.Characters }} Characters</div>
                <div class="feature">{{ currentPlan.DMs }} DM{{ currentPlan.DMs !== 1 ? 's' : '' }}</div>
                <div class="feature">{{ currentPlan.Players }} Players</div>
                <div class="feature">{{ currentPlan.Rooms }} Rooms</div>
              </div>
            </div>
            <div v-else class="current-plan-fallback">
              <p>Your realm is currently on the {{ realmTier }} subscription plan.</p>
            </div>
          </div>
          <div class="available-plans">
            <h4>Available Plans</h4>

            <!-- Fellowship placeholder for Patreon users (they get this free via Patreon) -->
            <div v-if="hasPatreonBenefit" class="plan-option fellowship-placeholder disabled">
              <div class="plan-content">
                <div class="plan-header">
                  <strong>Fellowship</strong>
                  <span class="patreon-badge">Via Patreon</span>
                  <span class="plan-cost">$0.00/month</span>
                </div>
                <div class="plan-features">
                  <div class="feature">Included with your Patreon support</div>
                </div>
              </div>
            </div>

            <!-- Loading state -->
            <div v-if="subscriptionStore.isLoading" class="loading-plans">
              <span class="material-symbols-outlined spinning">hourglass_empty</span>
              <p>Loading subscription plans...</p>
            </div>
            
            <!-- Error state -->
            <div v-else-if="subscriptionStore.hasError" class="error-plans">
              <span class="material-symbols-outlined">warning</span>
              <p>Unable to load plans. Showing basic information.</p>
            </div>
            
            <!-- Subscription plans -->
            <div v-for="subscription in availablePlans"
                 :key="subscription.Tier"
                 class="plan-option"
                 :class="{
                   'selected': selectedPlan?.Tier === subscription.Tier,
                   'upgrade-tier': subscription.RequiresPatreonFellowship
                 }"
                 @click="selectPlan(subscription)">
              <div class="plan-content">
                <div class="plan-header">
                  <strong>{{ subscription.Name || subscriptionStore.formatTierName(subscription.Tier) }}</strong>
                  <span v-if="subscription.RequiresPatreonFellowship" class="patreon-badge">Patreon Upgrade</span>
                  <span class="plan-cost">{{ subscriptionStore.formatCost(subscription.Cost) }}</span>
                </div>
                <div class="plan-features">
                  <div class="feature">{{ subscription.Articles }} Articles</div>
                  <div class="feature">{{ subscription.Characters }} Characters</div>
                  <div class="feature">{{ subscription.DMs }} DM{{ subscription.DMs !== 1 ? 's' : '' }}</div>
                  <div class="feature">{{ subscription.Players }} Players</div>
                  <div class="feature">{{ subscription.Rooms }} Rooms</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Proration Explanation -->
          <div v-if="selectedPlan && canUpgrade" class="proration-info">
            <div class="proration-header">
              <span class="material-symbols-outlined">info</span>
              <strong v-if="isUpgrade">Upgrading to {{ selectedPlan.Name }}</strong>
              <strong v-else>Downgrading to {{ selectedPlan.Name }}</strong>
            </div>
            <div class="proration-content">
              <!-- Patreon Billing Sync Info -->
              <div v-if="isPatreonUpgradeTier && isUpgrade" class="patreon-billing-sync">
                <div v-if="isLoadingBillingInfo" class="billing-loading">
                  <span class="material-symbols-outlined spinning">refresh</span>
                  Loading billing sync info...
                </div>
                <div v-else-if="billingInfoError" class="billing-error">
                  <span class="material-symbols-outlined">warning</span>
                  {{ billingInfoError }}
                </div>
                <div v-else-if="patreonBillingInfo && proratedAmount" class="billing-sync-details">
                  <p class="sync-header">
                    <span class="material-symbols-outlined">sync</span>
                    <strong>Billing Cycle Synchronized with Patreon</strong>
                  </p>
                  <div class="sync-breakdown">
                    <div class="sync-item">
                      <span class="sync-label">Today's charge:</span>
                      <span class="sync-value highlight">{{ proratedAmount.display }}</span>
                      <span class="sync-note">for {{ proratedAmount.daysCharged }} days</span>
                    </div>
                    <div class="sync-item">
                      <span class="sync-label">Then:</span>
                      <span class="sync-value">{{ subscriptionStore.formatCost(selectedPlan.Cost) }}</span>
                      <span class="sync-note">starting {{ patreonBillingInfo.billingDayFormatted }} of each month</span>
                    </div>
                  </div>
                  <p class="sync-benefit">
                    <span class="material-symbols-outlined">check_circle</span>
                    Your PayPal billing will align with your Patreon billing date
                  </p>
                </div>
              </div>
              <!-- Regular upgrade/downgrade info -->
              <div v-else>
                <p v-if="isUpgrade">
                  <strong v-if="isUpgradeFromFree">Start Your Subscription:</strong>
                  <strong v-else>Immediate Upgrade:</strong>
                  <span v-if="isUpgradeFromFree">Your subscription will start immediately and billing begins now. Changes take effect right away!</span>
                  <span v-else>You'll only pay the difference for the remaining days in your billing cycle and changes take effect immediately.</span>
                </p>
                <p v-else>
                  <strong>Scheduled Downgrade:</strong> You'll keep all current features until your billing period ends, then automatically transition to {{ selectedPlan.Name }}. No refunds needed - you get full value for what you've paid!
                </p>
                <p class="proration-note" v-if="isUpgrade">
                  <span v-if="isUpgradeFromFree">Start enjoying premium features immediately!</span>
                  <span v-else>Changes take effect immediately. No lost subscription time!</span>
                </p>
                <p class="proration-note downgrade-transition" v-else>Your current plan will remain active until {{ nextBillingDate }}, then automatically change to {{ selectedPlan.Name }}.</p>
              </div>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button @click="closeSubscriptionDialog" class="cancel-btn">Cancel</button>

          <!-- Payment options for non-free tiers (PayPal) -->
          <template v-if="features.hasPayPal">
            <div v-if="canUpgrade && selectedPlan?.Tier !== 'free'" class="payment-options">
              <!-- PayPal Subscription Button -->
              <div class="paypal-button-wrapper">
                <PayPalSubscriptionButton
                  :plan-tier="selectedPlanTier"
                  :realm-id="realmStore.activeRealmId"
                  :disabled="!canUpgrade || paypalStore?.isProcessing || isLoadingBillingInfo"
                  :compact="true"
                  :patreon-sync-enabled="isPatreonUpgradeTier && !!patreonBillingInfo"
                  :start-time="patreonSyncStartTime"
                  :setup-fee="patreonSyncSetupFee"
                  @success="handlePayPalSuccess"
                  @error="handlePayPalError"
                  @cancel="handlePayPalCancel"
                  @click="handlePayPalClick"
                />
              </div>
            </div>

            <!-- Fallback upgrade button (shown when PayPal is not available or current plan selected) -->
            <button
              v-else
              @click="upgradePlan"
              :disabled="!canUpgrade"
              class="upgrade-btn"
              :class="{
                'disabled': !canUpgrade,
                'downgrade': !isUpgrade && canUpgrade,
                'free-downgrade': selectedPlan?.Tier === 'free'
              }"
            >
              {{ getActionButtonText() }}
            </button>
          </template>

          <!-- Non-PayPal upgrade button -->
          <template v-else>
            <button
              @click="upgradePlan"
              :disabled="!canUpgrade"
              class="upgrade-btn"
              :class="{
                'disabled': !canUpgrade,
                'downgrade': !isUpgrade && canUpgrade,
                'free-downgrade': selectedPlan?.Tier === 'free'
              }"
            >
              {{ getActionButtonText() }}
            </button>
          </template>
        </div>
      </div>
    </dialog>

    <!-- Reload Dialog -->
    <dialog ref="reloadDialog" class="reload-dialog" v-if="showReloadDialog">
      <div class="modal-header">
        <h3>
          <span class="material-symbols-outlined">refresh</span>
          Reload Required
        </h3>
        <button @click="closeReloadDialog" class="close-btn">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      
      <div class="modal-body">
        <div class="reload-info">
          <div class="info-icon">
            <span class="material-symbols-outlined">info</span>
          </div>
          <div class="info-content">
            <p><strong>Subscription Updated Successfully!</strong></p>
            <p>{{ reloadReason }}</p>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="closeReloadDialog" class="btn-cancel">
          <span class="material-symbols-outlined">close</span>
          Cancel
        </button>
        <button @click="confirmReload" class="btn-reload" :disabled="isReloading">
          <span v-if="isReloading" class="material-symbols-outlined loading">hourglass_empty</span>
          <span v-else class="material-symbols-outlined">refresh</span>
          {{ isReloading ? 'Reloading...' : 'Reload Now' }}
        </button>
      </div>
    </dialog>

    <!-- Character Sheet Dialog -->
    <template v-if="features.hasCharacterSheets">
      <CharacterSheetDialog
        ref="characterSheetDialogRef"
        v-if="selectedCharacterForSheet"
        :character-id="selectedCharacterForSheet.ID"
        :character-name="selectedCharacterForSheet.Name"
        :character-sheet-url="selectedCharacterForSheet.CharacterSheetURL"
        :can-edit-url="canEditCharacterSheetUrl"
        @save="handleSaveCharacterSheetUrl"
        @close="handleCloseCharacterSheetDialog"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { useAccountStore } from '@shared/stores/account';
import { useUserStore } from '@shared/stores/user';
import { useRealmStore } from '@shared/stores/realm';
import { useCharacterStore } from '@shared/stores/character';
import { useDateStore } from '@shared/stores/date';
import { useSubscriptionStore } from '@shared/stores/subscription';
import { useSessionStore } from '@shared/stores/session';
import { useConfigStore } from '@shared/stores/config';
import { patreonService } from '@shared/services/patreonService';
import { features } from '@shared/config/features';

// Conditionally import PayPal store and component
let PayPalSubscriptionButton = null;
let paypalStore = null;
if (features.hasPayPal) {
  const { usePayPalStore } = await import(/* @vite-ignore */ '@/stores/paypal');
  paypalStore = usePayPalStore();
  const paypalComponent = await import(/* @vite-ignore */ '@/components/payment/PayPalSubscriptionButton.vue');
  PayPalSubscriptionButton = paypalComponent.default;
}

// Conditionally import gaming systems store
let gamingSystemsStore = null;
if (features.hasGamingSystems) {
  const { useGamingSystemsStore } = await import(/* @vite-ignore */ '@/stores/gamingSystems');
  gamingSystemsStore = useGamingSystemsStore();
}

// Conditionally import CharacterSheetDialog component
let CharacterSheetDialog = null;
if (features.hasCharacterSheets) {
  const charSheetComponent = await import(/* @vite-ignore */ '@/components/dialogs/CharacterSheetDialog.vue');
  CharacterSheetDialog = charSheetComponent.default;
}

const accountStore = useAccountStore();
const userStore = useUserStore();
const realmStore = useRealmStore();
const characterStore = useCharacterStore();
const dateStore = useDateStore();
const subscriptionStore = useSubscriptionStore();
const sessionStore = useSessionStore();
const configStore = useConfigStore();
const router = useRouter();

// Delete realm state
const showDeleteRealmDialog = ref(false);
const deleteRealmConfirmName = ref('');
const deleteRealmAcknowledged = ref(false);
const isDeletingRealm = ref(false);
const deleteRealmDialogRef = ref(null);

const canConfirmDelete = computed(() => {
  return deleteRealmAcknowledged.value &&
    deleteRealmConfirmName.value === realmStore.activeRealm?.Name;
});

// Subscription dialog state
const showSubscriptionDialog = ref(false);
const selectedPlanTier = ref('');
const selectedPlan = ref(null);
const isProcessingCreditPayment = ref(false);

// Patreon billing sync state
const patreonBillingInfo = ref(null);
const isLoadingBillingInfo = ref(false);
const billingInfoError = ref(null);

// Reload dialog state
const showReloadDialog = ref(false);
const reloadReason = ref('');
const isReloading = ref(false);

// Character sheet dialog state
const characterSheetDialogRef = ref(null);
const selectedPlayerForSheet = ref(null);
const selectedCharacterForSheet = ref(null);

// Get the realm's subscription tier, defaulting to 'Free' if not set
const realmTier = computed(() => {
  const tier = realmStore.activeRealm?.SubscriptionPlan;
  if (!tier || tier === 'free') {
    return 'Free';
  }
  // Capitalize first letter of tier name
  //return tier.charAt(0).toUpperCase() + tier.slice(1);
  return tier;
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

// Get next 3 upcoming sessions
const upcomingSessionsList = computed(() => {
  return sessionStore.upcomingSessions.slice(0, 3);
});

// Get the gaming system for classes for the active realm
// Uses fallback logic: GamingSystem.classes -> GamingSystemID -> Default
// Keep 'gamingSystem' name for backward compatibility with template
const gamingSystem = computed(() => {
  if (!gamingSystemsStore) return null;
  const gamingSystemId = realmStore.activeRealmClassesSystemId;
  if (!gamingSystemId) return null;
  return gamingSystemsStore.getSystemById(gamingSystemId);
});

// Get the gaming system for spells for the active realm
// Uses fallback logic: GamingSystem.spells -> GamingSystemID -> Default
const gamingSystemSpells = computed(() => {
  if (!gamingSystemsStore) return null;
  const gamingSystemId = realmStore.activeRealmSpellsSystemId;
  if (!gamingSystemId) return null;
  return gamingSystemsStore.getSystemById(gamingSystemId);
});

// Get current plan details for display
const currentPlan = computed(() => {
  const tier = realmTier.value;
  if (tier === 'Free') {
    return {
      Name: 'Free',
      Tier: 'free',
      Cost: 0,
      Articles: 5,
      Characters: 10,
      DMs: 1,
      Players: 4,
      Rooms: 10
    };
  }
  const found = subscriptionStore.allSubscriptions.find(
    sub => sub.Tier.toLowerCase() === tier.toLowerCase()
  );
  if (found) return found;
  // Tier not in public list (e.g. AdminOnly tier) — treat as free for comparison
  return {
    Name: tier,
    Tier: tier.toLowerCase(),
    Cost: 0
  };
});

// Check if realm has Patreon benefit
const hasPatreonBenefit = computed(() => {
  return realmStore.activeRealm?.HasPatreonBenefit === true;
});

// Filter available plans based on Patreon status
const availablePlans = computed(() => {
  const currentTier = realmTier.value.toLowerCase();

  // If realm has Patreon benefit, show ONLY upgrade tiers
  if (hasPatreonBenefit.value) {
    return subscriptionStore.getUpgradeTiersForPatreon;
  }

  // Otherwise, show only regular tiers (excluding upgrade tiers and current tier)
  return subscriptionStore.getRegularSubscriptions
    .filter(sub => sub.Tier.toLowerCase() !== currentTier);
});

// State for character management
const isUpdatingCharacter = ref(false);

// State for player status management
const isUpdatingPlayerStatus = ref(false);
const showStatusModal = ref(false);
const statusModalData = ref({
  player: null,
  playerName: '',
  currentActive: false,
  title: '',
  description: '',
  confirmText: '',
  atCapacity: false
});

// State for player removal management
const isRemovingPlayer = ref(false);
const showRemoveModal = ref(false);
const removeModalData = ref({
  player: null,
  playerName: ''
});

// State for description editing
const isEditingDescription = ref(false);
const editingDescriptionValue = ref('');
const isSavingDescription = ref(false);
const descriptionTextarea = ref(null);
const reloadDialog = ref(null);
const inviteDialog = ref(null);
const statusDialog = ref(null);
const removeDialog = ref(null);
const calendarDialog = ref(null);
const calendarConfirmDialog = ref(null);

// Invitation modal state
const showInviteModal = ref(false);
const isSending = ref(false);
const pendingInvitations = ref([]);

const inviteForm = ref({
  email: '',
  message: '',
  expirationHours: 168 // Default to 1 week
});

// Calendar editor state
const showCalendarEditor = ref(false);
const isSavingCalendar = ref(false);
const editableCalendar = ref({
  Months: [],
  Zodiac: []
});
const originalCalendarJson = ref(''); // Store original calendar for change detection
const showCalendarConfirmDialog = ref(false);
const calendarConfirmAcknowledged = ref(false);
const showZodiacConfig = ref(false);

// Computed property for total days in the calendar year
const totalCalendarDays = computed(() => {
  return editableCalendar.value.Months.reduce((sum, month) => sum + (month.Days || 0), 0);
});

// Computed property to detect if calendar has changed
const hasCalendarChanged = computed(() => {
  return JSON.stringify(editableCalendar.value) !== originalCalendarJson.value;
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

// Computed property to sort players with DM first
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

// Check if current user has write access
const hasWriteAccess = computed(() => {
  return userStore.isAdmin || userStore.isOwner || userStore.writeAccess;
});

// Get characters belonging to a specific player
const getPlayerCharacters = (playerUserId) => {
  if (!characterStore.characterList || characterStore.characterList.length === 0) return [];
  
  return characterStore.characterList.filter(character => {
    return character.UserID === playerUserId;
  });
};

// Get active character name by ID
const getActiveCharacterName = (characterId) => {
  if (!characterId || !characterStore.characterList) return null;

  const character = characterStore.characterList.find(char => char.ID === characterId);
  return character?.Name || null;
};

// Check if current user can see the "View Character Sheet" button for a given player
const canViewCharacterSheet = (player) => {
  // DM/owner can see button for ALL players
  if (realmStore.isOwner || realmStore.isRealmDM) {
    return true;
  }
  // Regular players can only see button for their OWN entry
  return player.UserID === userStore.userSub;
};

// Check if current user can edit the character sheet URL
const canEditCharacterSheetUrl = computed(() => {
  if (!selectedPlayerForSheet.value) return false;
  // DM/owner can always edit
  if (realmStore.isOwner || realmStore.isRealmDM) return true;
  // Character owner can edit
  return selectedPlayerForSheet.value.UserID === userStore.userSub;
});

// Update active character for a player
const updateActiveCharacter = async (playerUserId, characterId) => {
  if (isUpdatingCharacter.value) return;
  
  isUpdatingCharacter.value = true;
  
  try {
    const response = await axios.put(
      `${import.meta.env.VITE_API_BASE_URL}/realms/user`,
      { 
        UserID: playerUserId,
        RealmID: realmStore.activeRealmId,
        CharacterID: characterId || null
      },
      {
        headers: {
          'Authorization': `Bearer ${userStore.user.auth.idToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 200) {
      const player = realmStore.arActivePlayers.find(p => p.UserID === playerUserId);
      if (player) {
        player.ActiveCharacter = characterId;
      }
      
      const characterName = characterId ? getActiveCharacterName(characterId) : 'None';
      showToast(`Active character updated to: ${characterName}`, 'success');
    }
  } catch (error) {
    console.error('Error updating active character:', error);
    
    let errorMessage = 'Failed to update active character.';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    }
    showToast(errorMessage, 'error');
  } finally {
    isUpdatingCharacter.value = false;
  }
};

// View character sheet
const viewCharacterSheet = async (player) => {
  selectedPlayerForSheet.value = player;

  // Get the active character for this player
  const character = characterStore.characterList.find(
    char => char.ID === player.ActiveCharacter
  );

  if (!character) {
    showToast('Could not find the active character', 'error');
    return;
  }

  selectedCharacterForSheet.value = character;
  // Wait for Vue to mount the dialog component before showing it
  await nextTick();
  characterSheetDialogRef.value?.show();
};

// Handle saving character sheet URL
const handleSaveCharacterSheetUrl = async ({ characterId, url }) => {
  try {
    const result = await characterStore.updateCharacterSheetURL(characterId, url);

    if (result.success) {
      // Update local state
      if (selectedCharacterForSheet.value) {
        selectedCharacterForSheet.value.CharacterSheetURL = url;
      }
      showToast('Character sheet URL updated successfully', 'success');
      characterSheetDialogRef.value?.onSaveComplete();
    } else {
      showToast('Failed to update character sheet URL', 'error');
      characterSheetDialogRef.value?.onSaveComplete();
    }
  } catch (error) {
    console.error('Error saving character sheet URL:', error);
    showToast('Failed to update character sheet URL', 'error');
    characterSheetDialogRef.value?.onSaveComplete();
  }
};

// Handle closing character sheet dialog
const handleCloseCharacterSheetDialog = () => {
  selectedPlayerForSheet.value = null;
  selectedCharacterForSheet.value = null;
};

// Toggle player active status - opens modal for confirmation
const togglePlayerActive = (playerUserId, currentActiveStatus) => {
  if (isUpdatingPlayerStatus.value) return;
  
  const player = realmStore.arActivePlayers.find(p => p.UserID === playerUserId);
  if (!player) return;
  
  const playerName = getPlayerDisplayName(player);
  const action = currentActiveStatus ? 'deactivate' : 'activate';
  
  // Check if activating would exceed MaxPlayers limit
  const wouldExceedCapacity = !currentActiveStatus && realmStore.isRealmAtCapacity;
  
  statusModalData.value = {
    player: player,
    playerName: playerName,
    currentActive: currentActiveStatus,
    title: `${action.charAt(0).toUpperCase() + action.slice(1)} ${playerName}`,
    description: currentActiveStatus 
      ? `Are you sure you want to deactivate ${playerName}?`
      : wouldExceedCapacity
        ? `Cannot activate ${playerName} - realm is at capacity`
        : `Are you sure you want to activate ${playerName}?`,
    confirmText: `${action.charAt(0).toUpperCase() + action.slice(1)} Player`,
    atCapacity: wouldExceedCapacity
  };
  
  showStatusModal.value = true;
};

// Confirm the status change from modal
const confirmStatusChange = async () => {
  if (isUpdatingPlayerStatus.value) return;
  
  const { player, currentActive, atCapacity } = statusModalData.value;
  
  // Prevent activation if at capacity
  if (atCapacity) {
    showToast('Cannot activate player: realm is at capacity', 'error');
    return;
  }
  
  isUpdatingPlayerStatus.value = true;
  
  try {
    const response = await axios.put(
      `${import.meta.env.VITE_API_BASE_URL}/realms/user`,
      { 
        UserID: player.UserID,
        RealmID: realmStore.activeRealmId,
        Active: !currentActive
      },
      {
        headers: {
          'Authorization': `Bearer ${userStore.user.auth.idToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 200) {
      // Update the local player data
      player.Active = !currentActive;
      
      const statusText = !currentActive ? 'activated' : 'deactivated';
      showToast(`${statusModalData.value.playerName} has been ${statusText}`, 'success');
      closeStatusModal();
    }
  } catch (error) {
    console.error('Error toggling player active status:', error);
    
    let errorMessage = 'Failed to update player status.';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    }
    showToast(errorMessage, 'error');
  } finally {
    isUpdatingPlayerStatus.value = false;
  }
};

// Close status modal
const closeStatusModal = () => {
  statusDialog.value?.close();
  showStatusModal.value = false;
  statusModalData.value = {
    player: null,
    playerName: '',
    currentActive: false,
    title: '',
    description: '',
    confirmText: '',
    atCapacity: false
  };
};

// Remove player from realm - opens modal for confirmation
const removePlayer = (playerUserId) => {
  const player = realmStore.arActivePlayers.find(p => p.UserID === playerUserId);
  if (!player) return;
  
  const playerName = getPlayerDisplayName(player);
  
  removeModalData.value = {
    player: player,
    playerName: playerName
  };
  
  showRemoveModal.value = true;
};

// Confirm the player removal from modal
const confirmPlayerRemoval = async () => {
  if (isRemovingPlayer.value) return;
  
  const { player } = removeModalData.value;
  
  isRemovingPlayer.value = true;
  
  try {
    // Call the API to remove user from realm
    const response = await axios.delete(
      `${import.meta.env.VITE_API_BASE_URL}/realms/user/${player.UserID}`,
      {
        headers: {
          'Authorization': `Bearer ${userStore.user.auth.idToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 200) {
      // Remove from local player data
      const index = realmStore.arActivePlayers.findIndex(p => p.UserID === player.UserID);
      if (index > -1) {
        realmStore.arActivePlayers.splice(index, 1);
      }
      
      // Show success message with details about characters cleared
      const result = response.data;
      let successMessage = `${removeModalData.value.playerName} has been removed from the realm`;
      if (result.charactersCleared > 0) {
        successMessage += ` (${result.charactersCleared} character${result.charactersCleared !== 1 ? 's' : ''} unassigned)`;
      }
      
      showToast(successMessage, 'success');
      closeRemoveModal();
    }
  } catch (error) {
    console.error('Error removing player:', error);
    
    let errorMessage = 'Failed to remove player.';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.status === 403) {
      errorMessage = 'You do not have permission to remove this player.';
    } else if (error.response?.status === 404) {
      errorMessage = 'Player not found or not in this realm.';
    }
    showToast(errorMessage, 'error');
  } finally {
    isRemovingPlayer.value = false;
  }
};

// Close remove modal
const closeRemoveModal = () => {
  removeDialog.value?.close();
  showRemoveModal.value = false;
  removeModalData.value = {
    player: null,
    playerName: ''
  };
};

// Description editing functions
const startEditingDescription = () => {
  editingDescriptionValue.value = realmStore.activeRealm?.Description || '';
  isEditingDescription.value = true;
  
  // Focus the textarea after Vue updates the DOM
  nextTick(() => {
    if (descriptionTextarea.value) {
      descriptionTextarea.value.focus();
      descriptionTextarea.value.select();
    }
  });
};

const cancelEditingDescription = () => {
  isEditingDescription.value = false;
  editingDescriptionValue.value = '';
};

const saveDescription = async () => {
  if (isSavingDescription.value) return;
  
  const newDescription = editingDescriptionValue.value.trim();
  
  isSavingDescription.value = true;
  
  try {
    const response = await axios.put(
      `${import.meta.env.VITE_API_BASE_URL}/realms/realm/${realmStore.activeRealmId}`,
      {
        Description: newDescription
      },
      {
        headers: {
          'Authorization': `Bearer ${userStore.user.auth.idToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 200) {
      // Update the local realm store
      if (realmStore.activeRealm) {
        realmStore.activeRealm.Description = newDescription;
      }
      
      showToast('Realm description updated successfully', 'success');
      isEditingDescription.value = false;
      editingDescriptionValue.value = '';
    }
  } catch (error) {
    console.error('Error updating realm description:', error);
    
    let errorMessage = 'Failed to update realm description.';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.status === 403) {
      errorMessage = 'You do not have permission to edit this realm.';
    }
    showToast(errorMessage, 'error');
  } finally {
    isSavingDescription.value = false;
  }
};

const isSettingDefaultGamingSystem = ref(false);

const setDefaultGamingSystem = async () => {
  if (isSettingDefaultGamingSystem.value) return;

  isSettingDefaultGamingSystem.value = true;

  try {
    const response = await axios.put(
      `${import.meta.env.VITE_API_BASE_URL}/realms/realm/${realmStore.activeRealmId}`,
      {
        GamingSystem: {
          classes: 'Default',
          spells: 'Default',
          races: 'Default'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${userStore.user.auth.idToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 200) {
      // Update the local realm store
      if (realmStore.activeRealm) {
        realmStore.activeRealm.GamingSystem = {
          classes: 'Default',
          spells: 'Default',
          races: 'Default'
        };
      }

      showToast('Gaming system set to Default successfully', 'success');
    }
  } catch (error) {
    console.error('Error setting default gaming system:', error);

    let errorMessage = 'Failed to set default gaming system.';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.status === 403) {
      errorMessage = 'You do not have permission to edit this realm.';
    }
    showToast(errorMessage, 'error');
  } finally {
    isSettingDefaultGamingSystem.value = false;
  }
};

// Modal functions
const closeModal = () => {
  inviteDialog.value?.close();
  showInviteModal.value = false;
  resetForm();
};

const resetForm = () => {
  inviteForm.value = {
    email: '',
    message: '',
    expirationHours: 168
  };
};

// Calendar editor functions
const openCalendarEditor = async () => {
  // Initialize editable calendar with current realm calendar or defaults
  if (realmStore.activeRealm?.Calendar) {
    editableCalendar.value = JSON.parse(JSON.stringify(realmStore.activeRealm.Calendar));
  } else {
    // Use default calendar if no custom calendar exists
    editableCalendar.value = {
      Months: JSON.parse(JSON.stringify(dateStore.defaultMonths)),
      Zodiac: JSON.parse(JSON.stringify(dateStore.defaultZodiac))
    };
  }
  showCalendarEditor.value = true;
  // Wait for watchers to settle, then store original for change detection
  await nextTick();
  originalCalendarJson.value = JSON.stringify(editableCalendar.value);
};

const closeCalendarEditor = () => {
  calendarDialog.value?.close();
  showCalendarEditor.value = false;
  showCalendarConfirmDialog.value = false;
  calendarConfirmAcknowledged.value = false;
  showZodiacConfig.value = false;
  editableCalendar.value = {
    Months: [],
    Zodiac: []
  };
  originalCalendarJson.value = '';
};

const resetToTheGameDnD = () => {
  // TheGameDnD default calendar months (seasonal calendar)
  editableCalendar.value.Months = [
    { Name: 'Midspring', Abbr: 'MSP', Days: 30 },
    { Name: 'Springwane', Abbr: 'SPW', Days: 31 },
    { Name: 'Summer', Abbr: 'SMR', Days: 30 },
    { Name: 'Midsummer', Abbr: 'MSR', Days: 31 },
    { Name: 'Summerwane', Abbr: 'SRW', Days: 31 },
    { Name: 'Fall', Abbr: 'FAL', Days: 30 },
    { Name: 'Midfall', Abbr: 'MFL', Days: 31 },
    { Name: 'Fallwane', Abbr: 'FLW', Days: 30 },
    { Name: 'Winter', Abbr: 'WTR', Days: 31 },
    { Name: 'Midwinter', Abbr: 'MWR', Days: 31 },
    { Name: 'Winterwane', Abbr: 'WRW', Days: 28 },
    { Name: 'Spring', Abbr: 'SPR', Days: 31 }
  ];
  recalculateZodiacs();
};

const resetToGregorian = () => {
  editableCalendar.value.Months = [
    { Name: 'January', Abbr: 'Jan', Days: 31 },
    { Name: 'February', Abbr: 'Feb', Days: 28 },
    { Name: 'March', Abbr: 'Mar', Days: 31 },
    { Name: 'April', Abbr: 'Apr', Days: 30 },
    { Name: 'May', Abbr: 'May', Days: 31 },
    { Name: 'June', Abbr: 'Jun', Days: 30 },
    { Name: 'July', Abbr: 'Jul', Days: 31 },
    { Name: 'August', Abbr: 'Aug', Days: 31 },
    { Name: 'September', Abbr: 'Sep', Days: 30 },
    { Name: 'October', Abbr: 'Oct', Days: 31 },
    { Name: 'November', Abbr: 'Nov', Days: 30 },
    { Name: 'December', Abbr: 'Dec', Days: 31 }
  ];
  recalculateZodiacs();
};

const resetToGreyhawk = () => {
  // Greyhawk calendar: 16 months, 364 days/year
  // 4 festival weeks (7 days each) + 12 regular months (28 days each)
  const greyhawkMonths = [
    { Name: 'Needfest', Abbr: 'NFT', Days: 7 },
    { Name: 'Fireseek', Abbr: 'FIR', Days: 28 },
    { Name: 'Readying', Abbr: 'REA', Days: 28 },
    { Name: 'Coldeven', Abbr: 'COL', Days: 28 },
    { Name: 'Growfest', Abbr: 'GFT', Days: 7 },
    { Name: 'Planting', Abbr: 'PLA', Days: 28 },
    { Name: 'Flocktime', Abbr: 'FLO', Days: 28 },
    { Name: 'Wealsun', Abbr: 'WEA', Days: 28 },
    { Name: 'Richfest', Abbr: 'RFT', Days: 7 },
    { Name: 'Reaping', Abbr: 'REP', Days: 28 },
    { Name: 'Goodmonth', Abbr: 'GOO', Days: 28 },
    { Name: 'Harvester', Abbr: 'HAR', Days: 28 },
    { Name: 'Brewfest', Abbr: 'BFT', Days: 7 },
    { Name: 'Patchwall', Abbr: 'PAT', Days: 28 },
    { Name: "Ready'reat", Abbr: 'RDY', Days: 28 },
    { Name: 'Sunsebb', Abbr: 'SUN', Days: 28 }
  ];

  // Replace entire months array (different count than other calendars)
  editableCalendar.value.Months = greyhawkMonths;
  recalculateZodiacs();
};

const resetToCustom = () => {
  // Start with a minimal custom calendar (3 months minimum)
  editableCalendar.value.Months = [
    { Name: 'Month 1', Abbr: 'M1', Days: 30 },
    { Name: 'Month 2', Abbr: 'M2', Days: 30 },
    { Name: 'Month 3', Abbr: 'M3', Days: 30 }
  ];
  recalculateZodiacs();
};

const addMonth = () => {
  if (editableCalendar.value.Months.length >= 50) return;

  const nextIndex = editableCalendar.value.Months.length + 1;
  editableCalendar.value.Months.push({
    Name: `Month ${nextIndex}`,
    Abbr: `M${nextIndex}`,
    Days: 30
  });
  recalculateZodiacs();
};

const removeMonth = (index) => {
  if (editableCalendar.value.Months.length <= 3) return;
  editableCalendar.value.Months.splice(index, 1);
  recalculateZodiacs();
};

const addZodiac = () => {
  if (editableCalendar.value.Zodiac.length >= 20) return;
  editableCalendar.value.Zodiac.push({
    Name: `Zodiac ${editableCalendar.value.Zodiac.length + 1}`,
    End: totalCalendarDays.value
  });
  recalculateZodiacs();
};

const removeZodiac = (index) => {
  if (editableCalendar.value.Zodiac.length <= 1) return;
  editableCalendar.value.Zodiac.splice(index, 1);
  recalculateZodiacs();
};

const recalculateZodiacs = () => {
  const total = totalCalendarDays.value;
  const zodiacCount = editableCalendar.value.Zodiac.length;

  if (zodiacCount === 0 || total === 0) return;

  // Distribute days evenly across zodiac signs
  const daysPerZodiac = total / zodiacCount;

  editableCalendar.value.Zodiac.forEach((zodiac, index) => {
    // Calculate cumulative end day (rounded)
    zodiac.End = Math.round(daysPerZodiac * (index + 1));
  });
};

const saveCalendarChanges = () => {
  // Show confirmation dialog before saving
  calendarConfirmAcknowledged.value = false;
  showCalendarConfirmDialog.value = true;
};

const cancelCalendarConfirm = () => {
  showCalendarConfirmDialog.value = false;
  calendarConfirmAcknowledged.value = false;
};

const confirmSaveCalendar = async () => {
  if (isSavingCalendar.value || !calendarConfirmAcknowledged.value) return;

  isSavingCalendar.value = true;

  try {
    const updateData = {
      Calendar: editableCalendar.value,
      OldCalendar: realmStore.activeRealm?.Calendar || null  // Send old calendar for report date conversion
    };

    const response = await axios.put(
      `${import.meta.env.VITE_API_BASE_URL}/realms/realm/${realmStore.activeRealm.RealmID}`,
      updateData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userStore.user.auth.idToken}`
        }
      }
    );

    if (response.status === 200) {
      // Update the local realm store with the new calendar
      realmStore.activeRealm.Calendar = editableCalendar.value;

      showToast('Calendar updated successfully!', 'success');
      closeCalendarEditor();
    } else {
      throw new Error('Failed to update calendar');
    }
  } catch (error) {
    console.error('Error updating calendar:', error);
    let errorMessage = 'Failed to update calendar. Please try again.';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    }
    showToast(errorMessage, 'error');
  } finally {
    isSavingCalendar.value = false;
    showCalendarConfirmDialog.value = false;
  }
};

const sendInvitation = async () => {
  if (!inviteForm.value.email || isSending.value) return;
  
  isSending.value = true;
  
  try {
    const invitationData = {
      email: inviteForm.value.email.toLowerCase().trim(),
      realmId: userStore.activeRealmId,
      realmName: realmStore.activeRealm?.Name,
      message: inviteForm.value.message,
      expirationHours: inviteForm.value.expirationHours,
      inviterUserId: userStore.userSub,
      inviterName: userStore.fullName
    };

    const response = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL}/invitations/invite`,
      invitationData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userStore.user.auth.idToken}`
        }
      }
    );

    const result = response.data;
    
    const newInvitation = {
      invitationId: result.invitationId || `inv_${Date.now()}`,
      email: inviteForm.value.email,
      realmId: userStore.activeRealmId,
      ttl: result.ttl || Math.floor((Date.now() + inviteForm.value.expirationHours * 60 * 60 * 1000) / 1000),
      status: 'PENDING'
    };
    
    // Capture the email before closing modal (which resets the form)
    const invitedEmail = inviteForm.value.email;
    
    pendingInvitations.value.push(newInvitation);
    closeModal();
    showToast(`Invitation sent to ${invitedEmail}!`, 'success');
    
  } catch (error) {
    console.error('Error sending invitation:', error);
    let errorMessage = 'Failed to send invitation. Please try again.';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    }
    showToast(errorMessage, 'error');
  } finally {
    isSending.value = false;
  }
};

const cancelInvitation = async (invitationId) => {
  if (!confirm('Are you sure you want to cancel this invitation?')) return;
  
  try {
    // Find the invitation to get the email and realmId for the delete request
    const invitation = pendingInvitations.value.find(inv => inv.invitationId === invitationId);
    if (!invitation) {
      showToast('Invitation not found.', 'error');
      return;
    }

    // Call API to delete the invitation
    await axios.delete(
      `${import.meta.env.VITE_API_BASE_URL}/invitations`,
      {
        params: {
          email: invitation.email,
          realmId: invitation.realmId
        },
        headers: {
          'Authorization': `Bearer ${userStore.user.auth.idToken}`
        }
      }
    );

    // Remove from local array on success
    pendingInvitations.value = pendingInvitations.value.filter(
      inv => inv.invitationId !== invitationId
    );
    showToast('Invitation canceled successfully.', 'success');
  } catch (error) {
    console.error('Error canceling invitation:', error);
    let errorMessage = 'Failed to cancel invitation.';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    }
    showToast(errorMessage, 'error');
  }
};

const formatExpiration = (ttl) => {
  const expirationDate = new Date(ttl * 1000);
  const now = new Date();
  const diffMs = expirationDate - now;
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  
  if (diffHours < 24) {
    return `in ${diffHours} hours`;
  } else {
    const diffDays = Math.ceil(diffHours / 24);
    return `in ${diffDays} days`;
  }
};

// Format the current realm date
const formatCurrentDate = () => {
  return dateStore.strDate;
};

// Format session date/time for display
const formatSessionDateTime = (unixTimestamp) => {
  const date = new Date(unixTimestamp * 1000);
  const now = new Date();
  const diffMs = date - now;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  if (diffDays === 0) {
    return `Today at ${timeStr}`;
  } else if (diffDays === 1) {
    return `Tomorrow at ${timeStr}`;
  } else if (diffDays < 7) {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    return `${dayName} at ${timeStr}`;
  } else {
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
    return `${dateStr} at ${timeStr}`;
  }
};

// Delete realm confirmation
const confirmDeleteRealm = async () => {
  if (!canConfirmDelete.value || isDeletingRealm.value) return;

  isDeletingRealm.value = true;
  try {
    await realmStore.deleteRealm(realmStore.activeRealmId);
    showDeleteRealmDialog.value = false;
    showToast('Realm deleted successfully', 'success');
    router.push('/account');
  } catch (error) {
    console.error('Failed to delete realm:', error);
    const errorMessage = error.response?.data?.error?.message
      || error.response?.data?.message
      || 'Failed to delete realm. Please try again.';
    showToast(errorMessage, 'error');
  } finally {
    isDeletingRealm.value = false;
  }
};

// Simple toast notification
const showToast = (message, type = 'info') => {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  Object.assign(toast.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 24px',
    borderRadius: '8px',
    color: 'white',
    fontWeight: '600',
    zIndex: '9999',
    maxWidth: '300px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    transform: 'translateX(100%)',
    transition: 'transform 0.3s ease',
    backgroundColor: type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'
  });
  
  document.body.appendChild(toast);
  setTimeout(() => toast.style.transform = 'translateX(0)', 100);
  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.parentNode?.removeChild(toast), 300);
  }, 3000);
};

// Load pending invitations for the realm
const loadPendingInvitations = async () => {
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL}/invitations/realm/${realmStore.activeRealmId}`,
      {
        headers: {
          'Authorization': `Bearer ${userStore.user.auth.idToken}`
        }
      }
    );

    if (response.status === 200 && response.data.success) {
      // Filter for only pending invitations
      const pending = (response.data.data || []).filter(invite => 
        invite.status === 'PENDING' || invite.status === 'pending'
      );
      pendingInvitations.value = pending;
      console.log(`✅ Loaded ${pending.length} pending invitations`);
    }
  } catch (error) {
    console.error('Error loading pending invitations:', error);
    // Don't show error toast for this as it's not critical
  }
};

// Subscription dialog functions
const openSubscriptionDialog = async () => {
  showSubscriptionDialog.value = true;
  // Load subscriptions when opening dialog
  if (!subscriptionStore.loaded) {
    await subscriptionStore.loadSubscriptions();
  }
  // Preselect current plan when dialog opens
  selectedPlanTier.value = realmTier.value.toLowerCase();
  selectedPlan.value = subscriptionStore.allSubscriptions.find(
    sub => sub.Tier.toLowerCase() === realmTier.value.toLowerCase()
  ) || null;
};

const closeSubscriptionDialog = () => {
  showSubscriptionDialog.value = false;
  selectedPlanTier.value = '';
  selectedPlan.value = null;
};

// Reload dialog functions
const showReloadDialogWithReason = (reason) => {
  reloadReason.value = reason;
  showReloadDialog.value = true;
  nextTick(() => {
    reloadDialog.value?.showModal();
  });
};

const closeReloadDialog = () => {
  reloadDialog.value?.close();
  showReloadDialog.value = false;
  reloadReason.value = '';
  isReloading.value = false;
};

const confirmReload = () => {
  isReloading.value = true;
  window.location.reload();
};

const selectPlan = async (plan) => {
  selectedPlanTier.value = plan.Tier;
  selectedPlan.value = plan;

  // Fetch Patreon billing info when selecting a Patreon upgrade tier
  if (plan.RequiresPatreonFellowship && hasPatreonBenefit.value) {
    await fetchPatreonBillingInfo();
  } else {
    // Clear billing info for non-Patreon tiers
    patreonBillingInfo.value = null;
    billingInfoError.value = null;
  }
};

const fetchPatreonBillingInfo = async () => {
  isLoadingBillingInfo.value = true;
  billingInfoError.value = null;

  try {
    const response = await axios.get(
      `${import.meta.env.VITE_PAYPAL_API_BASE_URL}/subscriptions/patreon-billing-info`,
      {
        headers: {
          Authorization: `Bearer ${userStore.idToken}`
        }
      }
    );

    if (response.data.success && response.data.data.hasBillingInfo) {
      patreonBillingInfo.value = response.data.data;
    } else {
      patreonBillingInfo.value = null;
    }
  } catch (error) {
    console.error('Failed to fetch Patreon billing info:', error);
    billingInfoError.value = 'Could not load billing sync information';
    patreonBillingInfo.value = null;
  } finally {
    isLoadingBillingInfo.value = false;
  }
};

// Computed props for Patreon billing sync
const isPatreonUpgradeTier = computed(() => {
  return selectedPlan.value?.RequiresPatreonFellowship && hasPatreonBenefit.value;
});

const proratedAmount = computed(() => {
  if (!isPatreonUpgradeTier.value || !patreonBillingInfo.value || !selectedPlan.value?.Cost) {
    return null;
  }

  const monthlyCostCents = selectedPlan.value.Cost;
  const daysRemaining = patreonBillingInfo.value.daysUntilNextBilling;
  const dailyRate = monthlyCostCents / 30;
  const proration = Math.round(dailyRate * daysRemaining);

  return {
    cents: proration,
    display: `$${(proration / 100).toFixed(2)}`,
    daysCharged: daysRemaining
  };
});

const patreonSyncStartTime = computed(() => {
  if (!patreonBillingInfo.value?.nextBillingDate) return null;
  return patreonBillingInfo.value.nextBillingDate;
});

const patreonSyncSetupFee = computed(() => {
  if (!proratedAmount.value) return null;
  return {
    value: (proratedAmount.value.cents / 100).toFixed(2),
    currency_code: 'USD'
  };
});

const canUpgrade = computed(() => {
  return selectedPlanTier.value && selectedPlanTier.value !== realmTier.value.toLowerCase();
});

const nextBillingDate = computed(() => {
  // This would ideally come from the realm's subscription data
  // For now, we'll show a placeholder date
  // In a real implementation, this should be fetched from the backend
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  return nextMonth.toLocaleDateString();
});

const isUpgrade = computed(() => {
  if (!selectedPlan.value || !currentPlan.value) return false;
  return selectedPlan.value.Cost > currentPlan.value.Cost;
});

const isUpgradeFromFree = computed(() => {
  return currentPlan.value?.Tier === 'free' && isUpgrade.value;
});

const getActionButtonText = () => {
  if (selectedPlanTier.value === realmTier.value.toLowerCase()) {
    return 'Current Plan';
  }
  if (isUpgrade.value) {
    return 'Upgrade Plan';
  } else {
    return selectedPlan.value?.Tier === 'free' ? 'Schedule Free Transition' : 'Schedule Downgrade';
  }
};

const upgradePlan = () => {
  if (!canUpgrade.value) return;
  
  // Handle free downgrade
  if (selectedPlan.value?.Tier === 'free') {
    // Call the free downgrade API
    alert(`Free downgrade functionality will be implemented here. Your current plan will remain active until your next billing date.`);
  } else {
    // Fallback upgrade function (non-PayPal)
    alert(`Upgrade functionality will be implemented here. Selected plan: ${selectedPlan.value?.Name || selectedPlanTier.value}`);
  }
  closeSubscriptionDialog();
};

// PayPal event handlers
const handlePayPalClick = () => {
  console.log('PayPal subscription button clicked');
  showToast('Redirecting to PayPal...', 'info');
};

const handlePayPalSuccess = async (data) => {
  try {
    console.log('PayPal subscription successful:', data);
    
    // Save plan name before closing dialog (which clears selectedPlan)
    const planName = selectedPlan.value?.Name || selectedPlanTier.value;
    
    // Show success message
    showToast(`Successfully subscribed to ${planName} plan!`, 'success');
    
    // Refresh realm data to get updated subscription tier
    await realmStore.getRealms();
    
    // Close subscription dialog
    closeSubscriptionDialog();
    
  } catch (error) {
    console.error('Error handling PayPal success:', error);
    showToast('Subscription successful, but there was an error updating your account. Please refresh the page.', 'error');
  }
};

const handlePayPalError = (error) => {
  console.error('PayPal subscription error:', error);
  
  let errorMessage = 'There was an error processing your subscription. Please try again.';
  
  if (error && typeof error === 'object') {
    if (error.message) {
      errorMessage = error.message;
    } else if (error.name === 'VALIDATION_ERROR') {
      errorMessage = 'Please check your payment information and try again.';
    } else if (error.name === 'INSTRUMENT_DECLINED') {
      errorMessage = 'Your payment method was declined. Please try a different payment method.';
    }
  }
  
  showToast(errorMessage, 'error');
};

const handlePayPalCancel = (data) => {
  console.log('PayPal subscription cancelled:', data);
  showToast('Subscription cancelled. You can try again anytime.', 'info');
};

// Credit-based subscription purchase
const hasSufficientCredits = computed(() => {
  if (!selectedPlan.value || selectedPlan.value.Tier === 'free') {
    return false;
  }
  const costCents = selectedPlan.value.Cost;
  const balanceCents = accountStore.creditBalance;
  return balanceCents >= costCents;
});

const purchaseWithCredits = async () => {
  if (!selectedPlan.value || isProcessingCreditPayment.value) {
    return;
  }

  try {
    isProcessingCreditPayment.value = true;

    const planName = selectedPlan.value.Name || selectedPlanTier.value;
    const realmId = realmStore.activeRealmId;
    const tier = selectedPlan.value.Tier;

    console.log('Purchasing subscription with credits:', { realmId, tier });

    // Call the API to purchase subscription with credits
    const result = await patreonService.purchaseSubscriptionWithCredits(realmId, tier);

    console.log('Credit subscription purchase successful:', result);

    // Update credit balance in account store
    if (result.newCreditBalance !== undefined) {
      accountStore.creditBalance = result.newCreditBalance;
    }

    // Show success message
    showToast(`Successfully subscribed to ${planName} plan using credits!`, 'success');

    // Refresh realm data to get updated subscription tier
    await realmStore.getRealms();

    // Refresh account data to get updated credit balance
    await accountStore.refreshCreditBalance();

    // Close subscription dialog
    closeSubscriptionDialog();

  } catch (error) {
    console.error('Error purchasing subscription with credits:', error);

    let errorMessage = 'Failed to purchase subscription with credits. Please try again.';

    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    showToast(errorMessage, 'error');
  } finally {
    isProcessingCreditPayment.value = false;
  }
};

// Watch for dialog state changes and control dialogs
watch(showInviteModal, (newValue) => {
  if (newValue) {
    inviteDialog.value?.showModal();
  } else {
    inviteDialog.value?.close();
  }
});

watch(showStatusModal, (newValue) => {
  if (newValue) {
    statusDialog.value?.showModal();
  } else {
    statusDialog.value?.close();
  }
});

watch(showRemoveModal, (newValue) => {
  if (newValue) {
    removeDialog.value?.showModal();
  } else {
    removeDialog.value?.close();
  }
});

watch(showCalendarEditor, (newValue) => {
  if (newValue) {
    calendarDialog.value?.showModal();
  } else {
    calendarDialog.value?.close();
  }
});

watch(showCalendarConfirmDialog, async (newValue) => {
  if (newValue) {
    await nextTick();
    calendarConfirmDialog.value?.showModal();
  } else {
    calendarConfirmDialog.value?.close();
  }
});

watch(showDeleteRealmDialog, async (newValue) => {
  if (newValue) {
    deleteRealmConfirmName.value = '';
    deleteRealmAcknowledged.value = false;
    await nextTick();
    deleteRealmDialogRef.value?.showModal();
  } else {
    deleteRealmDialogRef.value?.close();
  }
});

// Watch for changes to total calendar days (month days changed) and recalculate zodiacs
watch(totalCalendarDays, () => {
  if (showCalendarEditor.value && editableCalendar.value.Zodiac.length > 0) {
    recalculateZodiacs();
  }
});

onMounted(async () => {
  // Load gaming systems if not already loaded
  if (gamingSystemsStore) {
    try {
      await gamingSystemsStore.fetchGamingSystems();
    } catch (err) {
      console.error('Error loading gaming systems:', err);
    }
  }

  // Load pending invitations when the component mounts
  if (userStore.isOwner && realmStore.activeRealmId) {
    await loadPendingInvitations();
  }

  // Load sessions for the active realm
  if (realmStore.activeRealmId) {
    try {
      await sessionStore.loadRealmSessions(realmStore.activeRealmId);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  }
});
</script>

<style scoped>
.active-realm-details {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  background: linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 100%);
  min-height: 100vh;
  color: #ffffff;
}

/* Breadcrumb Navigation */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.breadcrumb-link {
  color: var(--theme-accent);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: color 0.3s;
}

.breadcrumb-link:hover {
  color: #e6b373;
}

.breadcrumb-separator {
  color: #6c757d;
}

.breadcrumb-current {
  color: var(--theme-text-primary);
  font-weight: 500;
}

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid var(--theme-accent);
  border-radius: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.header-content {
  width: 100%;
}

.realm-info {
  width: 100%;
}

.realm-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--theme-bg-surface);
  font-size: 2.5rem;
  flex-shrink: 0;
  box-shadow: 0 4px 15px color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.realm-info h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--theme-accent);
  margin: 0 0 0.5rem 0;
}

.realm-description {
  color: var(--theme-text-primary);
  font-size: 1.2rem;
  margin: 0;
  opacity: 0.9;
}

/* Subscription Info */
.subscription-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  margin-top: 1rem;
}

/* Tier Badge */
.realm-tier {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.75rem;
}

.patreon-badge {
  font-size: 1.2em;
}

.tier-label {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.tier-value {
  font-size: 1rem;
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

.header-stats {
  display: flex;
  gap: 1rem;
}

.stat-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  min-width: 100px;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--theme-accent);
  line-height: 1;
}

.stat-label {
  font-size: 0.9rem;
  color: #ccc;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 0.25rem;
}

/* Sessions Section */
.sessions-section {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.sessions-section .section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.sessions-section .section-header h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.5rem;
  color: var(--theme-accent);
}

.sessions-section .section-header .material-symbols-outlined {
  font-size: 1.75rem;
}

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.session-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-radius: 0.75rem;
  padding: 1.25rem;
  transition: all 0.3s ease;
}

.session-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: color-mix(in srgb, var(--theme-accent) 40%, transparent);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--theme-accent) 10%, transparent);
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.session-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #ffffff;
  flex: 1;
}

.session-status {
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.session-status.status-scheduled {
  background: rgba(40, 167, 69, 0.2);
  color: #28a745;
  border: 1px solid rgba(40, 167, 69, 0.4);
}

.session-status.status-in_progress {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
  border: 1px solid rgba(255, 193, 7, 0.4);
}

.session-status.status-completed {
  background: rgba(108, 117, 125, 0.2);
  color: #6c757d;
  border: 1px solid rgba(108, 117, 125, 0.4);
}

.session-status.status-cancelled {
  background: rgba(220, 53, 69, 0.2);
  color: #dc3545;
  border: 1px solid rgba(220, 53, 69, 0.4);
}

.session-details {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 0.5rem;
}

.session-datetime,
.session-duration {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--theme-text-primary);
  font-size: 0.875rem;
}

.session-datetime .material-symbols-outlined,
.session-duration .material-symbols-outlined {
  font-size: 1rem;
  color: var(--theme-accent);
}

.session-description {
  margin: 0.75rem 0 0 0;
  color: #c1c1cd;
  font-size: 0.875rem;
  line-height: 1.5;
}

.no-sessions {
  text-align: center;
  padding: 1em;
  color: #888;
}

.no-sessions .material-symbols-outlined {
  font-size: 2rem;
  color: #555;
  margin-bottom: 0.5rem;
}

.no-sessions p {
  margin: 0;
  font-size: 1rem;
}

.create-first-session-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, var(--theme-accent) 0%, #ff9a3d 100%);
  color: #0a0e1a;
  border-radius: 0.5rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.create-first-session-btn:hover {
  background: linear-gradient(135deg, #ff9a3d 0%, #ff8a2b 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--theme-accent) 40%, transparent);
}

.view-all-sessions-link {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 1rem;
  color: var(--theme-accent);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
}

.view-all-sessions-link:hover {
  color: #ff9a3d;
  gap: 0.625rem;
}

.view-all-sessions-link .material-symbols-outlined {
  font-size: 1.125rem;
}

/* Player Management Section */
.player-management {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border-radius: 1rem;
  padding: 1.5rem;
  border: 1px solid #444;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h2 {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
  color: var(--theme-accent);
  font-size: 1.8rem;
  font-weight: 600;
}

.invite-btn {
  background: linear-gradient(135deg, #28a745 0%, #20803d 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.invite-btn:hover {
  background: linear-gradient(135deg, #20803d 0%, #1c6e34 100%);
  transform: translateY(-1px);
}

@media (max-width: 640px) {
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem; /* adds spacing between the title and button */
  }

  .section-actions {
    width: 100%;
  }

  .invite-btn {
    width: 100%; /* optional: make the button full-width on mobile */
    justify-content: center;
  }
}

/* Player List Widget */
.player-list-widget {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  overflow: hidden;
}

.widget-header {
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  padding: 1.5rem;
  border-bottom: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.widget-header h3 {
  margin: 0;
  color: var(--theme-accent);
  font-size: 1.3rem;
}

.player-count-info {
  color: var(--theme-text-primary);
  font-size: 0.9rem;
}

.slots-remaining {
  color: #28a745;
}

.at-capacity {
  color: #dc3545;
  font-weight: 600;
}

.players-list {
  max-height: 600px;
  overflow-y: auto;
}

.players-header-row {
  display: grid;
  grid-template-columns: 2fr 2fr 1fr 1fr;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: color-mix(in srgb, var(--theme-accent) 5%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--theme-accent) 10%, transparent);
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--theme-accent);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.player-item {
  display: grid;
  grid-template-columns: 2fr 2fr 1fr 1fr;
  gap: 1rem;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
}

.player-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.player-item.is-dm {
  background: linear-gradient(135deg, rgba(220, 53, 69, 0.03) 0%, rgba(220, 53, 69, 0.01) 100%);
  border-left: 3px solid #dc3545;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.player-avatar {
  position: relative;
  display: flex;
  align-items: center;
}

.role-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.role-icon.role-dm {
  background: rgba(220, 53, 69, 0.2);
  color: #dc3545;
}

.role-icon.role-player {
  background: rgba(46, 204, 113, 0.2);
  color: var(--theme-success);
}

.status-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--theme-bg-surface);
}

.status-indicator.online {
  background: #28a745;
}

.status-indicator.offline {
  background: #6c757d;
}

.player-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.player-name {
  font-weight: 600;
  color: var(--theme-text-primary);
  font-size: 1rem;
}

.dm-badge {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  color: white;
  font-size: 0.7rem;
  font-weight: bold;
  padding: 0.2rem 0.5rem;
  border-radius: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  width: fit-content;
}

.character-select {
  background: #1a1f2e;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  padding: 0.5rem;
  color: var(--theme-text-primary);
  font-size: 0.9rem;
  width: 100%;
  cursor: pointer;
  transition: all 0.3s ease;
}

.character-select:hover:not(:disabled) {
  background: #242938;
  border-color: color-mix(in srgb, var(--theme-accent) 50%, transparent);
}

.character-select:focus {
  outline: none;
  border-color: var(--theme-accent);
  background: #242938;
}

.character-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.character-select option {
  background: #1a1f2e;
  color: var(--theme-text-primary);
  padding: 0.5rem;
}

.character-name {
  color: var(--theme-text-primary);
  font-style: italic;
  font-size: 0.9rem;
}

.character-name.dm-na {
  color: #888;
  font-weight: 500;
}

.player-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-active {
  color: #28a745;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 500;
}

.status-inactive {
  color: #6c757d;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 500;
}

.status-active .material-symbols-outlined,
.status-inactive .material-symbols-outlined {
  font-size: 1rem;
}

.player-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  padding: 0.5rem;
  color: var(--theme-text-primary);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.view-btn:hover {
  border-color: #17a2b8;
  color: #17a2b8;
}

.remove-btn:hover {
  border-color: #dc3545;
  color: #dc3545;
}

.activate-btn:hover {
  border-color: #28a745;
  color: #28a745;
}

.deactivate-btn:hover {
  border-color: #ffc107;
  color: #ffc107;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn:disabled:hover {
  border-color: rgba(255, 255, 255, 0.2);
  color: var(--theme-text-primary);
}

/* Empty State */
.empty-player-list {
  text-align: center;
  padding: 4rem 2rem;
  color: #6c757d;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  color: #444;
}

.empty-player-list h3 {
  color: var(--theme-accent);
  margin-bottom: 1rem;
}

.invite-btn-large {
  background: linear-gradient(135deg, #28a745 0%, #20803d 100%);
  color: white;
  border: none;
  border-radius: 0.75rem;
  padding: 1rem 2rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
}

/* Calendar Section */
.calendar-section {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-top: 1rem;
  border: 1px solid #444;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.calendar-panel {
  background: color-mix(in srgb, var(--theme-accent) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-radius: 0.75rem;
  padding: 2rem;
}

.current-date {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.date-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--theme-bg-surface);
  font-size: 2rem;
  flex-shrink: 0;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.date-info {
  flex: 1;
}

.date-display {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--theme-accent);
  line-height: 1.2;
  margin-bottom: 0.5rem;
}

.date-details {
  color: var(--theme-text-primary);
  font-size: 1rem;
  opacity: 0.8;
}

/* Gaming System Section */
.gaming-system-section {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-top: 1rem;
  border: 1px solid #444;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.gaming-system-section .section-header {
  margin-bottom: 0;
}

.gaming-system-panel {
  background: color-mix(in srgb, var(--theme-accent) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-radius: 0.75rem;
  padding: 1.5rem;
}

.gaming-system-rows {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.gaming-system-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 0.5rem;
  border: 1px solid color-mix(in srgb, var(--theme-accent) 10%, transparent);
}

.gaming-system-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: var(--theme-accent);
  font-size: 1rem;
}

.gaming-system-label .material-symbols-outlined {
  font-size: 1.25rem;
  color: var(--theme-accent);
}

.gaming-system-value {
  color: var(--theme-text-primary);
  font-size: 1rem;
  font-weight: 500;
}

.no-gaming-system {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
  text-align: center;
  color: #999;
}

.no-gaming-system .material-symbols-outlined {
  font-size: 4rem;
  color: #666;
}

.no-gaming-system p {
  margin: 0;
  font-size: 1.1rem;
}

.no-gaming-system .setup-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1.5rem;
  width: 100%;
  max-width: 400px;
}

.no-gaming-system .setup-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  text-decoration: none;
  border-radius: 0.5rem;
  font-weight: 600;
  transition: all 0.3s ease;
  border: none;
  cursor: pointer;
  font-size: 1rem;
}

.no-gaming-system .setup-btn.default-btn {
  background: linear-gradient(135deg, var(--theme-success) 0%, #27ae60 100%);
  color: #ffffff;
}

.no-gaming-system .setup-btn.default-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(46, 204, 113, 0.3);
}

.no-gaming-system .setup-btn.default-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.no-gaming-system .setup-btn.custom-btn {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #ff9a56 100%);
  color: #1a1f2e;
}

.no-gaming-system .setup-btn.custom-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

@media (min-width: 600px) {
  .no-gaming-system .setup-actions {
    flex-direction: row;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.toggle-panel-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 0.5rem;
  color: var(--theme-accent);
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-panel-btn:hover {
  background: color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-color: color-mix(in srgb, var(--theme-accent) 50%, transparent);
}

.toggle-panel-btn .material-symbols-outlined {
  font-size: 1.5rem;
}

.manage-gaming-system-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  text-decoration: none;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
}

.manage-gaming-system-btn:hover {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--theme-accent) 30%, transparent);
  text-decoration: none;
}

.manage-gaming-system-btn .material-symbols-outlined {
  font-size: 1.2rem;
}

/* Pending Invitations */
.pending-invitations {
  margin-top: 2rem;
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.2);
  border-radius: 0.75rem;
  padding: 1.5rem;
}

.pending-invitations h4 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1rem 0;
  color: #ffc107;
}

.invitation-count {
  background: #ffc107;
  color: var(--theme-bg-surface);
  font-size: 0.7rem;
  font-weight: bold;
  padding: 0.2rem 0.5rem;
  border-radius: 1rem;
  min-width: 1.2rem;
  text-align: center;
}

.no-pending-invitations {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(40, 167, 69, 0.05);
  border: 1px solid rgba(40, 167, 69, 0.2);
  border-radius: 0.5rem;
  color: #28a745;
}

.no-pending-invitations p {
  margin: 0;
  font-style: italic;
}

.invitation-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.invitation-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 1rem;
}

.invitation-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.invitation-info .email {
  color: var(--theme-accent);
  font-weight: 600;
}

.invitation-info .expires {
  color: #888;
  font-size: 0.8rem;
}

.cancel-btn {
  background: transparent;
  border: 1px solid #dc3545;
  color: #dc3545;
  border-radius: 0.5rem;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cancel-btn:hover {
  background: #dc3545;
  color: white;
}

/* Modal Styles */
/* Dialog Elements */
.invite-dialog,
.status-dialog,
.remove-dialog,
.calendar-dialog {
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

.calendar-dialog {
  max-width: 800px;
}

.invite-dialog::backdrop,
.status-dialog::backdrop,
.remove-dialog::backdrop,
.calendar-dialog::backdrop {
  background: rgba(0, 0, 0, 0.8);
}

/* Status Modal Specific Styles */
.status-modal {
  max-width: 500px;
}

.status-confirmation {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.player-info-display {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
}

.player-avatar-display .role-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  background: rgba(46, 204, 113, 0.2);
  color: var(--theme-success);
}

.player-details-display {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.player-name-display {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--theme-accent);
}

.current-status {
  font-size: 0.9rem;
  color: var(--theme-text-primary);
}

.action-description {
  text-align: center;
}

.action-description p {
  color: var(--theme-text-primary);
  margin: 0 0 1rem 0;
  font-size: 1rem;
}

.activation-note,
.deactivation-note {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
}

.activation-note {
  background: rgba(40, 167, 69, 0.1);
  border: 1px solid rgba(40, 167, 69, 0.3);
  color: #28a745;
}

.deactivation-note {
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  color: #ffc107;
}

.capacity-warning {
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.3);
  color: #dc3545;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
}

.capacity-warning .warning-content {
  flex: 1;
}

.capacity-warning .warning-content strong {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.capacity-warning .warning-content p {
  margin: 0 0 0.75rem 0;
  line-height: 1.4;
}

.capacity-warning .warning-content ul {
  margin: 0;
  padding-left: 1.2rem;
  line-height: 1.5;
}

.capacity-warning .warning-content li {
  margin-bottom: 0.25rem;
}

.removal-warning {
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.3);
  color: #dc3545;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
}

.removal-warning .warning-content {
  flex: 1;
}

.removal-warning .warning-content strong {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.removal-warning .warning-content p {
  margin: 0;
  line-height: 1.4;
}

.btn-confirm {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  color: white;
}

.btn-activate {
  background: linear-gradient(135deg, #28a745 0%, #20803d 100%);
}

.btn-activate:hover:not(:disabled) {
  background: linear-gradient(135deg, #20803d 0%, #1c6e34 100%);
  transform: translateY(-1px);
}

.btn-deactivate {
  background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%);
  color: var(--theme-bg-surface);
}

.btn-deactivate:hover:not(:disabled) {
  background: linear-gradient(135deg, #e0a800 0%, #d39e00 100%);
  transform: translateY(-1px);
}

.btn-blocked {
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
  color: white;
}

.btn-blocked:hover {
  background: linear-gradient(135deg, #5a6268 0%, #545b62 100%);
  transform: none;
}

.btn-remove {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  color: white;
}

.btn-remove:hover:not(:disabled) {
  background: linear-gradient(135deg, #c82333 0%, #bd2130 100%);
  transform: translateY(-1px);
}

.btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
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

.capacity-warning-banner,
.capacity-info-banner {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
}

.capacity-warning-banner {
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.3);
  color: #dc3545;
}

.capacity-info-banner {
  background: rgba(46, 204, 113, 0.1);
  border: 1px solid rgba(46, 204, 113, 0.3);
  color: var(--theme-success);
}

.invite-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field label {
  color: var(--theme-accent);
  font-weight: 600;
  font-size: 0.9rem;
}

.email-input,
.message-input {
  background: #1a1f2e;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  padding: 0.75rem;
  color: var(--theme-text-primary);
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.expiration-select {
  background: #1a1f2e;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  padding: 0.75rem;
  color: var(--theme-text-primary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.email-input:hover,
.message-input:hover {
  background: #242938;
  border-color: color-mix(in srgb, var(--theme-accent) 50%, transparent);
}

.expiration-select:hover {
  background: #242938;
  border-color: color-mix(in srgb, var(--theme-accent) 50%, transparent);
}

.email-input:focus,
.message-input:focus,
.expiration-select:focus {
  outline: none;
  border-color: var(--theme-accent);
  background: #242938;
}

.expiration-select option {
  background: #1a1f2e;
  color: var(--theme-text-primary);
  padding: 0.5rem;
}

.field-hint {
  color: #888;
  font-size: 0.8rem;
  font-style: italic;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #444;
}

.btn-cancel,
.btn-send {
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

.btn-send {
  background: linear-gradient(135deg, #28a745 0%, #20803d 100%);
  border: none;
  color: white;
}

.btn-send:hover:not(:disabled) {
  background: linear-gradient(135deg, #20803d 0%, #1c6e34 100%);
}

.btn-send:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Responsive Design */
@media (max-width: 768px) {
  .active-realm-details {
    padding: 1rem;
  }
  
  .page-header {
    flex-direction: column;
    gap: 1.5rem;
    text-align: center;
  }

  .header-content {
    text-align: center;
  }

  .subscription-info {
    align-items: center;
  }
  
  .players-header-row,
  .player-item {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .player-item {
    text-align: left;
  }
  
  .player-actions {
    justify-content: flex-start;
  }
  
  .modal-content {
    width: 95%;
    margin: 1rem;
  }
}

/* Calendar Editor Styles */
.edit-calendar-btn {
  background: color-mix(in srgb, var(--theme-accent) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  color: var(--theme-accent);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.edit-calendar-btn:hover {
  background: color-mix(in srgb, var(--theme-accent) 25%, transparent);
  border-color: var(--theme-accent);
  transform: translateY(-1px);
}

.calendar-editor-modal {
  max-width: 900px;
  width: 95%;
}

.calendar-customization {
  margin-top: 1rem;
}

.customization-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.customization-header p {
  color: var(--theme-text-primary);
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
  flex: 1;
  min-width: 200px;
}

.calendar-preset-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.reset-btn {
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
  border: 1px solid;
}

.thegamednd-btn {
  background: color-mix(in srgb, var(--theme-accent) 15%, transparent);
  border-color: color-mix(in srgb, var(--theme-accent) 30%, transparent);
  color: var(--theme-accent);
}

.thegamednd-btn:hover {
  background: color-mix(in srgb, var(--theme-accent) 25%, transparent);
  border-color: var(--theme-accent);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--theme-accent) 20%, transparent);
}

.gregorian-btn {
  background: rgba(23, 162, 184, 0.15);
  border-color: rgba(23, 162, 184, 0.3);
  color: #17a2b8;
}

.gregorian-btn:hover {
  background: rgba(23, 162, 184, 0.25);
  border-color: #17a2b8;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(23, 162, 184, 0.2);
}

.greyhawk-btn {
  background: rgba(138, 43, 226, 0.15);
  border-color: rgba(138, 43, 226, 0.3);
  color: #a855f7;
}

.greyhawk-btn:hover {
  background: rgba(138, 43, 226, 0.25);
  border-color: #a855f7;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(138, 43, 226, 0.2);
}

.custom-btn {
  background: rgba(76, 175, 80, 0.15);
  border-color: rgba(76, 175, 80, 0.3);
  color: #81c784;
}

.custom-btn:hover {
  background: rgba(76, 175, 80, 0.25);
  border-color: #81c784;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.2);
}

.calendar-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  color: var(--theme-accent);
  font-size: 0.9rem;
}

.calendar-summary .separator {
  opacity: 0.5;
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.month-field {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  padding: 1rem;
  min-width: 0; /* Allow shrinking */
}

.month-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.month-header label {
  color: var(--theme-accent);
  font-weight: 500;
  font-size: 0.9rem;
  margin: 0;
}

.remove-month-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.remove-month-btn:hover:not(:disabled) {
  color: #ef5350;
  background: rgba(239, 83, 80, 0.1);
}

.remove-month-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.remove-month-btn .material-symbols-outlined {
  font-size: 1rem;
}

.month-inputs {
  display: flex;
  gap: 0.5rem;
}

.month-name-input,
.month-abbr-input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  padding: 0.6rem;
  color: var(--theme-text-primary);
  font-size: 0.85rem;
  box-sizing: border-box;
  min-width: 0; /* Allow shrinking */
}

.month-name-input {
  flex: 2;
}

.month-abbr-input {
  flex: 1;
  text-align: center;
  max-width: 60px;
}

.month-name-input:focus,
.month-abbr-input:focus,
.month-days-input:focus {
  outline: none;
  border-color: var(--theme-accent);
  background: rgba(255, 255, 255, 0.08);
}

.month-days-input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  padding: 0.6rem;
  color: var(--theme-text-primary);
  font-size: 0.85rem;
  box-sizing: border-box;
  width: 60px;
  text-align: center;
}

/* Hide number input spinners */
.month-days-input::-webkit-outer-spin-button,
.month-days-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.month-days-input[type=number] {
  -moz-appearance: textfield;
}

.add-month-container {
  display: flex;
  justify-content: center;
  margin-top: 0.5rem;
}

.add-month-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  border: 1px dashed color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 0.5rem;
  color: var(--theme-accent);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-month-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-color: var(--theme-accent);
}

.add-month-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.add-month-btn .material-symbols-outlined {
  font-size: 1.1rem;
}

/* Calendar Confirmation Dialog */
.calendar-confirm-dialog {
  background: #1a1a2e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  padding: 0;
  max-width: 480px;
  width: 90%;
  box-shadow: 0 20px 60px color-mix(in srgb, var(--theme-bg-primary) 50%, transparent);
}

.calendar-confirm-dialog::backdrop {
  background: rgba(0, 0, 0, 0.7);
}

.confirm-dialog-content {
  padding: 1.5rem;
}

.confirm-dialog-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.confirm-dialog-header h3 {
  margin: 0;
  color: var(--theme-text-primary);
  font-size: 1.25rem;
}

.confirm-dialog-header .warning-icon {
  color: #ffc107;
  font-size: 1.75rem;
}

.confirm-dialog-body {
  margin-bottom: 1.5rem;
}

.confirm-dialog-body p {
  color: #b0b0c0;
  line-height: 1.6;
  margin: 0 0 1rem 0;
}

.confirm-dialog-body .warning-text {
  color: #ef5350;
  font-weight: 500;
}

.acknowledge-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.2);
  border-radius: 0.5rem;
  cursor: pointer;
  margin-top: 1rem;
}

.acknowledge-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  accent-color: #ffc107;
  cursor: pointer;
}

.acknowledge-checkbox span {
  color: var(--theme-text-primary);
  font-size: 0.9rem;
  line-height: 1.4;
}

.confirm-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c82333;
}

.btn-danger:disabled {
  background: rgba(220, 53, 69, 0.4);
  cursor: not-allowed;
}

/* Zodiac Section Styles */
.zodiac-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.zodiac-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.zodiac-header h4 {
  margin: 0;
  color: var(--theme-accent);
  font-size: 1rem;
}

.btn-toggle-zodiac {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 0.5rem;
  color: var(--theme-text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-toggle-zodiac:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.25);
}

.btn-toggle-zodiac .material-symbols-outlined {
  font-size: 1.1rem;
}

.zodiac-config-panel {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.75rem;
  padding: 1rem;
}

.zodiac-hint {
  color: #888;
  font-size: 0.85rem;
  margin: 0 0 1rem 0;
}

.zodiac-actions {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.btn-add-zodiac,
.btn-recalculate {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-add-zodiac {
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  color: var(--theme-accent);
}

.btn-add-zodiac:hover:not(:disabled) {
  background: color-mix(in srgb, var(--theme-accent) 20%, transparent);
}

.btn-add-zodiac:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-recalculate {
  background: rgba(100, 181, 246, 0.1);
  border: 1px solid rgba(100, 181, 246, 0.3);
  color: #64b5f6;
}

.btn-recalculate:hover {
  background: rgba(100, 181, 246, 0.2);
}

.zodiac-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
}

.zodiac-field {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 0.75rem;
}

.zodiac-field-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.zodiac-field-header label {
  color: var(--theme-accent);
  font-size: 0.85rem;
  font-weight: 500;
}

.btn-remove-zodiac {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  padding: 0.2rem;
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
}

.btn-remove-zodiac:hover {
  color: #ef5350;
  background: rgba(239, 83, 80, 0.1);
}

.btn-remove-zodiac .material-symbols-outlined {
  font-size: 0.9rem;
}

.zodiac-inputs {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.zodiac-name-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.375rem;
  padding: 0.5rem;
  color: var(--theme-text-primary);
  font-size: 0.85rem;
  min-width: 0;
}

.zodiac-name-input:focus {
  outline: none;
  border-color: var(--theme-accent);
  background: rgba(255, 255, 255, 0.08);
}

.zodiac-end-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.zodiac-end-display .end-label {
  color: #888;
  font-size: 0.8rem;
  white-space: nowrap;
}

.zodiac-end-input {
  width: 60px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.375rem;
  padding: 0.5rem;
  color: var(--theme-text-primary);
  font-size: 0.85rem;
  text-align: center;
}

.zodiac-end-input:focus {
  outline: none;
  border-color: var(--theme-accent);
  background: rgba(255, 255, 255, 0.08);
}

/* Hide number input spinners for zodiac */
.zodiac-end-input::-webkit-outer-spin-button,
.zodiac-end-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.zodiac-end-input[type=number] {
  -moz-appearance: textfield;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #444;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: var(--theme-text-primary);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
}

.btn-primary {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  font-weight: 500;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.btn-primary:disabled {
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

/* Responsive adjustments for calendar editor */
@media (max-width: 768px) {
  .calendar-editor-modal {
    width: 98%;
    max-width: none;
  }
  
  .month-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .customization-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .calendar-preset-buttons {
    flex-direction: column;
    align-items: stretch;
  }
  
  .reset-btn {
    justify-content: center;
    width: 100%;
  }
}

@media (max-width: 480px) {
  .month-field {
    padding: 0.75rem;
  }
  
  .modal-footer {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
}

/* Manage Subscription Button */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.schedule-session-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  border: none;
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-decoration: none;
}

.schedule-session-btn:hover {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-1px);
  text-decoration: none;
}

.schedule-session-btn .material-symbols-outlined {
  font-size: 1rem;
}

.manage-subscription-btn {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  border: none;
  border-radius: 0.5rem;
  padding: 0.75rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.manage-subscription-btn:hover {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--theme-accent) 40%, transparent);
}

/* Subscription Dialog */
.subscription-dialog {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  border: none;
  padding: 0;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.subscription-dialog .dialog-content {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid var(--theme-accent);
  border-radius: 1rem;
  width: 50%;
  max-width: 900px;
  min-width: 500px;
  max-height: 80vh;
  color: var(--theme-text-primary);
  display: flex;
  flex-direction: column;
}

.subscription-dialog .dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1.5rem;
  border-bottom: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border-top-left-radius: 1rem;
  border-top-right-radius: 1rem;
  flex-shrink: 0;
}

.subscription-dialog .dialog-header h3 {
  margin: 0;
  color: var(--theme-accent);
  font-size: 1.25rem;
  font-weight: 700;
}

.subscription-dialog .close-btn {
  background: none;
  border: none;
  color: var(--theme-text-primary);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.3s ease;
}

.subscription-dialog .close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--theme-accent);
}

.subscription-dialog .dialog-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.subscription-dialog .current-plan h4,
.subscription-dialog .available-plans h4 {
  color: var(--theme-accent);
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
}

.subscription-dialog .current-plan p {
  margin: 0 0 1.5rem 0;
  color: #ccc;
  line-height: 1.5;
}

.subscription-dialog .current-plan-card {
  padding: 1rem;
  margin-bottom: 1.5rem;
  background: color-mix(in srgb, var(--theme-accent) 15%, transparent);
  border: 2px solid color-mix(in srgb, var(--theme-accent) 50%, transparent);
  border-radius: 0.5rem;
}

.subscription-dialog .current-plan-fallback p {
  margin: 0 0 1.5rem 0;
  color: #ccc;
  line-height: 1.5;
}

.subscription-dialog .plan-option {
  padding: 1rem;
  margin-bottom: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  transition: all 0.3s ease;
  cursor: pointer;
}

.subscription-dialog .plan-option.selected {
  background: color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-color: color-mix(in srgb, var(--theme-accent) 60%, transparent);
  border-width: 2px;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--theme-accent) 30%, transparent);
  transform: scale(1.02);
}

/* Plan selection styles removed - now using direct card selection */

.subscription-dialog .plan-content {
  width: 100%;
  margin: 0;
  display: block;
}

.subscription-dialog .plan-option:hover {
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  border-color: color-mix(in srgb, var(--theme-accent) 30%, transparent);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--theme-accent) 15%, transparent);
}

.subscription-dialog .plan-option.current-plan {
  background: color-mix(in srgb, var(--theme-accent) 15%, transparent);
  border-color: color-mix(in srgb, var(--theme-accent) 50%, transparent);
}

/* Patreon upgrade tier styles */
.subscription-dialog .plan-option.upgrade-tier {
  border-color: rgba(249, 104, 84, 0.4);
  background: rgba(249, 104, 84, 0.1);
}

.subscription-dialog .plan-option.upgrade-tier:hover {
  border-color: rgba(249, 104, 84, 0.6);
  background: rgba(249, 104, 84, 0.15);
}

.subscription-dialog .plan-option.upgrade-tier.selected {
  border-color: rgba(249, 104, 84, 0.8);
  background: rgba(249, 104, 84, 0.2);
  box-shadow: 0 2px 8px rgba(249, 104, 84, 0.3);
}

/* Fellowship placeholder for Patreon users */
.subscription-dialog .plan-option.fellowship-placeholder.disabled {
  opacity: 0.7;
  cursor: not-allowed;
  pointer-events: none;
  background: var(--surface-secondary, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
}

.patreon-badge {
  background: linear-gradient(135deg, #f96854, #ff9f7e);
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-left: 8px;
}

.patreon-upgrade-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(249, 104, 84, 0.15);
  border: 1px solid rgba(249, 104, 84, 0.3);
  border-radius: 8px;
  margin-bottom: 16px;
}

.patreon-upgrade-notice .material-symbols-outlined {
  color: #f96854;
  font-size: 24px;
}

.patreon-upgrade-notice p {
  margin: 0;
  color: var(--theme-text-primary);
  font-size: 0.9rem;
  line-height: 1.4;
}

.subscription-dialog .plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.subscription-dialog .plan-header strong {
  color: var(--theme-accent);
  font-size: 1.1rem;
}

.subscription-dialog .plan-cost {
  color: var(--theme-text-primary);
  font-weight: 600;
  font-size: 0.9rem;
}

.subscription-dialog .plan-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.subscription-dialog .feature {
  color: #ccc;
  font-size: 0.85rem;
  padding: 0.25rem 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0.25rem;
  text-align: center;
}

.subscription-dialog .loading-plans,
.subscription-dialog .error-plans {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: #ccc;
}

.subscription-dialog .loading-plans .material-symbols-outlined,
.subscription-dialog .error-plans .material-symbols-outlined {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: var(--theme-accent);
}

.subscription-dialog .spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Proration Information */
.subscription-dialog .proration-info {
  margin-top: 2rem;
  padding: 1rem;
  background: color-mix(in srgb, var(--theme-accent) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-radius: 0.5rem;
}

.subscription-dialog .proration-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  color: var(--theme-accent);
}

.subscription-dialog .proration-header .material-symbols-outlined {
  font-size: 1.2rem;
}

.subscription-dialog .proration-header strong {
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.subscription-dialog .proration-content p {
  margin: 0.5rem 0;
  color: var(--theme-text-primary);
  font-size: 0.9rem;
  line-height: 1.5;
}

.subscription-dialog .proration-content p strong {
  color: var(--theme-accent);
  margin-right: 0.25rem;
}

.subscription-dialog .proration-note {
  margin-top: 0.75rem !important;
  padding-top: 0.75rem;
  border-top: 1px solid color-mix(in srgb, var(--theme-accent) 10%, transparent);
  font-style: italic;
  color: color-mix(in srgb, var(--theme-accent) 80%, transparent) !important;
}

/* Patreon Billing Sync Styles */
.subscription-dialog .patreon-billing-sync {
  margin-top: 0.5rem;
}

.subscription-dialog .billing-loading,
.subscription-dialog .billing-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
}

.subscription-dialog .billing-loading {
  color: var(--theme-accent);
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
}

.subscription-dialog .billing-loading .spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.subscription-dialog .billing-error {
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
}

.subscription-dialog .billing-sync-details {
  background: rgba(249, 104, 84, 0.08);
  border: 1px solid rgba(249, 104, 84, 0.3);
  border-radius: 0.5rem;
  padding: 1rem;
}

.subscription-dialog .sync-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1rem 0;
  color: #f96854;
}

.subscription-dialog .sync-header .material-symbols-outlined {
  font-size: 1.2rem;
}

.subscription-dialog .sync-breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.subscription-dialog .sync-item {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.subscription-dialog .sync-label {
  color: var(--theme-text-primary);
  font-size: 0.9rem;
}

.subscription-dialog .sync-value {
  font-weight: 700;
  font-size: 1.1rem;
  color: #fff;
}

.subscription-dialog .sync-value.highlight {
  color: #4ade80;
}

.subscription-dialog .sync-note {
  font-size: 0.85rem;
  color: rgba(225, 225, 237, 0.7);
}

.subscription-dialog .sync-benefit {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(249, 104, 84, 0.2);
  color: #4ade80;
  font-size: 0.85rem;
}

.subscription-dialog .sync-benefit .material-symbols-outlined {
  font-size: 1rem;
}

.subscription-dialog .dialog-footer {
  display: grid;
  grid-template-columns: 33% 67%;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1.5rem;
  border-top: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border-bottom-left-radius: 1rem;
  border-bottom-right-radius: 1rem;
  flex-shrink: 0;
}

.subscription-dialog .paypal-button-wrapper {
  width: 100%;
  max-width: 100%;
}

/* Make PayPal button fill the width */
.subscription-dialog .paypal-button-wrapper :deep(.paypal-buttons) {
  width: 100% !important;
}

.subscription-dialog .paypal-button-wrapper :deep(.paypal-button-container) {
  width: 100% !important;
}

.subscription-dialog .cancel-btn {
  background: rgba(255, 255, 255, 0.1);
  color: var(--theme-text-primary);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.subscription-dialog .cancel-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.subscription-dialog .upgrade-btn {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  border: none;
  border-radius: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.subscription-dialog .upgrade-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--theme-accent) 40%, transparent);
}

.subscription-dialog .upgrade-btn:disabled {
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
  color: #adb5bd;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.subscription-dialog .upgrade-btn.free-downgrade {
  background: linear-gradient(135deg, #ff9a56 0%, #ff7043 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(255, 154, 86, 0.3);
}

.subscription-dialog .upgrade-btn.free-downgrade:hover:not(:disabled) {
  background: linear-gradient(135deg, #ff7043 0%, #f4511e 100%);
  box-shadow: 0 6px 20px rgba(255, 154, 86, 0.4);
}

.subscription-dialog .upgrade-btn.downgrade {
  background: linear-gradient(135deg, #ff9a56 0%, #ff7043 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(255, 154, 86, 0.3);
}

.subscription-dialog .upgrade-btn.downgrade:hover:not(:disabled) {
  background: linear-gradient(135deg, #ff7043 0%, #f4511e 100%);
  box-shadow: 0 6px 20px rgba(255, 154, 86, 0.4);
}

.subscription-dialog .proration-note.downgrade-transition {
  color: #ff9a56;
  font-weight: 600;
}

/* Description Editing Styles */
.realm-description-container {
  position: relative;
  width: 100%;
}

.description-display {
  position: relative;
  cursor: pointer;
}

.description-display .realm-description {
  margin: 0;
  color: var(--theme-text-primary);
  font-size: 1rem;
  line-height: 1.5;
  opacity: 0.9;
  position: relative;
}

.edit-hint {
  position: relative;
  z-index: 10;
  float: right;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--theme-accent) 90%, transparent);
  color: var(--theme-bg-surface);
  padding: 0.25rem;
  border-radius: 0.25rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 0.5rem;
  width: 1.5rem;
  height: 1.5rem;
  pointer-events: auto;
}

.edit-hint:hover {
  background: var(--theme-accent);
  transform: scale(1.1);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.edit-hint .material-symbols-outlined {
  font-size: 1rem;
}

.description-edit {
  margin-top: 0.5rem;
  width: 100%;
}

.description-textarea {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 0.5rem;
  padding: 1rem;
  color: var(--theme-text-primary);
  font-size: 1rem;
  line-height: 1.5;
  resize: vertical;
  min-height: 120px;
  font-family: inherit;
  transition: all 0.3s ease;
}

.description-textarea:focus {
  outline: none;
  border-color: var(--theme-accent);
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme-accent) 20%, transparent);
}

.description-textarea::placeholder {
  color: rgba(225, 225, 237, 0.5);
}

.edit-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.75rem;
  gap: 1rem;
}

.char-count {
  color: rgba(225, 225, 237, 0.6);
  font-size: 0.875rem;
}

.edit-actions button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  color: var(--theme-text-primary);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.btn-save {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  border: none;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.btn-save:hover:not(:disabled) {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--theme-accent) 40%, transparent);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-save .loading {
  animation: spin 1s linear infinite;
}

/* Reload Dialog Styles */
.reload-dialog {
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

.reload-dialog::backdrop {
  background: rgba(0, 0, 0, 0.7);
}

.reload-dialog .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #444;
}

.reload-dialog .modal-header h3 {
  margin: 0;
  color: var(--theme-accent);
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.reload-dialog .close-btn {
  background: transparent;
  border: none;
  color: #ccc;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: color 0.2s ease;
}

.reload-dialog .close-btn:hover {
  color: var(--theme-accent);
}

.reload-dialog .modal-body {
  padding: 1.5rem;
}

.reload-info {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.reload-info .info-icon {
  color: var(--theme-accent);
  margin-top: 0.25rem;
}

.reload-info .info-content {
  flex: 1;
}

.reload-info .info-content p {
  margin: 0 0 1rem 0;
  line-height: 1.6;
}

.reload-info .info-content p:last-child {
  margin-bottom: 0;
}

.reload-dialog .modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #444;
}

.reload-dialog .btn-cancel,
.reload-dialog .btn-reload {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
}

.reload-dialog .btn-cancel {
  background: #555;
  color: #fff;
}

.reload-dialog .btn-cancel:hover {
  background: #666;
}

.reload-dialog .btn-reload {
  background: var(--theme-accent);
  color: var(--theme-bg-surface);
}

.reload-dialog .btn-reload:hover:not(:disabled) {
  background: #ffb347;
  transform: translateY(-1px);
}

.reload-dialog .btn-reload:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.reload-dialog .loading {
  animation: spin 1s linear infinite;
}

/* Mobile responsive dialog */
@media (max-width: 768px) {
  .reload-dialog {
    width: 95%;
    margin: 1rem;
  }
  
  .reload-dialog .modal-header,
  .reload-dialog .modal-body,
  .reload-dialog .modal-footer {
    padding: 1rem;
  }
  
  .reload-dialog .modal-footer {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .reload-dialog .btn-cancel,
  .reload-dialog .btn-reload {
    width: 100%;
    justify-content: center;
  }
}

/* Delete Realm Section */
.delete-realm-section {
  margin-top: 2rem;
}

.danger-card {
  background: rgba(220, 53, 69, 0.08);
  border: 1px solid rgba(220, 53, 69, 0.3);
  border-radius: 0.75rem;
  padding: 1.5rem;
}

.danger-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.danger-card-header h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #dc3545;
}

.danger-icon {
  color: #dc3545;
}

.danger-description {
  color: #b0b0c0;
  font-size: 0.9rem;
  margin: 0 0 1rem;
  line-height: 1.4;
}

.btn-delete-realm {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.25rem;
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-delete-realm:hover {
  background: linear-gradient(135deg, #c82333 0%, #bd2130 100%);
  transform: translateY(-1px);
}

/* Delete Realm Dialog */
.delete-realm-dialog {
  background: #1a1f2e;
  border: 1px solid #dc3545;
  border-radius: 1rem;
  color: #ffffff;
  max-width: 500px;
  width: 90vw;
  padding: 0;
}

.delete-realm-dialog::backdrop {
  background: rgba(0, 0, 0, 0.7);
}

.delete-realm-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--theme-accent);
  text-align: center;
  padding: 0.75rem;
  background: color-mix(in srgb, var(--theme-accent) 8%, transparent);
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

.delete-confirm-fields {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.delete-acknowledge {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--theme-text-primary);
  line-height: 1.4;
}

.delete-acknowledge input[type="checkbox"] {
  margin-top: 0.2rem;
  accent-color: #dc3545;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.delete-confirm-input label {
  display: block;
  font-size: 0.85rem;
  color: #b0b0c0;
  margin-bottom: 0.5rem;
}

.delete-confirm-input input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid #444;
  border-radius: 0.5rem;
  color: #ffffff;
  font-size: 0.9rem;
  box-sizing: border-box;
}

.delete-confirm-input input:focus {
  outline: none;
  border-color: #dc3545;
}

@media (max-width: 768px) {
  .delete-realm-dialog {
    max-width: 95vw;
  }
}

/* Display Preferences / Theme Selector */
.display-prefs-section {
  margin-top: 1.5rem;
}

.display-prefs-section .section-header h2 {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.manage-theme-btn {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  color: var(--theme-accent);
  text-decoration: none;
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 0.4rem;
  transition: border-color 0.2s;
}
.manage-theme-btn:hover {
  border-color: var(--theme-accent);
}
.manage-theme-btn .material-symbols-outlined {
  font-size: 0.9rem;
}
.section-desc {
  color: var(--theme-text-secondary);
  font-size: 0.7rem;
  margin: 0.3rem 0 0;
}
.section-desc strong {
  color: var(--theme-text-primary);
  text-transform: capitalize;
}

/* Inline Theme Picker (RF-Vue style) */
.theme-selector {
  margin-top: 0.5rem;
}

.theme-label-text {
  font-size: 0.8rem;
  color: var(--theme-text-primary);
  margin-bottom: 0.4rem;
  display: block;
}

.theme-options {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 0.3rem;
}

.theme-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1rem;
  border: 2px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--theme-bg-surface) 60%, transparent);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  min-width: 6rem;
}

.theme-option:hover {
  border-color: color-mix(in srgb, var(--theme-accent) 50%, transparent);
  background: color-mix(in srgb, var(--theme-bg-surface) 80%, transparent);
}

.theme-option.active {
  border-color: var(--theme-accent);
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
}

.theme-preview {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.15);
}

.preview-dark-fantasy {
  background: linear-gradient(135deg, #161D26 0%, #182036 50%, #ffc581 100%);
}

.preview-parchment {
  background: linear-gradient(135deg, #2c2416 0%, #3a3122 50%, #d4a054 100%);
}

.preview-midnight {
  background: linear-gradient(135deg, #0a0e17 0%, #101624 50%, #8ab4f8 100%);
}

.theme-name {
  font-size: 0.7rem;
  color: var(--theme-text-primary);
  font-weight: 500;
}

.theme-check {
  position: absolute;
  top: 0.2rem;
  right: 0.2rem;
  font-size: 1rem;
  color: var(--theme-accent);
}
</style>