<template>
  <div class="maps-platform">
    <div class="maps-header">
      <h2 class="maps-title">
        <span class="material-symbols-outlined">map</span>
        Maps
      </h2>
      <div class="maps-header-actions">
        <button
          v-if="canUploadMaps"
          class="upload-map-button"
          @click="openUploadDialog"
          type="button"
        >
          <span class="material-symbols-outlined">cloud_upload</span>
          <span class="upload-map-button-label">Upload Map</span>
        </button>
        <button class="mobile-sidebar-toggle" @click="toggleMobileSidebar">
          <span class="material-symbols-outlined">{{ mobileSidebarOpen ? 'close' : 'list' }}</span>
          {{ mobileSidebarOpen ? 'Hide Map List' : 'Show Map List' }}
        </button>
      </div>
    </div>

    <MapUploadDialog ref="mapUploadDialogRef" @uploaded="onMapUploaded" />

    <!-- Free-tier upgrade banner -->
    <aside v-if="realmStore.isFreeTier" class="maps-upgrade-banner" role="note">
      <div class="banner-seal">
        <span class="seal-ring"></span>
        <span class="material-symbols-outlined seal-icon">lock</span>
      </div>
      <div class="banner-body">
        <h3 class="banner-title">A Cartographer's Sample</h3>
        <p class="banner-copy">
          You're viewing <em>RealmForgia</em> — the sample map bound to every free realm. Upgrade to unlock custom uploads, marker lore, and the full cartographer's library.
        </p>
      </div>
      <router-link :to="{ path: '/account/active-realm', query: { subscribe: 1 } }" class="banner-cta">
        <span class="cta-label">Upgrade Realm</span>
        <span class="material-symbols-outlined cta-arrow">arrow_forward</span>
      </router-link>
    </aside>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading maps...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <span class="material-symbols-outlined">error</span>
      <p>{{ error }}</p>
      <button @click="fetchMaps" class="retry-button">
        <span class="material-symbols-outlined">refresh</span>
        Retry
      </button>
    </div>

    <!-- Mobile Backdrop -->
    <div
      v-if="mobileSidebarOpen"
      class="mobile-sidebar-backdrop"
      @click="mobileSidebarOpen = false"
    ></div>

    <!-- Mobile Slide-Out Map List -->
    <nav v-if="enabledMaps.length > 0" class="maps-nav" :class="{ 'mobile-open': mobileSidebarOpen }">
      <div class="map-list">
        <header class="list-header">
          <span class="col-icon"></span>
          <span class="col-name">Name</span>
          <span class="spacer"></span>
        </header>
        <div class="list-content">
          <div
            v-for="map in enabledMaps"
            :key="map.ID"
            class="map-item"
            :class="{ active: selectedMap?.ID === map.ID }"
            @click="selectMap(map)"
          >
            <span class="map-icon">
              <span class="material-symbols-outlined">map</span>
            </span>
            <span class="map-name">{{ map.Name }}</span>
          </div>
        </div>
      </div>
    </nav>

    <!-- Two-Column Layout -->
    <div v-if="!loading && !error && enabledMaps.length > 0" class="maps-container">
      <!-- Map Content -->
      <div class="map-content">
        <MapViewer
          v-if="selectedMap"
          :map-data="selectedMap"
          @scale-updated="onScaleUpdated"
          @renamed="onMapRenamed"
          @deleted="onMapDeleted"
        />
        <div v-else class="no-selection">
          <span class="material-symbols-outlined">map</span>
          <p>Select a map from the list to view</p>
        </div>
      </div>
    </div>

    <!-- No Maps State -->
    <div v-if="!loading && !error && enabledMaps.length === 0" class="no-maps-state">
      <span class="material-symbols-outlined">map_off</span>
      <template v-if="realmStore.isOwner || realmStore.isRealmDM">
        <p>No maps enabled for this realm.</p>
        <p class="hint">Visit <router-link to="/account/manage-maps">Manage Maps</router-link> to enable maps for your realm.</p>
      </template>
      <template v-else>
        <p>No maps are available in this realm.</p>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useRealmStore } from '@shared/stores/realm';
