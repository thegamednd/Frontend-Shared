<template>
  <div class="map-viewer-container">
    <!-- Error State -->
    <div v-if="error" class="error-section">
      <span class="material-symbols-outlined">error</span>
      <p>{{ error }}</p>
    </div>

    <!-- Processing State -->
    <div v-else-if="mapData && !mapData.TileBaseUrl" class="processing-indicator" :data-state="processingState">
      <div class="cartographer-glyph">
        <span class="ripple ripple-1" aria-hidden="true"></span>
        <span class="ripple ripple-2" aria-hidden="true"></span>
        <span class="ripple ripple-3" aria-hidden="true"></span>

        <svg class="compass" viewBox="0 0 100 100" aria-hidden="true">
          <circle class="compass-ring" cx="50" cy="50" r="44" />
          <circle class="compass-inner" cx="50" cy="50" r="28" />

          <g class="compass-marks">
            <line x1="50" y1="6"  x2="50" y2="13" />
            <line x1="50" y1="87" x2="50" y2="94" />
            <line x1="6"  y1="50" x2="13" y2="50" />
            <line x1="87" y1="50" x2="94" y2="50" />
            <line x1="22" y1="22" x2="26" y2="26" class="diag" />
            <line x1="78" y1="22" x2="74" y2="26" class="diag" />
            <line x1="22" y1="78" x2="26" y2="74" class="diag" />
            <line x1="78" y1="78" x2="74" y2="74" class="diag" />
          </g>

          <g class="compass-letters">
            <text x="50" y="22">N</text>
            <text x="50" y="83">S</text>
            <text x="20" y="53">W</text>
            <text x="80" y="53">E</text>
          </g>

          <g class="compass-needle">
            <polygon class="needle-north" points="50,16 54,50 50,52 46,50" />
            <polygon class="needle-south" points="50,84 54,50 50,48 46,50" />
            <circle class="needle-pivot" cx="50" cy="50" r="2.6" />
          </g>
        </svg>

        <span class="failed-icon material-symbols-outlined" aria-hidden="true">error</span>
      </div>

      <div class="cartographer-copy">
        <h3 class="cartographer-heading">
          <template v-if="processingState === 'failed'">The Cartographer Faltered</template>
          <template v-else-if="processingState === 'pending'">Awaiting the Cartographer</template>
          <template v-else>Inking Your Realm</template>
        </h3>
        <p class="cartographer-body">
          <template v-if="processingState === 'failed'">
            {{ mapData.ProcessingError || 'The map could not be drawn.' }}
          </template>
          <template v-else-if="processingState === 'pending'">
            Your map waits in the cartographer's queue. Tiles will be drawn shortly.
          </template>
          <template v-else>
            Quill on parchment — tiles are being etched and borders gilded. This usually takes a minute or two.
          </template>
        </p>
        <p class="cartographer-status">
          <span class="status-dot" aria-hidden="true"></span>
          <span class="status-label">
            <template v-if="processingState === 'failed'">Failed</template>
            <template v-else-if="processingState === 'pending'">Pending</template>
            <template v-else>Processing</template>
          </span>
        </p>
      </div>
    </div>

    <!-- Map Viewer -->
    <div v-else-if="mapData && mapData.TileBaseUrl" class="map-viewer-content">
      <!-- Loading overlay -->
      <div v-if="loading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p>Initializing map...</p>
      </div>

      <div ref="mapContainer" class="leaflet-map"></div>

      <!-- Scale Configuration Dialog (Admin Only) -->
      <dialog ref="scaleDialog" class="scale-config-dialog" @close="onDialogClose">
        <h3 class="dialog-title">Configure Map Scale</h3>
        <div class="dialog-body">
          <p class="panel-description">
            Define the relationship between pixels and real-world distance.
          </p>

          <div class="scale-config-form">
            <div class="form-group">
              <label for="scalePixels">Pixels:</label>
              <input
                id="scalePixels"
                v-model.number="scalePixels"
                type="number"
                min="1"
                class="scale-input"
                placeholder="100"
              />
            </div>

            <div class="form-group">
              <label for="scaleDistance">Distance:</label>
              <input
                id="scaleDistance"
                v-model.number="scaleDistance"
                type="number"
                min="0.1"
                step="0.1"
                class="scale-input"
                placeholder="50"
              />
            </div>

            <div class="form-group">
              <label for="scaleUnit">Unit:</label>
              <select id="scaleUnit" v-model="scaleUnit" class="scale-select" @change="updateDisplayName">
                <option value="miles">Miles</option>
                <option value="kilometers">Kilometers</option>
                <option value="leagues">Leagues</option>
                <option value="feet">Feet</option>
                <option value="meters">Meters</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div class="form-group" v-if="scaleUnit === 'custom'">
              <label for="scaleDisplayName">Display Name:</label>
              <input
                id="scaleDisplayName"
                v-model="scaleDisplayName"
                type="text"
                class="scale-input"
                placeholder="e.g., Parsecs, Furlongs"
              />
            </div>

            <div class="scale-preview">
              <strong>Preview:</strong> {{ scalePixels }} pixels = {{ scaleDistance }} {{ scaleDisplayName }}
            </div>

            <div class="scale-actions">
              <button @click="saveScale" class="save-button" :disabled="scaleSaving">
                {{ scaleSaving ? 'Saving...' : 'Save Scale' }}
              </button>
              <button @click="cancelScaleConfig" class="cancel-button">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </dialog>

      <!-- Measurement Result Display -->
      <div
        v-if="measurementActive && measurementPoints.length > 0"
        ref="measurementPanel"
        class="measurement-panel"
        :style="measurementPanelStyle"
      >
        <h3 @mousedown="startDrag($event, 'measurement')" class="draggable-handle">Distance Measurement</h3>
        <p v-if="measurementPoints.length === 1" class="measurement-instruction">
          Click to add more points. Distance updates automatically.
        </p>
        <div v-if="measurementPoints.length >= 2" class="measurement-result">
          <div class="measurement-stats">
            <span class="point-count">{{ measurementPoints.length }} points</span>
          </div>
          <strong>Total Distance:</strong> {{ calculatedDistance }} {{ scaleDisplayNameComputed }}
        </div>
        <p v-if="measurementPoints.length >= 2" class="measurement-instruction">
          Click to add more points or use buttons below.
        </p>
        <div class="measurement-buttons">
          <button v-if="measurementPoints.length > 0" @click="undoLastPoint" class="undo-button">
            Undo Last
          </button>
          <button @click="clearMeasurement" class="clear-button">
            Clear All
          </button>
        </div>
      </div>

      <!-- Map Info Panel -->
      <div ref="infoPanel" class="map-info-panel" :style="infoPanelStyle">
        <div class="panel-header">
          <h3 @mousedown="startDrag($event, 'info')" class="draggable-handle">{{ mapData.Name }}</h3>
          <button
            @click="toggleFullscreen"
            class="fullscreen-icon-button"
            :title="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
          >
            <span class="material-symbols-outlined">
              {{ isFullscreen ? 'fullscreen_exit' : 'fullscreen' }}
            </span>
          </button>
        </div>

        <!-- Map Controls -->
        <div class="panel-controls">
          <!-- Measure Distance (hidden for free-tier sample maps) -->
          <button
            v-if="canMeasure"
            @click="toggleMeasurement"
            class="control-icon-button"
            :class="{ active: measurementActive }"
            :disabled="!hasScale"
            :title="hasScale ? 'Measure distance between two points' : 'Please configure scale first'"
          >
            <span class="material-symbols-outlined">square_foot</span>
          </button>

          <!-- Set Scale (Realm Owner / DM) -->
          <button
            v-if="canEditMap"
            @click="toggleScaleConfig"
            class="control-icon-button"
            :class="{ active: showScaleConfig }"
            title="Configure map scale"
          >
            <span class="material-symbols-outlined">straighten</span>
          </button>

          <!-- Add Marker (Realm Owner / DM) -->
          <button
            v-if="canEditMarkers"
            @click="toggleMarkerMode"
            class="control-icon-button"
            :class="{ active: markerMode }"
            title="Add map marker"
          >
            <span class="material-symbols-outlined">add_location</span>
          </button>

          <!-- Rename Map (Realm Owner / DM) -->
          <button
            v-if="canEditMap"
            @click="openRenameDialog"
            class="control-icon-button"
            title="Rename map"
          >
            <span class="material-symbols-outlined">edit</span>
          </button>

          <!-- Delete Map (Realm Owner / DM) -->
          <button
            v-if="canEditMap"
            @click="openDeleteDialog"
            class="control-icon-button control-icon-button--danger"
            title="Delete map"
          >
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>

      <!-- Rename Dialog -->
      <dialog ref="renameDialog" class="marker-dialog" @close="renameError = null">
        <h3 class="dialog-title">Rename Map</h3>
        <div class="dialog-body">
          <div class="form-group">
            <label for="mapRenameInput">Name</label>
            <input
              id="mapRenameInput"
              v-model="renameValue"
              type="text"
              maxlength="128"
              class="scale-input"
              placeholder="Map name"
              @keyup.enter="saveRename"
              autocomplete="off"
            />
          </div>
          <p v-if="renameError" class="error-text">{{ renameError }}</p>
          <div class="scale-actions">
            <button @click="saveRename" class="save-button" :disabled="renameSaving || !renameValue.trim()">
              {{ renameSaving ? 'Saving...' : 'Save' }}
            </button>
            <button @click="closeRenameDialog" class="cancel-button">Cancel</button>
          </div>
        </div>
      </dialog>

      <!-- Delete Confirmation Dialog -->
      <dialog ref="deleteDialog" class="marker-dialog" @close="deleteError = null">
        <h3 class="dialog-title">Delete Map</h3>
        <div class="dialog-body">
          <p>Delete <strong>{{ mapData.Name }}</strong>? This removes its tiles, thumbnail, and markers permanently.</p>
          <p v-if="deleteError" class="error-text">{{ deleteError }}</p>
          <div class="scale-actions">
            <button @click="confirmDelete" class="save-button save-button--danger" :disabled="deleting">
              {{ deleting ? 'Deleting...' : 'Delete' }}
            </button>
            <button @click="closeDeleteDialog" class="cancel-button">Cancel</button>
          </div>
        </div>
      </dialog>

      <!-- Marker Dialog -->
      <dialog ref="markerDialog" class="marker-dialog" @close="onMarkerDialogClose">
        <h3 class="dialog-title">{{ editingMarker ? 'Edit Marker' : 'Add Marker' }}</h3>
        <div class="dialog-body">
          <div class="form-group">
            <label for="markerName">Name *</label>
            <input
              id="markerName"
              v-model="markerName"
              type="text"
              maxlength="64"
              class="scale-input"
              placeholder="Marker name"
              autocomplete="off"
            />
            <span class="char-count">{{ markerName.length }}/64</span>
          </div>

          <div class="form-group">
            <label for="markerNote">Note</label>
            <textarea
              id="markerNote"
              v-model="markerNote"
              maxlength="264"
              class="marker-textarea"
              rows="3"
              placeholder="Brief description (optional)"
            ></textarea>
            <span class="char-count">{{ markerNote.length }}/264</span>
          </div>

          <div class="form-group marker-type-group">
            <label>Marker Type</label>
            <div class="marker-type-selector">
              <button
                v-for="type in markerTypes"
                :key="type.value"
                type="button"
                @click="markerType = type.value"
                :class="{ selected: markerType === type.value }"
                class="marker-type-btn"
                :title="type.label"
              >
                <span class="material-symbols-outlined" :style="{ color: type.color }">
                  {{ type.icon }}
                </span>
              </button>
            </div>
          </div>

          <div class="scale-actions">
            <button @click="saveMarker" class="save-button" :disabled="markerSaving || !markerName.trim()">
              {{ markerSaving ? 'Saving...' : 'Save Marker' }}
            </button>
            <button v-if="editingMarker" @click="deleteMarker" class="delete-button" :disabled="markerSaving">
              Delete
            </button>
            <button @click="cancelMarkerDialog" class="cancel-button">
              Cancel
            </button>
          </div>
        </div>
      </dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useUserStore } from '@shared/stores/user'
