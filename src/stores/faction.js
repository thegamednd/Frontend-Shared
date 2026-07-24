import { defineStore } from 'pinia';
import apiClient from '@shared/utils/api';

export const useFactionStore = defineStore('faction', {
    state: () => ({
        factions: [],
        loaded: false,
        isLoading: false,
    }),
    getters: {
        arFactionsAZ: (state) => [...state.factions].sort((a, b) => (a.Name || '').localeCompare(b.Name || '')),
        getFactionById: (state) => (id) => state.factions.find((f) => f.ID === id) || null,
    },
    actions: {
        async loadFactions(force = false) {
            if (this.loaded && !force) return;
            this.isLoading = true;
            try {
                const response = await apiClient.get('/characters/factions');
                this.factions = Array.isArray(response.data) ? response.data : [];
                this.loaded = true;
            } catch (error) {
                console.error('Failed to load factions:', error);
            } finally {
                this.isLoading = false;
            }
        },
        async createFaction(payload) {
            const response = await apiClient.post('/characters/factions', payload);
            if (response.data?.ID) this.factions.push(response.data);
            return response.data;
        },
        async updateFaction(id, payload) {
            const response = await apiClient.put(`/characters/factions/${id}`, payload);
            const index = this.factions.findIndex((f) => f.ID === id);
            if (index >= 0 && response.data?.ID) this.factions[index] = response.data;
            return response.data;
        },
        async deleteFaction(id) {
            await apiClient.delete(`/characters/factions/${id}`);
            this.factions = this.factions.filter((f) => f.ID !== id);
        },
        clear() {
            this.factions = [];
            this.loaded = false;
        },
    },
});
