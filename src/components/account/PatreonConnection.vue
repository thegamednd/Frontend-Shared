<template>
  <div class="patreon-connection">
    <div class="connection-header">
      <h3>
        <span class="material-symbols-outlined">volunteer_activism</span>
        Patreon Integration
      </h3>
      <p class="connection-description">Connect your Patreon account to receive subscription credits</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="connection-state loading-state">
      <span class="material-symbols-outlined spinning">hourglass_empty</span>
      <p>Loading Patreon status...</p>
    </div>

    <!-- Connected State -->
    <div v-else-if="isConnected" class="connection-state connected-state">
      <div class="connection-info">
        <div class="info-icon connected">
          <span class="material-symbols-outlined">check_circle</span>
        </div>
        <div class="info-content">
          <h4>Patreon Connected</h4>
          <p class="patreon-email">{{ patreonEmail }}</p>

          <!-- Supported Campaigns Section -->
          <div v-if="supportedCampaigns.length > 0" class="supported-campaigns">
            <h5 class="campaigns-title">
              <span class="material-symbols-outlined">volunteer_activism</span>
              Supporting {{ supportedCampaigns.length }} {{ supportedCampaigns.length === 1 ? 'Campaign' : 'Campaigns' }}
            </h5>
            <div class="campaigns-list">
              <div
                v-for="campaign in supportedCampaigns"
                :key="campaign.CampaignID"
                class="campaign-card"
              >
                <div class="campaign-info" @click="openCampaignDetails(campaign)">
                  <a
                    v-if="campaign.PatreonURL"
                    :href="campaign.PatreonURL"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="campaign-name campaign-name--link"
                    @click.stop
                  >{{ campaign.CampaignName }} <span class="material-symbols-outlined" style="font-size: 0.85rem; vertical-align: middle;">open_in_new</span></a>
                  <div v-else class="campaign-name">{{ campaign.CampaignName }}</div>
                  <div class="campaign-creator">by {{ campaign.CreatorName }}</div>
                  <div class="campaign-status">
                    <span class="material-symbols-outlined campaign-status-icon connected">check_circle</span>
                    <span class="campaign-tier" v-if="campaign.TierName">{{ campaign.TierName }}</span>
                    <span class="campaign-tier" v-else>Connected</span>
                  </div>
                  <div v-if="getAppliedRealmForCampaign(campaign.CampaignID)" class="campaign-realm">
                    <span class="material-symbols-outlined">castle</span>
                    {{ getAppliedRealmForCampaign(campaign.CampaignID) }}
                  </div>
                </div>
                <div class="campaign-actions">
                  <button
                    class="btn-campaign-disconnect"
                    :disabled="disconnecting || campaignHasAppliedBenefits(campaign.CampaignID)"
                    :title="campaignHasAppliedBenefits(campaign.CampaignID) ? 'Remove benefits before disconnecting' : 'Disconnect this campaign'"
                    @click.stop="handleDisconnectCampaign(campaign)"
                  >
                    <span class="material-symbols-outlined">link_off</span>
                  </button>
                  <span class="campaign-view-benefits material-symbols-outlined" @click="openCampaignDetails(campaign)">chevron_right</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="connection-actions">
        <div class="disconnect-section">
          <button
            @click="handleDisconnect"
            class="btn-disconnect"
            :disabled="disconnecting || hasAppliedBenefits"
          >
            <span v-if="disconnecting" class="material-symbols-outlined spinning">hourglass_empty</span>
            <span v-else class="material-symbols-outlined">link_off</span>
            {{ disconnecting ? 'Disconnecting...' : 'Disconnect All Campaigns' }}
          </button>
          <p v-if="hasAppliedBenefits" class="disconnect-blocked-message">
            <span class="material-symbols-outlined">info</span>
            Remove all Patreon benefits from your realms before disconnecting your Patreon account.
          </p>
        </div>
      </div>
    </div>

    <!-- Not Connected State -->
    <div v-else class="connection-state not-connected-state">
      <div class="connection-info">
        <div class="info-icon not-connected">
          <span class="material-symbols-outlined">link</span>
        </div>
        <div class="info-content">
          <h4>Connect Your Patreon</h4>
          <p class="connect-prompt">If you are subscribed to a Patreon tier that provides RealmForge benefits, connect your Patreon account to receive those benefits.</p>
          <ul class="benefits-list">
            <li>
              <span class="material-symbols-outlined">check</span>
              Automatic monthly credits based on your tier
            </li>
            <li>
              <span class="material-symbols-outlined">check</span>
              Credits applied to your RealmForge subscription
            </li>
            <li>
              <span class="material-symbols-outlined">check</span>
              Access exclusive tier rewards and perks
            </li>
          </ul>
        </div>
      </div>
      <div class="connection-actions">
        <button
          @click="handleConnect"
          class="btn-connect"
          :disabled="connecting"
        >
          <span v-if="connecting" class="material-symbols-outlined spinning">hourglass_empty</span>
          <span v-else class="material-symbols-outlined">link</span>
          {{ connecting ? 'Connecting...' : 'Connect with Patreon' }}
        </button>
      </div>
    </div>

    <!-- Disconnect Confirmation Dialog -->
    <dialog ref="confirmDialogRef" class="confirm-dialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>Confirm Disconnect</h3>
          <button @click="closeConfirmDialog" class="close-button" type="button">×</button>
        </div>
        <div class="dialog-body">
          <p class="warning-message">
            <span class="material-symbols-outlined">warning</span>
            {{ disconnectCampaign
              ? `Are you sure you want to disconnect from ${disconnectCampaign.CampaignName}?`
              : 'Are you sure you want to disconnect all Patreon campaigns?' }}
          </p>
          <p class="info-message">
            Your existing credits will remain, but you will not receive new monthly credits{{ disconnectCampaign ? ' from this campaign' : '' }}.
          </p>
        </div>
        <div class="dialog-footer">
          <button @click="closeConfirmDialog" type="button" class="btn-cancel">
            Cancel
          </button>
          <button @click="confirmDisconnect" type="button" class="btn-confirm">
            <span v-if="disconnecting" class="material-symbols-outlined spinning">hourglass_empty</span>
            {{ disconnecting ? 'Disconnecting...' : 'Disconnect' }}
          </button>
        </div>
      </div>
    </dialog>

    <!-- Campaign Benefits Dialog -->
    <dialog ref="campaignDialogRef" class="campaign-dialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>{{ selectedCampaign?.CampaignName }} Benefits</h3>
          <button @click="closeCampaignDialog" class="close-button" type="button">×</button>
        </div>
        <div class="dialog-body">
          <!-- Loading State -->
          <div v-if="loadingBenefits" class="benefits-loading">
            <span class="material-symbols-outlined spinning">hourglass_empty</span>
            <p>Loading benefits...</p>
          </div>

          <!-- Benefits List -->
          <div v-else-if="campaignBenefits.length > 0" class="benefits-list-container">
            <div v-for="benefit in campaignBenefits" :key="benefit.BenefitID" class="benefit-card">
              <div class="benefit-header">
                <div class="benefit-title">
                  <span class="material-symbols-outlined">{{ getBenefitIcon(benefit) }}</span>
                  <h4>{{ benefit.TierName }}</h4>
                </div>
                <div class="benefit-type-badge" :class="getBenefitTypeClass(benefit)">
                  <span>{{ getBenefitTypeLabel(benefit) }}</span>
                </div>
              </div>

              <div class="benefit-details">
                <p v-if="benefit.IsRecurring" class="benefit-recurring">
                  <span class="material-symbols-outlined">sync</span>
                  Recurring
                </p>

                <!-- Subscription Tier Details -->
                <div v-if="benefit.GrantedTierDetails" class="benefit-tier-info">
                  <span class="material-symbols-outlined">workspace_premium</span>
                  <div class="tier-details">
                    <strong>{{ benefit.GrantedTierDetails.Name }}</strong> subscription tier
                    <span class="tier-players">({{ benefit.GrantedTierDetails.Players }} players)</span>
                  </div>
                </div>
                <div v-else-if="benefit.GrantedTier" class="benefit-tier-info">
                  <span class="material-symbols-outlined">workspace_premium</span>
                  <div class="tier-details">
                    <strong>{{ benefit.GrantedTier }}</strong> subscription tier
                  </div>
                </div>

                <!-- Shop Items List -->
                <div v-if="benefit.ShopItemDetails && benefit.ShopItemDetails.length > 0" class="benefit-shop-items">
                  <span class="material-symbols-outlined">shopping_bag</span>
                  <div class="shop-items-list">
                    <span class="shop-items-label">Shop Items:</span>
                    <div class="shop-items-links">
                      <a
                        v-for="item in benefit.ShopItemDetails"
                        :key="item.ID"
                        :href="`${shopBaseUrl}/product/${item.ID}`"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="shop-item-link"
                      >
                        {{ item.Name }}
                        <span class="material-symbols-outlined">open_in_new</span>
                      </a>
                    </div>
                  </div>
                </div>

                <!-- Discount Info -->
                <div v-if="benefit.DiscountPercent" class="benefit-discount-info">
                  <span class="material-symbols-outlined">percent</span>
                  <div class="discount-details">
                    <strong>{{ benefit.DiscountPercent }}% off</strong> all shop products for this gaming system
                  </div>
                </div>
              </div>

              <!-- Application Status -->
              <div class="benefit-application">
                <!-- Discount / Shop Items: Account-level, no realm application needed -->
                <div v-if="!benefit.GrantedTier">
                  <div class="benefit-auto-issued">
                    <span class="material-symbols-outlined">check_circle</span>
                    <span>Automatically applied to your account</span>
                  </div>
                </div>

                <!-- Subscription Tier Benefits: Manual Application to Realm -->
                <div v-else>
                  <div v-if="benefit.AppliedToRealmID" class="benefit-applied-section">
                    <div class="benefit-applied">
                      <span class="material-symbols-outlined">check_circle</span>
                      <span>Applied to {{ benefit.AppliedToRealmName }}</span>
                      <button
                        @click="handleRemoveBenefit(benefit)"
                        class="btn-remove-benefit"
                        :disabled="processingBenefit === benefit.BenefitID"
                      >
                        <span v-if="processingBenefit === benefit.BenefitID" class="material-symbols-outlined spinning">hourglass_empty</span>
                        <span v-else>Remove</span>
                      </button>
                    </div>
                    <!-- Upgrade prompt for Fellowship tier -->
                    <div v-if="benefit.GrantedTier?.toLowerCase() === 'fellowship'" class="upgrade-prompt">
                      <span class="material-symbols-outlined">upgrade</span>
                      <div class="upgrade-content">
                        <p>Want more features? As a Patreon supporter, you get discounted upgrade pricing!</p>
                        <router-link to="/account/subscription" class="upgrade-link">
                          Upgrade to Established Guild ($5/mo) or Legendary Keep ($10/mo)
                        </router-link>
                      </div>
                    </div>
                  </div>
                  <div v-else class="benefit-not-applied">
                    <div class="benefit-apply-row">
                      <select
                        v-model="selectedRealmForBenefit[benefit.BenefitID]"
                        class="realm-selector"
                        :disabled="processingBenefit === benefit.BenefitID"
                      >
                        <option value="">Select a realm...</option>
                        <option
                          v-for="realm in availableRealms"
                          :key="realm.RealmID"
                          :value="realm.RealmID"
                        >
                          {{ realm.Name }}
                        </option>
                      </select>
                      <button
                        @click="handleApplyBenefit(benefit)"
                        class="btn-apply-benefit"
                        :disabled="!selectedRealmForBenefit[benefit.BenefitID] || processingBenefit === benefit.BenefitID"
                      >
                        <span v-if="processingBenefit === benefit.BenefitID" class="material-symbols-outlined spinning">hourglass_empty</span>
                        <span v-else>Apply</span>
                      </button>
                    </div>
                    <!-- Reload notice when active realm is selected -->
                    <div v-if="isActiveRealmSelected(benefit.BenefitID)" class="reload-notice">
                      <span class="material-symbols-outlined">refresh</span>
                      <span>RealmForge will reload to apply changes to your active realm.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- No Benefits State -->
          <div v-else class="no-benefits">
            <span class="material-symbols-outlined">inbox</span>
            <p>No benefits available for this campaign</p>
          </div>
        </div>
      </div>
    </dialog>

    <!-- Remove Benefit Confirmation Dialog -->
    <dialog ref="removeBenefitDialogRef" class="remove-benefit-dialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>Remove Patreon Benefit</h3>
          <button @click="closeRemoveBenefitDialog" class="close-button" type="button">×</button>
        </div>
        <div class="dialog-body">
          <!-- Loading State -->
          <div v-if="loadingRemovalInfo" class="removal-loading">
            <span class="material-symbols-outlined spinning">hourglass_empty</span>
            <p>Loading subscription details...</p>
          </div>

          <!-- Error State -->
          <div v-else-if="removalError && !removalInfo" class="removal-error">
            <span class="material-symbols-outlined">error</span>
            <p>{{ removalError }}</p>
            <button @click="loadRemovalInfo(benefitToRemove)" class="btn-retry">
              <span class="material-symbols-outlined">refresh</span>
              Try Again
            </button>
          </div>

          <!-- Removal Info -->
          <div v-else-if="removalInfo" class="removal-info-content">
            <!-- Warning Section -->
            <div class="removal-warning">
              <span class="material-symbols-outlined">warning</span>
              <div class="warning-text">
                <strong>Your Patreon benefit will be removed from {{ benefitToRemove?.AppliedToRealmName }}</strong>
                <p>You can apply this benefit to another realm later from your Patreon settings.</p>
              </div>
            </div>

            <!-- Reload notice when removing from active realm -->
            <div v-if="isRemovingFromActiveRealm" class="reload-notice">
              <span class="material-symbols-outlined">refresh</span>
              <span>RealmForge will reload to apply changes to your active realm.</span>
            </div>

            <!-- PayPal Subscription Info -->
            <div v-if="removalInfo.hasPayPalSubscription" class="paypal-subscription-info">
              <h4>
                <span class="material-symbols-outlined">credit_card</span>
                Active PayPal Subscription
              </h4>
              <div class="subscription-details">
                <div class="detail-row">
                  <span class="label">Current Tier:</span>
                  <span class="value">{{ removalInfo.currentTier }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Monthly Cost:</span>
                  <span class="value">{{ formatCurrency(removalInfo.monthlyCostCents / 100) }}/month</span>
                </div>
                <div v-if="removalInfo.nextBillingDate" class="detail-row">
                  <span class="label">Next Billing:</span>
                  <span class="value">{{ new Date(removalInfo.nextBillingDate).toLocaleDateString() }}</span>
                </div>
                <div v-if="removalInfo.daysRemaining !== undefined" class="detail-row">
                  <span class="label">Days Remaining:</span>
                  <span class="value">{{ removalInfo.daysRemaining }} days</span>
                </div>
              </div>

              <!-- Refund Info -->
              <div v-if="removalInfo.refundAmount && removalInfo.refundAmount >= 1" class="refund-info">
                <span class="material-symbols-outlined">payments</span>
                <div class="refund-text">
                  <strong>Prorated Refund: {{ formatCurrency(removalInfo.refundAmount) }}</strong>
                  <p>You will receive a refund for the unused portion of your subscription (90% of remaining time).</p>
                </div>
              </div>
              <div v-else-if="removalInfo.hasPayPalSubscription" class="refund-info no-refund">
                <span class="material-symbols-outlined">info</span>
                <div class="refund-text">
                  <strong>No Refund</strong>
                  <p>Prorated refund would be less than $1.00.</p>
                </div>
              </div>
            </div>

            <!-- Tier Selection -->
            <div class="tier-selection">
              <h4>
                <span class="material-symbols-outlined">workspace_premium</span>
                Select New Subscription Tier
              </h4>

              <!-- Suggested Tier Notice -->
              <div v-if="removalInfo.suggestedTier && removalInfo.suggestedTier.Tier.toLowerCase() !== 'free'" class="suggested-tier-notice">
                <span class="material-symbols-outlined">lightbulb</span>
                <p>
                  <strong>Suggested:</strong> Switch to <em>{{ removalInfo.suggestedTier.Name }}</em>
                  ({{ formatCurrency(removalInfo.suggestedTier.Cost / 100) }}/mo)
                  to maintain your current {{ removalInfo.suggestedTier.Players }} player capacity.
                </p>
              </div>

              <!-- Tier Options -->
              <div class="tier-options">
                <label
                  v-for="tier in removalInfo.availableTiers?.slice().sort((a, b) => a.Cost - b.Cost)"
                  :key="tier.Tier"
                  class="tier-option"
                  :class="{ selected: selectedNewTier === tier.Tier.toLowerCase() }"
                >
                  <input type="radio" v-model="selectedNewTier" :value="tier.Tier.toLowerCase()" name="newTier" />
                  <div class="tier-content">
                    <span class="tier-name">{{ tier.Name }}</span>
                    <span class="tier-price">{{ formatCurrency(tier.Cost / 100) }}/month</span>
                    <span class="tier-players">{{ tier.Players }} players</span>
                  </div>
                </label>
              </div>
            </div>

            <!-- PayPal Button for Paid Tiers -->
            <div v-if="features.hasPayPal && selectedTierRequiresPayment && !newSubscriptionData" class="paypal-section">
              <h4>
                <span class="material-symbols-outlined">credit_card</span>
                Subscribe to New Tier
              </h4>
              <p class="paypal-notice">Complete your new subscription before removing the Patreon benefit:</p>
              <PayPalSubscriptionButton
                :plan-tier="selectedNewTier"
                :realm-id="benefitToRemove?.AppliedToRealmID"
                @success="handleNewSubscriptionSuccess"
                @error="handleNewSubscriptionError"
                @cancel="handleNewSubscriptionCancel"
              />
            </div>

            <!-- New Subscription Confirmed -->
            <div v-if="newSubscriptionData" class="new-subscription-confirmed">
              <span class="material-symbols-outlined">check_circle</span>
              <span>New subscription created! Ready to proceed.</span>
            </div>

            <!-- Error Display -->
            <div v-if="removalError" class="removal-error-inline">
              <span class="material-symbols-outlined">error</span>
              <span>{{ removalError }}</span>
            </div>
          </div>
        </div>

        <!-- Dialog Footer -->
        <div class="dialog-footer">
          <button @click="closeRemoveBenefitDialog" type="button" class="btn-cancel" :disabled="processingRemoval">
            Cancel
          </button>
          <button
            @click="confirmRemoveBenefit"
            type="button"
            class="btn-confirm-removal"
            :disabled="processingRemoval || loadingRemovalInfo || (selectedTierRequiresPayment && !newSubscriptionData)"
          >
            <span v-if="processingRemoval" class="material-symbols-outlined spinning">hourglass_empty</span>
            <span v-else class="material-symbols-outlined">delete</span>
            {{ processingRemoval ? 'Processing...' : 'Remove Benefit' }}
          </button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, defineAsyncComponent } from 'vue';
