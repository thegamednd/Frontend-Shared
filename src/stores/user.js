import { defineStore } from 'pinia';
import { fetchAuthSession, fetchUserAttributes, getCurrentUser, updateUserAttributes, signOut } from '@aws-amplify/auth';
import { useRealmStore } from '@shared/stores/realm';
import { Hub } from 'aws-amplify/utils';
import axios from 'axios';
import apiClient from '@shared/utils/api';

const BASE_API_URL = `${import.meta.env.VITE_API_BASE_URL}`;

export const useUserStore = defineStore('user', {
    state: () => ({
        groups: [],
        prefs: {},
        loaded: false,
        isInitializing: true,
        users: [],
        user: null,
        userKeys: ['ActiveAccount', 'ActiveRealm'],
    }),
    getters: {
        isAuthenticated(state) {
            return !!state.user;
        },
        activeRealmId(state) {
            const ar = state.prefs.ActiveRealm;
            if (!ar) return null;
            // Legacy string format belongs to TheGame — ignore it on other frontends
            if (typeof ar === 'string') {
                const gsId = import.meta.env.VITE_GAMING_SYSTEM_ID;
                return gsId ? ar : null;
            }
            if (typeof ar === 'object') {
                const gsId = import.meta.env.VITE_GAMING_SYSTEM_ID;
                return ar[gsId] || null;
            }
            return null;
        },
        activeCharacterId(state) {
            return state.prefs.ActiveCharacter || null;
        },
        email(state) {
            return state.user?.attributes?.email || null;
        },
        firstName(state) {
            return state.user?.attributes?.given_name || null;
        },
        fullName(state) {
            let givenName = state.user?.attributes?.given_name || null;
            let familyName = state.user?.attributes?.family_name || null;
            return (givenName || familyName) ? `${givenName} ${familyName}`: `UNKNOWN`;
        },
        userSub(state) {
            return state.user?.userId || null;
        },
        isAdministrator(state) {
            return state.groups.includes('Administrators');
        },
        isAdmin(state) {
            return state.groups.includes('Administrators');
        },
        isCharacterEditor(state) {
            return state.groups.includes('Deity') || state.groups.includes('Administrators') || this.isDM || this.isOwner;
        },
        isContentEditor(state) {
            return state.groups.includes('Deity') || state.groups.includes('Administrators') || state.groups.includes('ContentEditors');
        },
        isDeity(state) {
            return state.groups.includes('Deity') || state.groups.includes('Administrators');
        },
        isPsiEditor(state) {
            return state.groups.includes('Deity') || state.groups.includes('Administrators') || state.groups.includes('PsiEditors');
        },
        isRealmEditor(state) {
            return state.groups.includes('Deity') || state.groups.includes('Administrators') || this.isDM || this.isOwner;
        },
        isReportEditor(state) {
            return state.groups.includes('Deity') || state.groups.includes('Administrators') || state.groups.includes('ReportEditors');
        },
        isSpellEditor(state) {
            return state.groups.includes('Deity') || state.groups.includes('Administrators') || state.groups.includes('SpellEditors');
        },
        isDM(state) {
            const realmStore = useRealmStore();
            const arDMs = realmStore.getRealmDMs;
            return !!arDMs?.find((player) => player.UserID === this.userSub);
        },
        isOwner(state) {
            const realmStore = useRealmStore();
            return realmStore.isOwner;
        },
    },
    actions: {
        async init() {
            try {
                await this.getUser();

                if (this.user) {
                    await Promise.all([
                        this.getPrefs(),
                        this.getGroups(),
                    ]);
                    this.loaded = true;
                } else {
                    console.warn('No user found');
                }
            } finally {
                this.isInitializing = false;
            }
        },

        /**
         * Fetches the current authenticated user and their attributes.
         * If the user attributes include identities as a string, it attempts to parse them as JSON.
         * If any error occurs during the fetch or parsing, the user is set to null and the error is logged.
         *
         * @returns {Promise<Object|null>} A promise that resolves to the user object or null if the fetch fails.
         */
        async getUser() {
            const MAX_RETRIES = 5;
            const RETRY_DELAY = 500; // .5 second

            try {
                this.user = await getCurrentUser({
                    bypassCache: true,
                });

                let retries = 0;
                while (retries < MAX_RETRIES) {
                    this.user.auth = await fetchAuthSession(this.user);
                    if (this.user.auth && this.user.auth.tokens) {
                        this.user.auth.idToken = this.user.auth.tokens.idToken.toString();
                        break;
                    } else {
                        console.warn('Auth session not available, retrying...');
                        retries++;
                        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                    }
                }

                if (!this.user.auth || !this.user.auth.tokens) {
                    throw new Error('Authentication tokens are missing after retries');
                }

                this.user.attributes = await fetchUserAttributes(this.user);
                if (this.user.attributes && this.user.attributes.identities && typeof this.user.attributes.identities === 'string') {
                    try {
                        this.user.attributes.identities = JSON.parse(this.user.attributes.identities);
                    } catch (e) {
                        console.error('Error parsing identities:', this.user.attributes.identities);
                        this.user.attributes.identities = [];
                    }
                }
                return this.user;
            } catch (error) {
                if (error.name === 'UserUnAuthenticatedException') {
                    console.warn('User is not authenticated.');
                    // Handle unauthenticated user scenario, e.g., redirect to login page
                } else {
                    console.error('Error fetching user:', error);
                }
                this.user = null;
                return null;
            }
        },

        /**
         * Fetches the preferences for the current authenticated user.
         * Makes an API call to retrieve the user preferences and stores them in the state.
         * If any error occurs during the fetch, the preferences are set to an empty object and the error is logged.
         *
         * @returns {Promise<Object>} A promise that resolves to the user preferences object.
         */
        async getPrefs() {
            try {
                const response = await apiClient.get(`/users/user/${this.user.userId}`);
                this.prefs = response.data;
                delete this.prefs.CognitoSub;
            } catch (error) {
                console.warn('Error fetching prefs:', error);
                this.prefs = { error };
            }
            return this.prefs;
        },

        async getUserBySub(sub) {
            const user = this.users.find(user => user.sub === sub);
            return user || {};
        },

        async getUsers() {
            try {
                const response = await apiClient.get('/users');
                this.users = response.data;
                return this.users;
            } catch (error) {
                console.warn('Error fetching users:', error);
                return [];
            }
        },

        isMemberOf(group) {
            return this.groups.includes(group);
        },

        async savePrefs() {
            try {
                // Only save the preferences that we allow to be updated
                const updatablePrefs = {};
                this.userKeys.forEach(key => {
                    if (this.prefs[key] !== undefined) {
                        updatablePrefs[key] = this.prefs[key];
                    }
                });

                await apiClient.put(`/users/user/${this.user.userId}`, updatablePrefs);
                console.log('User preferences saved successfully');
            } catch (error) {
                console.error('Error saving user preferences:', error);
                throw error;
            }
        },

        getPref(key) {
            if (typeof key !== 'string') {
                console.warn(`Invalid key for getPref: ${key}`);
                return;
            }
            return this.prefs[key] || null;
        },

        async setPref(key, value) {
            if (typeof key !== 'string' || typeof value === 'undefined') {
                console.warn(`Invalid key or value for setPref: ${key}, ${value}`);
                return;
            }
            if (!this.userKeys.includes(key)) {
                console.warn(`Key ${key} is not allowed`);
                return;
            }
            if (this.prefs[key] === value) {
                return;
            }
            this.prefs[key] = value;
            await this.savePrefs();
        },

        /**
         * Sets the active realm for the current user.
         * This is a convenience method that uses setPref to update the ActiveRealm preference.
         * 
         * @param {string} realmId - The ID of the realm to set as active
         * @returns {Promise<void>}
         */
        async setActiveRealm(realmId) {
            if (!realmId) {
                console.warn('setActiveRealm called with no realmId');
                return;
            }
            const gsId = import.meta.env.VITE_GAMING_SYSTEM_ID;
            await this.setPref('ActiveRealm', { [gsId]: realmId });
        },

        async getGroups() {
            try {
                
                // If user is not available, try to fetch it first
                if (!this.user) {
                    await this.getUser();
                }
                
                // Make sure we have the user
                if (!this.user) {
                    console.warn('No user available to get groups');
                    this.groups = [];
                    return this.groups;
                }
                
                // Try to extract groups from idToken payload
                if (this.user.auth?.tokens?.idToken?.payload) {
                    this.groups = this.user.auth.tokens.idToken.payload['cognito:groups'] || [];
                    return this.groups;
                }
                
                // Try to extract groups from accessToken payload
                if (this.user.auth?.tokens?.accessToken?.payload) {
                    this.groups = this.user.auth.tokens.accessToken.payload['cognito:groups'] || [];
                    return this.groups;
                }
                
                // If auth session info is not fully loaded, try to fetch it
                if (!this.user.auth || !this.user.auth.tokens) {
                    try {
                        this.user.auth = await fetchAuthSession(this.user);
                        
                        // Try again with the tokens
                        if (this.user.auth?.tokens?.idToken?.payload) {
                            this.groups = this.user.auth.tokens.idToken.payload['cognito:groups'] || [];
                            return this.groups;
                        }
                        
                        if (this.user.auth?.tokens?.accessToken?.payload) {
                            this.groups = this.user.auth.tokens.accessToken.payload['cognito:groups'] || [];
                            return this.groups;
                        }
                    } catch (sessionError) {
                        console.error('Failed to fetch auth session:', sessionError);
                    }
                }
                
                // If we still don't have groups, warn and return empty array
                console.warn('Could not find user groups in auth tokens');
                this.groups = [];
            } catch (error) {
                console.error('Error fetching user groups:', error);
                this.groups = [];
            }
            return this.groups;
        },

        async exitSite() {
            await signOut();
        },

        /**
         * Refreshes the user's authentication session and tokens.
         * This method should be called periodically to prevent token expiration.
         * 
         * @returns {Promise<boolean>} True if refresh was successful, false otherwise
         */
        async refreshSession() {
            try {
                if (!this.user) {
                    console.warn('No user available for session refresh');
                    return false;
                }

                // Fetch a fresh auth session
                const authSession = await fetchAuthSession({ forceRefresh: true });
                
                if (authSession?.tokens) {
                    // Update the user's auth information with fresh tokens
                    this.user.auth = authSession;
                    this.user.auth.idToken = authSession.tokens.idToken.toString();
                    
                    console.log('Session tokens refreshed successfully');
                    return true;
                } else {
                    console.warn('No tokens received during session refresh');
                    return false;
                }
            } catch (error) {
                console.error('Failed to refresh session:', error);
                
                // If the refresh fails due to authentication issues, 
                // the user may need to re-authenticate
                if (error.name === 'NotAuthorizedException' || 
                    error.name === 'UserUnAuthenticatedException') {
                    this.user = null;
                    this.loaded = false;
                }
                
                throw error;
            }
        },

        /**
         * Gets a valid token, refreshing if necessary.
         * This method should be used by other stores when making API calls.
         * 
         * @returns {Promise<string|null>} The valid ID token or null if unavailable
         */
        async getValidToken() {
            try {
                if (!this.user?.auth?.tokens?.idToken) {
                    console.warn('No auth tokens available');
                    return null;
                }

                // Check if the token is close to expiring (within 5 minutes)
                const token = this.user.auth.tokens.idToken;
                const payload = token.payload;
                const now = Math.floor(Date.now() / 1000);
                const expirationTime = payload.exp;
                
                // If token expires within 5 minutes, refresh it
                if (expirationTime - now < 300) {
                    console.log('Token expiring soon, refreshing...');
                    const refreshed = await this.refreshSession();
                    if (!refreshed) {
                        return null;
                    }
                }

                return this.user.auth.idToken;
            } catch (error) {
                console.error('Error getting valid token:', error);
                return null;
            }
        },
    },
});

// Listen for authentication events
Hub.listen('auth', async (data) => {
    const { payload } = data;
    if (payload.event === 'signedIn') {
        const userStore = useUserStore();
        userStore.isInitializing = true;
        userStore.user = await getCurrentUser({
            bypassCache: true,
        });
        userStore.init();
    } else if (payload.event === 'signOut') {
        const userStore = useUserStore();
        userStore.user = null;
    }
});