import { useMapsStore } from '@shared/stores/maps'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  mapData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['scaleUpdated', 'renamed', 'deleted', 'mapRefreshed'])

const PROCESSING_POLL_INTERVAL_MS = 15000

const userStore = useUserStore()
const mapsStore = useMapsStore()

// State
const loading = ref(false)
const error = ref(null)
const mapContainer = ref(null)
let leafletMap = null
const currentZoom = ref(0)

// Admin check
const isAdmin = computed(() => userStore.isDeity)
// Free-tier sample maps are intentionally read-only for end users: no markers,
// no measure tool, no scale config. Distance-measuring and marker authorship are
// paid-tier features.
const isFreeTierMap = computed(() => props.mapData?.IsFreeTierMap === true)
const canEditMarkers = computed(() =>
  !isFreeTierMap.value && (userStore.isDM || userStore.isOwner)
)
// Realm owner or DM can configure scale, rename, and delete non-template maps they own
const canEditMap = computed(() => !props.mapData?.IsTemplate && (userStore.isDM || userStore.isOwner))
const canMeasure = computed(() => !isFreeTierMap.value)

// Scale configuration state
const showScaleConfig = ref(false)
const scaleDialog = ref(null)
const scalePixels = ref(100)
const scaleDistance = ref(50)
const scaleUnit = ref('miles')
const scaleDisplayName = ref('Miles')
const scaleSaving = ref(false)

// Rename / delete state
const renameDialog = ref(null)
const renameValue = ref('')
const renameSaving = ref(false)
const renameError = ref(null)
const deleteDialog = ref(null)
const deleting = ref(false)
const deleteError = ref(null)

