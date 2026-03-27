import { defineStore } from 'pinia';
import { useUserStore } from '@shared/stores/user';
import { useAccountStore } from '@shared/stores/account';
import { useDateStore } from '@shared/stores/date';
import { useSubscriptionStore } from '@shared/stores/subscription';
import { watch } from 'vue';
import axios from 'axios';
import apiClient from '@shared/utils/api';

const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}`;

export const useRealmStore = defineStore('realm', {
    state: () => ({
        activeRealmId: null,
        default: {
            "AccountID": { type: "string", required: true, default: "" },
            "RealmID": { type: "string", required: true, default: "" },
            "Date": {
                "d": { type: "number", required: true, default: 1 },
                "m": { type: "number", required: true, default: 0 },
                "moon": { type: "number", required: true, default: 0 },
                "y": { type: "number", required: true, default: 1 },
                "zodiac": { type: "string", required: true, default: "" }
            },
            "DateSuffix": {
                "Abbr": { type: "string", required: true, default: "SF" },
                "Text": { type: "string", required: true, default: "Since Foundation" }
            },
            "Description": { type: "string", required: false, default: "" },
            "MaxCharacters": { type: "number", required: true, default: 500 },
            "MaxPlayers": { type: "number", required: true, default: 3 },
            "Name": { type: "string", required: true, default: "" }
        },
        realms: {},
        loaded: false,
        psionicsEnabled: null, // null = not yet checked, true/false = checked
    }),
    getters: {
        activeRealm(state) {
            return (state.activeRealmId) ? state.realms[state.activeRealmId] : null;
        },
        // Get gaming system ID for classes
        // Returns GamingSystem.classes.GamingSystemID (new format) or GamingSystem.classes (old string format)
        // Returns null if not set (No System)
        activeRealmClassesSystemId(state) {
            const realm = this.activeRealm;
            if (!realm) return null;

            const classes = realm.GamingSystem?.classes;
            if (!classes) return null;

            // Handle both formats: string (old) or object with GamingSystemID (new)
            if (typeof classes === 'string') {
                return classes;
            }
            return classes.GamingSystemID || null;
        },
        // Get enabled shop items for classes (from new object format)
        // Returns null if using old string format (all items enabled) or not set
        activeRealmClassesEnabledShopItems(state) {
            const realm = this.activeRealm;
            if (!realm) return null;

            const classes = realm.GamingSystem?.classes;
            if (!classes || typeof classes === 'string') return null;
            return classes.EnabledShopItems || null;
        },
        // Get enabled class IDs for the active realm
        // Returns array of enabled class IDs, or null if all are enabled (not configured)
        activeRealmClassesEnabledIds(state) {
            const realm = this.activeRealm;
            if (!realm) return null;
            const classes = realm.GamingSystem?.classes;
            if (!classes || typeof classes === 'string') return null;
            return classes.EnabledClassIds || null;
        },
        // Get gaming system ID for races
        // Returns GamingSystem.races.GamingSystemID (new format) or GamingSystem.races (old string format)
        // Returns null if not set (No System)
        activeRealmRacesSystemId(state) {
            const realm = this.activeRealm;
            if (!realm) return null;

            const races = realm.GamingSystem?.races;
            if (!races) return null;

            // Handle both formats: string (old) or object with GamingSystemID (new)
            if (typeof races === 'string') {
                return races;
            }
            return races.GamingSystemID || null;
        },
        // Get enabled shop items for races (from new object format)
        // Returns null if using old string format (all items enabled) or not set
        activeRealmRacesEnabledShopItems(state) {
            const realm = this.activeRealm;
            if (!realm) return null;

            const races = realm.GamingSystem?.races;
            if (!races || typeof races === 'string') return null;
            return races.EnabledShopItems || null;
        },
        // Get enabled race IDs for the active realm
        // Returns array of enabled race IDs, or null if all are enabled (not configured)
        activeRealmRacesEnabledIds(state) {
            const realm = this.activeRealm;
            if (!realm) return null;
            const races = realm.GamingSystem?.races;
            if (!races || typeof races === 'string') return null;
            return races.EnabledRaceIds || null;
        },
        // Get gaming system ID for spells
        // Returns GamingSystem.spells.GamingSystemID (new format) or GamingSystem.spells (old string format)
        // Returns null if not set (No System)
        activeRealmSpellsSystemId(state) {
            const realm = this.activeRealm;
            if (!realm) return null;

            const spells = realm.GamingSystem?.spells;
            if (!spells) return null;

            // Handle both formats: string (old) or object with GamingSystemID (new)
            if (typeof spells === 'string') {
                return spells;
            }
            return spells.GamingSystemID || null;
        },
        // Get enabled shop items for spells
        // Checks GamingSystem.spellsEnabledShopItems first, falls back to legacy GamingSystem.spells.EnabledShopItems
        // Returns null if all items enabled or not set
        activeRealmSpellsEnabledShopItems(state) {
            const realm = this.activeRealm;
            if (!realm) return null;
            // New location: separate GamingSystem field
            if (realm.GamingSystem?.spellsEnabledShopItems) {
                return realm.GamingSystem.spellsEnabledShopItems;
            }
            // Legacy: inside GamingSystem.spells object
            const spells = realm.GamingSystem?.spells;
            if (!spells || typeof spells === 'string') return null;
            return spells.EnabledShopItems || null;
        },
        // Get gaming system ID for skills (uses same system as classes)
        activeRealmSkillsSystemId(state) {
            return this.activeRealmClassesSystemId;
        },
        // Get enabled shop items for skills (from skills access structure)
        // Returns null if not set (all items enabled)
        activeRealmSkillsEnabledShopItems(state) {
            const realm = this.activeRealm;
            if (!realm) return null;
            const skills = realm.GamingSystem?.skills;
            if (!skills) return null;
            return skills.EnabledShopItems || null;
        },
        // Get gaming system ID for psionics (uses same system as classes)
        activeRealmPsionicsSystemId(state) {
            return this.activeRealmClassesSystemId;
        },
        // Get enabled maps for the active realm
        // Returns an array of map IDs that are enabled for this realm
        activeRealmMaps(state) {
            const realm = this.activeRealm;
            if (!realm) return [];

            const maps = realm.GamingSystem?.maps;
            if (!maps) return [];
            if (Array.isArray(maps)) return maps;           // old format: array of map IDs
            return maps.EnabledMapIds || [];                 // new format: object
        },
        // Get enabled shop items for maps (from new object format)
        // Returns null if using old array format (all items enabled) or not set
        activeRealmMapsEnabledShopItems(state) {
            const realm = this.activeRealm;
            if (!realm) return null;
            const maps = realm.GamingSystem?.maps;
            if (!maps || Array.isArray(maps)) return null;
            return maps.EnabledShopItems || null;
        },
        // Get enabled pantheon IDs for the active realm
        // Returns array of enabled pantheon IDs, or null if all are enabled (not configured)
        activeRealmPantheonsEnabledIds(state) {
            const realm = this.activeRealm;
            if (!realm) return null;
            const pantheons = realm.GamingSystem?.pantheons;
            if (!pantheons) return null;
            return pantheons.EnabledPantheonIds || null;
        },
        // Get enabled prayer IDs for the active realm
        // Returns array of enabled prayer IDs, or null if all are enabled (not configured)
        activeRealmPantheonsEnabledPrayerIds(state) {
            const realm = this.activeRealm;
            if (!realm) return null;
            const pantheons = realm.GamingSystem?.pantheons;
            if (!pantheons) return null;
            return pantheons.EnabledPrayerIds || null;
        },
        // Get enabled shop items for pantheons
        // Returns array of enabled shop item IDs, or null if all are enabled
        activeRealmPantheonsEnabledShopItems(state) {
            const realm = this.activeRealm;
            if (!realm) return null;
            return realm.GamingSystem?.pantheonsEnabledShopItems || null;
        },
        // Get enabled modules for the active realm
        // Returns an array of module IDs that are enabled for this realm
        activeRealmModules(state) {
            const realm = this.activeRealm;
            if (!realm) return [];

            // Check GamingSystem.modules array
            if (realm.GamingSystem?.modules && Array.isArray(realm.GamingSystem.modules)) {
                return realm.GamingSystem.modules;
            }

            // Default to empty array
            return [];
        },
        arRealms(state) {
            return Object.values(state.realms);
        },
        arOwnedRealms(state) {
            const accountStore = useAccountStore();
            if (!accountStore.account) {
                return [];
            }
            return Object.values(state.realms).filter(realm => 
                realm.AccountID === accountStore.account.AccountID
            );
        },
        arOwnedFreeRealms(state) {
            const accountStore = useAccountStore();
            if (!accountStore.account) {
                return [];
            }
            return Object.values(state.realms).filter(realm => 
                realm.AccountID === accountStore.account.AccountID &&
                (!realm.SubscriptionPlan || realm.SubscriptionPlan === 'free')
            );
        },
        arActivePlayers(state) {
            return (this.activeRealm?.Players) ? Object.values(this.activeRealm.Players) : [];
        },
        // Get all realm players (both active and inactive from User-X-Realm)
        arAllRealmPlayers(state) {
            return (this.activeRealm?.Players) ? Object.values(this.activeRealm.Players) : [];
        },
        // Get all active players (users with Active=true in User-X-Realm)
        activePlayersCount(state) {
            return this.arActivePlayers.filter(player => player.Active === true).length;
        },
        // Get maximum allowed players for the active realm
        maxPlayersLimit(state) {
            return this.activeRealm?.MaxPlayers || 5;
        },
        // Check if realm has reached player capacity
        isRealmAtCapacity(state) {
            return this.activePlayersCount >= this.maxPlayersLimit;
        },
        // Get remaining player slots
        remainingPlayerSlots(state) {
            return Math.max(0, this.maxPlayersLimit - this.activePlayersCount);
        },
        // Check if a new player can be added
        canAddPlayer(state) {
            return !this.isRealmAtCapacity;
        },
        isOwner(state) {
            const userStore = useUserStore();
            const accountStore = useAccountStore();
            
            // Check if we have an active realm and the user's account
            if (!this.activeRealm || !accountStore.account) {
                return false;
            }
            
            // Compare the realm's AccountID with the current user's account AccountID
            return this.activeRealm.AccountID === accountStore.account.AccountID;
        },
        getRealmDMs(state) {
            return this.arActivePlayers.filter((player) => player.Role === 'DM');
        },
        isRealmDM(state) {
            const userStore = useUserStore();
            if (!userStore.userSub || !this.activeRealm) {
                return false;
            }
            return this.getRealmDMs.some((dm) => dm.UserID === userStore.userSub);
        }
    },
    actions: {
        setPsionicsEnabled(value) {
            this.psionicsEnabled = value;
        },
        /**
         * Check if psionics are enabled by verifying the Psionicist class
         * is available in the realm's class packages. Requires classes store
         * to be loaded first.
         */
        async checkPsionicsEnabled() {
            // Skip if already checked for this realm
            if (this.psionicsEnabled !== null) return this.psionicsEnabled;

            try {
                const classesPath = '@' + '/stores/classes';
                const { useClassesStore } = await import(/* @vite-ignore */ classesPath);
                const classesStore = useClassesStore();

                const psionicist = classesStore.getClassByName('Psionicist');
                if (!psionicist) {
                    this.psionicsEnabled = false;
                    return false;
                }

                // If no class package restrictions, all classes are available
                const enabledShopItems = this.activeRealmClassesEnabledShopItems;
                if (!enabledShopItems) {
                    this.psionicsEnabled = true;
                    return true;
                }

                // Check if Psionicist is in any enabled class package
                const userStore = useUserStore();
                const accountStore = useAccountStore();
                const token = await userStore.getValidToken();
                const account = accountStore.account;
                const gamingSystemId = this.activeRealmClassesSystemId;

                const purchasedShopItemIds = account.Access?.[gamingSystemId] || [];
                const patreonShopItemIds = [];
                const activeRealm = this.activeRealm;
                if (activeRealm?.Metadata?.patreonBenefits) {
                    for (const benefit of activeRealm.Metadata.patreonBenefits) {
                        if (benefit.ShopItems && Array.isArray(benefit.ShopItems)) {
                            for (const id of benefit.ShopItems) {
                                if (!patreonShopItemIds.includes(id) && !purchasedShopItemIds.includes(id)) {
                                    patreonShopItemIds.push(id);
                                }
                            }
                        }
                    }
                }

                const enabledIds = [...purchasedShopItemIds, ...patreonShopItemIds]
                    .filter(id => enabledShopItems.includes(id));

                for (const shopItemId of enabledIds) {
                    try {
                        const { data: shopProduct } = await axios.get(
                            `${BASE_URL}/shop/products/product/${shopItemId}`,
                            { headers: { Authorization: `Bearer ${token}` } }
                        );

                        for (const item of (shopProduct.Items || [])) {
                            if (item.Type === 'Classes') {
                                if (!item.IDs || item.IDs.length === 0) {
                                    this.psionicsEnabled = true;
                                    return true;
                                }
                                if (item.IDs.includes(psionicist.ID)) {
                                    this.psionicsEnabled = true;
                                    return true;
                                }
                            }
                        }
                    } catch (err) {
                        console.error(`Error fetching shop item ${shopItemId}:`, err);
                    }
                }

                this.psionicsEnabled = false;
                return false;
            } catch (err) {
                console.error('Error checking psionics availability:', err);
                this.psionicsEnabled = false;
                return false;
            }
        },
        async init() {
            try {
                const dateStore = useDateStore();
                const userStore = useUserStore();
                await this.getRealms();

                this.activeRealmId = userStore.activeRealmId;

                // If no active realm but user has realms, auto-set the first one
                if (!this.activeRealmId && this.arRealms.length > 0) {
                    await this.setActiveRealm(this.arRealms[0].RealmID);
                }

                if (this.activeRealmId && this.activeRealm) {
                    dateStore.date = this.activeRealm.Date;

                    // Stamp last-accessed time on UserXRealm (fire-and-forget)
                    apiClient.put('/realms/user', {
                        UserID: userStore.userSub,
                        RealmID: this.activeRealmId,
                        LastAccessedAt: new Date().toISOString()
                    }).catch(() => {});
                }

                // Load subscriptions on initial load
                if (this.activeRealmId) {
                    try {
                        const subscriptionStore = useSubscriptionStore();
                        if (!subscriptionStore.loaded) {
                            subscriptionStore.loadSubscriptions();
                        }
                    } catch (error) {
                        console.error('❌ Failed to load subscriptions on init:', error);
                    }
                }

                // Watch for changes to user's active realm preference
                watch(
                    () => userStore.activeRealmId,
                    async (newActiveRealmId, oldActiveRealmId) => {
                        this.activeRealmId = newActiveRealmId;
                        if (newActiveRealmId && this.activeRealm) {
                            dateStore.date = this.activeRealm.Date;
                        }
                        
                        // Load characters when active realm changes (for initial setup)
                        if (newActiveRealmId !== oldActiveRealmId && newActiveRealmId) {
                            try {
                                const { useCharacterStore } = await import('@shared/stores/character');
                                const characterStore = useCharacterStore();
                                await characterStore.loadCharactersForActiveRealm();
                                console.log('✅ Characters loaded for realm:', newActiveRealmId);
                            } catch (error) {
                                console.error('❌ Failed to load characters for realm change:', error);
                            }

                            // Load subscriptions when active realm changes
                            try {
                                const subscriptionStore = useSubscriptionStore();
                                if (!subscriptionStore.loaded) {
                                    subscriptionStore.loadSubscriptions();
                                    console.log('✅ Subscriptions loading for realm:', newActiveRealmId);
                                }
                            } catch (error) {
                                console.error('❌ Failed to load subscriptions for realm change:', error);
                            }
                        }
                    }
                );

                this.loaded = true;
            } catch (error) {
                console.error('Failed to initialize realm store', error);
            }
        },

        getActivePlayerById(playerId) {
            return this.arActivePlayers.find((player) => player.PlayerID === playerId);
        },

        /**
         * Fetches the realm data for the given realmId.
         * If the realm data is already present in the store, it returns the cached data.
         * Otherwise, it makes an API call to fetch the realm data and stores it in the state.
         *
         * @param {string} realmId - The ID of the realm to fetch.
         * @param {boolean} force - If true, the realm data will be fetched from the API even if it is already cached.
         * @returns {Promise<Object|null>} A promise that resolves to the realm data or null if the fetch fails.
         */
        async getRealm(realmId, force = false) {
            if (this.realms[realmId] && !force) {
                return this.realms[realmId];
            }
            try {
                const response = await apiClient.get(`/realms/realm/${realmId}`);
                const realm = response.data;
                this.realms[realmId] = realm.body;
                return realm;
            } catch (error) {
                console.error('Failed to get realm', realmId, error);
                return null;
            }
        },

        async getRealms() {
            try {
                const response = await apiClient.get('/realms/user');

                if (response.status < 200 || response.status >= 300) {
                    console.error('Failed to get realms', response);
                    return null;
                }

                // Check if response has a special code (wrapped format)
                let realms = response.data;
                if (response.data?.code === 'ACTIVE_REALM_CLEARED') {
                    console.log('Active realm was cleared by server - reloading application');
                    realms = response.data.data;
                    // Store realms first, then reload
                    this.realms = {};
                    realms.forEach((realm) => {
                        this.realms[realm.RealmID] = realm;
                    });
                    window.location.reload();
                    return;
                }

                this.realms = {};
                realms.forEach((realm) => {
                    this.realms[realm.RealmID] = realm;
                });
            } catch (error) {
                console.error('Failed to get realms:', error);
                return null;
            }
        },

        async setActiveRealm(realmId) {
            const userStore = useUserStore();

            if (!this.realms[realmId]?.AccountID) {
                // Ensure that the realm is in the list of realms at userStore.prefs.Realms
                if (!userStore.prefs.Realms.includes(realmId)) {
                    throw new Error('User does not have access to realm', realmId);
                }
                await this.getRealm(realmId);
            }

            // Set the active realm ID locally
            this.activeRealmId = realmId;
            this.psionicsEnabled = null; // Reset — will be re-checked when psionics page loads

            // Update user preferences
            const gsId = import.meta.env.VITE_GAMING_SYSTEM_ID;
            await userStore.setPref('ActiveRealm', { [gsId]: realmId });

            // Stamp last-accessed time on UserXRealm (fire-and-forget)
            apiClient.put('/realms/user', {
                UserID: userStore.userSub,
                RealmID: realmId,
                LastAccessedAt: new Date().toISOString()
            }).catch(() => {});
            
            // Load characters for the newly active realm
            try {
                const { useCharacterStore } = await import('@shared/stores/character');
                const characterStore = useCharacterStore();
                await characterStore.loadCharactersForActiveRealm();
                console.log('✅ Characters loaded for realm:', realmId);
            } catch (error) {
                console.error('❌ Failed to load characters for realm:', error);
            }

            // Load subscriptions when setting active realm
            try {
                const subscriptionStore = useSubscriptionStore();
                if (!subscriptionStore.loaded) {
                    subscriptionStore.loadSubscriptions();
                    console.log('✅ Subscriptions loading for realm:', realmId);
                }
            } catch (error) {
                console.error('❌ Failed to load subscriptions for realm:', error);
            }
        },

        async setDate(date) {
            const result = await this.setAttr(this.activeRealmId, 'Date', date);
            console.log('result', result);
        },

        async _putRealm(realm) {
            try {
                // const user = await Auth.currentAuthenticatedUser();
                const response = await apiClient.put(`/realms/realm/${realm.RealmID}`, realm);
                if (response.status < 200 || response.status >= 300) {
                    console.error('Failed to update realm', realm, response);
                    return null;
                }

                this.date = response.data;
                // if (response.data.success)
                // this.date = date;
            } catch (error) {
                console.warn(error);
                console.warn('Error updating date', error);
            }
            return this.date;
        },

        async setAttr(id, attr, value, put = true) {
            try {
                const userStore = useUserStore();
                if (!userStore.isRealmEditor) {
                    console.warn('User is not a realm editor');
                    return null;
                }

                if (!this.default[attr]) {
                    console.warn(`Invalid attribute: ${attr}`);
                    return null;
                }
                if (attr === 'Date') {
                    const requiredKeys = Object.keys(this.default['Date']);
                    const valueKeys = Object.keys(value);
                    if (!requiredKeys.every(key => valueKeys.includes(key) && value[key] !== undefined)) {
                        console.warn(`Invalid date: ${JSON.stringify(value)}`);
                        return null;
                    }
                    const newValue = {};
                    requiredKeys.forEach(key => newValue[key] = value[key]);

                    value = newValue;
                } else if (typeof value !== this.default[attr].type) {
                    console.warn(`Invalid type for ${attr}: ${typeof value}`);
                    return null;
                }
                if (attr === 'RealmID' || attr === 'AccountID') {
                    console.warn(`Cannot set ${attr}`);
                    return null;
                }
                if (attr === 'MaxCharacters' && value < 0) {
                    console.warn(`Invalid MaxCharacters: ${value}`);
                    return null;
                }
                if (attr === 'Name' && (typeof value !== 'string' || value.length < 3)) {
                    console.warn(`Invalid Name: ${value}`);
                    return null;
                }
                this.realms[id][attr] = value;

                if (put) {
                    const realmOut = JSON.parse(JSON.stringify(this.realms[id]));
                    delete realmOut.Players;
                    await this._putRealm(realmOut);
                }
                
                return this.realms[id];
            } catch (error) {
                console.error(error);
                console.warn(`Error setting member attribute ${attr} to ${value}`);
                return null;
            }
        },

        updateRealmInStore(realmData) {
            if (realmData && realmData.RealmID) {
                this.realms[realmData.RealmID] = realmData;
            }
        },

        /**
         * Updates the GamingSystem field for the active realm.
         * This ensures proper reactivity when gaming system features are changed.
         * @param {string} feature - The feature to update (classes, races, spells, maps, modules)
         * @param {string|object|null} value - The gaming system ID, object (for spells), or null to remove
         */
        updateActiveRealmGamingSystem(feature, value) {
            if (!this.activeRealmId || !this.realms[this.activeRealmId]) {
                console.warn('No active realm to update gaming system for');
                return;
            }

            const realm = this.realms[this.activeRealmId];

            // Ensure GamingSystem object exists
            if (!realm.GamingSystem) {
                realm.GamingSystem = {};
            }

            // Update the specific feature
            if (value === null) {
                delete realm.GamingSystem[feature];
            } else {
                realm.GamingSystem[feature] = value;
            }

            // Force reactivity by reassigning the realm object
            this.realms[this.activeRealmId] = { ...realm };

            console.log(`Updated GamingSystem.${feature} to:`, value);
        },

        /**
         * Repairs broken spells config where GamingSystem.spells is an object with empty Classes.
         * The API returns no spells when Classes is empty. This converts back to string format
         * (all spells) and migrates EnabledShopItems to a separate GamingSystem field.
         * @returns {boolean} true if repair was needed and performed
         */
        async repairSpellsConfig() {
            const realm = this.activeRealm;
            if (!realm) return false;

            const spells = realm.GamingSystem?.spells;
            if (!spells || typeof spells === 'string') return false;
            // Only repair if Classes array exists but is empty — that's the broken state.
            // If there are no Classes at all (Schools-based config), nothing to repair.
            if (!spells.Classes || spells.Classes.length > 0) return false;

            const gamingSystemId = spells.GamingSystemID;
            if (!gamingSystemId) return false;

            console.log('🔧 Repairing broken spells config (empty Classes)...');

            const enabledShopItems = spells.EnabledShopItems;
            const updatePayload = {
                GamingSystem: {
                    spells: gamingSystemId,
                    ...(enabledShopItems ? { spellsEnabledShopItems: enabledShopItems } : {})
                }
            };

            try {
                const response = await apiClient.put(`/realms/realm/${realm.RealmID}`, updatePayload);

                this.updateActiveRealmGamingSystem('spells', gamingSystemId);
                if (enabledShopItems) {
                    this.updateActiveRealmGamingSystem('spellsEnabledShopItems', enabledShopItems);
                }
                if (response.data) {
                    this.updateRealmInStore(response.data);
                }

                console.log('✅ Spells config repaired successfully');
                return true;
            } catch (error) {
                console.error('Failed to repair spells config:', error);
                return false;
            }
        },

        async deleteRealm(realmId) {
            const response = await apiClient.delete(`/realms/realm/${realmId}`);
            delete this.realms[realmId];
            if (this.activeRealmId === realmId) {
                this.activeRealmId = null;
            }
            return response.data;
        },

        async createRealm(realmData) {
            try {
                const userStore = useUserStore();
                const accountStore = useAccountStore();
                
                if (!accountStore.account?.AccountID) {
                    throw new Error('No account found');
                }
                
                const payload = {
                    ...realmData,
                    AccountID: accountStore.account.AccountID
                };
                
                console.log('📤 Creating realm...', payload);
                
                const BASE_URL = import.meta.env.VITE_API_BASE_URL;
                const token = userStore.user.auth.idToken;
                
                const response = await apiClient.post('/realms/realm', payload, {
                    headers: {
                        'Accept': '*/*',
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.status >= 200 && response.status < 300) {
                    console.log('✅ Realm created successfully', response.data);
                    
                    // Refresh realm data
                    await this.getRealms();
                    
                    return {
                        success: true,
                        data: response.data
                    };
                } else {
                    throw new Error('Failed to create realm');
                }
                
            } catch (error) {
                console.error('Error creating realm:', error);
                
                let errorMessage = 'An error occurred while creating the realm. Please try again.';
                
                if (error.response?.data?.message) {
                    errorMessage = error.response.data.message;
                } else if (error.response?.data?.error?.message) {
                    errorMessage = error.response.data.error.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                return {
                    success: false,
                    error: errorMessage
                };
            }
        },
    },
});