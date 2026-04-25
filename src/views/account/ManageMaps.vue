<template>
  <div class="manage-maps-view">
    <div class="view-container">
      <!-- Header -->
      <div class="view-header">
        <button @click="$router.back()" class="back-btn">
          <span class="material-symbols-outlined">arrow_back</span>
          Back
        </button>
        <h1>
          <span class="material-symbols-outlined">map</span>
          Manage Maps
        </h1>
      </div>

      <!-- Free-tier upgrade prompt -->
      <div v-if="realmStore.isFreeTier" class="free-tier-upgrade">
        <div class="upgrade-seal">
          <span class="material-symbols-outlined">lock</span>
        </div>
        <h2>Unlock Map Management</h2>
        <p>
          Free realms can view the shared <em>RealmForgia</em> sample map, but cannot manage map packages or individual map access. Upgrade your realm to unlock custom uploads, marker management, purchased map packs, and the full cartographer's library.
        </p>
        <router-link to="/account/manage-realm" class="upgrade-cta">
          <span class="cta-label">Upgrade Realm</span>
          <span class="material-symbols-outlined">arrow_forward</span>
        </router-link>
      </div>

      <!-- Map Packages Section -->
      <div v-if="!realmStore.isFreeTier" class="packages-container">
        <div class="packages-header">
          <h2>
            <span class="material-symbols-outlined">inventory_2</span>
            Map Packages
          </h2>
          <p class="packages-description">Enable or disable map packages for this realm. Only maps from enabled packages will be available to players.</p>
        </div>

        <!-- Loading State -->
        <div v-if="loadingPackages" class="loading-container">
          <div class="loading-spinner"></div>
          <p>Loading map packages...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="packagesError" class="error-container">
          <span class="material-symbols-outlined">error</span>
          <p>{{ packagesError }}</p>
          <button @click="loadMapPackages" class="btn-retry">Retry</button>
        </div>

        <!-- No Packages State -->
        <div v-else-if="mapPackages.length === 0" class="no-packages">
          <span class="material-symbols-outlined">block</span>
          <h3>No Map Packages</h3>
          <p>Your account doesn't have access to any map packages. Purchase map packs from the shop to unlock maps for your realm.</p>
        </div>

        <!-- Package Cards -->
        <div v-else class="packages-list">
          <div
            v-for="pkg in mapPackages"
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
                <p v-if="pkg.alwaysOn" class="package-detail">Always enabled — core maps</p>
                <p v-else-if="pkg.mapIds" class="package-detail">{{ pkg.mapIds.length }} map{{ pkg.mapIds.length !== 1 ? 's' : '' }}</p>
                <p v-else class="package-detail">Full map access</p>
              </div>

              <button
                v-if="canManageMaps"
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

            <div v-if="!canManageMaps && !pkg.alwaysOn" class="read-only-notice">
              <span class="material-symbols-outlined">lock</span>
              Only realm owners and DMs can manage map packages
            </div>
          </div>

          <!-- Apply Changes Button -->
          <div v-if="canManageMaps" class="apply-changes-section">
            <button
              @click="saveMapPackages"
              class="btn-apply-changes"
              :disabled="!hasPackageChanges || savingPackages"
            >
              <span v-if="savingPackages" class="loading-spinner-small"></span>
              <template v-else>
                <span class="material-symbols-outlined">save</span>
                Apply Changes
              </template>
            </button>
            <span v-if="hasPackageChanges && !savingPackages" class="unsaved-changes-notice">
              You have unsaved changes
            </span>
          </div>
        </div>
      </div>

      <!-- Individual Map Access Control -->
      <div v-if="!realmStore.isFreeTier" class="access-container">
        <div class="access-header">
          <h2>
            <span class="material-symbols-outlined">shield</span>
            Map Access Management
          </h2>
          <p class="access-description">Enable or disable individual maps for this realm. Only enabled maps will be available to players during gameplay.</p>
        </div>

        <!-- Loading State -->
        <div v-if="loadingMaps" class="loading-container">
          <div class="loading-spinner"></div>
          <p>Loading available maps...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="mapsError" class="error-container">
          <span class="material-symbols-outlined">error</span>
          <p>{{ mapsError }}</p>
          <button @click="loadAvailableMaps" class="btn-retry">Retry</button>
        </div>

        <!-- Content states -->
        <template v-else>
          <!-- Full Access Info Banner -->
          <div v-if="hasFullMapAccess && availableMaps.length > 0" class="full-access-banner">
            <span class="material-symbols-outlined">auto_awesome</span>
            <p>Your account has full map access. Toggle individual maps below to customize which are available in this realm.</p>
          </div>

          <!-- No Maps Available -->
          <div v-if="!hasFullMapAccess && availableMaps.length === 0" class="no-access">
            <span class="material-symbols-outlined">block</span>
            <h3>No Maps Available</h3>
            <p>No maps are available from enabled packages. Enable map packages above to make maps available.</p>
          </div>

          <!-- Map Toggle List -->
          <div v-if="availableMaps.length > 0" class="maps-toggle-list">
          <div class="maps-toggles">
            <div
              v-for="map in availableMaps"
              :key="map.ID"
              class="map-card"
              :class="{
                'map-card--enabled': isMapEnabled(map.ID),
                'map-card--disabled': !isMapEnabled(map.ID)
              }"
            >
              <div class="map-content">
                <div class="map-info">
                  <h3>
                    <span class="material-symbols-outlined status-icon" :class="{
                      'status-icon--enabled': isMapEnabled(map.ID),
                      'status-icon--disabled': !isMapEnabled(map.ID)
                    }">
                      {{ isMapEnabled(map.ID) ? 'check_circle' : 'cancel' }}
                    </span>
                    {{ map.Name }}
                  </h3>
                </div>
                <button
                  v-if="canManageMaps"
                  @click="toggleMap(map.ID)"
                  class="btn-toggle-map"
                  :class="{
                    'btn-toggle--enable': !isMapEnabled(map.ID),
                    'btn-toggle--disable': isMapEnabled(map.ID)
                  }"
                  :disabled="savingMaps"
                >
                  <span v-if="savingMaps" class="loading-spinner-small"></span>
                  <template v-else>
                    <span class="material-symbols-outlined">
                      {{ isMapEnabled(map.ID) ? 'toggle_on' : 'toggle_off' }}
                    </span>
                    {{ isMapEnabled(map.ID) ? 'Disable' : 'Enable' }}
                  </template>
                </button>
              </div>

              <div v-if="!canManageMaps" class="read-only-notice">
                <span class="material-symbols-outlined">lock</span>
                Only realm owners and DMs can manage map access
              </div>
            </div>
          </div>

          <!-- Apply Changes Button -->
          <div v-if="canManageMaps" class="apply-changes-section">
            <button
              @click="saveMapAccess"
              class="btn-apply-changes"
              :disabled="!hasMapChanges || savingMaps"
            >
              <span v-if="savingMaps" class="loading-spinner-small"></span>
              <template v-else>
                <span class="material-symbols-outlined">save</span>
                Apply Changes
              </template>
            </button>
            <span v-if="hasMapChanges && !savingMaps" class="unsaved-changes-notice">
              You have unsaved changes
            </span>
          </div>
        </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAccountStore } from '@shared/stores/account';