// Measurement tool state
const measurementActive = ref(false)
const measurementPoints = ref([])
const measurementMarkers = ref([])
let measurementLine = null

// Map markers state (persistent markers set by admins)
const markerMode = ref(false)
const mapMarkerObjects = ref([]) // Leaflet marker objects on map
const pendingMarkerLatLng = ref(null) // Position for new marker
const editingMarker = ref(null) // Marker being edited
const markerDialog = ref(null) // Dialog ref
const markerName = ref('')
const markerNote = ref('')
const markerSaving = ref(false)
const markerType = ref('castle')

// Marker type options (Fantasy RPG theme)
const markerTypes = [
  { value: 'castle', icon: 'castle', color: '#9c27b0', label: 'Castle' },
  { value: 'village', icon: 'holiday_village', color: '#4caf50', label: 'Village' },
  { value: 'tavern', icon: 'local_bar', color: '#ff9800', label: 'Tavern' },
  { value: 'temple', icon: 'church', color: '#ffd700', label: 'Temple' },
  { value: 'danger', icon: 'skull', color: '#ff4444', label: 'Danger' },
  { value: 'treasure', icon: 'paid', color: '#ffd700', label: 'Treasure' },
  { value: 'dungeon', icon: 'door_open', color: '#666666', label: 'Dungeon' },
  { value: 'port', icon: 'anchor', color: '#4a90d9', label: 'Port' },
  { value: 'groups', icon: 'groups', color: '#3f51b5', label: 'Groups' },
  { value: 'pets', icon: 'pets', color: '#8d6e63', label: 'Pets' },
  { value: 'eco', icon: 'eco', color: '#2e7d32', label: 'Nature' },
  { value: 'sunny', icon: 'sunny', color: '#f9a825', label: 'Sunny' },
  { value: 'diamond', icon: 'diamond', color: '#00bcd4', label: 'Diamond' },
  { value: 'rainy', icon: 'rainy', color: '#607d8b', label: 'Rainy' },
  { value: 'bedtime', icon: 'bedtime', color: '#7b1fa2', label: 'Night' },
  { value: 'severe_cold', icon: 'severe_cold', color: '#4fc3f7', label: 'Cold' },
  { value: 'psychiatry', icon: 'psychiatry', color: '#e91e63', label: 'Magic' },
  { value: 'man', icon: 'man_2', color: '#795548', label: 'NPC' },
]

// Fullscreen state
const isFullscreen = ref(false)

// Draggable panel refs and state
const infoPanel = ref(null)
const measurementPanel = ref(null)
const infoPanelPosition = ref({ x: null, y: null })
const measurementPanelPosition = ref({ x: null, y: null })
let isDragging = false
let dragTarget = null
let dragOffset = { x: 0, y: 0 }

const STORAGE_KEY_INFO = 'realmforge-map-info-panel-position'
const STORAGE_KEY_MEASUREMENT = 'realmforge-map-measurement-panel-position'

// Computed styles for draggable panels
const infoPanelStyle = computed(() => {
  if (infoPanelPosition.value.x !== null && infoPanelPosition.value.y !== null) {
    return {
      left: `${infoPanelPosition.value.x}px`,
      top: `${infoPanelPosition.value.y}px`,
      right: 'auto',
      bottom: 'auto'
    }
  }
  return {}
})

const measurementPanelStyle = computed(() => {
  if (measurementPanelPosition.value.x !== null && measurementPanelPosition.value.y !== null) {
    return {
      left: `${measurementPanelPosition.value.x}px`,
      top: `${measurementPanelPosition.value.y}px`,
      right: 'auto',
      bottom: 'auto'
    }
  }
  return {}
})

// Computed properties
const hasScale = computed(() => {
  return props.mapData?.MapDimensions?.scale != null
})

const scaleDisplayNameComputed = computed(() => {
  return props.mapData?.MapDimensions?.scale?.displayName || 'units'
})

const processingState = computed(() => {
  const status = props.mapData?.Status
  if (status === 'failed') return 'failed'
  if (status === 'processing') return 'processing'
  return 'pending'
})

const calculatedDistance = computed(() => {
  if (measurementPoints.value.length < 2 || !hasScale.value) {
    return '0.00'
  }

  const referenceZoom = props.mapData.MapDimensions.scale.referenceZoom ?? leafletMap.getMaxZoom()
  const unitsPerPixel = props.mapData.MapDimensions.scale.unitsPerPixel

  let totalDistance = 0
  for (let i = 0; i < measurementPoints.value.length - 1; i++) {
    const point1 = leafletMap.project(measurementPoints.value[i], referenceZoom)
    const point2 = leafletMap.project(measurementPoints.value[i + 1], referenceZoom)
    totalDistance += point1.distanceTo(point2) * unitsPerPixel
  }

  return totalDistance.toFixed(2)
})

// Processing poll: while a map is queued/processing on the backend, re-fetch it
// from the API every 15s so the viewer can swap to the real Leaflet view as
// soon as tiles are ready. The fresh record is bubbled up to the parent so its
// selectedMap ref updates (which re-triggers our props.mapData watcher).
let processingPollTimer = null

const stopProcessingPoll = () => {
  if (processingPollTimer) {
    clearInterval(processingPollTimer)
    processingPollTimer = null
  }
}

const shouldPollProcessing = (map) =>
  !!map && !map.TileBaseUrl && map.Status !== 'failed'

const startProcessingPoll = () => {
  stopProcessingPoll()
  if (!shouldPollProcessing(props.mapData)) return

  processingPollTimer = setInterval(async () => {
    const currentId = props.mapData?.ID
    if (!currentId) {
      stopProcessingPoll()
      return
    }
    try {
      const fresh = await mapsStore.getMap(currentId, true)
      if (!fresh || fresh.ID !== props.mapData?.ID) return
      emit('mapRefreshed', fresh)
      if (!shouldPollProcessing(fresh)) {
        stopProcessingPoll()
      }
    } catch (err) {
      console.error('Error polling map processing status:', err)
    }
  }, PROCESSING_POLL_INTERVAL_MS)
}

// Methods
const cleanupMap = () => {
  if (leafletMap) {
    leafletMap.remove()
    leafletMap = null
  }
}

