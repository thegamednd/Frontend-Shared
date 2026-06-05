<template>
  <div class="manage-races-view">
    <div class="view-container">
      <!-- Header -->
      <div class="view-header">
        <button @click="$router.back()" class="back-btn">
          <span class="material-symbols-outlined">arrow_back</span>
          Back
        </button>
        <h1>
          <span class="material-symbols-outlined">groups</span>
          Manage Races
        </h1>
      </div>

      <!-- Configuring System State -->
      <div v-if="isConfiguringSystem" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Configuring races gaming system...</p>
      </div>

      <!-- Race Packages Section -->
      <div v-else-if="gamingSystem" class="packages-container">
        <div class="packages-header">
          <h2>
            <span class="material-symbols-outlined">inventory_2</span>
            Race Packages
          </h2>
          <p class="packages-description">Enable or disable race packages for this realm. Only races from enabled packages will be available to players.</p>
        </div>

        <!-- Loading State -->
        <div v-if="loadingPackages" class="loading-container">
          <div class="loading-spinner"></div>
          <p>Loading race packages...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="packagesError" class="error-container">
          <span class="material-symbols-outlined">error</span>
          <p>{{ packagesError }}</p>
          <button @click="loadRacePackages" class="btn-retry">Retry</button>
        </div>

        <!-- No Packages State -->
        <div v-else-if="racePackages.length === 0" class="no-packages">
          <span class="material-symbols-outlined">block</span>
          <h3>No Race Packages</h3>
          <p>Your account doesn't have access to any race packages for this gaming system. Purchase race packs from the shop to unlock races.</p>
        </div>

        <!-- Package Cards -->
        <div v-else class="packages-list">
          <div
            v-for="pkg in racePackages"
            :key="pkg.shopItemId"
            class="package-card"
            :class="{
              'package-card--enabled': isPackageEnabled(pkg.shopItemId),
              'package-card--locked': pkg.alwaysOn
            }"
          >
            <div class="package-content">
              <div class="package-info">
                <h3>
                  <span class="material-symbols-outlined package-icon" :class="{
                    'package-icon--enabled': isPackageEnabled(pkg.shopItemId),
                    'package-icon--locked': pkg.alwaysOn
                  }">
                    {{ pkg.alwaysOn ? 'lock' : (isPackageEnabled(pkg.shopItemId) ? 'check_circle' : 'cancel') }}
                  </span>
                  {{ pkg.name }}
                </h3>
                <p v-if="pkg.alwaysOn" class="package-detail">Always enabled — core races</p>
                <p v-else-if="pkg.raceIds" class="package-detail">{{ pkg.raceIds.length }} race{{ pkg.raceIds.length !== 1 ? 's' : '' }}</p>
                <p v-else class="package-detail">Full race access</p>
              </div>

              <button
                v-if="canManageRaces"
                @click="togglePackage(pkg.shopItemId)"
                class="btn-toggle-package"
                :class="{
                  'btn-toggle--enable': !isPackageEnabled(pkg.shopItemId) && !pkg.alwaysOn,
                  'btn-toggle--disable': isPackageEnabled(pkg.shopItemId) && !pkg.alwaysOn,
                  'btn-toggle--locked': pkg.alwaysOn
                }"
                :disabled="savingPackages || pkg.alwaysOn"
              >
                <span v-if="savingPackages" class="loading-spinner-small"></span>
                <template v-else-if="pkg.alwaysOn">
                  <span class="material-symbols-outlined">lock</span>
                  Always On
                </template>
                <template v-else>
                  <span class="material-symbols-outlined">
                    {{ isPackageEnabled(pkg.shopItemId) ? 'toggle_on' : 'toggle_off' }}
                  </span>
                  {{ isPackageEnabled(pkg.shopItemId) ? 'Disable' : 'Enable' }}
                </template>
              </button>
            </div>

            <div v-if="!canManageRaces && !pkg.alwaysOn" class="read-only-notice">
              <span class="material-symbols-outlined">lock</span>
              Only realm owners and DMs can manage race packages
            </div>
          </div>

          <!-- Apply Changes Button -->
          <div v-if="canManageRaces" class="apply-changes-section">
            <button
              @click="saveRacePackages"
              class="btn-apply-changes"
              :disabled="!hasChanges || savingPackages"
            >
              <span v-if="savingPackages" class="loading-spinner-small"></span>
              <template v-else>
                <span class="material-symbols-outlined">save</span>
                Apply Changes
              </template>
            </button>
            <span v-if="hasChanges && !savingPackages" class="unsaved-changes-notice">
              You have unsaved changes
            </span>
          </div>
        </div>
      </div>

      <!-- Races CRUD Interface -->
      <div class="crud-container">
        <RacesCRUD
          ref="racesCrudRef"
          v-if="realmStore.activeRealmId"
          :gamingSystemId="gamingSystem?.ID || null"
          :realmId="realmStore.activeRealmId"
          :allowedRaceIds="allowedRaceIds"
          :key="crudKey"
        />
        <div v-else class="no-data">
          <span class="material-symbols-outlined">error</span>
          <p>Unable to load races. Missing realm information.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRealmStore } from '@shared/stores/realm';
