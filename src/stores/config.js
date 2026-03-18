import { defineStore } from 'pinia';
import { roomPreferences } from '@shared/utils/storage';
import { useUserStore } from '@shared/stores/user';
import { applyTheme, defaultThemeId, themes, themeIds } from '@shared/themes';

export const useConfigStore = defineStore('config', {
  state: () => ({
    // Room-specific preferences
    roomPreferences: {
      // Structure: { realmId: { roomId: { contentExpanded: boolean, ... } } }
    },
    // Per-realm theme preferences
    // Structure: { realmId: themeId }
    realmThemes: {},
    // UI preferences
    uiPreferences: {
      sidebarCollapsed: false,
    },
    // Feature flags
    featureFlags: {
      betaFeatures: false,
      debugMode: false,
    },
    // Cache for performance
    _loadedRealms: new Set(),
  }),

  getters: {
    /**
     * Current theme ID for the active realm
     */
    currentTheme() {
      const userStore = useUserStore();
      const realmId = userStore.activeRealmId;
      if (realmId && this.realmThemes[realmId]) {
        return this.realmThemes[realmId];
      }
      return defaultThemeId;
    },

    /**
     * Available themes for UI selection
     */
    availableThemes: () => Object.entries(themes).map(([id, t]) => ({ id, label: t.label })),

    /**
     * Get current active realm ID from user store
     */
    activeRealmId() {
      const userStore = useUserStore();
      return userStore.activeRealmId;
    },

    /**
     * Check if room content is expanded for the current active realm
     * @param {string} roomId - The room ID to check
     * @returns {boolean} True if expanded, false if collapsed
     */
    isRoomContentExpanded: (state) => (roomId) => {
      const userStore = useUserStore();
      const realmId = userStore.activeRealmId;
      
      if (!realmId || !roomId) {
        return true; // Default to expanded
      }
      
      return state.roomPreferences[realmId]?.[roomId]?.contentExpanded ?? true;
    },

    /**
     * Get all room preferences for the current active realm
     * @returns {object} Room preferences for active realm
     */
    activeRealmRoomPreferences() {
      const userStore = useUserStore();
      const realmId = userStore.activeRealmId;
      
      if (!realmId) {
        return {};
      }
      
      return this.roomPreferences[realmId] || {};
    },

    /**
     * Get room preferences for a specific realm and room
     * @param {string} realmId - The realm ID
     * @param {string} roomId - The room ID
     * @returns {object} Room preferences
     */
    getRoomPreferences: (state) => (realmId, roomId) => {
      if (!realmId || !roomId) {
        return {};
      }
      
      return state.roomPreferences[realmId]?.[roomId] || {};
    },
  },

  actions: {
    /**
     * Initialize config store and load preferences for active realm
     */
    async initialize() {
      // Load UI preferences
      this.loadUIPreferences();
      
      // Load room preferences for active realm if available
      const userStore = useUserStore();
      if (userStore.activeRealmId) {
        await this.loadRealmPreferences(userStore.activeRealmId);
      }
    },

    /**
     * Load room preferences for a specific realm from localStorage
     * @param {string} realmId - The realm ID to load preferences for
     */
    async loadRealmPreferences(realmId) {
      if (!realmId || this._loadedRealms.has(realmId)) {
        return; // Already loaded or invalid
      }
      
      try {
        const realmPrefs = roomPreferences.getRealmPreferences(realmId);
        
        // Ensure the realm object exists in our state
        if (!this.roomPreferences[realmId]) {
          this.roomPreferences[realmId] = {};
        }
        
        // Merge loaded preferences with existing state
        this.roomPreferences[realmId] = {
          ...this.roomPreferences[realmId],
          ...realmPrefs
        };
        
        // Mark realm as loaded
        this._loadedRealms.add(realmId);
      } catch (error) {
        console.error(`Error loading realm preferences for ${realmId}:`, error);
      }
    },

    /**
     * Toggle room content expansion state
     * @param {string} roomId - The room ID to toggle
     * @param {string} realmId - Optional realm ID (uses active realm if not provided)
     * @returns {boolean} New expanded state
     */
    async toggleRoomContent(roomId, realmId = null) {
      if (!roomId) {
        console.warn('toggleRoomContent called without roomId');
        return true;
      }
      
      // Use provided realmId or get from user store
      const targetRealmId = realmId || this.activeRealmId;
      if (!targetRealmId) {
        console.warn('No realm ID available for toggleRoomContent');
        return true;
      }
      
      // Ensure realm preferences are loaded
      await this.loadRealmPreferences(targetRealmId);
      
      // Get current state (default to expanded)
      const currentState = this.roomPreferences[targetRealmId]?.[roomId]?.contentExpanded ?? true;
      const newState = !currentState;
      
      // Update local state
      if (!this.roomPreferences[targetRealmId]) {
        this.roomPreferences[targetRealmId] = {};
      }
      if (!this.roomPreferences[targetRealmId][roomId]) {
        this.roomPreferences[targetRealmId][roomId] = {};
      }
      
      this.roomPreferences[targetRealmId][roomId].contentExpanded = newState;
      
      // Persist to localStorage
      const success = roomPreferences.setRoomPreference(
        targetRealmId, 
        roomId, 
        'contentExpanded', 
        newState
      );
      
      if (!success) {
        console.error('Failed to persist room content state to localStorage');
      }
      
      console.log(`Room ${roomId} content ${newState ? 'expanded' : 'collapsed'}`);
      return newState;
    },

    /**
     * Set room content expansion state explicitly
     * @param {string} roomId - The room ID
     * @param {boolean} expanded - The expansion state
     * @param {string} realmId - Optional realm ID (uses active realm if not provided)
     * @returns {boolean} Success status
     */
    async setRoomContentExpanded(roomId, expanded, realmId = null) {
      if (!roomId || typeof expanded !== 'boolean') {
        console.warn('Invalid parameters for setRoomContentExpanded');
        return false;
      }
      
      const targetRealmId = realmId || this.activeRealmId;
      if (!targetRealmId) {
        console.warn('No realm ID available for setRoomContentExpanded');
        return false;
      }
      
      // Ensure realm preferences are loaded
      await this.loadRealmPreferences(targetRealmId);
      
      // Update local state
      if (!this.roomPreferences[targetRealmId]) {
        this.roomPreferences[targetRealmId] = {};
      }
      if (!this.roomPreferences[targetRealmId][roomId]) {
        this.roomPreferences[targetRealmId][roomId] = {};
      }
      
      this.roomPreferences[targetRealmId][roomId].contentExpanded = expanded;
      
      // Persist to localStorage
      const success = roomPreferences.setRoomPreference(
        targetRealmId, 
        roomId, 
        'contentExpanded', 
        expanded
      );
      
      if (!success) {
        console.error('Failed to persist room content state to localStorage');
        return false;
      }
      
      return true;
    },

    /**
     * Handle realm switching - load preferences for new realm
     * @param {string} newRealmId - The new active realm ID
     * @param {string} oldRealmId - The previous active realm ID
     */
    async onRealmChanged(newRealmId, oldRealmId) {
      if (newRealmId && !this._loadedRealms.has(newRealmId)) {
        await this.loadRealmPreferences(newRealmId);
      }
      // Apply the new realm's theme (falls back to default if none set)
      const themeId = (newRealmId && this.realmThemes[newRealmId]) || defaultThemeId;
      applyTheme(themeId);
    },

    /**
     * Set and apply a theme for the active realm
     * @param {string} themeId - Theme identifier from themes.js
     */
    setTheme(themeId) {
      if (!themeIds.includes(themeId)) {
        console.warn(`Unknown theme "${themeId}", available: ${themeIds.join(', ')}`);
        return;
      }
      const realmId = this.activeRealmId;
      if (!realmId) {
        console.warn('No active realm — cannot set theme');
        return;
      }
      this.realmThemes[realmId] = themeId;
      applyTheme(themeId);
      this.saveRealmThemes();
    },

    /**
     * Load UI preferences from localStorage
     */
    loadUIPreferences() {
      try {
        const stored = localStorage.getItem('realmForge_uiPreferences');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Migrate old global theme to remove it (no longer used)
          delete parsed.theme;
          this.uiPreferences = {
            ...this.uiPreferences,
            ...parsed
          };
        }
      } catch (error) {
        console.warn('Error loading UI preferences:', error);
      }
      // Load per-realm theme map
      this.loadRealmThemes();
      // Apply theme for current realm (or default if no realm yet)
      applyTheme(this.currentTheme);
    },

    /**
     * Load per-realm theme map from localStorage
     */
    loadRealmThemes() {
      try {
        const stored = localStorage.getItem('realmForge_realmThemes');
        if (stored) {
          this.realmThemes = JSON.parse(stored);
        }
      } catch (error) {
        console.warn('Error loading realm themes:', error);
      }
    },

    /**
     * Save per-realm theme map to localStorage
     */
    saveRealmThemes() {
      try {
        localStorage.setItem('realmForge_realmThemes', JSON.stringify(this.realmThemes));
      } catch (error) {
        console.error('Error saving realm themes:', error);
      }
    },

    /**
     * Save UI preferences to localStorage
     */
    saveUIPreferences() {
      try {
        localStorage.setItem('realmForge_uiPreferences', JSON.stringify(this.uiPreferences));
      } catch (error) {
        console.error('Error saving UI preferences:', error);
      }
    },

    /**
     * Set a UI preference
     * @param {string} key - Preference key
     * @param {*} value - Preference value
     */
    setUIPreference(key, value) {
      this.uiPreferences[key] = value;
      this.saveUIPreferences();
    },

    /**
     * Clear all room preferences for a specific realm
     * @param {string} realmId - The realm ID to clear
     */
    clearRealmPreferences(realmId) {
      if (!realmId) return;
      
      // Clear from state
      if (this.roomPreferences[realmId]) {
        delete this.roomPreferences[realmId];
      }
      
      // Clear from localStorage
      roomPreferences.removeRealmPreferences(realmId);
      
      // Remove from loaded cache
      this._loadedRealms.delete(realmId);
      
      console.log(`Cleared all preferences for realm ${realmId}`);
    },

    /**
     * Clear all stored preferences (use with caution)
     */
    clearAllPreferences() {
      // Clear state
      this.roomPreferences = {};
      this._loadedRealms.clear();
      
      // Clear localStorage
      roomPreferences.clear();
      localStorage.removeItem('realmForge_uiPreferences');
      localStorage.removeItem('realmForge_realmThemes');

      // Reset to defaults
      this.uiPreferences = {
        sidebarCollapsed: false,
      };
      this.realmThemes = {};
      applyTheme(defaultThemeId);

      console.log('Cleared all configuration preferences');
    },

    /**
     * Get debug information about stored preferences
     * @returns {object} Debug information
     */
    getDebugInfo() {
      return {
        roomPreferences: this.roomPreferences,
        uiPreferences: this.uiPreferences,
        loadedRealms: Array.from(this._loadedRealms),
        activeRealmId: this.activeRealmId,
        storageSize: roomPreferences.size(),
        storageKeys: roomPreferences.keys(),
      };
    },
  },
});