const initLeafletMap = async () => {
  loading.value = true
  error.value = null

  try {
    cleanupMap()
    await nextTick()

    let attempts = 0
    while (!mapContainer.value && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 50))
      attempts++
    }

    if (!mapContainer.value) {
      console.error('Map container ref not found after waiting')
      return
    }

    const mapData = props.mapData
    const { width, height, maxZoom, tileSize } = mapData.MapDimensions


    const startZoom = mapData.TileMetadata?.recommendedStartZoom ?? 1

    // Use the scaled dimensions from the maxZoom level for accurate bounds
    // The tile generation scales images at maxZoom to 2x original size
    const maxZoomLevel = mapData.TileMetadata?.zoomLevels?.find(z => z.level === maxZoom)
    const boundsWidth = maxZoomLevel?.scaledWidth ?? width
    const boundsHeight = maxZoomLevel?.scaledHeight ?? height


    const southWest = L.CRS.Simple.pointToLatLng(L.point(0, boundsHeight), maxZoom)
    const northEast = L.CRS.Simple.pointToLatLng(L.point(boundsWidth, 0), maxZoom)
    const mapBounds = L.latLngBounds(southWest, northEast)

    leafletMap = L.map(mapContainer.value, {
      crs: L.CRS.Simple,
      minZoom: 0,
      maxZoom: maxZoom || 5,
      center: mapBounds.getCenter(),
      zoom: startZoom,
      maxBounds: mapBounds,
      maxBoundsViscosity: 1.0,
      attributionControl: false
    })

    currentZoom.value = leafletMap.getZoom()

    leafletMap.on('zoomend', () => {
      currentZoom.value = leafletMap.getZoom()
    })

    const tileUrl = mapData.TileBaseUrl
    L.tileLayer(tileUrl, {
      minZoom: 0,
      maxZoom: maxZoom || 5,
      tileSize: tileSize || 512,
      noWrap: true,
      bounds: mapBounds,
      attribution: ''
    }).addTo(leafletMap)

    leafletMap.fitBounds(mapBounds)

    // Load saved markers
    loadMarkers()

  } catch (err) {
    console.error('Error initializing map:', err)
    error.value = err.message || 'Failed to load map'
  } finally {
    loading.value = false
  }
}

// Watch for map changes
watch(() => props.mapData, async (newMap, oldMap) => {
  if (newMap?.ID !== oldMap?.ID) {
    // Reset measurement state when switching maps
    if (measurementActive.value) {
      toggleMeasurement()
    }
    // Reset marker mode when switching maps
    if (markerMode.value) {
      markerMode.value = false
      leafletMap?.off('click', handleMarkerMapClick)
      leafletMap?.getContainer()?.style && (leafletMap.getContainer().style.cursor = '')
    }
    clearMapMarkers()
    scaleDialog.value?.close()
    markerDialog.value?.close()

    if (newMap && newMap.TileBaseUrl && newMap.MapDimensions) {
      stopProcessingPoll()
      await initLeafletMap()
    } else {
      cleanupMap()
      startProcessingPoll()
    }
  } else if (newMap && oldMap && !oldMap.TileBaseUrl && newMap.TileBaseUrl && newMap.MapDimensions) {
    // Same map record but tiles just finished processing — render the viewer.
    stopProcessingPoll()
    await initLeafletMap()
  }
})

// Scale configuration methods
const toggleScaleConfig = () => {
  if (showScaleConfig.value) {
    scaleDialog.value?.close()
  } else {
    // Load existing scale if available, adjusted for current zoom
    if (hasScale.value) {
      const scale = props.mapData.MapDimensions.scale
      const referenceZoom = scale.referenceZoom ?? leafletMap.getMaxZoom()
      const zoomDiff = currentZoom.value - referenceZoom
      // Pixels double/halve for each zoom level difference
      const adjustedPixels = scale.pixelsPerUnit * Math.pow(2, zoomDiff)
      scalePixels.value = Math.round(adjustedPixels * 100) / 100
      scaleDistance.value = 1
      scaleUnit.value = scale.unit
      scaleDisplayName.value = scale.displayName
    }
    scaleDialog.value?.showModal()
    showScaleConfig.value = true
  }
}

const cancelScaleConfig = () => {
  scaleDialog.value?.close()
}

const onDialogClose = () => {
  showScaleConfig.value = false
}

const updateDisplayName = () => {
  const unitMap = {
    miles: 'Miles',
    kilometers: 'Kilometers',
    leagues: 'Leagues',
    feet: 'Feet',
    meters: 'Meters'
  }

  if (scaleUnit.value !== 'custom') {
    scaleDisplayName.value = unitMap[scaleUnit.value] || scaleUnit.value
  }
}

const saveScale = async () => {
  scaleSaving.value = true

  try {
    const pixelsPerUnit = scalePixels.value / scaleDistance.value
    const unitsPerPixel = scaleDistance.value / scalePixels.value

    const scaleData = {
      pixelsPerUnit,
      unitsPerPixel,
      unit: scaleUnit.value,
      displayName: scaleDisplayName.value,
      referenceZoom: currentZoom.value
    }

    const updatedDimensions = {
      ...props.mapData.MapDimensions,
      scale: scaleData
    }

    await mapsStore.updateMap(props.mapData.ID, {
      MapDimensions: updatedDimensions
    })

    // Update local mapData
    props.mapData.MapDimensions.scale = scaleData

    emit('scaleUpdated', scaleData)

    scaleDialog.value?.close()
  } catch (err) {
    console.error('Error saving scale:', err)
    error.value = 'Failed to save scale: ' + err.message
  } finally {
    scaleSaving.value = false
  }
}

// Rename map
const openRenameDialog = () => {
  renameValue.value = props.mapData.Name || ''
  renameError.value = null
  renameDialog.value?.showModal()
}

const closeRenameDialog = () => {
  renameDialog.value?.close()
}

const saveRename = async () => {
  const trimmed = renameValue.value.trim()
  if (!trimmed || trimmed === props.mapData.Name) {
    closeRenameDialog()
    return
  }

  renameSaving.value = true
  renameError.value = null
  try {
    await mapsStore.updateMap(props.mapData.ID, { Name: trimmed })
    props.mapData.Name = trimmed
    emit('renamed', { id: props.mapData.ID, name: trimmed })
    closeRenameDialog()
  } catch (err) {
    console.error('Error renaming map:', err)
    renameError.value = err.response?.data?.message || 'Failed to rename map.'
  } finally {
    renameSaving.value = false
  }
}

// Delete map
const openDeleteDialog = () => {
  deleteError.value = null
  deleteDialog.value?.showModal()
}

const closeDeleteDialog = () => {
  deleteDialog.value?.close()
}

const confirmDelete = async () => {
  deleting.value = true
  deleteError.value = null
  try {
    await mapsStore.deleteMap(props.mapData.ID)
    emit('deleted', props.mapData.ID)
    closeDeleteDialog()
  } catch (err) {
    console.error('Error deleting map:', err)
    deleteError.value = err.response?.data?.message || 'Failed to delete map.'
  } finally {
    deleting.value = false
  }
}

// Measurement tool methods
const toggleMeasurement = () => {
  if (!hasScale.value) {
    return
  }

  measurementActive.value = !measurementActive.value

  if (measurementActive.value) {
    leafletMap.on('click', handleMapClick)
    leafletMap.getContainer().style.cursor = 'crosshair'
  } else {
    leafletMap.off('click', handleMapClick)
    leafletMap.getContainer().style.cursor = ''
    clearMeasurement()
  }
}

