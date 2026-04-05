import axios from 'axios';
import { useUserStore } from '@shared/stores/user';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Create axios instance for Patreon API
const patreonClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add authentication token
patreonClient.interceptors.request.use(
  async (config) => {
    try {
      const userStore = useUserStore();
      const token = await userStore.getValidToken();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    } catch (error) {
      console.error('Error in Patreon request interceptor:', error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Patreon Service
 * Handles all Patreon-related API calls
 */
export const patreonService = {
  /**
   * Initiates OAuth flow by getting the Patreon authorization URL
   * @returns {Promise<{authorizationUrl: string}>}
   */
  async initiateOAuth() {
    try {
      const response = await patreonClient.get('/patreon/oauth/authorize');
      // Unwrap the response: { success: true, data: { authorizationUrl } }
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error('Invalid response from server');
    } catch (error) {
      console.error('Error initiating Patreon OAuth:', error);
      throw error;
    }
  },

  /**
   * Gets the current Patreon subscription for the user
   * @returns {Promise<Object|null>} Patreon subscription data or null
   */
  async getSubscription() {
    try {
      const response = await patreonClient.get('/patreon/subscription');
      // Unwrap the response: { success: true, data: subscription }
      if (response.data?.success && response.data?.data !== undefined) {
        return response.data.data; // Return the actual subscription data (could be null)
      }
      return null;
    } catch (error) {
      // If 404, user doesn't have Patreon connected
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error fetching Patreon subscription:', error);
      throw error;
    }
  },

  /**
   * Disconnects the Patreon account from the user's RealmForge account
   * @returns {Promise<void>}
   */
  async disconnectPatreon() {
    try {
      await patreonClient.delete('/patreon/disconnect');
    } catch (error) {
      console.error('Error disconnecting Patreon:', error);
      throw error;
    }
  },

  /**
   * Gets available realms for benefit application
   * @returns {Promise<Array>} Array of realms with eligibility info
   */
  async getAvailableRealms() {
    try {
      const response = await patreonClient.get('/patreon/available-realms');
      // Unwrap the response: { success: true, data: realms[] }
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching available realms:', error);
      throw error;
    }
  },

  /**
   * Applies Patreon benefit to a specific realm
   * @param {string} realmId - The realm ID to apply benefit to
   * @returns {Promise<void>}
   */
  async applyBenefit(realmId) {
    try {
      await patreonClient.post('/patreon/apply-benefit', { realmId });
    } catch (error) {
      console.error('Error applying Patreon benefit:', error);
      throw error;
    }
  },

  /**
   * Removes Patreon benefit from a specific realm
   * @param {string} realmId - The realm ID to remove benefit from
   * @returns {Promise<void>}
   */
  async removeBenefit(realmId) {
    try {
      await patreonClient.post('/patreon/remove-benefit', { realmId });
    } catch (error) {
      console.error('Error removing Patreon benefit:', error);
      throw error;
    }
  },

  /**
   * Purchases a realm subscription using Patreon credits
   * @param {string} realmId - The realm ID to subscribe
   * @param {string} subscriptionTier - The subscription tier (e.g., 'guild', 'fellowship')
   * @returns {Promise<Object>} Subscription purchase result with new balance and realm data
   */
  async purchaseSubscriptionWithCredits(realmId, subscriptionTier) {
    try {
      const response = await patreonClient.post('/patreon/credit-subscription', {
        realmId,
        subscriptionTier
      });
      // Unwrap the response: { success: true, data: result }
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error('Invalid response from server');
    } catch (error) {
      console.error('Error purchasing subscription with credits:', error);
      throw error;
    }
  },

  /**
   * Gets benefits for a specific campaign with application status
   * @param {string} campaignId - The campaign ID
   * @returns {Promise<Array>} Array of benefits with status
   */
  async getCampaignBenefits(campaignId) {
    try {
      const response = await patreonClient.get(`/patreon/campaigns/${campaignId}/benefits`);
      // Unwrap the response: { success: true, data: benefits[] }
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching campaign benefits:', error);
      throw error;
    }
  },

  /**
   * Applies a Patreon benefit to a realm
   * @param {string} campaignId - The campaign ID
   * @param {string} benefitId - The benefit ID
   * @param {string} realmId - The realm ID to apply benefit to
   * @returns {Promise<void>}
   */
  async applyBenefitToRealm(campaignId, benefitId, realmId) {
    try {
      await patreonClient.post('/patreon/apply-benefit', {
        campaignId,
        benefitId,
        realmId
      });
    } catch (error) {
      console.error('Error applying benefit to realm:', error);
      throw error;
    }
  },

  /**
   * Removes a Patreon benefit from a realm
   * @param {string} campaignId - The campaign ID
   * @param {string} benefitId - The benefit ID
   * @param {string} realmId - The realm ID to remove benefit from
   * @returns {Promise<void>}
   */
  async removeBenefitFromRealm(campaignId, benefitId, realmId) {
    try {
      await patreonClient.post('/patreon/remove-benefit', {
        campaignId,
        benefitId,
        realmId
      });
    } catch (error) {
      console.error('Error removing benefit from realm:', error);
      throw error;
    }
  },

  /**
   * Gets benefit removal info including PayPal subscription details for refund calculation
   * @param {string} campaignId - The campaign ID
   * @param {string} benefitId - The benefit ID
   * @param {string} realmId - The realm ID
   * @returns {Promise<Object>} Removal info with PayPal details, refund amount, and available tiers
   */
  async getRemovalInfo(campaignId, benefitId, realmId) {
    try {
      const response = await patreonClient.get('/patreon/removal-info', {
        params: { campaignId, benefitId, realmId }
      });
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error('Invalid response from server');
    } catch (error) {
      console.error('Error fetching removal info:', error);
      throw error;
    }
  },

  /**
   * Gets active Patreon discounts for the authenticated user
   * @returns {Promise<Array>} Array of { GamingSystemID, DiscountPercent, CampaignID, BenefitID }
   */
  async getMyDiscounts() {
    try {
      const response = await patreonClient.get('/patreon/my-discounts');
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      if (error.response?.status === 404) {
        return [];
      }
      console.error('Error fetching Patreon discounts:', error);
      return [];
    }
  },

  /**
   * Validates discount for cart items (server-side price validation)
   * @param {Array} items - Array of { productId, quantity }
   * @returns {Promise<Object>} { items, totalOriginal, totalDiscounted, totalSavings }
   */
  async validateDiscount(items) {
    try {
      const response = await patreonClient.post('/patreon/validate-discount', { items });
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('Error validating discount:', error);
      return null;
    }
  },

  /**
   * Gets public Patreon benefit summary for a gaming system
   * No authentication required — used for promotional banners
   * @param {string} gamingSystemId - The gaming system ID
   * @returns {Promise<Object|null>} { campaignName, patreonURL, benefits: [{ type, description }] }
   */
  async getSystemBenefits(gamingSystemId) {
    try {
      const response = await patreonClient.get(`/patreon/system-benefits/${gamingSystemId}`);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching system benefits:', error);
      return null;
    }
  },

  /**
   * Removes a Patreon benefit with full PayPal subscription handling
   * Cancels old subscription, processes refund, removes benefit, and updates realm tier
   * @param {string} campaignId - The campaign ID
   * @param {string} benefitId - The benefit ID
   * @param {string} realmId - The realm ID
   * @param {string} newTier - The new tier to set (e.g., 'free', 'base', 'guild')
   * @param {Object|null} newSubscriptionData - New PayPal subscription data if paid tier selected
   * @returns {Promise<Object>} Result with cancellation, refund, and tier update details
   */
  async removeBenefitWithPayPalHandling(campaignId, benefitId, realmId, newTier, newSubscriptionData = null) {
    try {
      const response = await patreonClient.post('/patreon/remove-benefit-with-paypal', {
        campaignId,
        benefitId,
        realmId,
        newTier,
        newSubscriptionData
      });
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error('Invalid response from server');
    } catch (error) {
      console.error('Error removing benefit with PayPal handling:', error);
      throw error;
    }
  }
};

export default patreonService;