import { useAccountStore } from '@shared/stores/account';
import { useUserStore } from '@shared/stores/user';
import { useGamingSystemsStore } from '@shared/stores/gamingSystems';
import { useRacesStore } from '@shared/stores/races';
import { useNotifications } from '@shared/composables/useNotifications';
import { useShopStore } from '@shared/stores/shop';
import RacesCRUD from '@shared/components/gamingSystem/RacesCRUD.vue';
import apiClient from '@shared/utils/api';
import axios from 'axios';

const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}`;
const APP_GAMING_SYSTEM_ID = import.meta.env.VITE_GAMING_SYSTEM_ID;

const realmStore = useRealmStore();
const accountStore = useAccountStore();
const userStore = useUserStore();
const gamingSystemsStore = useGamingSystemsStore();
const racesStore = useRacesStore();
const shopStore = useShopStore();
const { notifySuccess, notifyError } = useNotifications();

// State
const racesCrudRef = ref(null);
const isConfiguringSystem = ref(false);
const crudKey = ref(0);

// Race Packages State
const loadingPackages = ref(false);
const packagesError = ref(null);
const racePackages = ref([]);            // All available race packages from shop items
const enabledShopItems = ref([]);        // Currently enabled shop item IDs
const originalEnabledShopItems = ref([]); // Original state for change detection
const savingPackages = ref(false);
const hasChanges = ref(false);

// Get the gaming system for races for the active realm
const gamingSystem = computed(() => {
  const gamingSystemId = realmStore.activeRealmRacesSystemId;
  if (!gamingSystemId) return null;
  return gamingSystemsStore.getSystemById(gamingSystemId);
});

// Check if user can manage races (owner or DM)
const canManageRaces = computed(() => {
  return realmStore.isOwner || realmStore.isRealmDM;
});

/**
 * Compute allowed race IDs from enabled packages.
 * null = all races allowed (no filtering)
 * array = only these race IDs allowed
 */
const allowedRaceIds = computed(() => {
  if (racePackages.value.length === 0) return null;

  const ids = [];
  let hasFullAccess = false;

  for (const pkg of racePackages.value) {
    if (!isPackageEnabled(pkg.shopItemId)) continue;

    if (!pkg.raceIds) {
      // This package grants full access — no filtering needed
      hasFullAccess = true;
      break;
    }
    ids.push(...pkg.raceIds);
  }

  if (hasFullAccess) return null;
  return ids.length > 0 ? [...new Set(ids)] : [];
});

/**
 * Auto-configure the races gaming system for the realm if not already set.
 * Each Vue app has a single gaming system via VITE_GAMING_SYSTEM_ID.
 */
async function ensureRacesSystemConfigured() {
  if (realmStore.activeRealmRacesSystemId) return;
  if (!APP_GAMING_SYSTEM_ID) return;

  isConfiguringSystem.value = true;
  try {
    const token = await userStore.getValidToken();
    const realmId = realmStore.activeRealmId;

    // Preserve any existing races config (EnabledRaceIds, EnabledShopItems) and just add the GamingSystemID
    const existing = realmStore.activeRealm?.GamingSystem?.races;
    const racesValue = (existing && typeof existing === 'object')
      ? { ...existing, GamingSystemID: APP_GAMING_SYSTEM_ID }
      : APP_GAMING_SYSTEM_ID;

    const response = await axios.put(
      `${BASE_URL}/realms/realm/${realmId}`,
      { GamingSystem: { races: racesValue } },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    realmStore.updateActiveRealmGamingSystem('races', racesValue);

    if (response.data) {
      realmStore.updateRealmInStore(response.data);
    }

    await racesStore.loadRaces(true);
    racesCrudRef.value?.refreshRaces();
  } catch (error) {
    console.error('Error auto-configuring races gaming system:', error);
    notifyError('Failed to configure races gaming system. Please try again.');
  } finally {
    isConfiguringSystem.value = false;
  }
}

// ==================================================
// Race Packages Management
// ==================================================

/**
 * Check if a package is enabled
 */
function isPackageEnabled(shopItemId) {
  return enabledShopItems.value.includes(shopItemId);
}

/**
 * Toggle a package on/off
 */
function togglePackage(shopItemId) {
  if (!canManageRaces.value) return;

  const pkg = racePackages.value.find(p => p.shopItemId === shopItemId);
  if (!pkg || pkg.alwaysOn) return;

  const index = enabledShopItems.value.indexOf(shopItemId);
  if (index >= 0) {
    enabledShopItems.value.splice(index, 1);
  } else {
    enabledShopItems.value.push(shopItemId);
  }

  markAsChanged();
}

/**
 * Mark form as changed by comparing current state to original
 */
function markAsChanged() {
  const current = JSON.stringify([...enabledShopItems.value].sort());
  const original = JSON.stringify([...originalEnabledShopItems.value].sort());
  hasChanges.value = current !== original;
}

/**
 * Load race packages from account access + Patreon benefits
 */
async function loadRacePackages() {
  loadingPackages.value = true;
  packagesError.value = null;

  try {
    const token = await userStore.getValidToken();
    const account = accountStore.account;
    const gamingSystemId = gamingSystem.value?.ID;

    if (!gamingSystemId) {
      packagesError.value = 'No gaming system configured';
      return;
    }

    // Get shop item IDs for this gaming system from Account.Access
    const purchasedShopItemIds = account.Access?.[gamingSystemId] || [];

    // Also get shop items from Patreon benefits on the active realm
    const patreonShopItemIds = [];
    const activeRealm = realmStore.activeRealm;
    if (activeRealm?.Metadata?.patreonBenefits) {
      for (const benefit of activeRealm.Metadata.patreonBenefits) {
        if (benefit.ShopItems && Array.isArray(benefit.ShopItems)) {
          for (const shopItemId of benefit.ShopItems) {
            if (!patreonShopItemIds.includes(shopItemId) && !purchasedShopItemIds.includes(shopItemId)) {
              patreonShopItemIds.push(shopItemId);
            }
          }
        }
      }
    }

    // Also fetch system products (e.g., RealmForge Essentials) that may not be
    // in Account.Access yet (GrantToNewAccounts only applies at account creation)
    const systemShopItemIds = [];
    try {
      await shopStore.fetchSystemProducts(gamingSystemId, false, { source: 'realm-create' });
      const systemProducts = shopStore.getProductsBySystemId(gamingSystemId);
      for (const product of systemProducts) {
        if (product.GrantToNewAccounts && product.IsSystemProduct) {
          if (!purchasedShopItemIds.includes(product.ID) && !patreonShopItemIds.includes(product.ID)) {
            systemShopItemIds.push(product.ID);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch system products:', err);
    }

    // Combine all sources
    const allShopItemIds = [...purchasedShopItemIds, ...patreonShopItemIds, ...systemShopItemIds];

    if (allShopItemIds.length === 0) {
      racePackages.value = [];
      return;
    }

    const packages = [];

    for (const shopItemId of allShopItemIds) {
      try {
        const { data: shopProduct } = await axios.get(
          `${BASE_URL}/shop/products/product/${shopItemId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Only include items that have Races in their Items array
        const hasRaces = shopProduct.Items?.some(item => item.Type === 'Races');
        if (!hasRaces) continue;

        // Extract race IDs from all Races items
        let fullRaceAccess = false;
        const ids = [];
        for (const item of shopProduct.Items) {
          if (item.Type === 'Races') {
            if (item.IDs && item.IDs.length > 0) {
              ids.push(...item.IDs);
            } else {
              // No IDs means full access
              fullRaceAccess = true;
              break;
            }
          }
        }
        const raceIds = fullRaceAccess ? null : (ids.length > 0 ? [...new Set(ids)] : null);

        packages.push({
          shopItemId,
          name: shopProduct.Name,
          alwaysOn: shopProduct.GrantToNewAccounts === true,
          raceIds
        });
      } catch (err) {
        console.error(`Error fetching shop item ${shopItemId}:`, err);
      }
    }

    racePackages.value = packages;

    // Initialize enabled state from realm config
    loadCurrentEnabledPackages();

  } catch (error) {
    console.error('Error loading race packages:', error);
    packagesError.value = error.response?.data?.message || 'Failed to load race packages. Please try again.';
  } finally {
    loadingPackages.value = false;
  }
}