import { useMapsStore } from '@shared/stores/maps';
import MapViewer from '@shared/components/MapViewer.vue';
import MapUploadDialog from '@shared/components/maps/MapUploadDialog.vue';

const emits = defineEmits(['set-room']);
const router = useRouter();
const route = useRoute();
const realmStore = useRealmStore();
const mapsStore = useMapsStore();

const loading = ref(true);
const error = ref(null);
const selectedMap = ref(null);
const mobileSidebarOpen = ref(false);
const mapUploadDialogRef = ref(null);

const toggleMobileSidebar = () => {
  mobileSidebarOpen.value = !mobileSidebarOpen.value;
};

// Only realm owners or DMs on a paid tier may upload custom maps.
const canUploadMaps = computed(() =>
  (realmStore.isOwner || realmStore.isRealmDM) && !realmStore.isFreeTier
);

const openUploadDialog = () => {
  mapUploadDialogRef.value?.open();
};

// When a map finishes uploading, auto-select it so the viewer shows the new map.
const onMapUploaded = (mapData) => {
  if (mapData?.ID) {
    selectMap(mapData);
  }
};

// Get enabled map IDs for the active realm
const enabledMapIds = computed(() => {
  return realmStore.activeRealmMaps;
});

// Get enabled maps (maps that are both accessible and enabled for this realm)
// If no maps config exists at all (GamingSystem.maps is undefined), show all maps.
// If config exists (user has used ManageMaps), respect EnabledMapIds — empty means none.
const enabledMaps = computed(() => {
  const allMaps = mapsStore.arMaps;
  const ids = enabledMapIds.value;
  const sortByName = (a, b) => (a.Name || '').localeCompare(b.Name || '');
  const activeRealmId = realmStore.activeRealm?.RealmID;

  // Free-tier realms: the store has already narrowed to the sample map(s);
  // skip the EnabledMapIds filter entirely so they always land on them.
  if (realmStore.isFreeTier) {
    return allMaps.slice().sort(sortByName);
  }

  const mapsConfig = realmStore.activeRealm?.GamingSystem?.maps;
  if (!mapsConfig) {
    // No maps config at all — realm never configured maps, show all
    return allMaps.slice().sort(sortByName);
  }

  // Config exists — filter by EnabledMapIds, but always include custom
  // realm-scoped maps (maps the realm itself owns via RealmID).
  return allMaps
    .filter(map => ids.includes(map.ID) || (activeRealmId && map.RealmID === activeRealmId))
    .sort(sortByName);
});

const fetchMaps = async () => {
  loading.value = true;
  error.value = null;

  try {
    await mapsStore.loadMaps();
  } catch (err) {
    console.error('Error loading maps:', err);
    error.value = err.response?.data?.message || 'Failed to load maps. Please try again.';
  } finally {
    loading.value = false;
  }
};

const selectMap = (map) => {
  selectedMap.value = map;
  mobileSidebarOpen.value = false;
  // Update URL with map ID as query parameter
  router.push({ name: 'Maps', query: { map: map.ID } });
};

const onScaleUpdated = (scaleData) => {
};

const onMapRenamed = ({ id, name }) => {
  if (selectedMap.value?.ID === id) {
    selectedMap.value = { ...selectedMap.value, Name: name };
  }
};

const onMapDeleted = (id) => {
  if (selectedMap.value?.ID === id) {
    selectedMap.value = null;
    router.push({ name: 'Maps', query: {} });
  }
};

const loadMapFromUrl = () => {
  const mapIdFromQuery = route.query.map;
  if (mapIdFromQuery) {
    const map = enabledMaps.value.find(m => m.ID === mapIdFromQuery);
    if (map) {
      selectedMap.value = map;
    }
  }
};

// Watch for URL changes (browser back/forward)
watch(() => route.query.map, (newMapId) => {
  if (newMapId) {
    const map = enabledMaps.value.find(m => m.ID === newMapId);
    if (map) {
      selectedMap.value = map;
    }
  } else {
    selectedMap.value = null;
  }
});

