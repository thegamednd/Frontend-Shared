import { defineStore } from 'pinia';
import { useRealmStore } from '@shared/stores/realm';
import { watch } from 'vue';
import apiClient from '@shared/utils/api';

export const useClassesStore = defineStore('classes', {
    state: () => ({
        classes: {}, // Store classes by ID
        classListsByRealm: {}, // Track which classes belong to which realm
        loaded: false,
        isLoading: false,
        lastError: null,
        currentRealmId: null,
    }),
    getters: {
        // Get all classes as an array
        arClasses(state) {
            return Object.values(state.classes);
        },

        // Get a specific class by ID
        getClassById: (state) => (classId) => {
            return state.classes[classId] || null;
        },

        // Get classes for the current realm
        getClassesForCurrentRealm(state) {
            if (!state.currentRealmId || !state.classListsByRealm[state.currentRealmId]) {
                return [];
            }
            const classIds = state.classListsByRealm[state.currentRealmId];
            return classIds.map(id => state.classes[id]).filter(Boolean);
        },

        // Get classes for the current realm, sorted by ClassName
        getSortedClasses(state) {
            const classes = this.getClassesForCurrentRealm;
            return classes.slice().sort((a, b) => {
                if (a.ClassName < b.ClassName) return -1;
                if (a.ClassName > b.ClassName) return 1;
                return 0;
            });
        },

        // Check if classes are loaded for the current realm
        isLoadedForCurrentRealm(state) {
            return state.currentRealmId && state.classListsByRealm[state.currentRealmId] !== undefined;
        },

        // Get a specific class by name
        getClassByName: (state) => (className) => {
            return Object.values(state.classes).find(c => c.ClassName === className) || null;
        },

        // Get root classes (no parent) for current realm
        getRootClasses() {
            const classes = this.getClassesForCurrentRealm;
            return classes
                .filter(c => !c.MechanicsData?.Parent)
                .sort((a, b) => a.ClassName.localeCompare(b.ClassName));
        },

        // Get child classes for a given parent name
        getChildClasses: (state) => (parentName) => {
            return Object.values(state.classes)
                .filter(c => c.MechanicsData?.Parent === parentName)
                .sort((a, b) => a.ClassName.localeCompare(b.ClassName));
        },

        // Check if classes have hierarchy (TheGame-style with Parent)
        hasHierarchy() {
            const classes = this.getClassesForCurrentRealm;
            return classes.some(c => c.MechanicsData?.Parent);
        }
    },
    actions: {
        async init() {
            try {
                const realmStore = useRealmStore();

                // Watch for changes to active realm and reload classes
                watch(
                    () => realmStore.activeRealmId,
                    async (newActiveRealmId) => {
                        if (newActiveRealmId) {
                            this.currentRealmId = newActiveRealmId;
                            await this.loadClasses();
                        } else {
                            this.currentRealmId = null;
                        }
                    }
                );

                // Load classes if we have an active realm
                if (realmStore.activeRealmId) {
                    this.currentRealmId = realmStore.activeRealmId;
                    await this.loadClasses();
                }

                this.loaded = true;
            } catch (error) {
                console.error('Failed to initialize classes store', error);
                this.lastError = error.message;
            }
        },

        /**
         * Load all classes for the current realm
         */
        async loadClasses(force = false) {
            try {
                const realmStore = useRealmStore();
                const realmId = realmStore.activeRealm?.RealmID || realmStore.activeRealmId;

                if (!realmId) {
                    console.warn('No active realm found');
                    return;
                }

                // Check if already loaded for this realm
                if (!force && this.classListsByRealm[realmId]) {
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

                const response = await apiClient.get('/classes');

                if (response.status >= 200 && response.status < 300) {
                    const classesArray = Array.isArray(response.data) ? response.data : [response.data];

                    // Store class IDs for this realm
                    const classIds = [];

                    classesArray.forEach((classItem) => {
                        if (classItem.ID) {
                            this.classes[classItem.ID] = classItem;
                            classIds.push(classItem.ID);
                        }
                    });

                    this.classListsByRealm[realmId] = classIds;
                } else {
                    throw new Error(`Failed to load classes: ${response.status}`);
                }
            } catch (error) {
                console.error('Failed to load classes:', error);
                this.lastError = error.response?.data?.message || error.message;
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Get a specific class by ID, fetching from API if not cached
         */
        async getClass(classId, force = false) {
            // Return cached class if available and not forcing refresh
            if (this.classes[classId] && !force) {
                // Check if we have full details (Content field exists)
                if (this.classes[classId].Content || Object.keys(this.classes[classId]).length > 5) {
                    return this.classes[classId];
                }
            }

            try {
                const response = await apiClient.get(`/classes/class/${classId}`);

                if (response.status >= 200 && response.status < 300) {
                    this.classes[classId] = response.data;
                    return response.data;
                } else {
                    throw new Error(`Class not found: ${classId}`);
                }
            } catch (error) {
                console.error(`Failed to get class ${classId}:`, error);
                this.lastError = error.response?.data?.message || error.message;
                return null;
            }
        },

        /**
         * Clear all classes from the store
         */
        clearClasses() {
            this.classes = {};
            this.classListsByRealm = {};
            this.loaded = false;
            this.currentRealmId = null;
        },

        /**
         * Clear classes for a specific realm
         */
        clearClassesForRealm(realmId) {
            if (this.classListsByRealm[realmId]) {
                const classIds = this.classListsByRealm[realmId];
                classIds.forEach(id => {
                    delete this.classes[id];
                });
                delete this.classListsByRealm[realmId];
            }
        }
    }
});