import { useRealmStore } from '@shared/stores/realm';
import { useUserStore } from '@shared/stores/user';
import { useMapsStore } from '@shared/stores/maps';
import { useNotifications } from '@shared/composables/useNotifications';
import axios from 'axios';

const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}`;
const router = useRouter();

const accountStore = useAccountStore();
const realmStore = useRealmStore();
const userStore = useUserStore();
const mapsStore = useMapsStore();
const { notifySuccess, notifyError } = useNotifications();

// Package State
const loadingPackages = ref(false);
const packagesError = ref(null);
const mapPackages = ref([]);
const enabledShopItems = ref([]);
const originalEnabledShopItems = ref([]);
const savingPackages = ref(false);
const hasPackageChanges = ref(false);

// Individual Map State
const loadingMaps = ref(false);
const mapsError = ref(null);
const hasFullMapAccess = ref(false);
const availableMaps = ref([]);
const enabledMapIds = ref([]);
const originalEnabledMapIds = ref([]);
const savingMaps = ref(false);
const hasMapChanges = ref(false);

// Check if user can manage maps (owner or DM)
const canManageMaps = computed(() => {
  return realmStore.isOwner || realmStore.isRealmDM;
});

/**
 * Compute allowed map IDs from enabled packages.
 * null = all maps allowed (no filtering)
 * array = only these map IDs allowed
 */
const allowedMapIds = computed(() => {
  if (mapPackages.value.length === 0) return null;

  const ids = [];
  let hasFullAccess = false;

  for (const pkg of mapPackages.value) {
    if (!isPackageEnabled(pkg.shopItemId)) continue;

    if (!pkg.mapIds) {
      hasFullAccess = true;
      break;
    }
    ids.push(...pkg.mapIds);
  }

  if (hasFullAccess) return null;
  return ids.length > 0 ? [...new Set(ids)] : [];
});

// ==================================================
// Map Packages Management
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
  if (!canManageMaps.value) return;

  const pkg = mapPackages.value.find(p => p.shopItemId === shopItemId);
  if (!pkg || pkg.alwaysOn) return;

  const index = enabledShopItems.value.indexOf(shopItemId);
  if (index >= 0) {
    enabledShopItems.value.splice(index, 1);
  } else {
    enabledShopItems.value.push(shopItemId);
  }

  markPackagesAsChanged();
}

/**
 * Mark packages form as changed by comparing current state to original
 */
function markPackagesAsChanged() {
  const current = JSON.stringify([...enabledShopItems.value].sort());
  const original = JSON.stringify([...originalEnabledShopItems.value].sort());
  hasPackageChanges.value = current !== original;
}

/**
 * Load map packages from account access + Patreon benefits
 */
async function loadMapPackages() {
  loadingPackages.value = true;
  packagesError.value = null;

  try {
    const token = await userStore.getValidToken();
    const account = accountStore.account;

    // Collect all shop item IDs across all gaming systems
    const allShopItemIds = new Set();

    // From Account.Access (all gaming systems)
    if (account.Access) {
      for (const gsId of Object.keys(account.Access)) {
        const items = account.Access[gsId];
        if (Array.isArray(items)) {
          items.forEach(id => allShopItemIds.add(id));
        }
      }
    }

    // Also get shop items from Patreon benefits on the active realm
    const activeRealm = realmStore.activeRealm;
    if (activeRealm?.Metadata?.patreonBenefits) {
      for (const benefit of activeRealm.Metadata.patreonBenefits) {
        if (benefit.ShopItems && Array.isArray(benefit.ShopItems)) {
          benefit.ShopItems.forEach(id => allShopItemIds.add(id));
        }
      }
    }

    if (allShopItemIds.size === 0) {
      mapPackages.value = [];
      return;
    }

    const packages = [];

    for (const shopItemId of allShopItemIds) {
      try {
        const { data: shopProduct } = await axios.get(
          `${BASE_URL}/shop/products/product/${shopItemId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Only include items that have Maps in their Items array
        const hasMaps = shopProduct.Items?.some(item => item.Type === 'Maps');
        if (!hasMaps) continue;

        // Extract map IDs from all Maps items
        let fullMapAccess = false;
        const ids = [];
        for (const item of shopProduct.Items) {
          if (item.Type === 'Maps') {
            if (item.IDs && item.IDs.length > 0) {
              ids.push(...item.IDs);
            } else {
              fullMapAccess = true;
              break;
            }
          }
        }
        const mapIds = fullMapAccess ? null : (ids.length > 0 ? [...new Set(ids)] : null);

        packages.push({
          shopItemId,
          name: shopProduct.Name,
          alwaysOn: shopProduct.GrantToNewAccounts === true,
          mapIds
        });
      } catch (err) {
        console.error(`Error fetching shop item ${shopItemId}:`, err);
      }
    }

    mapPackages.value = packages;

    // Load maps so allowedMapIds computed works correctly
    await mapsStore.loadMaps();

    loadCurrentEnabledPackages();
  } catch (error) {
    console.error('Error loading map packages:', error);
    packagesError.value = error.response?.data?.message || 'Failed to load map packages. Please try again.';
  } finally {
    loadingPackages.value = false;
  }
}

