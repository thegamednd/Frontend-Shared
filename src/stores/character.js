import { defineStore } from 'pinia';
import axios from 'axios';
import apiClient from '@shared/utils/api';
import { useUserStore } from './user';

const BASE_API_URL = import.meta.env.VITE_API_BASE_URL;

export const useCharacterStore = defineStore('characters', {
    state: () => ({
        active: null,  // Character ID or null
        characters: {},
        default: {
            "ID": {type: 'string', val: null},
            "Aura": {type: 'object', val: { Code: null, Name: null }},
            "Bio": {type: 'string', val: ''},
            "Born": {type: 'number', val: null},
            "Classes": {type: 'array', val: []},
            "Died": {type: 'number', val: null},
            "Ethnicity": {type: 'string', val: null},
            "Eyes": {type: 'string', val: null},
            "Group": {type: 'string', val: null},
            "Hair": {type: 'string', val: null},
            "Height": {type: 'string', val: null},
            "HP": {type: 'number', val: 1},
            "Image": {type: 'string', val: null},
            "Level": {type: 'number', val: null},
            "Name": {type: 'string', val: null},
            "UserID": {type: 'string', val: null},
            "Pseudonym": {type: 'string', val: null},
            "Races": {type: 'array', val: []},
            "RealmID": {type: 'string', val: null},
            "Religion": {type: 'string', val: null},
            "Title": {type: 'string', val: null},
            "Weight": {type: 'number', val: null},
            "CharacterSheetURL": {type: 'string', val: null},
            "Alignment": {type: 'string', val: null},
            "Stats": {type: 'object', val: {}},
            "SavingThrows": {type: 'array', val: []},
            "Armour": {type: 'object', val: {}},
            "WeaponSkills": {type: 'array', val: []},
            "SpecialtyMoves": {type: 'array', val: []},
            "CurrentEffects": {type: 'array', val: []},
            "Languages": {type: 'array', val: []},
            "Traits": {type: 'object', val: {}},
            "Equipment": {type: 'object', val: {}},
            "SpellPoints": {type: 'object', val: null},
            "WizardSchools": {type: 'object', val: null},
            "CasterColour": {type: 'string', val: null},
            "Psionics": {type: 'object', val: null},
            "InstrumentSkills": {type: 'array', val: []},
            "PantheonId": {type: 'string', val: null},
            "Prayers": {type: 'array', val: []}
        },
        groups: [{Name: "Active"}, {Name: "Retired"}, {Name: "Deceased"}, {Name: "NPC"}, {Name: "Archive"}],
        loaded: false,
        races: [
            { "name": "Brownie" }, { "name": "Drow" }, { "name": "Dryad" },
            { "name": "Dwarf" }, { "name": "Elf" }, { "name": "Giant, Fire" },
            { "name": "Giant, Hill" }, { "name": "Gnome" }, { "name": "Gnoll" },
            { "name": "Grig" }, { "name": "Hobbit" }, { "name": "Human" },
            { "name": "Illithid" }, { "name": "Leprechaun" }, { "name": "Lizard Man" },
            { "name": "Minotaur" }, { "name": "Ogre" }, { "name": "Orc" },
            { "name": "Pixie" }, { "name": "Quarterling" }, { "name": "Sprite" },
            { "name": "Sylph" }, { "name": "Troll" }
        ],
    }),
    getters: {
        arSortedGroups(state) {
            return state.groups.slice().sort((a, b) => {
                if (a.Name < b.Name) return -1;
                if (a.Name > b.Name) return 1;
                return 0;
            });
        },
        arSortedRaces(state) {
            return state.races.slice().sort();
        },
        characterList(state) {
            const arCharacters = Object.values(state.characters);
            return arCharacters.slice().sort((a, b) => {
                // Use PascalCase field names
                const aBorn = a.Born;
                const bBorn = b.Born;
                
                if (aBorn && bBorn) {
                    return (new Date(aBorn) - new Date(bBorn)) * -1;
                } else if (aBorn) {
                    return -1;
                } else if (bBorn) {
                    return 1;
                }
                return 0; // Add explicit return for when neither has born date
            });
        },
        userChars(state) {
            const userStore = useUserStore();
            return this.characterList.filter((char) => char.UserID === userStore.userSub);
        },
        activeCharacter(state) {
            if (!state.active) return null;
            return state.characters[state.active] || null;
        }
    },
    actions: {
        /**
         * Whether the current user may view the full character sheet
         * (mechanical fields). Returns true for the realm owner, any DM,
         * and the character's owner. Used to gate the sheet view, the
         * print view, and the "Sheet" button on the Member page.
         */
        canViewCharacter(character) {
            if (!character) return false;
            const userStore = useUserStore();
            if (userStore.isOwner) return true;
            if (userStore.isDM) return true;
            return !!(character.UserID && character.UserID === userStore.userSub);
        },

        /**
         * Check if a string is a UUID format
         */
        isUUID(str) {
            if (!str || typeof str !== 'string') return false;
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            return uuidRegex.test(str);
        },

        async init() {
            // Classes are now managed by the classes store - no longer fetch here
            // await this.fetchClasses();

            // Only fetch characters if user has an active realm and we haven't already loaded them
            const userStore = useUserStore();
            if (userStore.activeRealmId && Object.keys(this.characters).length === 0) {
                await this.fetchCharacters();
            } else if (!userStore.activeRealmId) {
                // Clear any existing characters since user has no active realm
                this.characters = {};
            }

            this.getActiveCharacter();
            this.loaded = true;
        },
        async fetchCharacters() {
            try {
                const response = await apiClient.get('/characters');
                
                if (response.status < 200 || response.status >= 300) {
                    console.error('Failed to fetch characters');
                    return;
                }
                
                response.data.items.forEach((char) => {
                    // Use ID field if available, otherwise use id
                    const characterId = char.ID || char.id;
                    this.characters[characterId] = char;
                });
            } catch (error) {
                if (error.response?.status === 403) {
                    console.warn('User does not have permission to access characters - likely needs realm assignment');
                    this.characterList = [];
                } else {
                    console.error('Error fetching characters:', error);
                }
            }
        },
        async fetchRaces() {
            try {
                const response = await apiClient.get('/characters/races');
                
                if (response.status < 200 || response.status >= 300) {
                    console.error('Failed to fetch races');
                    return;
                }
                
                this.races = response.data;
            } catch (error) {
                console.error('Error fetching races:', error);
            }
        },

        getActiveCharacter() {
            const userStore = useUserStore();
            this.active = userStore.activeCharacterId || null;
        },

        async postMember(member) {
            try {
                // For FormData, don't set Content-Type - let browser handle it
                const requestConfig = {
                    // Don't set Accept or Content-Type for multipart data
                };
                
                console.log('📤 Request config:', requestConfig);
                console.log('📤 Full URL:', `${BASE_API_URL}/characters/character`);
                console.log('📤 Member data type:', member.constructor.name);
                
                const response = await apiClient.post('/characters/character', member, requestConfig);
                const newCharacter = response.data;
                
                if (newCharacter) {
                    // Add the new character to the local store cache
                    const characterId = newCharacter.ID || newCharacter.id;
                    console.log('✅ Adding new character to store cache:', characterId);
                    this.characters[characterId] = newCharacter;
                    
                    // If this is the user's first character, make it active
                    if (!this.active) {
                        console.log('🎯 Setting new character as active:', newCharacter.Name);
                        this.active = characterId;
                    }
                }
                
                return newCharacter;
            }
            catch (error) {
                // Enhanced error logging
                console.error('❌ Full error object:', error);
                console.error('❌ Error response:', error.response);
                console.error('❌ Error status:', error.response?.status);
                console.error('❌ Error statusText:', error.response?.statusText);
                console.error('❌ Error headers:', error.response?.headers);
                console.error('❌ Error data:', error.response?.data);
                console.error('❌ Request that failed:', error.config);
                console.warn('Error posting member');
                return null;
            }
        },

        async updateCharacter(characterId, updates) {
            try {
                console.log('📤 Updating character:', characterId);
                console.log('📤 Update data:', updates);
                
                const response = await apiClient.put(`/characters/character/${characterId}`, updates);
                
                // Update the local character data
                if (response.data && response.data.ID) {
                    // If we uploaded a new image, don't overwrite the imageUrl with base64 data
                    // The backend should return the proper S3 URL, but if it returns base64, ignore it
                    const updatedData = { ...response.data };
                    
                    // Check if image field contains base64 data (starts with /9j/ or similar base64 indicators)
                    if (updatedData.Image && typeof updatedData.Image === 'string' && 
                        (updatedData.Image.startsWith('/9j/') || updatedData.Image.startsWith('iVBOR') || 
                         updatedData.Image.startsWith('UklGR') || updatedData.Image.length > 1000)) {
                        // This looks like base64 data, so don't use it as the image URL
                        // Keep the existing image URL or set it to null for now
                        if (this.characters[characterId]) {
                            updatedData.Image = this.characters[characterId].Image;
                        } else {
                            delete updatedData.Image;
                        }
                    }
                    
                    this.characters[response.data.ID] = updatedData;
                }
                
                console.log('✅ Character updated successfully:', response.data);
                return response.data;
            }
            catch (error) {
                console.error('❌ Error updating character:', error);
                console.error('❌ Error response:', error.response);
                console.error('❌ Error status:', error.response?.status);
                console.error('❌ Error data:', error.response?.data);
                throw error;
            }
        },

        async createCharacter(characterData, imageFile = null) {
            try {
                const formData = new FormData();
                
                // Add character data
                formData.append('characterData', JSON.stringify(characterData));
                
                // Add image file if provided
                if (imageFile) {
                    formData.append('image', imageFile);
                }
                
                console.log('📤 Creating character...');
                
                // Note: For FormData, we let the browser set Content-Type header
                const response = await apiClient.post('/characters', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                
                const newCharacter = response.data;
                
                // Add to local characters store
                if (newCharacter.ID) {
                    this.characters[newCharacter.ID] = newCharacter;
                }
                
                // Refresh character list
                await this.fetchCharacters();
                
                console.log('✅ Character created successfully:', newCharacter);
                return { success: true, character: newCharacter };
            }
            catch (error) {
                console.error('❌ Error creating character:', error);
                console.error('❌ Error response:', error.response);
                console.error('❌ Error status:', error.response?.status);
                console.error('❌ Error data:', error.response?.data);
                
                const errorMessage = error.response?.data?.message || 
                                   error.response?.data?.error || 
                                   'Failed to create character';
                
                return { success: false, error: errorMessage };
            }
        },

        /**
         * Loads characters for the active realm if one is set.
         * This method can be called when a realm is activated.
         */
        async loadCharactersForActiveRealm() {
            const userStore = useUserStore();
            if (userStore.activeRealmId) {
                await this.fetchCharacters();
                this.getActiveCharacter();
            } else {
                console.log('⏸️ No active realm - clearing characters');
                this.characters = {};
                this.active = null;
            }
        },
        
        async patchCharacter(characterId, updates, requestId) {
            try {
                const payload = { ...updates };
                if (requestId) payload.requestId = requestId;

                const response = await apiClient.patch(`/characters/character/${characterId}`, payload);

                // Update local store
                if (response.data && response.data.ID) {
                    this.characters[response.data.ID] = {
                        ...this.characters[response.data.ID],
                        ...response.data
                    };
                }
                return response.data;
            } catch (error) {
                console.error('Error patching character:', error);
                throw error;
            }
        },

        setCharacterAttr(characterId, attr, value, save = true, requestId) {
            // Update locally
            if (this.characters[characterId]) {
                this.characters[characterId] = {
                    ...this.characters[characterId],
                    [attr]: value
                };
            }

            // Persist to backend
            if (save) {
                const rid = requestId || `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
                return this.patchCharacter(characterId, { [attr]: value }, rid);
            }
        },

        async updateCharacterSheetURL(characterId, url) {
            try {
                const updates = { CharacterSheetURL: url || null };
                const response = await this.updateCharacter(characterId, updates);
                return { success: true, data: response };
            } catch (error) {
                console.error('Error updating character sheet URL:', error);
                return { success: false, error: error.message };
            }
        },

        async deleteCharacter(characterId) {
            try {
                console.log('🗑️ Deleting character:', characterId);
                
                // Call the API to delete the character
                const response = await apiClient.delete(`/characters/character/${characterId}`);
                
                if (response.status < 200 || response.status >= 300) {
                    throw new Error(`Failed to delete character: HTTP ${response.status}`);
                }
                
                // Remove character from local store
                delete this.characters[characterId];
                
                // If this was the active character, clear active character
                if (this.active === characterId) {
                    this.getActiveCharacter(); // This will set a new active character or clear it
                }
                
                console.log('✅ Character deleted successfully:', characterId);
                return response.data;
                
            } catch (error) {
                console.error('❌ Error deleting character:', error);
                
                // Re-throw with more specific error info
                if (error.response?.status === 403) {
                    throw new Error('You do not have permission to delete this character');
                } else if (error.response?.status === 404) {
                    throw new Error('Character not found or already deleted');
                } else if (error.response?.status >= 500) {
                    throw new Error('Server error occurred while deleting character');
                } else {
                    throw new Error('Failed to delete character. Please try again.');
                }
            }
        },
    },
});