onMounted(async () => {
  emits('set-room', 'maps');
  await fetchMaps();
  // Load map from URL if present
  loadMapFromUrl();
  // Free-tier realms see only the sample map — auto-select so they don't land on an empty viewer.
  if (!selectedMap.value && realmStore.isFreeTier && enabledMaps.value.length > 0) {
    selectMap(enabledMaps.value[0]);
  }
});

onBeforeUnmount(() => {
  emits('set-room', null);
});
</script>

<style scoped>
.maps-platform {
  height: 100%;
  display: grid;
  grid-template-columns: 350px 1fr;
  grid-template-rows: auto auto 1fr;
  background: linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 100%);
  color: #ffffff;
}

.maps-header {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  border-bottom: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.maps-nav {
  grid-row: 3;
  grid-column: 1;
}

.maps-container {
  grid-row: 3;
  grid-column: 2;
}

.maps-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--theme-accent);
  font-size: 2rem;
  margin: 0.5rem 0 0 0;
  font-family: var(--theme-font-display);
}

.maps-title .material-symbols-outlined {
  font-size: 2rem;
}

/* Header action cluster (upload + mobile toggle) */
.maps-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.upload-map-button {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1rem;
  min-height: 44px;
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 60%, transparent);
  border-radius: 0.55rem;
  font-weight: 700;
  font-size: 0.88rem;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(200, 155, 92, 0.22);
  transition: transform 0.15s ease, box-shadow 0.2s ease, filter 0.2s ease;
}

.upload-map-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(200, 155, 92, 0.32);
  filter: brightness(1.05);
}

.upload-map-button:active {
  transform: translateY(0);
  box-shadow: 0 3px 8px rgba(200, 155, 92, 0.2);
}

.upload-map-button .material-symbols-outlined {
  font-size: 1.25rem;
}

/* Loading, Error States */
.loading-state,
.error-state,
.no-maps-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 3rem;
  gap: 1rem;
  color: #D2B48C;
  grid-column: 1 / -1;
}

.no-maps-state .hint {
  font-size: 0.9rem;
  color: #999;
}

.no-maps-state .hint a {
  color: var(--theme-accent);
  text-decoration: none;
  font-weight: 600;
}

.no-maps-state .hint a:hover {
  text-decoration: underline;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-top: 4px solid var(--theme-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.retry-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.retry-button:hover {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-1px);
}

/* Two-Column Layout — maps-platform becomes the grid on desktop */
.maps-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Left Column: Navigation */
.maps-nav {
  display: flex;
  flex-direction: column;
  background: color-mix(in srgb, var(--theme-bg-surface) 50%, transparent);
  border-right: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  overflow: hidden;
}

/* Map List */
.map-list {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.list-header {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  background: #420500;
  border-bottom: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  color: var(--theme-accent);
  font-weight: 600;
}

.col-icon {
  width: 50px;
  text-align: center;
}

.col-name {
  flex: 1;
  padding-left: 0.5rem;
}

.spacer {
  width: 10px;
}

.list-content {
  flex: 1;
  overflow-y: auto;
}

.map-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  background: rgba(55, 77, 125, 0.4);
  border-bottom: 1px solid color-mix(in srgb, var(--theme-bg-surface-alt) 50%, transparent);
  cursor: pointer;
  transition: all 0.2s ease;
}

.map-item:hover {
  background: rgba(55, 77, 125, 0.6);
}

.map-item.active {
  background: color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-left: 4px solid var(--theme-accent);
  font-weight: 600;
}

.map-icon {
  width: 50px;
  text-align: center;
  color: var(--theme-accent);
  border-right: 1px solid color-mix(in srgb, var(--theme-bg-surface-alt) 50%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.map-icon .material-symbols-outlined {
  font-size: 1.5rem;
}

.map-item.active .map-icon {
  color: var(--theme-accent);
}

.map-name {
  flex: 1;
  padding-left: 0.75rem;
  color: #D2B48C;
}

.map-item.active .map-name {
  color: #ffffff;
}

/* Right Column: Content */
.map-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 2rem;
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
}

.no-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #666;
}

.no-selection .material-symbols-outlined {
  font-size: 5rem;
  margin-bottom: 1rem;
  color: #555;
}

.no-selection p {
  font-size: 1.2rem;
  margin: 0;
}

.error-state .material-symbols-outlined,
.no-maps-state .material-symbols-outlined {
  font-size: 4rem;
  color: #666;
}

/* Mobile toggle button — hidden on desktop */
.mobile-sidebar-toggle {
  display: none;
}

.mobile-sidebar-backdrop {
  display: none;
}

/* Mobile: stack vertically, sidebar as overlay */
@media (max-width: 768px) {
  .maps-platform {
    display: flex;
    flex-direction: column;
  }

  .maps-container {
    flex: 1;
  }

  .maps-nav {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 85vw;
    max-width: 320px;
    height: 100dvh;
    z-index: 10000;
    border-right: 2px solid color-mix(in srgb, var(--theme-accent) 40%, transparent);
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.5);
    background: var(--theme-bg-surface, #182036);
  }

  .maps-nav.mobile-open {
    display: flex;
  }

  .mobile-sidebar-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: color-mix(in srgb, var(--theme-accent) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--theme-accent) 40%, transparent);
    border-radius: 0.5rem;
    color: var(--theme-accent);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    min-height: 44px;
    transition: background 0.2s;
  }

  /* On narrow viewports, hide the label and keep an icon-only upload button. */
  .upload-map-button {
    padding: 0.5rem 0.75rem;
  }

  .upload-map-button-label {
    display: none;
  }

  .mobile-sidebar-toggle:active {
    background: color-mix(in srgb, var(--theme-accent) 25%, transparent);
  }

  .mobile-sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 9999;
  }

  .map-content {
    padding: 1rem;
  }

  .maps-header {
    padding: 0.75rem 1rem;
  }

  .maps-title {
    font-size: 1.5rem;
  }

  .no-selection .material-symbols-outlined {
    font-size: 3rem;
  }
}