/**
 * Load current enabled packages from realm configuration
 */
function loadCurrentEnabledPackages() {
  const savedEnabledItems = realmStore.activeRealmMapsEnabledShopItems;

  if (savedEnabledItems && Array.isArray(savedEnabledItems)) {
    enabledShopItems.value = [...savedEnabledItems];
  } else {
    // Old format or not set: all packages enabled
    enabledShopItems.value = mapPackages.value.map(p => p.shopItemId);
  }

  // Always-on packages are always enabled
  for (const pkg of mapPackages.value) {
    if (pkg.alwaysOn && !enabledShopItems.value.includes(pkg.shopItemId)) {
      enabledShopItems.value.push(pkg.shopItemId);
    }
  }

  originalEnabledShopItems.value = [...enabledShopItems.value];
  hasPackageChanges.value = false;
}

/**
 * Save map package configuration to realm
 */
async function saveMapPackages() {
  savingPackages.value = true;

  try {
    const token = await userStore.getValidToken();
    const realmId = realmStore.activeRealmId;

    const allPackagesEnabled = mapPackages.value.every(p => enabledShopItems.value.includes(p.shopItemId));
    const allMapsEnabled = availableMaps.value.every(m => enabledMapIds.value.includes(m.ID));

    let mapsValue;
    if (allPackagesEnabled && allMapsEnabled) {
      // All packages and all maps enabled — use flat array (backward-compatible)
      mapsValue = [...enabledMapIds.value];
    } else {
      mapsValue = {
        EnabledShopItems: [...enabledShopItems.value],
        EnabledMapIds: [...enabledMapIds.value],
      };
    }

    const response = await axios.put(
      `${BASE_URL}/realms/realm/${realmId}`,
      { GamingSystem: { maps: mapsValue } },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    realmStore.updateActiveRealmGamingSystem('maps', mapsValue);

    if (response.data) {
      realmStore.updateRealmInStore(response.data);
    }

    originalEnabledShopItems.value = [...enabledShopItems.value];
    hasPackageChanges.value = false;

    notifySuccess('Map packages updated successfully!');

    // Reload available maps based on updated packages
    await loadAvailableMaps();

    // Sync EnabledMapIds so the backend filters correctly
    const allowed = allowedMapIds.value;
    const syncMapsValue = (allowed !== null)
      ? { EnabledShopItems: [...enabledShopItems.value], EnabledMapIds: [...enabledMapIds.value] }
      : [...enabledMapIds.value];

    const syncResponse = await axios.put(
      `${BASE_URL}/realms/realm/${realmId}`,
      { GamingSystem: { maps: syncMapsValue } },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    realmStore.updateActiveRealmGamingSystem('maps', syncMapsValue);
    if (syncResponse.data) {
      realmStore.updateRealmInStore(syncResponse.data);
    }

    originalEnabledMapIds.value = [...enabledMapIds.value];
    hasMapChanges.value = false;

  } catch (error) {
    console.error('Error saving map packages:', error);
    notifyError(error.response?.data?.message || 'Failed to save map packages. Please try again.');
  } finally {
    savingPackages.value = false;
  }
}

// ==================================================
// Individual Map Access Control
// ==================================================

/**
 * Check if a map is enabled
 */
function isMapEnabled(mapId) {
  return enabledMapIds.value.includes(mapId);
}

/**
 * Toggle a map on/off
 */
function toggleMap(mapId) {
  if (!canManageMaps.value) return;

  const index = enabledMapIds.value.indexOf(mapId);
  if (index >= 0) {
    enabledMapIds.value.splice(index, 1);
  } else {
    enabledMapIds.value.push(mapId);
  }

  markMapsAsChanged();
}

/**
 * Mark maps form as changed
 */
function markMapsAsChanged() {
  const current = JSON.stringify([...enabledMapIds.value].sort());
  const original = JSON.stringify([...originalEnabledMapIds.value].sort());
  hasMapChanges.value = current !== original;
}

/**
 * Load available maps from store, filter by allowedMapIds, sort alphabetically
 */
async function loadAvailableMaps() {
  loadingMaps.value = true;
  mapsError.value = null;
  hasFullMapAccess.value = false;

  try {
    const allowed = allowedMapIds.value;
    const allMaps = mapsStore.arMaps;

    if (allowed === null) {
      // Full access — show all maps
      hasFullMapAccess.value = true;
      availableMaps.value = [...allMaps].sort((a, b) => (a.Name || '').localeCompare(b.Name || ''));
    } else if (allowed.length === 0) {
      availableMaps.value = [];
    } else {
      availableMaps.value = allMaps
        .filter(m => allowed.includes(m.ID))
        .sort((a, b) => (a.Name || '').localeCompare(b.Name || ''));
    }

    loadCurrentEnabledMapsFromConfig();
  } catch (error) {
    console.error('Error loading maps:', error);
    mapsError.value = error.response?.data?.message || 'Failed to load maps. Please try again.';
  } finally {
    loadingMaps.value = false;
  }
}

/**
 * Load current enabled map IDs from realm config
 */
function loadCurrentEnabledMapsFromConfig() {
  const savedIds = realmStore.activeRealmMaps;
  const mapsConfig = realmStore.activeRealm?.GamingSystem?.maps;

  if (savedIds && savedIds.length > 0) {
    // Only include IDs that are in the available set
    const availableIds = availableMaps.value.map(m => m.ID);
    enabledMapIds.value = savedIds.filter(id => availableIds.includes(id));
  } else if (mapsConfig && typeof mapsConfig === 'object' && !Array.isArray(mapsConfig)) {
    // Config exists but EnabledMapIds is empty — user intentionally disabled all maps
    enabledMapIds.value = [];
  } else {
    // No config at all = all available maps enabled by default
    enabledMapIds.value = availableMaps.value.map(m => m.ID);
  }

  originalEnabledMapIds.value = [...enabledMapIds.value];
  hasMapChanges.value = false;
}

/**
 * Save individual map access to realm
 */
async function saveMapAccess() {
  savingMaps.value = true;

  try {
    const token = await userStore.getValidToken();
    const realmId = realmStore.activeRealmId;

    const allPackagesEnabled = mapPackages.value.every(p => enabledShopItems.value.includes(p.shopItemId));
    const allMapsEnabled = availableMaps.value.every(m => enabledMapIds.value.includes(m.ID));
    const hasPackageRestrictions = allowedMapIds.value !== null;

    let mapsValue;
    if (allPackagesEnabled && allMapsEnabled && !hasPackageRestrictions) {
      // All packages and all maps enabled, no restrictions — flat array (backward-compatible)
      mapsValue = [...enabledMapIds.value];
    } else {
      mapsValue = {
        EnabledShopItems: [...enabledShopItems.value],
        EnabledMapIds: [...enabledMapIds.value],
      };
    }

    const response = await axios.put(
      `${BASE_URL}/realms/realm/${realmId}`,
      { GamingSystem: { maps: mapsValue } },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    realmStore.updateActiveRealmGamingSystem('maps', mapsValue);

    if (response.data) {
      realmStore.updateRealmInStore(response.data);
    }

    originalEnabledMapIds.value = [...enabledMapIds.value];
    hasMapChanges.value = false;

    notifySuccess('Map access updated successfully!');

  } catch (error) {
    console.error('Error saving map access:', error);
    notifyError(error.response?.data?.message || 'Failed to save map access. Please try again.');
  } finally {
    savingMaps.value = false;
  }
}

onMounted(async () => {
  // Only realm owners and DMs can manage maps
  if (!realmStore.isOwner && !realmStore.isRealmDM) {
    router.replace('/account');
    return;
  }

  // Load gaming systems if the host app provides the store (TheGame-Vue does; RF-Vue doesn't).
  // Lazy conditional dynamic import — same pattern as Account.vue so the dep scanner
  // doesn't fail in apps without the gamingSystems store.
  try {
    const mod = await import(/* @vite-ignore */ '@/stores/gamingSystems');
    if (typeof mod.useGamingSystemsStore === 'function') {
      const gamingSystemsStore = mod.useGamingSystemsStore();
      if (!gamingSystemsStore.isLoaded) {
        await gamingSystemsStore.fetchGamingSystems();
      }
    }
  } catch {
    // Gaming systems store not available in this app — skip.
  }

  // Load map packages
  await loadMapPackages();

  // Load available maps based on enabled packages
  await loadAvailableMaps();
});
</script>

<style scoped>
.manage-maps-view {
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

/* Packages Section */
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

/* Loading / Error / No Packages / No Access states */
.loading-container,
.error-container,
.no-packages,
.no-access {
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

/* Map Access Management */
.access-container {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-radius: 1rem;
  padding: 2rem;
}

.access-header {
  margin-bottom: 2rem;
}

.access-header h2 {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0 0 0.5rem 0;
  color: var(--theme-accent);
  font-size: 1.5rem;
  font-weight: 600;
}

.access-header h2 .material-symbols-outlined {
  font-size: 1.75rem;
}

.access-description {
  margin: 0;
  color: #ccc;
  font-size: 0.95rem;
  line-height: 1.6;
}

.no-access {
  padding: 3rem 2rem;
}

.no-access .material-symbols-outlined {
  font-size: 4rem;
  color: #666;
  margin-bottom: 1rem;
}

.no-access h3 {
  color: var(--theme-accent);
  font-size: 1.5rem;
  margin: 0 0 0.75rem 0;
}

.no-access p {
  color: #ccc;
  font-size: 1rem;
  line-height: 1.6;
  max-width: 500px;
  margin: 0;
}

/* Full Access Banner */
.full-access-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: color-mix(in srgb, var(--theme-accent) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 25%, transparent);
  border-radius: 0.75rem;
  margin-bottom: 1.5rem;
}

.full-access-banner .material-symbols-outlined {
  font-size: 1.5rem;
  color: var(--theme-accent);
  flex-shrink: 0;
}

.full-access-banner p {
  color: #ccc;
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0;
}

/* Map Toggle List */
.maps-toggle-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.maps-toggle-list .maps-toggles {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.map-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-radius: 0.75rem;
  padding: 1.25rem 1.5rem;
  transition: all 0.2s ease;
}

.map-card--enabled {
  border-color: rgba(34, 197, 94, 0.4);
  background: rgba(34, 197, 94, 0.05);
}

.map-card--disabled {
  opacity: 0.7;
}

.map-card:hover {
  border-color: color-mix(in srgb, var(--theme-accent) 40%, transparent);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--theme-accent) 10%, transparent);
}

.map-card--enabled:hover {
  border-color: rgba(34, 197, 94, 0.6);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.15);
}

.map-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.map-info {
  flex: 1;
  min-width: 0;
}

.map-info h3 {
  margin: 0;
  color: var(--theme-accent);
  font-size: 1.15rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-icon {
  font-size: 1.5rem;
}

.status-icon--enabled {
  color: #22c55e;
}

.status-icon--disabled {
  color: #ef4444;
}

.btn-toggle-map {
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

.btn-toggle-map:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-toggle-map .material-symbols-outlined {
  font-size: 1.2rem;
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
  .manage-maps-view {
    padding: 1rem;
  }

  .view-header h1 {
    font-size: 1.5rem;
  }

  .access-container,
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

  .map-content {
    flex-direction: column;
    align-items: stretch;
  }

  .btn-toggle-map {
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

/* ---- Free-tier upgrade block ---- */
.free-tier-upgrade {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
  margin: 1.5rem auto;
  padding: 2.5rem 1.75rem 2.25rem;
  max-width: 560px;
  background:
    radial-gradient(ellipse at top, color-mix(in srgb, var(--theme-accent) 14%, transparent) 0%, transparent 65%),
    linear-gradient(180deg, #141826 0%, #0d1120 100%);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 45%, transparent);
  border-radius: 6px;
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--theme-accent) 28%, transparent),
    0 10px 28px rgba(0, 0, 0, 0.38),
    0 0 0 1px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.free-tier-upgrade::before,
.free-tier-upgrade::after {
  content: "";
  position: absolute;
  width: 22px;
  height: 22px;
  border: 1px solid var(--theme-accent);
  opacity: 0.65;
  pointer-events: none;
}
.free-tier-upgrade::before {
  top: 10px; left: 10px;
  border-right: none; border-bottom: none;
}
.free-tier-upgrade::after {
  bottom: 10px; right: 10px;
  border-left: none; border-top: none;
}

.upgrade-seal {
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--theme-accent) 70%, transparent);
  background:
    radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--theme-accent) 35%, transparent) 0%, transparent 55%),
    radial-gradient(circle at center, rgba(20, 10, 5, 0.85) 0%, rgba(10, 5, 3, 0.95) 70%);
  box-shadow:
    inset 0 0 14px color-mix(in srgb, var(--theme-accent) 32%, transparent),
    0 0 0 1px rgba(0, 0, 0, 0.6);
}

