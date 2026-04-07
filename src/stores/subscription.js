import { defineStore } from 'pinia';
import apiClient from '@shared/utils/api';

export const useSubscriptionStore = defineStore('subscription', {
    state: () => ({
        subscriptions: [],
        loading: false,
        loaded: false,
        error: null
    }),
    
    getters: {
        /**
         * Get all subscription tiers sorted by tier order
         */
        allSubscriptions(state) {
            return state.subscriptions;
        },
        
        /**
         * Get subscription by tier name
         */
        getSubscriptionByTier: (state) => (tier) => {
            return state.subscriptions.find(sub => sub.Tier.toLowerCase() === tier.toLowerCase());
        },
        
        /**
         * Check if subscriptions are currently loading
         */
        isLoading(state) {
            return state.loading;
        },
        
        /**
         * Check if there was an error loading subscriptions
         */
        hasError(state) {
            return state.error !== null;
        },

        /**
         * Get upgrade tiers for Patreon Fellowship users
         * These are discounted tiers that require an active Patreon benefit
         */
        getUpgradeTiersForPatreon(state) {
            return state.subscriptions.filter(sub => sub.RequiresPatreonFellowship === true);
        },

        /**
         * Get regular subscription tiers (excludes upgrade tiers)
         */
        getRegularSubscriptions(state) {
            return state.subscriptions.filter(sub => !sub.RequiresPatreonFellowship);
        }
    },
    
    actions: {
        /**
         * Load all subscription tiers from the API
         */
        async loadSubscriptions() {
            if (this.loaded && !this.hasError) {
                return; // Already loaded successfully
            }
            
            this.loading = true;
            this.error = null;
            
            try {
                // Use authenticated API client to get user-specific subscription visibility
                // Pass gaming system ID to filter tiers for this gaming system
                const gamingSystemId = import.meta.env.VITE_GAMING_SYSTEM_ID;
                const params = gamingSystemId ? { gamingSystemId } : {};
                const response = await apiClient.get('/subscriptions', {
                    params,
                    timeout: 10000
                });
                
                if (response.data && response.data.success && response.data.data) {
                    this.subscriptions = response.data.data.items || [];
                    this.loaded = true;
                } else {
                    throw new Error('Invalid response format from subscriptions API');
                }
                
            } catch (error) {
                console.error('Error loading subscriptions:', error);
                this.error = error.message || 'Failed to load subscription tiers';
                this.subscriptions = [];
            } finally {
                this.loading = false;
            }
        },
        
        /**
         * Refresh subscription data (force reload)
         */
        async refreshSubscriptions() {
            this.loaded = false;
            this.error = null;
            await this.loadSubscriptions();
        },
        
        /**
         * Format cost for display
         */
        formatCost(costInCents, interval = 'monthly') {
            if (costInCents === 0) {
                return 'Free';
            }
            if (interval === 'annual') {
                return `$${(costInCents / 100).toFixed(2)}/year`;
            }
            return `$${(costInCents / 100).toFixed(2)}/month`;
        },
        
        /**
         * Capitalize tier name for display
         */
        formatTierName(tier) {
            if (!tier) return '';
            return tier.charAt(0).toUpperCase() + tier.slice(1);
        }
    }
});