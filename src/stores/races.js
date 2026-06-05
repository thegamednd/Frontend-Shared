import { defineStore } from 'pinia';
import { useRealmStore } from '@shared/stores/realm';
import { watch } from 'vue';
import apiClient from '@shared/utils/api';

export const useRacesStore = defineStore('races', {
    state: () => ({
        races: {}, // Store races by ID
        raceListsByRealm: {}, // Track which races belong to which realm
        loaded: false,
        isLoading: false,
        lastError: null,
        currentRealmId: null,
    }),
    getters: {
        // Get all races as an array
        arRaces(state) {
            return Object.values(state.races);
        },

        // Get a specific race by ID
        getRaceById: (state) => (raceId) => {
            return state.races[raceId] || null;
        },

        // Get races for the current realm
        getRacesForCurrentRealm(state) {
            if (!state.currentRealmId || !state.raceListsByRealm[state.currentRealmId]) {
                return [];
            }
            const raceIds = state.raceListsByRealm[state.currentRealmId];
            return raceIds.map(id => state.races[id]).filter(Boolean);
        },

        // Get races for the current realm, sorted by RaceName
        getSortedRaces(state) {
            const races = this.getRacesForCurrentRealm;
            return races.slice().sort((a, b) => {
                if (a.RaceName < b.RaceName) return -1;
                if (a.RaceName > b.RaceName) return 1;
                return 0;
            });
        },

        // Check if races are loaded for the current realm
        isLoadedForCurrentRealm(state) {
            return state.currentRealmId && state.raceListsByRealm[state.currentRealmId] !== undefined;
        },

        // Get a specific race by name
        getRaceByName: (state) => (raceName) => {
            return Object.values(state.races).find(r => r.RaceName === raceName) || null;
        }
    },
    actions: {
        async init() {
            try {
                const realmStore = useRealmStore();

                // Watch for changes to active realm and reload races
                watch(
                    () => realmStore.activeRealmId,
                    async (newActiveRealmId) => {
                        if (newActiveRealmId) {
                            this.currentRealmId = newActiveRealmId;
                            await this.loadRaces();
                        } else {
                            this.currentRealmId = null;
                        }
                    }
                );

                // Load races if we have an active realm
                if (realmStore.activeRealmId) {
                    this.currentRealmId = realmStore.activeRealmId;
                    await this.loadRaces();
                }

                this.loaded = true;
            } catch (error) {
                console.error('Failed to initialize races store', error);
                this.lastError = error.message;
            }
        },

        /**
         * Load all races for the current realm
         */
        async loadRaces(force = false) {
            try {
                const realmStore = useRealmStore();
                const realmId = realmStore.activeRealm?.RealmID || realmStore.activeRealmId;

                if (!realmId) {
                    console.warn('No active realm found');
                    return;
                }

                // Check if already loaded for this realm
                if (!force && this.raceListsByRealm[realmId]) {
                    return;
                }

                // Prevent redundant loading if already loading
                if (this.isLoading) {
                    while (this.isLoading) {
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                    return;
                }

                this.isLoading = true;
                this.lastError = null;
                this.currentRealmId = realmId;

                const response = await apiClient.get('/races');

                if (response.status >= 200 && response.status < 300) {
                    const racesArray = Array.isArray(response.data) ? response.data : [response.data];

                    // Store race IDs for this realm
                    const raceIds = [];

                    racesArray.forEach((raceItem) => {
                        if (raceItem.ID) {
                            this.races[raceItem.ID] = raceItem;
                            raceIds.push(raceItem.ID);
                        }
                    });

                    this.raceListsByRealm[realmId] = raceIds;
                } else {
                    throw new Error(`Failed to load races: ${response.status}`);
                }
            } catch (error) {
                console.error('Failed to load races:', error);
                this.lastError = error.response?.data?.message || error.message;
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Get a specific race by ID, fetching from API if not cached
         */
        async getRace(raceId, force = false) {
            // Return cached race if available and not forcing refresh
            if (this.races[raceId] && !force) {
                // Check if we have full details (Content field exists)
                if (this.races[raceId].Content || Object.keys(this.races[raceId]).length > 5) {
                    return this.races[raceId];
                }
            }

            try {
                const response = await apiClient.get(`/races/race/${raceId}`);

                if (response.status >= 200 && response.status < 300) {
                    this.races[raceId] = response.data;
                    return response.data;
                } else {
                    throw new Error(`Race not found: ${raceId}`);
                }
            } catch (error) {
                console.error(`Failed to get race ${raceId}:`, error);
                this.lastError = error.response?.data?.message || error.message;
                return null;
            }
        },

        /**
         * Clear all races from the store
         */
        clearRaces() {
            this.races = {};
            this.raceListsByRealm = {};
            this.loaded = false;
            this.currentRealmId = null;
        },

        /**
         * Clear races for a specific realm
         */
        clearRacesForRealm(realmId) {
            if (this.raceListsByRealm[realmId]) {
                const raceIds = this.raceListsByRealm[realmId];
                raceIds.forEach(id => {
                    delete this.races[id];
                });
                delete this.raceListsByRealm[realmId];
            }
        }
    }
});
