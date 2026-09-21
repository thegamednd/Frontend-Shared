<template>
    <figure
        class="realm-tracker"
        :class="{
            'is-lit': count > 0,
            'is-saving': saving,
            'has-error': !!errorMessage,
            'can-edit': canEdit,
            'intro-complete': introComplete,
        }"
        :style="numeralStyle(count)"
        :title="canEdit ? (editing ? 'Enter to save, Esc to cancel' : 'Double-click to edit') : label"
    >
        <video
            v-if="showVideo"
            ref="videoEl"
            class="tracker-video"
            :src="videoUrl"
            autoplay
            muted
            playsinline
            @loadedmetadata="onVideoLoaded"
            @ended="onVideoEnded"
            @error="onVideoError"
        />
        <img
            class="tracker-image"
            :class="{ 'is-hidden': showVideo }"
            :src="imageUrl"
            :alt="label"
            draggable="false"
        />
        <input
            v-if="editing"
            ref="inputEl"
            v-model.number="draft"
            type="number"
            min="0"
            step="1"
            inputmode="numeric"
            class="charge-input"
            @keydown.enter.prevent="commit"
            @keydown.esc.prevent="cancel"
            @blur="commit"
        />
        <span v-else class="charge-numeral" @dblclick="beginEdit">{{ count }}</span>
        <figcaption v-if="errorMessage" class="charge-error">{{ errorMessage }}</figcaption>
    </figure>
</template>

<script setup>
import { ref, computed, inject, onMounted, onBeforeUnmount, nextTick } from 'vue';
import apiClient from '@shared/utils/api';
import { useRealmStore } from '@shared/stores/realm';
import { useWebSocket } from '@shared/composables/useWebSocket';
import { trackerVideoUrl, trackerImageUrl, numeralStyle, DEFAULT_TRACKER } from '@shared/utils/tracker';

const props = defineProps({
    // Settings-page mode: always plays the intro, never edits, no WebSocket.
    preview: { type: Boolean, default: false },
    // Skip the intro video and show the finished state (image + numeral).
    intro: { type: Boolean, default: true },
});

const realmStore = useRealmStore();
const { connect: wsConnect, disconnect: wsDisconnect } = useWebSocket();

const realmId = computed(() => realmStore.activeRealmId);
const tracker = computed(() => realmStore.activeRealm?.Tracker || DEFAULT_TRACKER);
const count = computed(() => Number.isInteger(tracker.value.Count) && tracker.value.Count >= 0 ? tracker.value.Count : 0);
const label = computed(() => tracker.value.Label || DEFAULT_TRACKER.Label);
const videoUrl = computed(() => trackerVideoUrl(realmId.value, tracker.value));
const imageUrl = computed(() => trackerImageUrl(realmId.value, tracker.value));
const canEdit = computed(() => !props.preview && (realmStore.isOwner || realmStore.isRealmDM));

const trackerPlayed = props.preview ? ref(false) : inject('trackerPlayed', ref(false));
const showVideo = ref(props.intro && !trackerPlayed.value);
const introComplete = ref(!props.intro || trackerPlayed.value);
const videoEl = ref(null);
const inputEl = ref(null);
const editing = ref(false);
const saving = ref(false);
const draft = ref(0);
const errorMessage = ref('');
let errorTimer = null;

function onVideoLoaded() {
    if (videoEl.value) videoEl.value.playbackRate = 2;
}

function onVideoEnded() {
    if (introComplete.value) return;
    showVideo.value = false;
    introComplete.value = true;
    trackerPlayed.value = true;
}

function onVideoError(event) {
    const v = event?.target;
    if (!v || v.readyState < 2) onVideoEnded();
}

function flashError(message) {
    errorMessage.value = message;
    clearTimeout(errorTimer);
    errorTimer = setTimeout(() => (errorMessage.value = ''), 3000);
}

function beginEdit() {
    if (!canEdit.value || saving.value) return;
    draft.value = count.value;
    errorMessage.value = '';
    editing.value = true;
    nextTick(() => {
        inputEl.value?.focus();
        inputEl.value?.select();
    });
}

async function commit() {
    if (!editing.value) return;
    if (draft.value === '' || draft.value === null || draft.value === undefined
        || (typeof draft.value === 'string' && draft.value.trim() === '')) {
        editing.value = false;
        return;
    }
    const next = Math.trunc(Number(draft.value));
    editing.value = false;

    if (!Number.isInteger(next) || next < 0) {
        flashError('Must be a whole number, zero or greater.');
        return;
    }
    if (next === count.value) return;

    const previous = count.value;
    saving.value = true;
    realmStore.setTracker(realmId.value, { Count: next });
    try {
        await apiClient.put(`/realms/realm/${realmId.value}/tracker/count`, { count: next });
    } catch (error) {
        console.warn('Failed to save tracker count:', error);
        realmStore.setTracker(realmId.value, { Count: previous });
        flashError('Could not save. Try again.');
    } finally {
        saving.value = false;
    }
}