const handleMapClick = (e) => {
  if (!measurementActive.value) {
    return
  }

  measurementPoints.value.push(e.latlng)

  const marker = L.circleMarker(e.latlng, {
    radius: 6,
    fillColor: '#ffc581',
    color: '#fff',
    weight: 2,
    opacity: 1,
    fillOpacity: 0.8
  }).addTo(leafletMap)

  measurementMarkers.value.push(marker)

  // Update polyline to include all points
  if (measurementPoints.value.length >= 2) {
    if (measurementLine) {
      measurementLine.setLatLngs(measurementPoints.value)
    } else {
      measurementLine = L.polyline(measurementPoints.value, {
        color: '#ffc581',
        weight: 3,
        opacity: 0.8,
        dashArray: '10, 5'
      }).addTo(leafletMap)
    }
  }
}

const clearMeasurement = () => {
  measurementMarkers.value.forEach(marker => {
    if (leafletMap) {
      leafletMap.removeLayer(marker)
    }
  })
  measurementMarkers.value = []

  if (measurementLine && leafletMap) {
    leafletMap.removeLayer(measurementLine)
    measurementLine = null
  }

  measurementPoints.value = []
}

const undoLastPoint = () => {
  if (measurementPoints.value.length === 0) return

  // Remove last point
  measurementPoints.value.pop()

  // Remove last marker
  const lastMarker = measurementMarkers.value.pop()
  if (lastMarker && leafletMap) {
    leafletMap.removeLayer(lastMarker)
  }

  // Update or remove polyline
  if (measurementPoints.value.length >= 2) {
    measurementLine.setLatLngs(measurementPoints.value)
  } else if (measurementLine && leafletMap) {
    leafletMap.removeLayer(measurementLine)
    measurementLine = null
  }
}

// Map Marker functions (persistent markers set by admins)
const loadMarkers = () => {
  if (!leafletMap || !props.mapData?.Markers) return

  // Clear existing marker objects
  clearMapMarkers()

  // Create Leaflet markers for each saved marker
  props.mapData.Markers.forEach(markerData => {
    createLeafletMarker(markerData)
  })
}