import { useAccountStore } from '@shared/stores/account';
import { useRealmStore } from '@shared/stores/realm';
import { useNotifications } from '@shared/composables/useNotifications';
import { patreonService } from '@shared/services/patreonService';
import { features } from '@shared/config/features';

// Conditionally load PayPal component
const PayPalSubscriptionButton = features.hasPayPal
  ? defineAsyncComponent(() => (() => { const p = '@' + '/components/payment/PayPalSubscriptionButton.vue'; return import(/* @vite-ignore */ p); })())
  : null;

// Conditionally load PayPal store
let paypalStore = null;
if (features.hasPayPal) {
  (() => { const p = '@' + '/stores/paypal'; return import(/* @vite-ignore */ p); })()
    .then(({ usePayPalStore }) => { paypalStore = usePayPalStore(); })
    .catch(() => {});
}

const accountStore = useAccountStore();
const realmStore = useRealmStore();
const { notifySuccess, notifyError } = useNotifications();

const loading = ref(true);
const connecting = ref(false);
const disconnecting = ref(false);
const confirmDialogRef = ref(null);

// Campaign dialog state
const campaignDialogRef = ref(null);
const selectedCampaign = ref(null);
const loadingBenefits = ref(false);
const campaignBenefits = ref([]);
const selectedRealmForBenefit = ref({});
const processingBenefit = ref(null);