/* Landscape: compact header */
@media (max-height: 500px) and (orientation: landscape) {
  .maps-header {
    padding: 0.25rem 1rem;
  }

  .maps-title {
    font-size: 1.1rem;
    margin: 0;
  }

  .maps-title .material-symbols-outlined {
    font-size: 1.1rem;
  }

  .mobile-sidebar-toggle {
    min-height: 36px;
    padding: 0.25rem 0.75rem;
    font-size: 0.8rem;
  }
}

/* ---- Free-tier upgrade banner — weathered herald's proclamation ---- */
.maps-upgrade-banner {
  grid-row: 2;
  grid-column: 1 / -1;
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1.25rem;
  margin: 0.75rem 1.25rem 0;
  padding: 1rem 1.5rem 1rem 1.25rem;
  background:
    radial-gradient(ellipse at top left, color-mix(in srgb, var(--theme-accent) 12%, transparent) 0%, transparent 60%),
    radial-gradient(ellipse at bottom right, rgba(60, 30, 15, 0.35) 0%, transparent 55%),
    linear-gradient(180deg, #141826 0%, #0d1120 100%);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 45%, transparent);
  border-radius: 4px;
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--theme-accent) 28%, transparent),
    inset 0 -1px 0 rgba(0, 0, 0, 0.5),
    0 8px 24px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  isolation: isolate;
}

.maps-upgrade-banner::before,
.maps-upgrade-banner::after {
  content: "";
  position: absolute;
  width: 18px;
  height: 18px;
  border: 1px solid var(--theme-accent);
  opacity: 0.7;
  pointer-events: none;
}
.maps-upgrade-banner::before {
  top: 6px;
  left: 6px;
  border-right: none;
  border-bottom: none;
}
.maps-upgrade-banner::after {
  bottom: 6px;
  right: 6px;
  border-left: none;
  border-top: none;
}

.maps-upgrade-banner > * {
  position: relative;
  z-index: 1;
}