const createLeafletMarker = (markerData) => {
  if (!leafletMap) return

  // Find marker type config, default to first type (castle)
  const typeConfig = markerTypes.find(t => t.value === markerData.Type) || markerTypes[0]

  const icon = L.divIcon({
    html: `<div class="marker-icon-wrapper" style="background-color: ${typeConfig.color};">
      <span class="material-symbols-outlined">${typeConfig.icon}</span>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
    className: 'map-marker-icon'
  })

  const marker = L.marker([markerData.Y, markerData.X], { icon }).addTo(leafletMap)

  // Create popup content
  const popupContent = createMarkerPopup(markerData)
  marker.bindPopup(popupContent, {
    maxWidth: 250,
    className: 'marker-popup'
  })

  // Store reference to marker data
  marker.markerData = markerData

  mapMarkerObjects.value.push(marker)
}

const createMarkerPopup = (markerData) => {
  const noteHtml = markerData.Note ? `<p class="marker-popup-note">${markerData.Note}</p>` : ''
  const editButton = canEditMarkers.value
    ? `<button class="marker-popup-btn edit-btn" onclick="window.dispatchEvent(new CustomEvent('editMarker', { detail: '${markerData.ID}' }))">Edit</button>`
    : ''

  return `
    <div class="marker-popup-content">
      <h4 class="marker-popup-title">${markerData.Name}</h4>
      ${noteHtml}
      ${editButton}
    </div>
  `
}

const clearMapMarkers = () => {
  mapMarkerObjects.value.forEach(marker => {
    if (leafletMap) {
      leafletMap.removeLayer(marker)
    }
  })
  mapMarkerObjects.value = []
}

const toggleMarkerMode = () => {
  // Turn off measurement mode if active
  if (measurementActive.value) {
    toggleMeasurement()
  }

  markerMode.value = !markerMode.value

  if (markerMode.value) {
    leafletMap.on('click', handleMarkerMapClick)
    leafletMap.getContainer().style.cursor = 'crosshair'
  } else {
    leafletMap.off('click', handleMarkerMapClick)
    leafletMap.getContainer().style.cursor = ''
  }
}

const handleMarkerMapClick = (e) => {
  if (!markerMode.value) return

  // Store position and open dialog for new marker
  pendingMarkerLatLng.value = e.latlng
  editingMarker.value = null
  markerName.value = ''
  markerNote.value = ''
  markerType.value = 'castle' // Default type for new markers
  markerDialog.value?.showModal()
}

const openEditMarkerDialog = (markerId) => {
  const markerData = props.mapData?.Markers?.find(m => m.ID === markerId)
  if (!markerData) return

  editingMarker.value = markerData
  markerName.value = markerData.Name
  markerNote.value = markerData.Note || ''
  markerType.value = markerData.Type || 'castle' // Load existing type or default
  pendingMarkerLatLng.value = null
  markerDialog.value?.showModal()
}

const onMarkerDialogClose = () => {
  pendingMarkerLatLng.value = null
  editingMarker.value = null
  markerName.value = ''
  markerNote.value = ''
  markerType.value = 'castle'
}

const cancelMarkerDialog = () => {
  markerDialog.value?.close()
}

const saveMarker = async () => {
  if (!markerName.value.trim()) return

  markerSaving.value = true

  try {
    if (editingMarker.value) {
      // Update existing marker
      const updatedMarker = await mapsStore.updateMarker(
        props.mapData.ID,
        editingMarker.value.ID,
        {
          Name: markerName.value.trim(),
          Note: markerNote.value.trim() || undefined,
          X: editingMarker.value.X,
          Y: editingMarker.value.Y,
          Type: markerType.value
        }
      )

      // Ensure Type is preserved (API may not return it)
      const markerWithType = { ...updatedMarker, Type: updatedMarker.Type || markerType.value }

      // Update local marker data and refresh display
      const index = props.mapData.Markers.findIndex(m => m.ID === editingMarker.value.ID)
      if (index >= 0) {
        props.mapData.Markers[index] = markerWithType
      }
      loadMarkers()
    } else if (pendingMarkerLatLng.value) {
      // Create new marker
      const newMarker = await mapsStore.addMarker(props.mapData.ID, {
        Name: markerName.value.trim(),
        Note: markerNote.value.trim() || undefined,
        X: pendingMarkerLatLng.value.lng,
        Y: pendingMarkerLatLng.value.lat,
        Type: markerType.value
      })

      // Ensure Type is preserved (API may not return it)
      const markerWithType = { ...newMarker, Type: newMarker.Type || markerType.value }

      // Add to local data and display
      if (!props.mapData.Markers) {
        props.mapData.Markers = []
      }
      props.mapData.Markers.push(markerWithType)
      createLeafletMarker(markerWithType)

      // Exit marker placement mode after creating a new marker
      markerMode.value = false
      leafletMap?.off('click', handleMarkerMapClick)
      if (leafletMap?.getContainer()?.style) {
        leafletMap.getContainer().style.cursor = ''
      }
    }

    markerDialog.value?.close()
  } catch (err) {
    console.error('Error saving marker:', err)
    error.value = 'Failed to save marker: ' + err.message
  } finally {
    markerSaving.value = false
  }
}

const deleteMarker = async () => {
  if (!editingMarker.value) return

  markerSaving.value = true

  try {
    await mapsStore.deleteMarker(props.mapData.ID, editingMarker.value.ID)

    // Remove from local data
    const index = props.mapData.Markers.findIndex(m => m.ID === editingMarker.value.ID)
    if (index >= 0) {
      props.mapData.Markers.splice(index, 1)
    }

    // Refresh display
    loadMarkers()
    markerDialog.value?.close()
  } catch (err) {
    console.error('Error deleting marker:', err)
    error.value = 'Failed to delete marker: ' + err.message
  } finally {
    markerSaving.value = false
  }
}

// Listen for edit marker events from popup
const handleEditMarkerEvent = (e) => {
  openEditMarkerDialog(e.detail)
}

// Fullscreen functionality
const toggleFullscreen = async () => {
  const mapViewerContent = mapContainer.value?.parentElement

  if (!mapViewerContent) return

  if (!document.fullscreenElement) {
    try {
      await mapViewerContent.requestFullscreen()
      isFullscreen.value = true
      setTimeout(() => {
        if (leafletMap) {
          leafletMap.invalidateSize()
        }
      }, 100)
    } catch (err) {
      console.error('Error attempting to enable fullscreen:', err)
    }
  } else {
    if (document.exitFullscreen) {
      await document.exitFullscreen()
      isFullscreen.value = false
      setTimeout(() => {
        if (leafletMap) {
          leafletMap.invalidateSize()
        }
      }, 100)
    }
  }
}

const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement
  if (leafletMap) {
    leafletMap.invalidateSize()
  }
}

// Draggable panel functions
const loadPanelPositions = () => {
  try {
    const infoPos = localStorage.getItem(STORAGE_KEY_INFO)
    const measurePos = localStorage.getItem(STORAGE_KEY_MEASUREMENT)

    if (infoPos) {
      infoPanelPosition.value = JSON.parse(infoPos)
    }
    if (measurePos) {
      measurementPanelPosition.value = JSON.parse(measurePos)
    }
  } catch (e) {
    console.warn('Failed to load panel positions:', e)
  }
}

const savePanelPosition = (type) => {
  try {
    if (type === 'info') {
      localStorage.setItem(STORAGE_KEY_INFO, JSON.stringify(infoPanelPosition.value))
    } else if (type === 'measurement') {
      localStorage.setItem(STORAGE_KEY_MEASUREMENT, JSON.stringify(measurementPanelPosition.value))
    }
  } catch (e) {
    console.warn('Failed to save panel position:', e)
  }
}

const validatePanelPositions = () => {
  const container = mapContainer.value?.parentElement
  if (!container) return

  const containerRect = container.getBoundingClientRect()

  // Validate info panel
  if (infoPanelPosition.value.x !== null) {
    const panel = infoPanel.value
    if (panel) {
      const panelRect = panel.getBoundingClientRect()
      let { x, y } = infoPanelPosition.value

      // Ensure panel is within viewport
      x = Math.max(0, Math.min(x, containerRect.width - panelRect.width))
      y = Math.max(0, Math.min(y, containerRect.height - panelRect.height))

      infoPanelPosition.value = { x, y }
      savePanelPosition('info')
    }
  }

  // Validate measurement panel
  if (measurementPanelPosition.value.x !== null) {
    const panel = measurementPanel.value
    if (panel) {
      const panelRect = panel.getBoundingClientRect()
      let { x, y } = measurementPanelPosition.value

      // Ensure panel is within viewport
      x = Math.max(0, Math.min(x, containerRect.width - panelRect.width))
      y = Math.max(0, Math.min(y, containerRect.height - panelRect.height))

      measurementPanelPosition.value = { x, y }
      savePanelPosition('measurement')
    }
  }
}

const startDrag = (e, type) => {
  e.preventDefault()

  const panel = type === 'info' ? infoPanel.value : measurementPanel.value
  if (!panel) return

  const panelRect = panel.getBoundingClientRect()
  const container = mapContainer.value?.parentElement
  if (!container) return

  const containerRect = container.getBoundingClientRect()

  // Get current position relative to container
  const currentX = panelRect.left - containerRect.left
  const currentY = panelRect.top - containerRect.top

  // Initialize position if not already set (first drag)
  if (type === 'info' && infoPanelPosition.value.x === null) {
    infoPanelPosition.value = { x: currentX, y: currentY }
  } else if (type === 'measurement' && measurementPanelPosition.value.x === null) {
    measurementPanelPosition.value = { x: currentX, y: currentY }
  }

  isDragging = true
  dragTarget = type

  // Calculate offset from mouse to panel top-left
  dragOffset = {
    x: e.clientX - panelRect.left,
    y: e.clientY - panelRect.top
  }

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (e) => {
  if (!isDragging || !dragTarget) return

  const container = mapContainer.value?.parentElement
  if (!container) return

  const containerRect = container.getBoundingClientRect()
  const panel = dragTarget === 'info' ? infoPanel.value : measurementPanel.value
  if (!panel) return

  const panelRect = panel.getBoundingClientRect()

  // Calculate new position: mouse position minus offset, relative to container
  let x = e.clientX - containerRect.left - dragOffset.x
  let y = e.clientY - containerRect.top - dragOffset.y

  // Constrain to container bounds
  x = Math.max(0, Math.min(x, containerRect.width - panelRect.width))
  y = Math.max(0, Math.min(y, containerRect.height - panelRect.height))

  if (dragTarget === 'info') {
    infoPanelPosition.value = { x, y }
  } else if (dragTarget === 'measurement') {
    measurementPanelPosition.value = { x, y }
  }
}

const stopDrag = () => {
  if (isDragging && dragTarget) {
    savePanelPosition(dragTarget)
  }
  isDragging = false
  dragTarget = null
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// Lifecycle
onMounted(async () => {
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  window.addEventListener('editMarker', handleEditMarkerEvent)
  window.addEventListener('resize', validatePanelPositions)

  // Load saved panel positions
  loadPanelPositions()

  if (props.mapData && props.mapData.TileBaseUrl && props.mapData.MapDimensions) {
    await initLeafletMap()
  } else if (shouldPollProcessing(props.mapData)) {
    startProcessingPoll()
  }

  // Validate positions after map is initialized
  nextTick(() => {
    validatePanelPositions()
  })
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  window.removeEventListener('editMarker', handleEditMarkerEvent)
  window.removeEventListener('resize', validatePanelPositions)
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  stopProcessingPoll()
  cleanupMap()
})
</script>

<style scoped>
.map-viewer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.error-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  gap: 1rem;
  color: rgba(255, 255, 255, 0.7);
}

.error-section .material-symbols-outlined {
  font-size: 4rem;
  color: #666;
}

.error-section h3 {
  margin: 0;
  color: var(--theme-accent);
  font-size: 1.5rem;
}

.error-text {
  color: #ff6b6b;
}

/* Processing Indicator (cartographer's compass) */
.processing-indicator {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.75rem;
  padding: 2.5rem 2rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.85);
  font-family: 'Cormorant Garamond', 'Iowan Old Style', Palatino, serif;
}

.cartographer-glyph {
  position: relative;
  width: 180px;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ripple {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--theme-accent) 55%, transparent);
  opacity: 0;
}

.processing-indicator[data-state="processing"] .ripple {
  animation: ripple-pulse 3.6s cubic-bezier(0.25, 0.6, 0.4, 1) infinite;
}
.ripple-1 { animation-delay: 0s; }
.ripple-2 { animation-delay: 1.2s; }
.ripple-3 { animation-delay: 2.4s; }

@keyframes ripple-pulse {
  0%   { transform: scale(0.55); opacity: 0; }
  18%  { opacity: 0.85; }
  100% { transform: scale(1.65); opacity: 0; }
}

.compass {
  width: 140px;
  height: 140px;
  position: relative;
  z-index: 2;
  filter: drop-shadow(0 0 18px color-mix(in srgb, var(--theme-accent) 32%, transparent));
}

.compass-ring {
  fill: color-mix(in srgb, var(--theme-bg-primary) 85%, transparent);
  stroke: var(--theme-accent);
  stroke-width: 0.7;
}
.compass-inner {
  fill: none;
  stroke: var(--theme-accent);
  stroke-width: 0.35;
  stroke-dasharray: 1.5 2;
  opacity: 0.55;
}
.compass-marks line {
  stroke: var(--theme-accent);
  stroke-width: 1.2;
  stroke-linecap: round;
}
.compass-marks line.diag {
  stroke-width: 0.7;
  opacity: 0.7;
}
.compass-letters text {
  fill: var(--theme-accent);
  font-family: 'Cinzel', 'Trajan Pro', 'Cormorant Garamond', serif;
  font-size: 7px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-anchor: middle;
  dominant-baseline: middle;
}

.compass-needle {
  transform-origin: 50% 50%;
  transform-box: view-box;
}
.needle-north { fill: var(--theme-accent); }
.needle-south { fill: color-mix(in srgb, var(--theme-accent) 35%, rgba(255,255,255,0.18)); }
.needle-pivot {
  fill: var(--theme-bg-primary);
  stroke: var(--theme-accent);
  stroke-width: 0.6;
}

.processing-indicator[data-state="processing"] .compass-needle {
  animation: needle-spin 4.5s cubic-bezier(0.5, 0.05, 0.5, 0.95) infinite;
}
.processing-indicator[data-state="pending"] .compass-needle {
  animation: needle-waver 3.2s ease-in-out infinite;
}

@keyframes needle-spin {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes needle-waver {
  0%, 100% { transform: rotate(-14deg); }
  50%      { transform: rotate(14deg);  }
}

.failed-icon { display: none; }

.processing-indicator[data-state="failed"] .compass {
  opacity: 0.32;
  filter: grayscale(0.7);
}
.processing-indicator[data-state="failed"] .failed-icon {
  display: block;
  position: absolute;
  z-index: 3;
  font-size: 64px;
  color: #ef4444;
  filter: drop-shadow(0 0 18px rgba(239, 68, 68, 0.55));
}

.cartographer-copy { max-width: 32ch; }

.cartographer-heading {
  margin: 0 0 0.6rem 0;
  font-family: 'Cinzel', 'Trajan Pro', 'Cormorant Garamond', serif;
  font-size: 1.55rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--theme-accent);
}

.cartographer-body {
  margin: 0 0 1.25rem 0;
  font-size: 0.95rem;
  font-style: italic;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.7);
}

.cartographer-status {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.35rem 0.95rem;
  border: 1px solid color-mix(in srgb, var(--theme-accent) 35%, transparent);
  border-radius: 999px;
  font-family: 'Cinzel', serif;
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--theme-accent);
  background: color-mix(in srgb, var(--theme-accent) 8%, transparent);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--theme-accent);
}
.processing-indicator[data-state="processing"] .status-dot {
  animation: status-pulse 1.4s ease-in-out infinite;
}
.processing-indicator[data-state="pending"] .status-dot { opacity: 0.5; }

.processing-indicator[data-state="failed"] .cartographer-status {
  border-color: rgba(239, 68, 68, 0.4);
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}
.processing-indicator[data-state="failed"] .status-dot { background: #ef4444; }

@keyframes status-pulse {
  0%, 100% { transform: scale(1);   opacity: 1;   }
  50%      { transform: scale(1.6); opacity: 0.4; }
}

@media (prefers-reduced-motion: reduce) {
  .ripple,
  .compass-needle,
  .status-dot {
    animation: none !important;
  }
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(10, 14, 26, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: rgba(255, 255, 255, 0.7);
  z-index: 2000;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-top-color: var(--theme-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.map-viewer-content {
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
}

.leaflet-map {
  flex: 1;
  background: #0f0f1e;
}

/* Map Info Panel */
.map-info-panel {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(26, 26, 46, 0.95);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 0.5rem;
  padding: 0.5rem;
  min-width: 220px;
  max-width: 300px;
  max-height: calc(100% - 2rem);
  overflow-y: auto;
  z-index: 1000;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.map-info-panel h3 {
  margin: 0;
  color: var(--theme-accent);
  font-size: 1.1rem;
  font-weight: 600;
  flex: 1;
}

.draggable-handle {
  cursor: grab;
  user-select: none;
}

.draggable-handle:active {
  cursor: grabbing;
}


.fullscreen-icon-button {
  background: transparent;
  color: var(--theme-accent);
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
}

.fullscreen-icon-button:hover {
  background: color-mix(in srgb, var(--theme-accent) 20%, transparent);
  color: #ffffff;
}

.fullscreen-icon-button .material-symbols-outlined {
  font-size: 1.5rem;
}

/* Panel Controls */
.panel-controls {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.control-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.3rem 0.375rem;
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  color: var(--theme-accent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 0.375rem;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-button:hover:not(:disabled) {
  background: color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-color: color-mix(in srgb, var(--theme-accent) 50%, transparent);
}

.control-button.active {
  background: color-mix(in srgb, var(--theme-accent) 25%, transparent);
  border-color: var(--theme-accent);
}

.control-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.control-button .material-symbols-outlined {
  font-size: 1.1rem;
}

.control-icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  color: var(--theme-accent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-icon-button:hover {
  background: color-mix(in srgb, var(--theme-accent) 20%, transparent);
  border-color: color-mix(in srgb, var(--theme-accent) 50%, transparent);
}

.control-icon-button.active {
  background: color-mix(in srgb, var(--theme-accent) 25%, transparent);
  border-color: var(--theme-accent);
}

.control-icon-button .material-symbols-outlined {
  font-size: 1.2rem;
}

.control-icon-button--danger {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.35);
}

.control-icon-button--danger:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.6);
}

.save-button--danger {
  background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
}

.save-button--danger:hover:not(:disabled) {
  background: linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%);
}

/* Scale Configuration Dialog */
.scale-config-dialog {
  background: rgba(26, 26, 46, 0.98);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 0.5rem;
  padding: 0;
  width: 60vw;
  max-height: 90vh;
  overflow: hidden;
  color: white;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.6);
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
}

.scale-config-dialog[open] {
  display: flex;
  flex-direction: column;
}

.scale-config-dialog::backdrop {
  background: color-mix(in srgb, var(--theme-bg-primary) 50%, transparent);
}

.dialog-title {
  margin: 0;
  padding: 1rem 1.5rem;
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  color: var(--theme-accent);
  font-size: 1.1rem;
  flex-shrink: 0;
}

.dialog-body {
  padding: 1rem 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.panel-description {
  margin: 0 0 0.75rem 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
}

.scale-config-form > * {
  margin-bottom: 0.75rem;
}

.scale-config-form > *:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 0.25rem;
  color: var(--theme-accent);
  font-size: 0.9rem;
  font-weight: 500;
}

.scale-input {
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.25rem;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
}

.scale-input:focus {
  outline: none;
  border-color: var(--theme-accent);
  background: rgba(255, 255, 255, 0.08);
}

.scale-select {
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.25rem;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
  cursor: pointer;
}

.scale-select:focus {
  outline: none;
  border-color: var(--theme-accent);
}

.scale-select option {
  background: #1a1a2e;
  color: rgba(255, 255, 255, 0.9);
}

.scale-preview {
  padding: 0.75rem;
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 0.25rem;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
}

.scale-preview strong {
  color: var(--theme-accent);
}

.scale-actions {
  display: flex;
  gap: 0.5rem;
}

.save-button {
  flex: 1;
  padding: 0.75rem;
  background: var(--theme-accent);
  color: #1a1a2e;
  border: none;
  border-radius: 0.25rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.save-button:hover:not(:disabled) {
  background: rgb(255, 220, 170);
}

.save-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cancel-button {
  flex: 1;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.25rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-button:hover {
  background: rgba(255, 255, 255, 0.15);
}

/* Measurement Panel */
.measurement-panel {
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  background: rgba(26, 26, 46, 0.98);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 0.5rem;
  padding: 1rem;
  min-width: 220px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.measurement-panel h3 {
  margin: 0 0 0.75rem 0;
  color: var(--theme-accent);
  font-size: 1rem;
}

.measurement-instruction {
  margin: 0 0 0.75rem 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  font-style: italic;
}

.measurement-result {
  padding: 0.75rem;
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 0.25rem;
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.1rem;
  margin-bottom: 0.75rem;
}

.measurement-result strong {
  color: var(--theme-accent);
}

.clear-button {
  width: 100%;
  padding: 0.5rem;
  background: rgba(255, 107, 107, 0.2);
  color: #ff6b6b;
  border: 1px solid rgba(255, 107, 107, 0.4);
  border-radius: 0.25rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-button:hover {
  background: rgba(255, 107, 107, 0.3);
  border-color: #ff6b6b;
}

.measurement-stats {
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
}

.point-count {
  color: rgba(255, 255, 255, 0.7);
}

.measurement-buttons {
  display: flex;
  gap: 0.5rem;
}

.measurement-buttons .clear-button {
  flex: 1;
}

.undo-button {
  flex: 1;
  padding: 0.5rem;
  background: color-mix(in srgb, var(--theme-accent) 20%, transparent);
  color: var(--theme-accent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 40%, transparent);
  border-radius: 0.25rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.undo-button:hover {
  background: color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-color: var(--theme-accent);
}

/* Marker Dialog */
.marker-dialog {
  background: rgba(26, 26, 46, 0.98);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 0.5rem;
  padding: 0;
  width: 400px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  color: white;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.6);
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
}

.marker-dialog[open] {
  display: flex;
  flex-direction: column;
}

.marker-dialog::backdrop {
  background: color-mix(in srgb, var(--theme-bg-primary) 50%, transparent);
}

.marker-dialog .form-group {
  margin-bottom: 1rem;
  position: relative;
}

.marker-dialog .scale-input {
  width: 100%;
  box-sizing: border-box;
}

.marker-textarea {
  width: 100%;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.25rem;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
}

.marker-textarea:focus {
  outline: none;
  border-color: var(--theme-accent);
  background: rgba(255, 255, 255, 0.08);
}

.char-count {
  position: absolute;
  right: 0;
  bottom: -1.25rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.delete-button {
  flex: 1;
  padding: 0.75rem;
  background: rgba(255, 107, 107, 0.2);
  color: #ff6b6b;
  border: 1px solid rgba(255, 107, 107, 0.4);
  border-radius: 0.25rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.delete-button:hover:not(:disabled) {
  background: rgba(255, 107, 107, 0.3);
  border-color: #ff6b6b;
}

.delete-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.marker-type-group {
  margin-bottom: 1rem;
}

.marker-type-group label {
  display: block;
  margin-bottom: 0.5rem;
}

.marker-type-selector {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.marker-type-btn {
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.marker-type-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.4);
}

.marker-type-btn.selected {
  border-color: var(--theme-accent);
  background: color-mix(in srgb, var(--theme-accent) 20%, transparent);
}

.marker-type-btn .material-symbols-outlined {
  font-size: 1.5rem;
}
</style>

<!-- Global styles for Leaflet popups (not scoped) -->
<style>
.marker-popup .leaflet-popup-content-wrapper {
  background: rgba(26, 26, 46, 0.98);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-radius: 0.5rem;
  color: white;
}

.marker-popup .leaflet-popup-tip {
  background: rgba(26, 26, 46, 0.98);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.marker-popup .leaflet-popup-close-button {
  color: rgba(255, 255, 255, 0.7);
}

.marker-popup .leaflet-popup-close-button:hover {
  color: var(--theme-accent);
}

.marker-popup-content {
  padding: 0.25rem;
}

.marker-popup-title {
  margin: 0 0 0.5rem 0;
  color: var(--theme-accent);
  font-size: 1rem;
  font-weight: 600;
}

.marker-popup-note {
  margin: 0 0 0.75rem 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  line-height: 1.4;
}

.marker-popup-btn {
  padding: 0.4rem 0.75rem;
  background: color-mix(in srgb, var(--theme-accent) 20%, transparent);
  color: var(--theme-accent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 40%, transparent);
  border-radius: 0.25rem;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.marker-popup-btn:hover {
  background: color-mix(in srgb, var(--theme-accent) 30%, transparent);
  border-color: var(--theme-accent);
}

/* Map marker icon (divIcon) */
.map-marker-icon {
  background: transparent;
  border: none;
}

.marker-icon-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
}

.marker-icon-wrapper .material-symbols-outlined {
  transform: rotate(45deg);
  color: white;
  font-size: 18px;
}
</style>