// Track applied realms per campaign
const campaignAppliedRealms = ref({});

// Remove benefit dialog state
const removeBenefitDialogRef = ref(null);
const benefitToRemove = ref(null);
const loadingRemovalInfo = ref(false);
const removalInfo = ref(null);
const selectedNewTier = ref('free');
const processingRemoval = ref(false);
const removalError = ref(null);
const newSubscriptionData = ref(null);

// Computed properties
const isConnected = computed(() => {
  return Object.keys(accountStore.patreonSubscriptions).length > 0;
});

const patreonEmail = computed(() => {
  // Use email from any subscription (they all share the same Patreon account)
  const subs = Object.values(accountStore.patreonSubscriptions);
  return subs[0]?.PatreonEmail || 'Unknown';
});

const supportedCampaigns = computed(() => {
  // Each subscription record IS a per-campaign entry with CampaignID, CampaignName, CreatorName, etc.
  return Object.values(accountStore.patreonSubscriptions);
});

// Get all owned realms from the realm store, sorted alphabetically by name
const availableRealms = computed(() => {
  return [...(realmStore.arOwnedRealms || [])].sort((a, b) => {
    const nameA = (a.Name || '').toLowerCase();
    const nameB = (b.Name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });
});

// Check if the selected realm for a benefit is the active realm
const isActiveRealmSelected = (benefitId) => {
  const selectedRealmId = selectedRealmForBenefit.value[benefitId];
  return selectedRealmId && selectedRealmId === realmStore.activeRealmId;
};

// Check if removing benefit from active realm
const isRemovingFromActiveRealm = computed(() => {
  return benefitToRemove.value?.AppliedToRealmID === realmStore.activeRealmId;
});

// Check if any campaigns have benefits applied to realms
const hasAppliedBenefits = computed(() => {
  return Object.keys(campaignAppliedRealms.value).length > 0;
});

// Track which campaign is being disconnected (null = disconnect all)
const disconnectCampaign = ref(null);

// Check if a specific campaign has applied benefits
const campaignHasAppliedBenefits = (campaignId) => {
  return !!campaignAppliedRealms.value[campaignId];
};

// Methods
const handleConnect = async () => {
  connecting.value = true;
  try {
    const { authorizationUrl } = await patreonService.initiateOAuth();
    // Redirect to Patreon OAuth
    window.location.href = authorizationUrl;
  } catch (error) {
    console.error('Error initiating Patreon OAuth:', error);
    notifyError('Failed to initiate Patreon connection. Please try again.');
    connecting.value = false;
  }
};

const handleDisconnect = () => {
  // Disconnect all campaigns
  disconnectCampaign.value = null;
  confirmDialogRef.value?.showModal();
};

const handleDisconnectCampaign = (campaign) => {
  // Disconnect a specific campaign
  disconnectCampaign.value = campaign;
  confirmDialogRef.value?.showModal();
};

const closeConfirmDialog = () => {
  confirmDialogRef.value?.close();
  disconnectCampaign.value = null;
};

const confirmDisconnect = async () => {
  disconnecting.value = true;
  const campaignId = disconnectCampaign.value?.CampaignID || undefined;
  try {
    const success = await accountStore.disconnectPatreon(campaignId);
    if (success) {
      const msg = campaignId
        ? `Disconnected from ${disconnectCampaign.value.CampaignName}`
        : 'All Patreon campaigns disconnected';
      notifySuccess(msg);
      closeConfirmDialog();
    } else {
      notifyError('Failed to disconnect Patreon');
    }
  } catch (error) {
    console.error('Error disconnecting Patreon:', error);
    notifyError('Failed to disconnect Patreon');
  } finally {
    disconnecting.value = false;
  }
};

// Campaign dialog methods
const openCampaignDetails = async (campaign) => {
  selectedCampaign.value = campaign;
  campaignBenefits.value = [];
  selectedRealmForBenefit.value = {};

  campaignDialogRef.value?.showModal();

  // Load campaign benefits (realms are already loaded in the store)
  await loadCampaignBenefits(campaign.CampaignID);
};

const closeCampaignDialog = () => {
  campaignDialogRef.value?.close();
  selectedCampaign.value = null;
};

const loadCampaignBenefits = async (campaignId) => {
  loadingBenefits.value = true;
  try {
    campaignBenefits.value = await patreonService.getCampaignBenefits(campaignId);
    // Update the applied realm for this campaign
    const appliedBenefits = campaignBenefits.value.filter(b => b.AppliedToRealmID && b.AppliedToRealmName);
    if (appliedBenefits.length > 0) {
      campaignAppliedRealms.value[campaignId] = appliedBenefits[0].AppliedToRealmName;
    } else {
      delete campaignAppliedRealms.value[campaignId];
    }
  } catch (error) {
    console.error('Error loading campaign benefits:', error);
    notifyError('Failed to load campaign benefits');
    campaignBenefits.value = [];
  } finally {
    loadingBenefits.value = false;
  }
};

const handleApplyBenefit = async (benefit) => {
  // Credit benefits are automatically issued - no manual application
  if (benefit.BenefitType === 'credit') {
    notifyError('Credit benefits are automatically issued when you connect your Patreon account');
    return;
  }

  // For direct_tier benefits, realmId is required
  const realmId = selectedRealmForBenefit.value[benefit.BenefitID];
  if (!realmId) {
    return; // Realm selection is required
  }

  // Check if applying to active realm (need to reload after)
  const applyingToActiveRealm = realmId === realmStore.activeRealmId;

  processingBenefit.value = benefit.BenefitID;
  try {
    await patreonService.applyBenefitToRealm(
      selectedCampaign.value.CampaignID,
      benefit.BenefitID,
      realmId
    );

    notifySuccess('Benefit applied to realm successfully');

    // If applied to active realm, reload the page to reflect changes
    if (applyingToActiveRealm) {
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      return;
    }

    // Reload benefits to update status
    await loadCampaignBenefits(selectedCampaign.value.CampaignID);

    // Clear realm selection
    selectedRealmForBenefit.value[benefit.BenefitID] = '';
  } catch (error) {
    console.error('Error applying benefit:', error);
    notifyError(error.response?.data?.error?.message || 'Failed to apply benefit');
  } finally {
    processingBenefit.value = null;
  }
};

const handleRemoveBenefit = async (benefit) => {
  // Credit benefits cannot be manually removed
  if (benefit.BenefitType === 'credit') {
    notifyError('Credit benefits are automatically managed and cannot be manually removed');
    return;
  }

  // Open the removal dialog instead of removing directly
  await openRemoveBenefitDialog(benefit);
};

// Open the remove benefit dialog
const openRemoveBenefitDialog = async (benefit) => {
  benefitToRemove.value = benefit;
  removalInfo.value = null;
  selectedNewTier.value = 'free';
  removalError.value = null;
  newSubscriptionData.value = null;

  removeBenefitDialogRef.value?.showModal();

  // Fetch removal info (PayPal subscription details, available tiers)
  await loadRemovalInfo(benefit);
};

// Close the remove benefit dialog
const closeRemoveBenefitDialog = () => {
  removeBenefitDialogRef.value?.close();
  benefitToRemove.value = null;
  removalInfo.value = null;
  removalError.value = null;
  newSubscriptionData.value = null;
};

// Load removal info from API
const loadRemovalInfo = async (benefit) => {
  loadingRemovalInfo.value = true;
  removalError.value = null;

  try {
    const info = await patreonService.getRemovalInfo(
      selectedCampaign.value.CampaignID,
      benefit.BenefitID,
      benefit.AppliedToRealmID
    );
    removalInfo.value = info;

    // If there's a suggested tier and it's not free, preselect it
    if (info.suggestedTier?.Tier && info.suggestedTier.Tier.toLowerCase() !== 'free') {
      selectedNewTier.value = info.suggestedTier.Tier.toLowerCase();
    }
  } catch (error) {
    console.error('Error loading removal info:', error);
    removalError.value = error.response?.data?.error?.message || 'Failed to load removal information';
  } finally {
    loadingRemovalInfo.value = false;
  }
};

// Check if selected tier requires PayPal payment
const selectedTierRequiresPayment = computed(() => {
  if (!removalInfo.value || selectedNewTier.value === 'free') return false;
  const tier = removalInfo.value.availableTiers?.find(
    t => t.Tier.toLowerCase() === selectedNewTier.value
  );
  return tier && tier.Cost > 0 && tier.PayPalPlanID;
});

// Get the PayPal plan ID for the selected tier
const selectedTierPlanId = computed(() => {
  if (!removalInfo.value) return null;
  const tier = removalInfo.value.availableTiers?.find(
    t => t.Tier.toLowerCase() === selectedNewTier.value
  );
  return tier?.PayPalPlanID || null;
});

// Handle new PayPal subscription success
const handleNewSubscriptionSuccess = (data) => {
  console.log('New subscription created:', data);
  newSubscriptionData.value = {
    subscriptionId: data.subscriptionId,
    orderID: data.orderID
  };
  notifySuccess('New subscription created! Proceeding with benefit removal...');
  // Auto-proceed with removal after successful subscription
  confirmRemoveBenefit();
};

// Handle new PayPal subscription error
const handleNewSubscriptionError = (error) => {
  console.error('New subscription error:', error);
  removalError.value = 'Failed to create new subscription. Please try again.';
};

// Handle new PayPal subscription cancel
const handleNewSubscriptionCancel = () => {
  console.log('New subscription cancelled by user');
};

// Confirm and execute benefit removal with PayPal handling
const confirmRemoveBenefit = async () => {
  if (!benefitToRemove.value || !selectedCampaign.value) return;

  // If paid tier selected but no new subscription data, show error
  if (selectedTierRequiresPayment.value && !newSubscriptionData.value) {
    removalError.value = 'Please complete the PayPal subscription before proceeding.';
    return;
  }

  // Check if removing from active realm (need to reload after)
  const removingFromActiveRealm = isRemovingFromActiveRealm.value;

  processingRemoval.value = true;
  removalError.value = null;

  try {
    const result = await patreonService.removeBenefitWithPayPalHandling(
      selectedCampaign.value.CampaignID,
      benefitToRemove.value.BenefitID,
      benefitToRemove.value.AppliedToRealmID,
      selectedNewTier.value,
      newSubscriptionData.value
    );

    // Build success message
    let message = 'Benefit removed successfully';
    if (result.refundIssued && result.refundAmount > 0) {
      message += `. Refund of $${result.refundAmount.toFixed(2)} issued.`;
    }
    if (result.newTier && result.newTier !== 'free') {
      message += ` Realm updated to ${result.newTier} tier.`;
    }

    notifySuccess(message);
    closeRemoveBenefitDialog();

    // If removed from active realm, reload the page to reflect changes
    if (removingFromActiveRealm) {
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      return;
    }

    // Reload benefits to update status
    await loadCampaignBenefits(selectedCampaign.value.CampaignID);
  } catch (error) {
    console.error('Error removing benefit:', error);
    removalError.value = error.response?.data?.error?.message || 'Failed to remove benefit. Please try again.';
  } finally {
    processingRemoval.value = false;
  }
};

// Format currency display
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

// Determine shop URL based on environment
const shopBaseUrl = computed(() => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname.includes('dev.')) {
    return 'https://dev.realmforge.io';
  }
  return 'https://realmforge.io';
});