.banner-seal {
  position: relative;
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.seal-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--theme-accent) 70%, transparent);
  background:
    radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--theme-accent) 35%, transparent) 0%, transparent 55%),
    radial-gradient(circle at center, rgba(20, 10, 5, 0.8) 0%, rgba(10, 5, 3, 0.95) 70%);
  box-shadow:
    inset 0 0 12px color-mix(in srgb, var(--theme-accent) 30%, transparent),
    0 0 0 1px rgba(0, 0, 0, 0.6);
  animation: sealPulse 3.4s ease-in-out infinite;
}

.seal-icon {
  font-size: 1.5rem;
  color: var(--theme-accent);
  text-shadow:
    0 0 8px color-mix(in srgb, var(--theme-accent) 60%, transparent),
    0 1px 0 rgba(0, 0, 0, 0.7);
  filter: drop-shadow(0 0 3px color-mix(in srgb, var(--theme-accent) 40%, transparent));
}

@keyframes sealPulse {
  0%, 100% {
    box-shadow:
      inset 0 0 12px color-mix(in srgb, var(--theme-accent) 30%, transparent),
      0 0 0 1px rgba(0, 0, 0, 0.6),
      0 0 0 0 color-mix(in srgb, var(--theme-accent) 0%, transparent);
  }
  50% {
    box-shadow:
      inset 0 0 16px color-mix(in srgb, var(--theme-accent) 45%, transparent),
      0 0 0 1px rgba(0, 0, 0, 0.6),
      0 0 14px 2px color-mix(in srgb, var(--theme-accent) 25%, transparent);
  }
}

.banner-body {
  min-width: 0;
}

.banner-title {
  margin: 0 0 0.2rem 0;
  font-family: var(--theme-font-display);
  font-size: 1.1rem;
  letter-spacing: 0.04em;
  color: var(--theme-accent);
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.55);
}

.banner-copy {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.45;
  color: color-mix(in srgb, #e8dcc4 85%, transparent);
}

.banner-copy em {
  font-style: italic;
  color: color-mix(in srgb, var(--theme-accent) 90%, #ffe8c4);
  font-weight: 600;
}

.banner-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1rem 0.55rem 1.1rem;
  min-height: 42px;
  background:
    linear-gradient(135deg, var(--theme-accent) 0%, #d9a869 45%, #b8864a 100%);
  color: #2a1a0a;
  border: 1px solid #8a5a2e;
  border-radius: 3px;
  font-family: var(--theme-font-display);
  font-size: 0.86rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  white-space: nowrap;
  box-shadow:
    inset 0 1px 0 rgba(255, 230, 180, 0.5),
    inset 0 -1px 0 rgba(90, 50, 15, 0.5),
    0 3px 8px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(0, 0, 0, 0.3);
  transition: transform 0.18s ease, box-shadow 0.25s ease, filter 0.2s ease;
}

.banner-cta:hover,
.banner-cta:focus-visible {
  transform: translateY(-1px);
  filter: brightness(1.06);
  box-shadow:
    inset 0 1px 0 rgba(255, 235, 190, 0.55),
    inset 0 -1px 0 rgba(90, 50, 15, 0.5),
    0 5px 14px rgba(0, 0, 0, 0.45),
    0 0 16px color-mix(in srgb, var(--theme-accent) 40%, transparent),
    0 0 0 1px rgba(0, 0, 0, 0.3);
  outline: none;
}

.banner-cta:active {
  transform: translateY(0);
}

.cta-arrow {
  font-size: 1.1rem;
  transition: transform 0.2s ease;
}

.banner-cta:hover .cta-arrow {
  transform: translateX(3px);
}

@media (max-width: 640px) {
  .maps-upgrade-banner {
    grid-template-columns: auto 1fr;
    grid-template-areas:
      "seal body"
      "cta  cta";
    gap: 0.75rem 1rem;
    padding: 0.85rem 1rem;
    margin: 0.6rem 0.75rem 0;
  }
  .banner-seal { grid-area: seal; width: 44px; height: 44px; }
  .seal-icon { font-size: 1.3rem; }
  .banner-body { grid-area: body; }
  .banner-cta {
    grid-area: cta;
    justify-content: center;
    width: 100%;
  }
  .banner-title { font-size: 1rem; }
  .banner-copy { font-size: 0.82rem; }
}
</style>
