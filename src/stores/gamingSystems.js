import { defineStore } from 'pinia'
import apiClient from '@shared/utils/api'

export const useGamingSystemsStore = defineStore('gamingSystems', {
  state: () => ({
    systems: {},
    loading: false,
    error: null,
    loaded: false
  }),

  getters: {
    /**
     * Get all gaming systems as an array
     */
    allSystems: (state) => Object.values(state.systems),

    /**
     * Get a gaming system by ID
     */
    getSystemById: (state) => (id) => {
      return state.systems[id] || null
    },

    /**
     * Get gaming system name by ID
     */
    getSystemNameById: (state) => (id) => {
      return state.systems[id]?.Name || 'Unknown System'
    },

    /**
     * Check if systems are loaded
     */
    isLoaded: (state) => state.loaded,

    /**
     * Check if systems are loading
     */
    isLoading: (state) => state.loading
  },

  actions: {
    /**
     * Fetch all gaming systems from the API
     */
    async fetchGamingSystems() {
      // Don't refetch if already loaded
      if (this.loaded && Object.keys(this.systems).length > 0) {
        return
      }

      this.loading = true
      this.error = null

      try {
        const response = await apiClient.get('/systems')

        // API returns { systems: [...] }
        // Convert array to object with ID as key
        const systemsArray = response.data.systems || []
        this.systems = systemsArray.reduce((acc, system) => {
          acc[system.ID] = system
          return acc
        }, {})
        this.loaded = true
      } catch (err) {
        console.error('Error fetching gaming systems:', err)
        this.error = err.response?.data?.message || 'Failed to load gaming systems'
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Fetch the child gaming systems for a given parent and merge them into
     * the systems map. Returns the array of child systems.
     */
    async fetchChildSystems(parentId) {
      this.loading = true
      this.error = null

      try {
        const response = await apiClient.get(`/systems/${parentId}/children`)

        // API returns { systems: [...] }
        const childSystems = response.data.systems || []
        childSystems.forEach((system) => {
          this.systems[system.ID] = system
        })
        return childSystems
      } catch (err) {
        console.error('Error fetching child gaming systems:', err)
        this.error = err.response?.data?.message || 'Failed to load child gaming systems'
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Refresh gaming systems (force reload)
     */
    async refreshGamingSystems() {
      this.loaded = false
      await this.fetchGamingSystems()
    },

    /**
     * Clear gaming systems data
     */
    clearGamingSystems() {
      this.systems = {}
      this.loaded = false
      this.error = null
    }
  }
})