// Utility methods for benefit display
const getBenefitIcon = (benefit) => {
  if (benefit.DiscountPercent) return 'percent';
  if (benefit.GrantedTier && benefit.ShopItems?.length > 0) return 'card_membership';
  if (benefit.GrantedTier) return 'workspace_premium';
  if (benefit.ShopItems?.length > 0) return 'shopping_bag';
  return 'redeem';
};

const getBenefitTypeLabel = (benefit) => {
  const parts = [];
  if (benefit.GrantedTier) parts.push('Tier Grant');
  if (benefit.ShopItems?.length > 0) parts.push('Shop Items');
  if (benefit.DiscountPercent) parts.push('Shop Discount');
  return parts.length > 0 ? parts.join(' + ') : 'Benefit';
};

const getBenefitTypeClass = (benefit) => {
  if (benefit.DiscountPercent) return 'benefit-type-discount';
  if (benefit.GrantedTier && benefit.ShopItems?.length > 0) return 'benefit-type-combined';
  if (benefit.GrantedTier) return 'benefit-type-direct_tier';
  if (benefit.ShopItems?.length > 0) return 'benefit-type-shop_items';
  return 'benefit-type-default';
};

// Load applied realms for all campaigns
const loadAllCampaignRealms = async () => {
  const campaigns = supportedCampaigns.value;
  if (!campaigns || campaigns.length === 0) return;

  for (const campaign of campaigns) {
    try {
      const benefits = await patreonService.getCampaignBenefits(campaign.CampaignID);
      // Find benefits that are applied to a realm
      const appliedBenefits = benefits.filter(b => b.AppliedToRealmID && b.AppliedToRealmName);
      if (appliedBenefits.length > 0) {
        // Use the first applied realm (typically there's only one per campaign)
        campaignAppliedRealms.value[campaign.CampaignID] = appliedBenefits[0].AppliedToRealmName;
      }
    } catch (error) {
      console.error(`Error loading benefits for campaign ${campaign.CampaignID}:`, error);
    }
  }
};