function cancel() {
    editing.value = false;
    errorMessage.value = '';
}

function handleBroadcast(message) {
    if (message?.type !== 'trackerUpdate' || message.realmId !== realmId.value) return;
    if (editing.value || saving.value) return;
    const next = Number(message.count);
    if (Number.isInteger(next) && next >= 0) {
        realmStore.setTracker(realmId.value, { Count: next });
    }
}

onMounted(() => {
    if (!props.preview && realmId.value) {
        wsConnect(`tracker:${realmId.value}`, handleBroadcast);
    }
});

onBeforeUnmount(() => {
    if (!props.preview) wsDisconnect();
    clearTimeout(errorTimer);
});
</script>

<style scoped>
.realm-tracker {
    position: relative;
    margin: 0;
    padding: 0;
    width: 160px;
    aspect-ratio: 138 / 158;
    user-select: none;
    border-radius: 14px;
    background: linear-gradient(160deg, #2a1a0e 0%, #150a04 100%);
    box-shadow:
        0 12px 24px rgba(0, 0, 0, 0.6),
        0 4px 8px rgba(0, 0, 0, 0.45),
        0 0 24px rgba(212, 175, 55, 0.18),
        inset 0 0 0 1px rgba(255, 240, 200, 0.5),
        inset 0 0 0 4px #6a4a18,
        inset 0 0 0 5px #d4af37,
        inset 0 0 0 8px #6a4a18,
        inset 0 0 0 9px rgba(255, 240, 200, 0.35);
    transition: box-shadow 500ms ease;
}

.realm-tracker.is-lit {
    box-shadow:
        0 12px 28px rgba(0, 0, 0, 0.6),
        0 4px 10px rgba(0, 0, 0, 0.45),
        0 0 36px rgba(255, 197, 129, 0.45),
        0 0 70px rgba(212, 175, 55, 0.18),
        inset 0 0 0 1px rgba(255, 240, 200, 0.65),
        inset 0 0 0 4px #6a4a18,
        inset 0 0 0 5px #ffd98a,
        inset 0 0 0 8px #6a4a18,
        inset 0 0 0 9px rgba(255, 240, 200, 0.5);
}

.tracker-image,
.tracker-video {
    display: block;
    width: 100%;
    height: 100%;
    padding: 11px;
    box-sizing: border-box;
    object-fit: cover;
    border-radius: 14px;
    pointer-events: none;
}

.tracker-video {
    position: absolute;
    inset: 0;
    background: transparent;
}

.tracker-image {
    transition: opacity 600ms ease, filter 400ms ease;
}

.tracker-image.is-hidden {
    opacity: 0;
    transition: none;
}

.realm-tracker.is-lit .tracker-image {
    filter: drop-shadow(0 0 8px rgba(255, 197, 129, 0.35));
}

.realm-tracker:not(.intro-complete) .charge-numeral {
    opacity: 0;
}

.charge-numeral,
.charge-input {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-family: 'Cinzel', 'Trajan Pro', 'Times New Roman', serif;
    font-weight: 700;
    font-size: 2.6rem;
    line-height: 1;
    letter-spacing: 0.02em;
    color: var(--numeral-color, #9aa1a8);
    text-shadow:
        0 0 6px var(--numeral-glow-1, transparent),
        0 0 14px var(--numeral-glow-2, transparent),
        0 0 22px var(--numeral-glow-3, transparent),
        0 1px 0 rgba(0, 0, 0, 0.55);
    mix-blend-mode: screen;
    transform: translateY(0.125em);
    transition: color 400ms ease, text-shadow 400ms ease, opacity 600ms ease, transform 200ms ease;
}

.charge-numeral {
    cursor: default;
}

.realm-tracker.can-edit .charge-numeral {
    cursor: text;
}

.realm-tracker.can-edit:hover .charge-numeral {
    transform: translateY(0.125em) scale(1.04);
}

.realm-tracker.is-saving .charge-numeral {
    animation: charge-pulse 0.9s ease-in-out infinite;
}

@keyframes charge-pulse {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.45); }
}

.charge-input {
    inset: auto;
    top: 50%;
    left: 50%;
    width: 4ch;
    display: block;
    place-items: unset;
    transform: translate(-50%, calc(-50% + 0.125em));
    background: transparent;
    border: none;
    border-bottom: 1px dashed currentColor;
    text-align: center;
    caret-color: var(--numeral-color, #ffc581);
    outline: none;
    padding: 0;
    -moz-appearance: textfield;
    appearance: textfield;
}

.charge-input::-webkit-outer-spin-button,
.charge-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.charge-error {
    position: absolute;
    left: 50%;
    bottom: -1.6em;
    transform: translateX(-50%);
    white-space: nowrap;
    font-size: 0.75rem;
    color: #ff9a8a;
    font-style: italic;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
    pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
    .realm-tracker.is-saving .charge-numeral { animation: none; }
}
</style>
