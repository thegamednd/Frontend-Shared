import { defineStore } from 'pinia';
//import { fetchAuthSession, fetchUserAttributes, getCurrentUser, updateUserAttributes } from '@aws-amplify/auth';
//import { Hub } from 'aws-amplify/utils';
import { useUserStore } from '@shared/stores/user';
import { patreonService } from '@shared/services/patreonService';
import axios from 'axios';
import apiClient from '@shared/utils/api';

const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}`;

export const useAccountStore = defineStore('account', {
    state: () => ({
        access: {},
        account: null,
        loaded: false,
        creditBalance: 0,
        patreonSubscription: null,
    }),
    getters: {
        accountId(state) {
            return state.account?.AccountID || null;
        }
    },
    actions: {
        async init() {
            await this.getAccount();
            this.loaded = true;
        },


        /**
         * Fetches the account data for the current authenticated user.
         * If the account data is already present in the store and force is not true, it returns the cached data.
         * Otherwise, it makes an API call to fetch the account data and stores it in the state.
         *
         * @param {boolean} [force=false] - If true, the account data will be fetched from the API even if it is already cached.
         * @returns {Promise<Object|null>} A promise that resolves to the account data or null if the fetch fails.
         */
        async getAccount(force = false) {
            const userStore = useUserStore();
            if (!userStore.user) {
                console.warn('No user found');
                this.account = null;
                return null;
            }
            const token = userStore.user.auth.idToken;

            try {
                if (!this.account || force) {
                    const response = await axios.get(
                        `${BASE_URL}/accounts/account`,
                        {
                            headers: {
                                Accept: '*/*',
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );
                    if (response.status < 200 || response.status >= 300) {
                        console.error(response);
                        throw new Error('Failed to get accounts');
                    }

                    this.account = response.data;

                    // Update credit balance from account data
                    this.creditBalance = this.account.CreditBalance || 0;

                    // Process Access map to build access structure
                    await this.processAccountAccess();
                }
            } catch (e) {
                console.error(e);
                this.account = null;
            }

            return this.account;
        },

        /**
         * Process the Access map from account data
         * Fetches shop items and builds the access structure:
         * {
         *   "gaming-system-id": {
         *     Spells: [
         *       { Class: "class-id-1" },  // Full access to all spells for this class
         *       { Class: "class-id-2", Schools: ["Dwarven", "Elven"] }  // Limited to specific schools
         *     ],
         *     Classes: true,
         *     Maps: ["map-id-1", "map-id-2"],
         *     Modules: ["module-id-1", "module-id-2"]
         *   }
         * }
         * @returns {Promise<Object>} Processed access map
         */
        async processAccountAccess() {
            if (!this.account?.Access) {
                this.access = {};
                return this.access;
            }

            const accessMap = {};

            try {
                // Process each gaming system in the Access map
                for (const [gamingSystemId, shopItemIds] of Object.entries(this.account.Access)) {
                    if (!Array.isArray(shopItemIds)) {
                        console.warn(`Invalid shop item IDs for gaming system ${gamingSystemId}`);
                        continue;
                    }

                    // Initialize gaming system entry
                    if (!accessMap[gamingSystemId]) {
                        accessMap[gamingSystemId] = {
                            Spells: [],
                            FullSpells: false,  // true = full access to all spells
                            MaxSpellLevel: undefined, // undefined = not set yet, null = unlimited, number = highest level cap
                            Classes: false,     // true = all, string[] = specific IDs
                            Races: false,       // true = all, string[] = specific IDs
                            Skills: false,      // true = all, string[] = specific IDs
                            Pantheons: false,   // true = all, string[] = specific IDs
                            Maps: [],
                            Modules: []
                        };
                    }

                    // Fetch and process all shop items for this gaming system
                    await this.processShopItems(shopItemIds, gamingSystemId, accessMap);
                }

                this.access = accessMap;
                return accessMap;
            } catch (error) {
                console.error('Error processing account access:', error);
                this.access = accessMap; // Save partial result
                return accessMap;
            }
        },

        /**
         * Process shop items recursively, handling nested Shop items
         * @param {Array<string>} shopItemIds - Array of shop item IDs
         * @param {string} gamingSystemId - Gaming system ID
         * @param {Object} accessMap - Access map being built
         * @param {Set<string>} visited - Set of visited shop item IDs (prevents infinite loops)
         * @returns {Promise<void>}
         */
        async processShopItems(shopItemIds, gamingSystemId, accessMap, visited = new Set()) {
            // Fetch all shop items in parallel
            const fetchPromises = shopItemIds
                .filter(id => !visited.has(id)) // Avoid infinite loops
                .map(async (shopItemId) => {
                    visited.add(shopItemId);
                    try {
                        const response = await apiClient.get(`/shop/products/product/${shopItemId}`);
                        return response.data;
                    } catch (error) {
                        console.error(`Error fetching shop item ${shopItemId}:`, error);
                        return null;
                    }
                });

            const shopItems = (await Promise.all(fetchPromises)).filter(item => item !== null);

            // Process each shop item's Items array
            for (const shopItem of shopItems) {
                if (!shopItem.Items || !Array.isArray(shopItem.Items)) {
                    continue;
                }

                for (const item of shopItem.Items) {
                    await this.processShopItemType(item, gamingSystemId, accessMap, visited);
                }
            }
        },

        /**
         * Process a single shop item type
         * @param {Object} item - Shop item with Type and optional ID
         * @param {string} gamingSystemId - Gaming system ID
         * @param {Object} accessMap - Access map being built
         * @param {Set<string>} visited - Set of visited shop item IDs
         * @returns {Promise<void>}
         */
        async processShopItemType(item, gamingSystemId, accessMap, visited) {
            const { Type, ID, IDs, Class, Schools, MaxLevel } = item;

            switch (Type) {
                case 'Spells':
                    // Track MaxLevel: take the highest across all spell items
                    // undefined = not set yet, null = unlimited, number = capped
                    if (accessMap[gamingSystemId].MaxSpellLevel !== null) {
                        // Not yet unlimited
                        if (MaxLevel == null) {
                            // This item has no MaxLevel → unlimited
                            accessMap[gamingSystemId].MaxSpellLevel = null;
                        } else {
                            const lvl = Number(MaxLevel);
                            const current = accessMap[gamingSystemId].MaxSpellLevel;
                            if (current === undefined || lvl > current) {
                                accessMap[gamingSystemId].MaxSpellLevel = lvl;
                            }
                        }
                    }
                    // If already null (unlimited), no further changes needed

                    if (Class) {
                        // Restricted to specific class(es)
                        // Check if we already have an entry for this class
                        const existingEntry = accessMap[gamingSystemId].Spells.find(e => e.Class === Class);
                        if (existingEntry) {
                            // If existing entry has no Schools (full access), keep it
                            // If new entry has Schools, merge them
                            if (existingEntry.Schools && Schools) {
                                // Merge schools, avoiding duplicates
                                for (const school of Schools) {
                                    if (!existingEntry.Schools.includes(school)) {
                                        existingEntry.Schools.push(school);
                                    }
                                }
                            } else if (!Schools) {
                                // New entry has full access, remove Schools restriction
                                delete existingEntry.Schools;
                            }
                        } else {
                            // Add new entry
                            const spellAccess = { Class };
                            if (Schools && Schools.length > 0) {
                                spellAccess.Schools = [...Schools];
                            }
                            accessMap[gamingSystemId].Spells.push(spellAccess);
                        }
                    } else {
                        // No Class = full access to all spells in this gaming system
                        accessMap[gamingSystemId].FullSpells = true;
                    }
                    break;

                case 'Classes':
                    if (IDs && IDs.length > 0) {
                        // Specific classes
                        if (accessMap[gamingSystemId].Classes === true) break; // already have full access
                        if (!Array.isArray(accessMap[gamingSystemId].Classes)) {
                            accessMap[gamingSystemId].Classes = [];
                        }
                        IDs.forEach(id => {
                            if (!accessMap[gamingSystemId].Classes.includes(id)) {
                                accessMap[gamingSystemId].Classes.push(id);
                            }
                        });
                    } else {
                        accessMap[gamingSystemId].Classes = true;
                    }
                    break;

                case 'Races':
                    if (IDs && IDs.length > 0) {
                        if (accessMap[gamingSystemId].Races === true) break;
                        if (!Array.isArray(accessMap[gamingSystemId].Races)) {
                            accessMap[gamingSystemId].Races = [];
                        }
                        IDs.forEach(id => {
                            if (!accessMap[gamingSystemId].Races.includes(id)) {
                                accessMap[gamingSystemId].Races.push(id);
                            }
                        });
                    } else {
                        accessMap[gamingSystemId].Races = true;
                    }
                    break;

                case 'Skills':
                    if (IDs && IDs.length > 0) {
                        if (accessMap[gamingSystemId].Skills === true) break;
                        if (!Array.isArray(accessMap[gamingSystemId].Skills)) {
                            accessMap[gamingSystemId].Skills = [];
                        }
                        IDs.forEach(id => {
                            if (!accessMap[gamingSystemId].Skills.includes(id)) {
                                accessMap[gamingSystemId].Skills.push(id);
                            }
                        });
                    } else {
                        accessMap[gamingSystemId].Skills = true;
                    }
                    break;

                case 'Pantheons':
                    if (IDs && IDs.length > 0) {
                        if (accessMap[gamingSystemId].Pantheons === true) break;
                        if (!Array.isArray(accessMap[gamingSystemId].Pantheons)) {
                            accessMap[gamingSystemId].Pantheons = [];
                        }
                        IDs.forEach(id => {
                            if (!accessMap[gamingSystemId].Pantheons.includes(id)) {
                                accessMap[gamingSystemId].Pantheons.push(id);
                            }
                        });
                    } else {
                        accessMap[gamingSystemId].Pantheons = true;
                    }
                    break;

                case 'Maps':
                    if (ID && !accessMap[gamingSystemId].Maps.includes(ID)) {
                        accessMap[gamingSystemId].Maps.push(ID);
                    }
                    if (IDs && IDs.length > 0) {
                        IDs.forEach(id => {
                            if (!accessMap[gamingSystemId].Maps.includes(id)) {
                                accessMap[gamingSystemId].Maps.push(id);
                            }
                        });
                    }
                    break;

                case 'Modules':
                    if (ID && !accessMap[gamingSystemId].Modules.includes(ID)) {
                        accessMap[gamingSystemId].Modules.push(ID);
                    }
                    if (IDs && IDs.length > 0) {
                        IDs.forEach(id => {
                            if (!accessMap[gamingSystemId].Modules.includes(id)) {
                                accessMap[gamingSystemId].Modules.push(id);
                            }
                        });
                    }
                    break;

                case 'Shop':
                    // Nested shop item - recursively process
                    if (ID) {
                        await this.processShopItems([ID], gamingSystemId, accessMap, visited);
                    }
                    break;

                case 'Rules':
                    // Rules might be needed in the future
                    if (!accessMap[gamingSystemId].Rules) {
                        accessMap[gamingSystemId].Rules = true;
                    }
                    break;

                default:
                    console.warn(`Unknown shop item type: ${Type}`);
            }
        },

        /**
         * Fetches the Patreon subscription for the current user
         * @returns {Promise<Object|null>} Patreon subscription data or null
         */
        async fetchPatreonSubscription() {
            try {
                const subscription = await patreonService.getSubscription();
                this.patreonSubscription = subscription;
                return subscription;
            } catch (error) {
                console.error('Error fetching Patreon subscription:', error);
                this.patreonSubscription = null;
                return null;
            }
        },

        /**
         * Disconnects the Patreon account
         * @returns {Promise<boolean>} Success status
         */
        async disconnectPatreon() {
            try {
                await patreonService.disconnectPatreon();
                this.patreonSubscription = null;
                // Refresh account to update credit balance if needed
                await this.getAccount(true);
                return true;
            } catch (error) {
                console.error('Error disconnecting Patreon:', error);
                return false;
            }
        },

        /**
         * Refreshes credit balance from server
         * @returns {Promise<void>}
         */
        async refreshCreditBalance() {
            await this.getAccount(true);
        },

        async setActiveAccount(accountId) {
            if (!this.accounts[accountId]) {
                console.warn(`Account ${accountId} not found`);
                this.activeAccountId = null;
                return false;
            }
            this.activeAccountId = accountId;
            return true;
        },

        async updateAccount(accountId, account) {
            try {
                await axios.put(`/api/accounts/${accountId}`, account);
                await this.getAccounts();
            } catch (e) {
                console.error(e);
            }
        },
    },
});