.upgrade-seal .material-symbols-outlined {
  font-size: 1.9rem;
  color: var(--theme-accent);
  text-shadow:
    0 0 8px color-mix(in srgb, var(--theme-accent) 60%, transparent),
    0 1px 0 rgba(0, 0, 0, 0.7);
}

.free-tier-upgrade h2 {
  margin: 0;
  font-family: var(--theme-font-display);
  font-size: 1.6rem;
  letter-spacing: 0.04em;
  color: var(--theme-accent);
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.55);
}

.free-tier-upgrade p {
  margin: 0;
  max-width: 44ch;
  font-size: 0.95rem;
  line-height: 1.55;
  color: color-mix(in srgb, #e8dcc4 85%, transparent);
}

.free-tier-upgrade em {
  font-style: italic;
  color: color-mix(in srgb, var(--theme-accent) 90%, #ffe8c4);
  font-weight: 600;
}

.upgrade-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.7rem 1.3rem;
  min-height: 46px;
  background: linear-gradient(135deg, var(--theme-accent) 0%, #d9a869 45%, #b8864a 100%);
  color: #2a1a0a;
  border: 1px solid #8a5a2e;
  border-radius: 3px;
  font-family: var(--theme-font-display);
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  box-shadow:
    inset 0 1px 0 rgba(255, 230, 180, 0.5),
    inset 0 -1px 0 rgba(90, 50, 15, 0.5),
    0 4px 10px rgba(0, 0, 0, 0.4);
  transition: transform 0.18s ease, box-shadow 0.25s ease, filter 0.2s ease;
}

.upgrade-cta:hover,
.upgrade-cta:focus-visible {
  transform: translateY(-1px);
  filter: brightness(1.06);
  box-shadow:
    inset 0 1px 0 rgba(255, 235, 190, 0.55),
    inset 0 -1px 0 rgba(90, 50, 15, 0.5),
    0 6px 16px rgba(0, 0, 0, 0.45),
    0 0 18px color-mix(in srgb, var(--theme-accent) 40%, transparent);
  outline: none;
}

.upgrade-cta .material-symbols-outlined {
  font-size: 1.2rem;
  transition: transform 0.2s ease;
}

.upgrade-cta:hover .material-symbols-outlined {
  transform: translateX(3px);
}

@media (max-width: 640px) {
  .free-tier-upgrade {
    padding: 2rem 1.25rem 1.75rem;
    margin: 1rem;
  }
  .free-tier-upgrade h2 { font-size: 1.35rem; }
  .free-tier-upgrade p { font-size: 0.9rem; }
}
</style>
