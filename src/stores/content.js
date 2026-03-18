import { defineStore } from 'pinia';
import { useUserStore } from '@shared/stores/user';
import { useRealmStore } from '@shared/stores/realm';
import { watch } from 'vue';
import apiClient from '@shared/utils/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const useContentStore = defineStore('content', {
    state: () => ({
        rooms: {},
        contents: {},
        activeRoomId: null,
        loaded: false,
        isLoading: false,
        lastError: null,
    }),
    getters: {
        // Room getters
        arRooms(state) {
            return Object.values(state.rooms);
        },
        activeRoom(state) {
            return state.activeRoomId ? state.rooms[state.activeRoomId] : null;
        },
        getRoomById: (state) => (roomId) => {
            return state.rooms[roomId] || null;
        },
        
        // Content getters
        arContents(state) {
            return Object.values(state.contents);
        },
        getContentsByRoomId: (state) => (roomId) => {
            return Object.values(state.contents).filter(content => content.RoomID === roomId);
        },
        getContentById: (state) => (contentId) => {
            return state.contents[contentId] || null;
        }
    },
    actions: {
        async init() {
            try {
                const userStore = useUserStore();
                const realmStore = useRealmStore();
                
                // Watch for changes to active realm and reload rooms
                watch(
                    () => realmStore.activeRealmId,
                    async (newActiveRealmId) => {
                        if (newActiveRealmId) {
                            await this.loadRooms();
                        } else {
                            this.rooms = {};
                            this.contents = {};
                            this.activeRoomId = null;
                        }
                    }
                );

                // Load rooms if we have an active realm
                if (realmStore.activeRealmId) {
                    await this.loadRooms();
                }

                this.loaded = true;
            } catch (error) {
                console.error('Failed to initialize content store', error);
                this.lastError = error.message;
            }
        },

        /**
         * Load all rooms for the active realm
         */
        async loadRooms() {
            try {
                // Prevent redundant loading if already loading
                if (this.isLoading) {
                    console.log('⏸️ Rooms already loading, waiting for completion...');
                    // Wait for the current loading to complete
                    while (this.isLoading) {
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                    console.log('✅ Rooms loading completed, returning existing data');
                    return;
                }
                
                this.isLoading = true;
                this.lastError = null;

                const response = await apiClient.get(`${API_BASE_URL}/rooms`);
                
                if (response.status >= 200 && response.status < 300) {
                    this.rooms = {};
                    const rooms = Array.isArray(response.data) ? response.data : [response.data];
                    
                    rooms.forEach((room) => {
                        this.rooms[room.ID] = room;
                    });
                } else {
                    throw new Error(`Failed to load rooms: ${response.status}`);
                }
            } catch (error) {
                console.error('Failed to load rooms:', error);
                this.lastError = error.response?.data?.message || error.message;
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Get a specific room by ID
         */
        async getRoom(roomId, force = false) {
            if (this.rooms[roomId] && !force) {
                return this.rooms[roomId];
            }

            try {
                const response = await apiClient.get(`${API_BASE_URL}/rooms/room/${roomId}`);
                
                if (response.status >= 200 && response.status < 300) {
                    this.rooms[roomId] = response.data;
                    return response.data;
                } else {
                    throw new Error(`Room not found: ${roomId}`);
                }
            } catch (error) {
                console.error(`Failed to get room ${roomId}:`, error);
                this.lastError = error.response?.data?.message || error.message;
                return null;
            }
        },

        /**
         * Create a new room
         */
        async createRoom(roomData) {
            try {
                this.isLoading = true;
                this.lastError = null;

                const payload = {
                    Name: roomData.name,
                    Description: roomData.description || '',
                    MaxContents: roomData.maxContents || 50,
                    CreatedBy: 'user-set-by-api', // This will be set by the API from JWT
                };

                // Add image data if provided
                if (roomData.imageBase64 && roomData.imageFilename) {
                    payload.imageBase64 = roomData.imageBase64;
                    payload.imageFilename = roomData.imageFilename;
                    payload.imageType = roomData.imageType;
                }

                console.log('📤 Creating room...', payload);

                const response = await apiClient.post(`${API_BASE_URL}/rooms/room`, payload);
                
                if (response.status >= 200 && response.status < 300) {
                    const newRoom = response.data;
                    this.rooms[newRoom.ID] = newRoom;
                    
                    console.log('✅ Room created successfully', newRoom);
                    
                    return {
                        success: true,
                        data: newRoom
                    };
                } else {
                    throw new Error('Failed to create room');
                }
            } catch (error) {
                console.error('Error creating room:', error);
                
                let errorMessage = 'An error occurred while creating the room. Please try again.';
                
                if (error.response?.data?.message) {
                    errorMessage = error.response.data.message;
                } else if (error.response?.data?.error?.message) {
                    errorMessage = error.response.data.error.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                this.lastError = errorMessage;
                
                return {
                    success: false,
                    error: errorMessage
                };
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Update an existing room
         */
        async updateRoom(roomId, updates) {
            try {
                this.isLoading = true;
                this.lastError = null;

                const payload = {};
                
                if (updates.name !== undefined) payload.Name = updates.name;
                if (updates.description !== undefined) payload.Description = updates.description;
                if (updates.maxContents !== undefined) payload.MaxContents = updates.maxContents;
                if (updates.isActive !== undefined) payload.IsActive = updates.isActive;

                // Add image data if provided
                if (updates.imageBase64 && updates.imageFilename) {
                    payload.imageBase64 = updates.imageBase64;
                    payload.imageFilename = updates.imageFilename;
                    payload.imageType = updates.imageType;
                }

                const response = await apiClient.put(`${API_BASE_URL}/rooms/room/${roomId}`, payload);
                
                if (response.status >= 200 && response.status < 300) {
                    const updatedRoom = response.data;
                    this.rooms[roomId] = updatedRoom;
                    
                    console.log('✅ Room updated successfully', updatedRoom);
                    
                    return {
                        success: true,
                        data: updatedRoom
                    };
                } else {
                    throw new Error('Failed to update room');
                }
            } catch (error) {
                console.error(`Error updating room ${roomId}:`, error);
                
                let errorMessage = 'An error occurred while updating the room. Please try again.';
                
                if (error.response?.data?.message) {
                    errorMessage = error.response.data.message;
                } else if (error.response?.data?.error?.message) {
                    errorMessage = error.response.data.error.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                this.lastError = errorMessage;
                
                return {
                    success: false,
                    error: errorMessage
                };
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Delete a room
         */
        async deleteRoom(roomId, deleteChildContent = false) {
            try {
                this.isLoading = true;
                this.lastError = null;

                const url = `${API_BASE_URL}/rooms/room/${roomId}${deleteChildContent ? '?deleteContent=true' : ''}`;
                const response = await apiClient.delete(url);
                
                if (response.status >= 200 && response.status < 300) {
                    delete this.rooms[roomId];
                    
                    // Clear active room if it was deleted
                    if (this.activeRoomId === roomId) {
                        this.activeRoomId = null;
                    }
                    
                    console.log(`✅ Room ${roomId} deleted successfully`);
                    
                    return {
                        success: true
                    };
                } else {
                    throw new Error('Failed to delete room');
                }
            } catch (error) {
                console.error(`Error deleting room ${roomId}:`, error);
                
                let errorMessage = 'An error occurred while deleting the room. Please try again.';
                
                if (error.response?.data?.message) {
                    errorMessage = error.response.data.message;
                } else if (error.response?.data?.error?.message) {
                    errorMessage = error.response.data.error.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                this.lastError = errorMessage;
                
                return {
                    success: false,
                    error: errorMessage
                };
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Set the active room
         */
        setActiveRoom(roomId) {
            this.activeRoomId = roomId;
        },

        /**
         * Load contents for a specific room
         */
        async loadContentsForRoom(roomId) {
            try {
                this.isLoading = true;
                this.lastError = null;

                const response = await apiClient.get(`${API_BASE_URL}/contents/contents`, {
                    params: { roomId }
                });
                
                if (response.status >= 200 && response.status < 300) {
                    const contents = Array.isArray(response.data) ? response.data : [response.data];
                    
                    // Clear existing contents for this room
                    Object.keys(this.contents).forEach(contentId => {
                        if (this.contents[contentId].RoomID === roomId) {
                            delete this.contents[contentId];
                        }
                    });
                    
                    // Add new contents
                    contents.forEach((content) => {
                        this.contents[content.ID] = content;
                    });
                    
                    console.log(`✅ Loaded ${contents.length} contents for room ${roomId}`);
                    
                    return contents;
                } else {
                    throw new Error(`Failed to load contents for room: ${roomId}`);
                }
            } catch (error) {
                console.error(`Failed to load contents for room ${roomId}:`, error);
                this.lastError = error.response?.data?.message || error.message;
                return [];
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Create new content in a room
         */
        async createContent(contentData) {
            try {
                this.isLoading = true;
                this.lastError = null;

                const payload = {
                    RoomID: contentData.RoomID,
                    RealmID: contentData.RealmID,
                    Name: contentData.Name,
                    Content: contentData.Content,
                    Intro: contentData.Intro || '',
                    Link: contentData.Link || '',
                    Path: contentData.Path,
                    Parent: contentData.Parent,
                    IsActive: contentData.IsActive !== undefined ? contentData.IsActive : false,
                    Editors: contentData.Editors || []
                };

                console.log('📤 Creating content...', payload);

                const response = await apiClient.post(`${API_BASE_URL}/contents/content`, payload);
                
                if (response.status >= 200 && response.status < 300) {
                    const newContent = response.data;
                    this.contents[newContent.ID] = newContent;
                    
                    // Add the content ID to the room's contents array
                    const roomId = contentData.RoomID;
                    if (this.rooms[roomId] && this.rooms[roomId].contents) {
                        this.rooms[roomId].contents.push(newContent.ID);
                    }
                    
                    console.log('✅ Content created successfully', newContent);
                    
                    return newContent;
                } else {
                    throw new Error('Failed to create content');
                }
            } catch (error) {
                console.error('Error creating content:', error);
                
                let errorMessage = 'An error occurred while creating the content. Please try again.';
                
                if (error.response?.data?.message) {
                    errorMessage = error.response.data.message;
                } else if (error.response?.data?.error?.message) {
                    errorMessage = error.response.data.error.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                this.lastError = errorMessage;
                throw new Error(errorMessage);
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Update existing content
         */
        async updateContent(contentId, updates, roomId = null) {
            try {
                this.isLoading = true;
                this.lastError = null;

                // If roomId not provided, try to find it from the content
                if (!roomId && this.contents[contentId]) {
                    roomId = this.contents[contentId].RoomID;
                }
                
                if (!roomId) {
                    throw new Error('RoomID is required for updating content');
                }

                const payload = {
                    RoomID: roomId  // Include RoomID in the payload for the API
                };
                
                if (updates.Name !== undefined) payload.Name = updates.Name;
                if (updates.Content !== undefined) payload.Content = updates.Content;
                if (updates.Intro !== undefined) payload.Intro = updates.Intro;
                if (updates.Link !== undefined) payload.Link = updates.Link;
                if (updates.IsActive !== undefined) payload.IsActive = updates.IsActive;

                console.log('📤 Updating content...', contentId, payload);

                const response = await apiClient.put(`${API_BASE_URL}/contents/content/${contentId}`, payload);
                
                if (response.status >= 200 && response.status < 300) {
                    const updatedContent = response.data;
                    this.contents[contentId] = updatedContent;
                    
                    console.log('✅ Content updated successfully', updatedContent);
                    
                    return {
                        success: true,
                        data: updatedContent
                    };
                } else {
                    throw new Error('Failed to update content');
                }
            } catch (error) {
                console.error(`Error updating content ${contentId}:`, error);
                
                let errorMessage = 'An error occurred while updating the content. Please try again.';
                
                if (error.response?.data?.message) {
                    errorMessage = error.response.data.message;
                } else if (error.response?.data?.error?.message) {
                    errorMessage = error.response.data.error.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                this.lastError = errorMessage;
                
                return {
                    success: false,
                    error: errorMessage
                };
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Load contents for a specific room
         */
        async loadRoomContents(roomId) {
            try {
                // Check if the room already has contents loaded
                const room = this.rooms[roomId];
                if (room && room.contents) {
                    console.log(`✅ Room ${roomId} already has contents loaded`);
                    return;
                }

                this.isLoading = true;
                this.lastError = null;

                console.log(`🔄 Loading contents for room ${roomId} from API...`);
                const response = await apiClient.get(`${API_BASE_URL}/rooms/room/${roomId}/contents`);
                
                if (response.status >= 200 && response.status < 300) {
                    const contentsArray = Array.isArray(response.data) ? response.data : [response.data];
                    
                    // Extract IDs from the contents array
                    const contentIds = [];
                    
                    // Store each content item in the contents state
                    contentsArray.forEach((contentItem) => {
                        if (contentItem.ID) {
                            contentIds.push(contentItem.ID);
                            this.contents[contentItem.ID] = contentItem;
                        }
                    });
                    
                    // Add the contents array to the room
                    if (this.rooms[roomId]) {
                        this.rooms[roomId].contents = contentIds;
                    }
                    
                    console.log(`✅ Loaded ${contentsArray.length} contents for room ${roomId}`);
                    
                    return contentsArray;
                } else {
                    throw new Error(`Failed to load contents for room: ${roomId}`);
                }
            } catch (error) {
                console.error(`Failed to load contents for room ${roomId}:`, error);
                this.lastError = error.response?.data?.message || error.message;
                
                // Set empty contents array on error
                if (this.rooms[roomId]) {
                    this.rooms[roomId].contents = [];
                }
                
                return [];
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Delete content
         */
        async deleteContent(contentId, roomId, deleteChildContent = false) {
            try {
                this.isLoading = true;
                this.lastError = null;

                console.log(`🔄 Deleting content ${contentId} from room ${roomId}...`);
                console.log(`Delete child content: ${deleteChildContent}`);

                const url = `${API_BASE_URL}/contents/content/${contentId}?roomId=${roomId}${deleteChildContent ? '&deleteChildren=true' : ''}`;
                const response = await apiClient.delete(url);
                
                if (response.status >= 200 && response.status < 300) {
                    // Remove content from store
                    delete this.contents[contentId];
                    
                    // Remove content ID from the room's contents array
                    if (this.rooms[roomId] && this.rooms[roomId].contents) {
                        this.rooms[roomId].contents = this.rooms[roomId].contents.filter(id => id !== contentId);
                    }
                    
                    console.log(`✅ Content ${contentId} deleted successfully`);
                    
                    return {
                        success: true
                    };
                } else {
                    throw new Error('Failed to delete content');
                }
            } catch (error) {
                console.error(`Error deleting content ${contentId}:`, error);
                
                let errorMessage = 'An error occurred while deleting the content. Please try again.';
                
                if (error.response?.data?.message) {
                    errorMessage = error.response.data.message;
                } else if (error.response?.data?.error?.message) {
                    errorMessage = error.response.data.error.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                this.lastError = errorMessage;
                
                return {
                    success: false,
                    error: errorMessage
                };
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Load all contents for the active realm
         */
        async loadAllContents() {
            try {
                // Check if contents are already loaded
                if (Object.keys(this.contents).length > 0) {
                    console.log('✅ Contents already loaded');
                    return;
                }

                this.isLoading = true;
                this.lastError = null;

                console.log('🔄 Loading all contents from API...');
                const response = await apiClient.get(`${API_BASE_URL}/contents/all`);
                
                if (response.status >= 200 && response.status < 300) {
                    const contentsArray = Array.isArray(response.data) ? response.data : [response.data];
                    
                    // Store each content item in the contents state
                    contentsArray.forEach((contentItem) => {
                        if (contentItem.ID) {
                            this.contents[contentItem.ID] = contentItem;
                        }
                    });
                    
                    console.log(`✅ Loaded ${contentsArray.length} contents`);
                    
                    return contentsArray;
                } else {
                    throw new Error('Failed to load all contents');
                }
            } catch (error) {
                console.error('Failed to load all contents:', error);
                this.lastError = error.response?.data?.message || error.message;
                return [];
            } finally {
                this.isLoading = false;
            }
        }
    }
});