// Get applied realm for a campaign
const getAppliedRealmForCampaign = (campaignId) => {
  return campaignAppliedRealms.value[campaignId] || null;
};

// Lifecycle
onMounted(async () => {
  try {
    await accountStore.fetchPatreonSubscription();
    // Load applied realms for all campaigns after subscriptions are loaded
    if (Object.keys(accountStore.patreonSubscriptions).length > 0) {
      await loadAllCampaignRealms();
    }
  } catch (error) {
    console.error('Error loading Patreon subscriptions:', error);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.patreon-connection {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid #444;
  border-radius: 1rem;
  overflow: hidden;
}

.connection-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #444;
  background: linear-gradient(135deg, #1a2441 0%, #2c3e63 100%);
}

.connection-header h3 {
  margin: 0 0 0.5rem 0;
  color: var(--theme-accent);
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.connection-description {
  margin: 0;
  color: #ccc;
  font-size: 0.9rem;
}

.connection-state {
  padding: 2rem;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: #ccc;
}

/* Connected State */
.connected-state {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.connection-info {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.info-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 2rem;
}

.info-icon.connected {
  background: linear-gradient(135deg, #28a745 0%, #20803d 100%);
  color: white;
}

.info-icon.not-connected {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
}

.info-content {
  flex: 1;
}

.info-content h4 {
  margin: 0 0 0.5rem 0;
  color: var(--theme-accent);
  font-size: 1.2rem;
}

.info-content p {
  margin: 0 0 1rem 0;
  color: #ccc;
  line-height: 1.5;
}

.patreon-email {
  font-family: monospace;
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  padding: 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  display: inline-block;
  margin-bottom: 0.5rem;
}

/* Benefits List */
.benefits-list {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.benefits-list li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #ccc;
}

.benefits-list .material-symbols-outlined {
  color: #28a745;
  font-size: 1.2rem;
}

/* Supported Campaigns */
.supported-campaigns {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.campaigns-title {
  margin: 0 0 1rem 0;
  color: var(--theme-accent);
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.campaigns-title .material-symbols-outlined {
  font-size: 1.2rem;
  color: var(--theme-accent);
}

.campaigns-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.campaign-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: color-mix(in srgb, var(--theme-accent) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-radius: 0.5rem;
  transition: all 0.2s ease;
  cursor: pointer;
}

.campaign-card:hover {
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  border-color: color-mix(in srgb, var(--theme-accent) 30%, transparent);
  transform: translateX(4px);
}

.campaign-info {
  flex: 1;
}

.campaign-name {
  color: #ffffff;
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 0.25rem;
}

.campaign-name--link {
  text-decoration: none;
  color: #ffffff;
  transition: color 0.2s;
}

.campaign-name--link:hover {
  color: #ff424d;
}

.campaign-creator {
  color: #ccc;
  font-size: 0.85rem;
}

.campaign-realm {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.35rem;
  color: #4caf50;
  font-size: 0.8rem;
  font-weight: 500;
}

.campaign-realm .material-symbols-outlined {
  font-size: 0.9rem;
}

.campaign-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.campaign-link {
  color: var(--theme-accent);
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.campaign-link:hover {
  background: color-mix(in srgb, var(--theme-accent) 20%, transparent);
  color: #e6b373;
}

.campaign-link .material-symbols-outlined {
  font-size: 1.2rem;
}

.campaign-status {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.25rem;
  font-size: 0.8rem;
}

.campaign-status-icon.connected {
  color: #4caf50;
  font-size: 0.9rem;
}

.campaign-tier {
  color: #ccc;
  font-weight: 500;
}

.btn-campaign-disconnect {
  background: transparent;
  border: 1px solid transparent;
  color: #999;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  transition: all 0.2s ease;
  padding: 0;
}

.btn-campaign-disconnect:hover:not(:disabled) {
  background: color-mix(in srgb, #dc3545 15%, transparent);
  border-color: #dc3545;
  color: #dc3545;
}

.btn-campaign-disconnect:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-campaign-disconnect .material-symbols-outlined {
  font-size: 1.1rem;
}

.campaign-view-benefits {
  color: var(--theme-accent);
  font-size: 1.5rem;
  cursor: pointer;
}

/* Connection Actions */
.connection-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1em;
}

.btn-connect,
.btn-disconnect {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  font-size: 0.9rem;
}

.btn-connect {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
}

.btn-connect:hover:not(:disabled) {
  background: linear-gradient(135deg, #7a5c2a 0%, #6b4f22 100%);
  transform: translateY(-1px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
}

.btn-disconnect {
  background: transparent;
  border: 1px solid #dc3545;
  color: #dc3545;
}

.btn-disconnect:hover:not(:disabled) {
  background: #dc3545;
  color: white;
  transform: translateY(-1px);
}

.btn-connect:disabled,
.btn-disconnect:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Disconnect Section */
.disconnect-section {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
}

.disconnect-blocked-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  padding: 0.625rem 1rem;
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 0.5rem;
  color: #ffecb3;
  font-size: 0.85rem;
  max-width: 400px;
  text-align: left;
}

.disconnect-blocked-message .material-symbols-outlined {
  font-size: 1.1rem;
  color: #ffc107;
  flex-shrink: 0;
}

/* Spinning Animation */
.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Confirmation Dialog */
.confirm-dialog {
  margin: auto;
  padding: 0;
  border: none;
  border-radius: 1rem;
  background: transparent;
  max-width: 500px;
  width: 90vw;
}

.confirm-dialog::backdrop {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}

.dialog-content {
  background: linear-gradient(135deg, #1a2441 0%, #2c3e63 100%);
  border: 1px solid #444;
  border-radius: 1rem;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #444;
}

.dialog-header h3 {
  margin: 0;
  color: var(--theme-accent);
  font-size: 1.2rem;
}

.close-button {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.8rem;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.dialog-body {
  padding: 1.5rem;
}

.warning-message {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0 0 1rem 0;
  color: var(--theme-accent);
  font-weight: 600;
  font-size: 1rem;
}

.warning-message .material-symbols-outlined {
  color: #ffc107;
  font-size: 1.5rem;
}

.info-message {
  margin: 0;
  color: #ccc;
  line-height: 1.6;
  font-size: 0.9rem;
}

.dialog-footer {
  padding: 1rem 1.5rem 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  border-top: 1px solid #444;
}

.btn-cancel,
.btn-confirm {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.btn-cancel {
  background: rgba(108, 117, 125, 0.2);
  color: white;
  border: 1px solid rgba(108, 117, 125, 0.3);
}

.btn-cancel:hover {
  background: rgba(108, 117, 125, 0.3);
}

.btn-confirm {
  background: #dc3545;
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background: #c82333;
  transform: translateY(-1px);
}

.btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Campaign Dialog */
.campaign-dialog {
  margin: auto;
  padding: 0;
  border: none;
  border-radius: 1rem;
  background: transparent;
  max-width: 700px;
  width: 90vw;
  max-height: 80vh;
}

.campaign-dialog::backdrop {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}

.campaign-dialog .dialog-body {
  max-height: 60vh;
  overflow-y: auto;
}

/* Benefits Loading/Empty States */
.benefits-loading,
.no-benefits {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  gap: 1rem;
  color: #ccc;
}

.benefits-loading .material-symbols-outlined,
.no-benefits .material-symbols-outlined {
  font-size: 3rem;
  color: var(--theme-accent);
}

/* Benefits List */
.benefits-list-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.benefit-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  padding: 1.25rem;
  transition: all 0.2s ease;
}

.benefit-card:hover {
  border-color: color-mix(in srgb, var(--theme-accent) 30%, transparent);
  background: rgba(255, 255, 255, 0.05);
}

.benefit-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.benefit-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.benefit-title .material-symbols-outlined {
  color: var(--theme-accent);
  font-size: 1.5rem;
}

.benefit-title h4 {
  margin: 0;
  color: #ffffff;
  font-size: 1.1rem;
  font-weight: 600;
}

.benefit-type-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.benefit-type-credit {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.benefit-type-direct_tier {
  background: rgba(156, 39, 176, 0.2);
  color: #ce93d8;
  border: 1px solid rgba(156, 39, 176, 0.3);
}

.benefit-type-custom {
  background: rgba(33, 150, 243, 0.2);
  color: #64b5f6;
  border: 1px solid rgba(33, 150, 243, 0.3);
}

.benefit-type-shop_items {
  background: rgba(255, 152, 0, 0.2);
  color: #ffb74d;
  border: 1px solid rgba(255, 152, 0, 0.3);
}

.benefit-type-combined {
  background: rgba(103, 58, 183, 0.2);
  color: #b39ddb;
  border: 1px solid rgba(103, 58, 183, 0.3);
}

.benefit-type-discount {
  background: rgba(46, 204, 113, 0.2);
  color: #2ecc71;
  border: 1px solid rgba(46, 204, 113, 0.3);
}

.benefit-details {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.benefit-tier-info {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(156, 39, 176, 0.1);
  border: 1px solid rgba(156, 39, 176, 0.2);
  border-radius: 0.5rem;
}

.benefit-tier-info .material-symbols-outlined {
  color: #ce93d8;
  font-size: 1.25rem;
  margin-top: 2px;
}

.tier-details {
  color: var(--theme-text-primary);
  font-size: 0.95rem;
  line-height: 1.4;
}

.tier-details strong {
  color: #ffffff;
}

.tier-players {
  color: #a5d6a7;
  margin-left: 0.25rem;
}

.benefit-shop-items {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.2);
  border-radius: 0.5rem;
}

.benefit-shop-items .material-symbols-outlined {
  color: #ffb74d;
  font-size: 1.25rem;
  margin-top: 2px;
}

.shop-items-list {
  flex: 1;
}

.shop-items-label {
  color: #ccc;
  font-size: 0.9rem;
  display: block;
  margin-bottom: 0.5rem;
}

.shop-items-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.shop-item-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.75rem;
  background: color-mix(in srgb, var(--theme-accent) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 0.375rem;
  color: var(--theme-accent);
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.shop-item-link:hover {
  background: color-mix(in srgb, var(--theme-accent) 25%, transparent);
  border-color: color-mix(in srgb, var(--theme-accent) 50%, transparent);
  color: #ffe0b2;
}

.benefit-discount-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(46, 204, 113, 0.1);
  border: 1px solid rgba(46, 204, 113, 0.2);
  border-radius: 0.5rem;
}

.benefit-discount-info .material-symbols-outlined {
  color: #2ecc71;
  font-size: 1.25rem;
}

.discount-details {
  color: #ccc;
  font-size: 0.9rem;
}

.discount-details strong {
  color: #2ecc71;
}

.shop-item-link .material-symbols-outlined {
  font-size: 0.9rem;
  opacity: 0.7;
}

.benefit-description {
  color: #ccc;
  margin: 0 0 0.75rem 0;
  line-height: 1.5;
  font-size: 0.95rem;
}

.benefit-campaign,
.benefit-recurring {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.benefit-campaign .material-symbols-outlined {
  font-size: 1rem;
  color: var(--theme-accent);
}

.benefit-recurring .material-symbols-outlined {
  font-size: 1rem;
  color: var(--theme-accent);
}

/* Benefit Application */
.benefit-application {
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.benefit-applied {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 0.5rem;
}

.benefit-applied .material-symbols-outlined {
  color: #4caf50;
  font-size: 1.25rem;
}

.benefit-applied span:nth-child(2) {
  flex: 1;
  color: #a5d6a7;
  font-weight: 500;
}

.btn-remove-benefit {
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid #dc3545;
  color: #dc3545;
  border-radius: 0.375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.85rem;
}

.btn-remove-benefit:hover:not(:disabled) {
  background: #dc3545;
  color: white;
}

.btn-remove-benefit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.benefit-not-applied {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.benefit-apply-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

/* Reload Notice */
.reload-notice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.3);
  border-radius: 0.5rem;
  color: #64b5f6;
  font-size: 0.85rem;
}

.reload-notice .material-symbols-outlined {
  font-size: 1.1rem;
  color: #42a5f5;
}

.realm-selector {
  flex: 1;
  padding: 0.625rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.375rem;
  color: #ffffff;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.realm-selector:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--theme-accent) 40%, transparent);
  background: rgba(255, 255, 255, 0.08);
}

.realm-selector:focus {
  outline: none;
  border-color: var(--theme-accent);
  background: rgba(255, 255, 255, 0.08);
}

.realm-selector:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.realm-selector option {
  background: #1a2441;
  color: #ffffff;
}

.btn-apply-benefit {
  padding: 0.625rem 1.25rem;
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  border: none;
  border-radius: 0.375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.9rem;
}

.btn-apply-benefit:hover:not(:disabled) {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-1px);
}

.btn-apply-benefit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.benefit-auto-issued {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 0.5rem;
}

.benefit-auto-issued .material-symbols-outlined {
  color: #4caf50;
  font-size: 1.25rem;
}

.benefit-auto-issued span:nth-child(2) {
  flex: 1;
  color: #a5d6a7;
  font-weight: 500;
}

.benefit-pending-auto {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 0.5rem;
}

.benefit-pending-auto .material-symbols-outlined {
  color: #ffc107;
  font-size: 1.25rem;
}

.benefit-pending-auto span:nth-child(2) {
  flex: 1;
  color: #ffecb3;
  font-weight: 500;
  font-size: 0.9rem;
}

/* Upgrade Prompt */
.benefit-applied-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.upgrade-prompt {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(249, 104, 84, 0.1);
  border: 1px solid rgba(249, 104, 84, 0.3);
  border-radius: 0.5rem;
  align-items: flex-start;
}

.upgrade-prompt .material-symbols-outlined {
  color: #f96854;
  font-size: 1.25rem;
  margin-top: 2px;
}

.upgrade-content {
  flex: 1;
}

.upgrade-content p {
  margin: 0 0 0.5rem 0;
  color: var(--theme-text-primary);
  font-size: 0.9rem;
  line-height: 1.4;
}

.upgrade-link {
  color: #f96854;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  transition: color 0.2s ease;
}

.upgrade-link:hover {
  color: #ff9f7e;
  text-decoration: underline;
}

/* Remove Benefit Dialog */
.remove-benefit-dialog {
  margin: auto;
  padding: 0;
  border: none;
  border-radius: 1rem;
  background: transparent;
  max-width: 600px;
  width: 90vw;
  max-height: 85vh;
}

.remove-benefit-dialog::backdrop {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}

.remove-benefit-dialog .dialog-body {
  max-height: 60vh;
  overflow-y: auto;
}

.removal-loading,
.removal-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  gap: 1rem;
  color: #ccc;
}

.removal-loading .material-symbols-outlined {
  font-size: 3rem;
  color: var(--theme-accent);
}

.removal-error .material-symbols-outlined {
  font-size: 3rem;
  color: #dc3545;
}

.btn-retry {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: rgba(108, 117, 125, 0.2);
  border: 1px solid rgba(108, 117, 125, 0.3);
  color: white;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 600;
}

.btn-retry:hover {
  background: rgba(108, 117, 125, 0.3);
}

.removal-info-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Warning Section */
.removal-warning {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 0.5rem;
}

.removal-warning .material-symbols-outlined {
  color: #ffc107;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.warning-text strong {
  color: #fff;
  display: block;
  margin-bottom: 0.5rem;
}

.warning-text p {
  margin: 0;
  color: #ccc;
  font-size: 0.9rem;
}

/* PayPal Subscription Info */
.paypal-subscription-info {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 1rem;
}

.paypal-subscription-info h4 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1rem 0;
  color: var(--theme-accent);
  font-size: 1rem;
}

.paypal-subscription-info h4 .material-symbols-outlined {
  font-size: 1.25rem;
}

.subscription-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row .label {
  color: #aaa;
  font-size: 0.9rem;
}

.detail-row .value {
  color: #fff;
  font-weight: 500;
}

/* Refund Info */
.refund-info {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 0.5rem;
}

.refund-info.no-refund {
  background: rgba(108, 117, 125, 0.1);
  border-color: rgba(108, 117, 125, 0.3);
}

.refund-info .material-symbols-outlined {
  color: #4caf50;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.refund-info.no-refund .material-symbols-outlined {
  color: #6c757d;
}

.refund-text strong {
  color: #a5d6a7;
  display: block;
  margin-bottom: 0.25rem;
}

.refund-info.no-refund .refund-text strong {
  color: #ccc;
}

.refund-text p {
  margin: 0;
  color: #ccc;
  font-size: 0.85rem;
}

/* Tier Selection */
.tier-selection {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 1rem;
}

.tier-selection h4 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1rem 0;
  color: var(--theme-accent);
  font-size: 1rem;
}

.tier-selection h4 .material-symbols-outlined {
  font-size: 1.25rem;
}

.suggested-tier-notice {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(249, 104, 84, 0.1);
  border: 1px solid rgba(249, 104, 84, 0.3);
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

.suggested-tier-notice .material-symbols-outlined {
  color: #f96854;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.suggested-tier-notice p {
  margin: 0;
  color: var(--theme-text-primary);
  font-size: 0.9rem;
  line-height: 1.4;
}

.suggested-tier-notice em {
  color: var(--theme-accent);
  font-style: normal;
  font-weight: 600;
}

/* Tier Options */
.tier-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tier-option {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tier-option:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.tier-option.selected {
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  border-color: color-mix(in srgb, var(--theme-accent) 50%, transparent);
}

.tier-option input[type="radio"] {
  margin-right: 1rem;
  accent-color: var(--theme-accent);
  width: 18px;
  height: 18px;
}

.tier-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.tier-name {
  color: #fff;
  font-weight: 600;
  min-width: 120px;
}

.tier-price {
  color: #a5d6a7;
  font-size: 0.9rem;
  min-width: 100px;
}

.tier-players {
  color: #ccc;
  font-size: 0.85rem;
}

/* PayPal Section */
.paypal-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 1rem;
}

.paypal-section h4 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.75rem 0;
  color: var(--theme-accent);
  font-size: 1rem;
}

.paypal-section h4 .material-symbols-outlined {
  font-size: 1.25rem;
}

.paypal-notice {
  margin: 0 0 1rem 0;
  color: #ccc;
  font-size: 0.9rem;
}

/* New Subscription Confirmed */
.new-subscription-confirmed {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 0.5rem;
  color: #a5d6a7;
  font-weight: 500;
}

.new-subscription-confirmed .material-symbols-outlined {
  color: #4caf50;
  font-size: 1.25rem;
}

/* Removal Error Inline */
.removal-error-inline {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.3);
  border-radius: 0.5rem;
  color: #f8d7da;
}

.removal-error-inline .material-symbols-outlined {
  color: #dc3545;
  font-size: 1.25rem;
}

/* Confirm Removal Button */
.btn-confirm-removal {
  padding: 0.75rem 1.5rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.btn-confirm-removal:hover:not(:disabled) {
  background: #c82333;
  transform: translateY(-1px);
}

.btn-confirm-removal:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Responsive */
@media (max-width: 768px) {
  .connection-info {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .connection-actions {
    justify-content: stretch;
  }

  .btn-connect,
  .btn-disconnect {
    width: 100%;
    justify-content: center;
  }

  .dialog-footer {
    flex-direction: column;
  }

  .btn-cancel,
  .btn-confirm,
  .btn-confirm-removal {
    width: 100%;
    justify-content: center;
  }

  .tier-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .tier-name,
  .tier-price {
    min-width: auto;
  }
}
</style>
