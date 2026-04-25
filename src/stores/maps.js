import axios from 'axios';
import { defineStore } from 'pinia';
import { useAccountStore } from '@shared/stores/account';
import { useRealmStore } from '@shared/stores/realm';
import apiClient from '@shared/utils/api';

export const useMapsStore = defineStore('maps', {
    state: () => ({
        maps: {}, // Store maps by ID { mapId: mapData }
        loaded: false,
        isLoading: false,
        lastError: null,
    }),
    getters: {
        /**
         * Get all maps as an array
         */
        arMaps(state) {
            return Object.values(state.maps);
        },

        /**
         * Get all maps sorted by name
         */
        getSortedMaps(state) {
            const maps = this.arMaps;
            return maps.slice().sort((a, b) => {
                const nameA = a.Name || '';
                const nameB = b.Name || '';
                return nameA.localeCompare(nameB);
            });
        },

        /**
         * Get a specific map by ID
         */
        getMapById: (state) => (mapId) => {
            return state.maps[mapId] || null;
        },

        /**
         * Check if maps are loaded
         */
        isLoaded(state) {
            return state.loaded;
        }
    },
    actions: {
        /**
         * Load all maps that the account has access to
         * Gets map IDs from accountStore.access and fetches map details
         */
        async loadMaps(force = false) {
            try {
                const accountStore = useAccountStore();
                const realmStore = useRealmStore();

                // Check if already loaded
                if (!force && this.loaded && Object.keys(this.maps).length > 0) {
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

                // Free-tier realms only ever see the shared sample map(s). The backend
                // /maps endpoint already filters to IsFreeTierMap templates for free tier,
                // so skip account/Patreon/custom-map lookups entirely.
                if (realmStore.isFreeTier && realmStore.activeRealmId) {
                    try {
                        const response = await apiClient.get('/maps');
                        const items = response.data || [];
                        const newMaps = {};
                        items.forEach((map) => {
                            if (map.ID) newMaps[map.ID] = map;
                        });
                        this.maps = newMaps;
                        this.loaded = true;
                    } catch (err) {
                        console.error('Error fetching free-tier maps:', err);
                        this.lastError = err.response?.data?.message || err.message;
                        throw err;
                    } finally {
                        this.isLoading = false;
                    }
                    return;
                }

                const access = accountStore.access || {};

                // Collect all map IDs from all gaming systems (Account.Access)
                const allMapIds = [];
                const directMaps = []; // Maps fetched in bulk (full-access gaming systems)
                for (const [gamingSystemId, accessInfo] of Object.entries(access)) {
                    if (accessInfo.Maps === true) {
                        // Full access — fetch all template maps for this gaming system in one call
                        try {
                            const response = await apiClient.get(`/maps/system/${gamingSystemId}`);
                            const systemMaps = response.data || [];
                            systemMaps.forEach(map => {
                                if (map.ID) directMaps.push(map);
                            });
                        } catch (err) {
                            console.error(`Error fetching system maps for ${gamingSystemId}:`, err);
                        }
                    } else if (accessInfo.Maps && Array.isArray(accessInfo.Maps)) {
                        accessInfo.Maps.forEach(mapId => {
                            // Only add unique map IDs
                            if (!allMapIds.some(item => item.mapId === mapId)) {
                                allMapIds.push({ mapId, gamingSystemId });
                            }
                        });
                    }
                }

                // Also check Patreon benefits on the active realm for additional maps
                const activeRealm = realmStore.activeRealm;
                if (activeRealm?.Metadata?.patreonBenefits) {
                    for (const benefit of activeRealm.Metadata.patreonBenefits) {
                        if (benefit.ShopItems && Array.isArray(benefit.ShopItems)) {
                            for (const shopItemId of benefit.ShopItems) {
                                try {
                                    const product = await this.fetchShopProduct(shopItemId);
                                    if (product?.Items) {
                                        for (const item of product.Items) {
                                            if (item.Type === 'Maps') {
                                                const mapIds = [];
                                                if (item.ID) mapIds.push(item.ID);
                                                if (item.IDs && Array.isArray(item.IDs)) mapIds.push(...item.IDs);
                                                for (const mid of mapIds) {
                                                    if (!allMapIds.some(m => m.mapId === mid)) {
                                                        allMapIds.push({
                                                            mapId: mid,
                                                            gamingSystemId: product.GamingSystemID,
                                                            fromPatreon: true
                                                        });
                                                    }
                                                }
                                            }
                                        }
                                    }
                                } catch (err) {
                                    console.error(`Error processing Patreon shop item ${shopItemId}:`, err);
                                }
                            }
                        }
                    }
                }

                // Fetch realm-scoped maps (realm-specific custom maps + override maps) for the active realm
                const realmMaps = [];
                if (realmStore.activeRealmId) {
                    try {
                        const response = await apiClient.get('/maps');
                        const items = response.data || [];
                        items.forEach(map => {
                            if (map.ID) realmMaps.push(map);
                        });
                    } catch (err) {
                        console.error('Error fetching realm maps:', err);
                    }
                }

                if (allMapIds.length === 0 && directMaps.length === 0 && realmMaps.length === 0) {
                    this.maps = {};
                    this.loaded = true;
                    return;
                }

                // Fetch individually-specified maps in parallel
                const mapFetchPromises = allMapIds.map(async ({ mapId, gamingSystemId }) => {
                    try {
                        const response = await apiClient.get(`/maps/map/${mapId}`);
                        return {
                            ...response.data,
                            GamingSystemID: response.data.GamingSystemID || gamingSystemId
                        };
                    } catch (err) {
                        console.error(`Error fetching map ${mapId}:`, err);
                        return null;
                    }
                });

                const mapsArray = [
                    ...directMaps,
                    ...realmMaps,
                    ...(await Promise.all(mapFetchPromises)).filter(map => map !== null)
                ];

                // Store maps by ID
                const newMaps = {};
                mapsArray.forEach((map) => {
                    if (map.ID) {
                        newMaps[map.ID] = map;
                    }
                });

                this.maps = newMaps;
                this.loaded = true;


            } catch (error) {
                console.error('Failed to load maps:', error);
                this.lastError = error.response?.data?.message || error.message;
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Get a specific map by ID, fetching from API if not cached
         */
        async getMap(mapId, force = false) {
            // Return cached map if available and not forcing refresh
            if (this.maps[mapId] && !force) {
                return this.maps[mapId];
            }

            // Fetch from API
            try {
                const response = await apiClient.get(`/maps/map/${mapId}`);

                if (response.status >= 200 && response.status < 300) {
                    const mapData = response.data;

                    // Cache the map
                    if (mapData.ID) {
                        this.maps[mapData.ID] = mapData;
                    }

                    return mapData;
                } else {
                    throw new Error(`Failed to load map: ${response.status}`);
                }
            } catch (error) {
                console.error(`Failed to fetch map ${mapId}:`, error);
                this.lastError = error.response?.data?.message || error.message;
                throw error;
            }
        },

        /**
         * Clear all maps from the store
         */
        clearMaps() {
            this.maps = {};
            this.loaded = false;
            this.lastError = null;
        },

        /**
         * Refresh maps (force reload)
         */
        async refreshMaps() {
            this.loaded = false;
            await this.loadMaps(true);
        },

        /**
         * Fetch a shop product by ID
         * @param {string} shopItemId - Shop product ID
         * @returns {Promise<Object|null>} Shop product data or null
         */
        async fetchShopProduct(shopItemId) {
            try {
                const response = await apiClient.get(`/shop/products/product/${shopItemId}`);
                return response.data;
            } catch (error) {
                console.error(`Error fetching shop item ${shopItemId}:`, error);
                return null;
            }
        },

        /**
         * Upload a custom map for the active realm using the pre-signed URL flow:
         *   1. POST /maps/map            — create a pending map record (quota check)
         *   2. GET /maps/map/{id}/upload-url?extension=ext — obtain a pre-signed S3 PUT URL
         *   3. PUT file to S3            — bypasses API Gateway's 10 MB limit
         *   4. POST /maps/map/{id}/process — queue tile generation
         *
         * @param {Object} params
         * @param {File} params.file
         * @param {string} params.Name
         * @param {string} params.GamingSystemID
         * @param {string} [params.Description]
         * @param {(progress: { step: string, percent?: number }) => void} [params.onProgress]
         * @returns {Promise<Object>} The created map record (pending state).
         */
        async uploadMap({ file, Name, GamingSystemID, Description, onProgress }) {
            if (!file) throw new Error('A file is required');
            if (!Name) throw new Error('Name is required');
            if (!GamingSystemID) throw new Error('GamingSystemID is required');

            const extFromMime = {
                'image/png': 'png',
                'image/jpeg': 'jpg',
                'image/webp': 'webp'
            }[file.type] || 'png';

            const unwrap = (resp) => {
                const payload = resp?.data;
                return payload?.data ?? payload;
            };

            try {
                onProgress?.({ step: 'metadata' });
                const createResp = await apiClient.post('/maps/map', {
                    Name,
                    GamingSystemID,
                    ...(Description ? { Description } : {})
                });
                const mapData = unwrap(createResp);
                if (!mapData?.ID) throw new Error('Map create returned no ID');

                // Seed the cache immediately so the sidebar shows the pending map.
                this.maps = { ...this.maps, [mapData.ID]: mapData };

                onProgress?.({ step: 'presign' });
                const urlResp = await apiClient.get(
                    `/maps/map/${mapData.ID}/upload-url`,
                    { params: { extension: extFromMime } }
                );
                const urlData = unwrap(urlResp);
                if (!urlData?.uploadUrl) throw new Error('No uploadUrl returned');

                onProgress?.({ step: 'upload', percent: 0 });
                // axios with NO auth interceptors for the S3 PUT — use a bare instance.
                await axios.put(urlData.uploadUrl, file, {
                    headers: { 'Content-Type': file.type },
                    timeout: 600000,
                    onUploadProgress: (evt) => {
                        if (evt.total) {
                            onProgress?.({
                                step: 'upload',
                                percent: Math.round((evt.loaded / evt.total) * 100)
                            });
                        }
                    }
                });

                onProgress?.({ step: 'process' });
                await apiClient.post(`/maps/map/${mapData.ID}/process`, { extension: extFromMime });

                return mapData;
            } catch (error) {
                console.error('Failed to upload map:', error);
                throw error;
            }
        },

        /**
         * Update a map (e.g. saving scale configuration)
         * @param {string} mapId - Map ID
         * @param {Object} updates - Fields to update
         * @returns {Promise<Object>} Updated map data
         */
        async updateMap(mapId, updates) {
            try {
                const response = await apiClient.put(`/maps/map/${mapId}`, updates);
                const updatedMap = response.data;

                // Update cache
                if (this.maps[mapId]) {
                    this.maps[mapId] = { ...this.maps[mapId], ...updatedMap };
                }

                return updatedMap;
            } catch (error) {
                console.error(`Failed to update map ${mapId}:`, error);
                throw error;
            }
        },

        async deleteMap(mapId) {
            try {
                await apiClient.delete(`/maps/map/${mapId}`);
                delete this.maps[mapId];
            } catch (error) {
                console.error(`Failed to delete map ${mapId}:`, error);
                throw error;
            }
        },

        /**
         * Add a marker to a map
         * @param {string} mapId - Map ID
         * @param {Object} markerData - Marker data (Name, Note, X, Y, Type)
         * @returns {Promise<Object>} Created marker data
         */
        async addMarker(mapId, markerData) {
            try {
                const response = await apiClient.post(`/maps/map/${mapId}/markers`, markerData);
                return response.data;
            } catch (error) {
                console.error(`Failed to add marker to map ${mapId}:`, error);
                throw error;
            }
        },

        /**
         * Update a marker on a map
         * @param {string} mapId - Map ID
         * @param {string} markerId - Marker ID
         * @param {Object} updates - Fields to update
         * @returns {Promise<Object>} Updated marker data
         */
        async updateMarker(mapId, markerId, updates) {
            try {
                const response = await apiClient.put(`/maps/map/${mapId}/markers/${markerId}`, updates);
                return response.data;
            } catch (error) {
                console.error(`Failed to update marker ${markerId} on map ${mapId}:`, error);
                throw error;
            }
        },

        /**
         * Delete a marker from a map
         * @param {string} mapId - Map ID
         * @param {string} markerId - Marker ID
         */
        async deleteMarker(mapId, markerId) {
            try {
                await apiClient.delete(`/maps/map/${mapId}/markers/${markerId}`);
            } catch (error) {
                console.error(`Failed to delete marker ${markerId} from map ${mapId}:`, error);
                throw error;
            }
        }
    }
});