/**
 * Load current enabled packages from realm configuration
 */
function loadCurrentEnabledPackages() {
  const savedEnabledItems = realmStore.activeRealmRacesEnabledShopItems;

  if (savedEnabledItems && Array.isArray(savedEnabledItems)) {
    // New format: specific items enabled
    enabledShopItems.value = [...savedEnabledItems];
  } else {
    // Old format (string) or not set: all items enabled
    enabledShopItems.value = racePackages.value.map(p => p.shopItemId);
  }

  // Always-on packages are always enabled
  for (const pkg of racePackages.value) {
    if (pkg.alwaysOn && !enabledShopItems.value.includes(pkg.shopItemId)) {
      enabledShopItems.value.push(pkg.shopItemId);
    }
  }

  originalEnabledShopItems.value = [...enabledShopItems.value];
  hasChanges.value = false;
}

/**
 * Save race package configuration to realm
 */
async function saveRacePackages() {
  savingPackages.value = true;

  try {
    const token = await userStore.getValidToken();
    const realmId = realmStore.activeRealmId;
    const gamingSystemId = gamingSystem.value?.ID;

    // Determine save format
    const allEnabled = racePackages.value.every(p => enabledShopItems.value.includes(p.shopItemId));

    let racesValue;
    if (allEnabled) {
      // All enabled — use simple string format (backward-compatible)
      racesValue = gamingSystemId;
    } else {
      // Some disabled — use object format with EnabledShopItems
      racesValue = {
        GamingSystemID: gamingSystemId,
        EnabledShopItems: [...enabledShopItems.value]
      };
    }

    const response = await axios.put(
      `${BASE_URL}/realms/realm/${realmId}`,
      { GamingSystem: { races: racesValue } },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    realmStore.updateActiveRealmGamingSystem('races', racesValue);

    if (response.data) {
      realmStore.updateRealmInStore(response.data);
    }

    // Refresh races and CRUD
    await racesStore.loadRaces(true);
    crudKey.value++;

    originalEnabledShopItems.value = [...enabledShopItems.value];
    hasChanges.value = false;

    // Sync EnabledRaceIds so the backend filters correctly
    const allowed = allowedRaceIds.value;
    let enabledIds;
    if (allowed !== null) {
      // Packages restrict access — get all available race IDs from the store
      const allRaces = racesStore.arRaces;
      enabledIds = allRaces
        .filter(r => allowed.includes(r.ID) || r.RealmID)
        .map(r => r.ID);
    }
    // Merge with the racesValue we just saved so we don't drop GamingSystemID / EnabledShopItems locally
    const baseRaces = (racesValue && typeof racesValue === 'object')
      ? { ...racesValue }
      : { GamingSystemID: racesValue };
    const mergedRaces = (allowed !== null)
      ? { ...baseRaces, EnabledRaceIds: enabledIds }
      : { ...baseRaces, EnabledRaceIds: null };

    const syncResponse = await axios.put(
      `${BASE_URL}/realms/realm/${realmId}`,
      { GamingSystem: { races: mergedRaces } },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    realmStore.updateActiveRealmGamingSystem('races', mergedRaces);
    if (syncResponse.data) {
      realmStore.updateRealmInStore(syncResponse.data);
    }

    notifySuccess('Race packages updated successfully!');

  } catch (error) {
    console.error('Error saving race packages:', error);
    notifyError(error.response?.data?.message || 'Failed to save race packages. Please try again.');
  } finally {
    savingPackages.value = false;
  }
}

onMounted(async () => {
  if (!gamingSystemsStore.isLoaded) {
    await gamingSystemsStore.fetchGamingSystems();
  }

  // Auto-configure races gaming system if not set
  await ensureRacesSystemConfigured();

  // Load race packages
  await loadRacePackages();

  // Auto-repair: if packages restrict access but EnabledRaceIds is null,
  // persist the computed IDs so the backend filters correctly
  const allowed = allowedRaceIds.value;
  const savedIds = realmStore.activeRealmRacesEnabledIds;
  if (allowed !== null && !savedIds && canManageRaces.value) {
    try {
      const token = await userStore.getValidToken();
      const realmId = realmStore.activeRealmId;

      // Load current races to compute enabled IDs
      await racesStore.loadRaces(true);
      const allRaces = racesStore.arRaces;
      const enabledIds = allRaces
        .filter(r => allowed.includes(r.ID) || r.RealmID)
        .map(r => r.ID);

      const existing = realmStore.activeRealm?.GamingSystem?.races;
      const baseRaces = (existing && typeof existing === 'object')
        ? { ...existing }
        : (typeof existing === 'string' ? { GamingSystemID: existing } : {});
      const raceIdsValue = { ...baseRaces, EnabledRaceIds: enabledIds };

      const response = await axios.put(
        `${BASE_URL}/realms/realm/${realmId}`,
        { GamingSystem: { races: raceIdsValue } },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      realmStore.updateActiveRealmGamingSystem('races', raceIdsValue);
      if (response.data) {
        realmStore.updateRealmInStore(response.data);
      }

    } catch (err) {
      console.error('Failed to auto-repair EnabledRaceIds:', err);
    }
  }
});
</script>

<style scoped>
.manage-races-view {
  height: 100%;
  overflow-y: auto;
  padding: 2rem;
  background: linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 100%);
  color: #ffffff;
}

.view-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Header */
.view-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  color: var(--theme-accent);
  cursor: pointer;
  transition: all 0.2s ease;
  width: fit-content;
  font-size: 0.95rem;
  font-weight: 600;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.view-header h1 {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
  color: var(--theme-accent);
  font-size: 2rem;
  font-weight: 700;
}

.view-header h1 .material-symbols-outlined {
  font-size: 2.5rem;
}

/* CRUD Container */
.crud-container {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-radius: 1rem;
  padding: 2rem;
  min-height: 600px;
}

/* No Data State */
.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #f54242;
  text-align: center;
}

.no-data .material-symbols-outlined {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.no-data p {
  margin: 0;
  font-size: 1.1rem;
}

/* Race Packages Section */
.packages-container {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-radius: 1rem;
  padding: 2rem;
}

.packages-header {
  margin-bottom: 2rem;
}

.packages-header h2 {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0 0 0.5rem 0;
  color: var(--theme-accent);
  font-size: 1.5rem;
  font-weight: 600;
}

.packages-header h2 .material-symbols-outlined {
  font-size: 1.75rem;
}

.packages-description {
  margin: 0;
  color: #ccc;
  font-size: 0.95rem;
  line-height: 1.6;
}

/* Loading / Error / No Packages states */
.loading-container,
.error-container,
.no-packages {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-top-color: var(--theme-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.error-container .material-symbols-outlined {
  font-size: 3rem;
  color: #ff6b6b;
  margin-bottom: 0.5rem;
}

.btn-retry {
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 600;
}

.btn-retry:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.no-packages .material-symbols-outlined {
  font-size: 4rem;
  color: #666;
  margin-bottom: 1rem;
}

.no-packages h3 {
  color: var(--theme-accent);
  font-size: 1.5rem;
  margin: 0 0 0.75rem 0;
}

.no-packages p {
  color: #ccc;
  font-size: 1rem;
  line-height: 1.6;
  max-width: 500px;
  margin: 0;
}

/* Package Cards */
.packages-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.package-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-radius: 0.75rem;
  padding: 1.25rem 1.5rem;
  transition: all 0.2s ease;
}

.package-card--enabled {
  border-color: rgba(34, 197, 94, 0.4);
  background: rgba(34, 197, 94, 0.05);
}

.package-card--locked {
  border-color: color-mix(in srgb, var(--theme-accent) 35%, transparent);
  background: color-mix(in srgb, var(--theme-accent) 4%, transparent);
}

.package-card:hover {
  border-color: color-mix(in srgb, var(--theme-accent) 40%, transparent);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--theme-accent) 10%, transparent);
}

.package-card--enabled:hover {
  border-color: rgba(34, 197, 94, 0.6);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.15);
}

.package-card--locked:hover {
  border-color: color-mix(in srgb, var(--theme-accent) 50%, transparent);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--theme-accent) 10%, transparent);
}

.package-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.package-info {
  flex: 1;
  min-width: 0;
}

.package-info h3 {
  margin: 0 0 0.25rem 0;
  color: var(--theme-accent);
  font-size: 1.15rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.package-icon {
  font-size: 1.4rem;
}

.package-icon--enabled {
  color: #22c55e;
}

.package-icon--locked {
  color: var(--theme-accent);
}

.package-detail {
  margin: 0;
  color: #aaa;
  font-size: 0.9rem;
  padding-left: 1.9rem;
}

.btn-toggle-package {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 600;
  font-size: 0.95rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-toggle--enable {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
  color: #22c55e;
}

.btn-toggle--enable:not(:disabled):hover {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.2);
}

.btn-toggle--disable {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.btn-toggle--disable:not(:disabled):hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
}

.btn-toggle--locked {
  background: color-mix(in srgb, var(--theme-accent) 8%, transparent);
  border-color: color-mix(in srgb, var(--theme-accent) 25%, transparent);
  color: var(--theme-accent);
  cursor: default;
  opacity: 0.8;
}

.btn-toggle-package:disabled {
  cursor: not-allowed;
}

.btn-toggle-package .material-symbols-outlined {
  font-size: 1.2rem;
}

.read-only-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  color: #aaa;
  font-size: 0.85rem;
  text-align: center;
}

.read-only-notice .material-symbols-outlined {
  font-size: 1rem;
}

/* Apply Changes Section */
.apply-changes-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-apply-changes {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 2rem;
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 700;
  font-size: 1rem;
  min-width: 180px;
}

.btn-apply-changes:not(:disabled):hover {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--theme-accent) 40%, transparent);
}

.btn-apply-changes:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-apply-changes .material-symbols-outlined {
  font-size: 1.3rem;
}

.unsaved-changes-notice {
  color: var(--theme-accent);
  font-size: 0.95rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.unsaved-changes-notice::before {
  content: '\2022';
  font-size: 1.5rem;
  line-height: 1;
}

/* Responsive */
@media (max-width: 768px) {
  .manage-races-view {
    padding: 1rem;
  }

  .view-header h1 {
    font-size: 1.5rem;
  }

  .crud-container,
  .packages-container {
    padding: 1rem;
  }

  .package-content {
    flex-direction: column;
    align-items: stretch;
  }

  .btn-toggle-package {
    width: 100%;
  }

  .apply-changes-section {
    flex-direction: column;
    align-items: stretch;
  }

  .btn-apply-changes {
    width: 100%;
  }

  .unsaved-changes-notice {
    justify-content: center;
  }
}
</style>
