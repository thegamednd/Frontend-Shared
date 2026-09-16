<template>
  <div class="tracker-settings">
    <nav class="breadcrumb">
      <router-link to="/account/active-realm" class="breadcrumb-link">
        <span class="material-symbols-outlined">arrow_back</span>
        Active Realm
      </router-link>
    </nav>

    <header class="page-header">
      <h1><span class="material-symbols-outlined">token</span> Tracker</h1>
      <div class="tracker-intro">
        <p>
          The Game was built for long campaigns where players drift in and out between sessions.
          Rather than explain every absence, the setting added magic items, pendants at first,
          that let a character join or leave the party whenever a player can or cannot make it.
          Those items run on charges, and the whole group shares one pool.
        </p>
        <p>
          This tracker keeps that pool in view on the home page as a number over the pendant.
          It starts red when charges are low and warms to gold as they climb.
        </p>
        <p class="tracker-howto">
          Only the DM and the realm owner can change it. Double-click the number, type the new
          value and press <kbd>Enter</kbd>. <kbd>Esc</kbd> cancels. Everyone in the realm sees
          the new count within a second.
        </p>
        <p>If your realm uses some other trinket, change the label below.</p>
      </div>
    </header>

    <section v-if="!realmStore.isOwner" class="notice">
      Only the realm owner can change these settings.
    </section>

    <template v-else>
      <section class="card">
        <h2>Display</h2>
        <label class="toggle-row">
          <ToggleSwitch v-model="form.enabled" />
          <span>Show the tracker on the home page</span>
        </label>
        <label class="field">
          <span class="field-label">Label</span>
          <input v-model="form.label" type="text" :maxlength="TRACKER_LABEL_MAX" class="text-input" placeholder="Pendant Charges" />
          <span class="field-hint">{{ form.label.trim().length }} / {{ TRACKER_LABEL_MAX }}</span>
        </label>
        <div class="actions">
          <button class="btn-primary" :disabled="savingSettings || !settingsDirty" @click="saveSettings">
            {{ savingSettings ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </section>

      <section class="card media-card">
        <h2>Intro video</h2>
        <p class="card-desc">Plays once when the home page opens, then fades to the final image. MP4, 10 seconds or shorter. It will be cropped to {{ TRACKER_WIDTH }}×{{ TRACKER_HEIGHT }}.</p>
        <div class="media-row">
          <video class="media-preview" :src="videoUrl" :key="videoUrl" muted playsinline controls preload="metadata"></video>
          <div class="media-controls">
            <input ref="videoInput" type="file" accept="video/mp4" class="file-input" @change="onVideoChosen" />
            <button class="btn-secondary" :disabled="busyVideo" @click="videoInput.click()">
              <span class="material-symbols-outlined">upload</span> {{ busyVideo ? videoStatus : 'Choose MP4' }}
            </button>
            <button v-if="tracker.VideoFile" class="btn-link" :disabled="busyVideo" @click="resetVideo">Use default</button>
            <p v-if="videoError" class="field-error">{{ videoError }}</p>
          </div>
        </div>
      </section>

      <section class="card media-card">
        <h2>Final image</h2>
        <p class="card-desc">Shown behind the number after the video ends. Any image; it will be cropped to {{ TRACKER_WIDTH }}×{{ TRACKER_HEIGHT }} and saved as JPG.</p>
        <div class="media-row">
          <img class="media-preview" :src="imageUrl" :key="imageUrl" alt="" />
          <div class="media-controls">
            <input ref="imageInput" type="file" accept="image/*" class="file-input" @change="onImageChosen" />
            <button class="btn-secondary" :disabled="busyImage" @click="imageInput.click()">
              <span class="material-symbols-outlined">upload</span> {{ busyImage ? 'Uploading…' : 'Choose image' }}
            </button>
            <button v-if="tracker.ImageFile" class="btn-link" :disabled="busyImage" @click="resetImage">Use default</button>
            <p v-if="imageError" class="field-error">{{ imageError }}</p>
          </div>
        </div>
      </section>

      <section class="card preview-card">
        <h2>Preview</h2>
        <p class="tracker-label">{{ form.label.trim() || 'Pendant Charges' }}</p>
        <RealmTracker :key="previewKey" preview />
        <button class="btn-link" @click="previewKey++">Replay intro</button>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import apiClient from '@shared/utils/api';
import { useRealmStore } from '@shared/stores/realm';
import { useNotifications } from '@shared/composables/useNotifications';
import RealmTracker from '@shared/components/widgets/RealmTracker.vue';
import ToggleSwitch from '@shared/components/widgets/ToggleSwitch.vue';
import {
  DEFAULT_TRACKER, TRACKER_LABEL_MAX, MAX_VIDEO_SECONDS, MAX_VIDEO_BYTES, TRACKER_WIDTH, TRACKER_HEIGHT,
  trackerVideoUrl, trackerImageUrl, validateLabel, readVideoDuration,
} from '@shared/utils/tracker';

const realmStore = useRealmStore();
const { notifySuccess, notifyError } = useNotifications();

const realmId = computed(() => realmStore.activeRealmId);
const tracker = computed(() => realmStore.activeRealm?.Tracker || DEFAULT_TRACKER);
const videoUrl = computed(() => trackerVideoUrl(realmId.value, tracker.value));
const imageUrl = computed(() => trackerImageUrl(realmId.value, tracker.value));

const form = reactive({ enabled: tracker.value.Enabled, label: tracker.value.Label });
// Watch Enabled and Label as separate sources (not a single getter returning
// an array): a getter that builds a new array on every recompute would never
// be reference-equal to its previous value, so it would fire on ANY tracker
// change (e.g. a media upload/reset) and clobber an unsaved edit.
watch(
  [() => tracker.value.Enabled, () => tracker.value.Label],
  ([enabled, label]) => { form.enabled = enabled; form.label = label; },
);
const settingsDirty = computed(() => form.enabled !== tracker.value.Enabled || form.label.trim() !== tracker.value.Label);

const savingSettings = ref(false);
const busyVideo = ref(false);
const videoStatus = ref('');
const videoError = ref('');
const busyImage = ref(false);
const imageError = ref('');
const videoInput = ref(null);
const imageInput = ref(null);
const previewKey = ref(0);

async function saveSettings() {
  const check = validateLabel(form.label);
  if (!check.ok) { notifyError(check.error); return; }
  savingSettings.value = true;
  try {
    const { data } = await apiClient.put(`/realms/realm/${realmId.value}/tracker`, { Enabled: form.enabled, Label: check.value });
    realmStore.setTracker(realmId.value, data);
    notifySuccess('Tracker settings saved.');
  } catch (err) {
    console.error(err);
    notifyError('Could not save tracker settings.');
  } finally {
    savingSettings.value = false;
  }
}

async function onVideoChosen(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  videoError.value = '';

  if (file.type !== 'video/mp4') { videoError.value = 'Please choose an MP4 file.'; return; }
  if (file.size > MAX_VIDEO_BYTES) { videoError.value = 'That file is over 60 MB.'; return; }
  let seconds;
  try { seconds = await readVideoDuration(file); } catch (err) { videoError.value = err.message; return; }
  if (seconds > MAX_VIDEO_SECONDS) {
    videoError.value = `That video is ${seconds.toFixed(1)} seconds. It must be ${MAX_VIDEO_SECONDS} seconds or shorter.`;
    return;
  }

  busyVideo.value = true;
  try {
    videoStatus.value = 'Uploading…';
    const { data: { uploadUrl, key } } = await apiClient.get(`/tracker-media/${realmId.value}/upload-url`);
    const uploadResponse = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'video/mp4' }, body: file });
    if (!uploadResponse.ok) throw new Error(`Upload failed (${uploadResponse.status})`);
    videoStatus.value = 'Converting…';
    const { data } = await apiClient.post(`/tracker-media/${realmId.value}/video`, { key });
    realmStore.setTracker(realmId.value, { VideoFile: data.filename });
    previewKey.value++;
    notifySuccess('Intro video saved.');
  } catch (err) {
    console.error(err);
    const code = err?.response?.data?.code;
    videoError.value = code === 'VIDEO_TOO_LONG' ? `The video must be ${MAX_VIDEO_SECONDS} seconds or shorter.` : 'Could not process that video.';
  } finally {
    busyVideo.value = false;
    videoStatus.value = '';
  }
}

async function resetVideo() {
  busyVideo.value = true;
  try {
    await apiClient.delete(`/tracker-media/${realmId.value}/video`);
    realmStore.setTracker(realmId.value, { VideoFile: undefined });
    previewKey.value++;
    notifySuccess('Intro video reset to default.');
  } catch (err) {
    console.error(err);
    notifyError('Could not reset the video.');
  } finally {
    busyVideo.value = false;
  }
}

function downsizeToJpeg(file, maxEdge = 1024) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL('image/jpeg', 0.92).split(',')[1]);
    };
    img.onerror = () => reject(new Error('That file is not an image.'));
    img.src = URL.createObjectURL(file);
  });
}

async function onImageChosen(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  imageError.value = '';
  busyImage.value = true;
  try {
    const imageBase64 = await downsizeToJpeg(file);
    const { data } = await apiClient.put(`/tracker-media/${realmId.value}/image`, { imageBase64, imageMimeType: 'image/jpeg' });
    realmStore.setTracker(realmId.value, { ImageFile: data.filename });
    previewKey.value++;
    notifySuccess('Final image saved.');
  } catch (err) {
    console.error(err);
    imageError.value = err?.message?.includes('not an image') ? err.message : 'Could not process that image.';
  } finally {
    busyImage.value = false;
  }
}

async function resetImage() {
  busyImage.value = true;
  try {
    await apiClient.delete(`/tracker-media/${realmId.value}/image`);
    realmStore.setTracker(realmId.value, { ImageFile: undefined });
    previewKey.value++;
    notifySuccess('Final image reset to default.');
  } catch (err) {
    console.error(err);
    notifyError('Could not reset the image.');
  } finally {
    busyImage.value = false;
  }
}
</script>

<style scoped>
.tracker-settings { max-width: 720px; margin: 0 auto; padding: 1rem; }
.breadcrumb-link { display: inline-flex; align-items: center; gap: 0.3rem; color: var(--theme-accent); text-decoration: none; font-size: 0.85rem; }
.page-header h1 { display: flex; align-items: center; gap: 0.5rem; margin: 0.75rem 0 0.25rem; }
.page-desc, .card-desc { color: var(--theme-text-secondary); font-size: 0.85rem; margin: 0 0 0.75rem; }
.tracker-intro { max-width: 62ch; margin: 0 0 1.25rem; color: var(--theme-text-secondary); font-size: 0.9rem; line-height: 1.55; }
.tracker-intro p { margin: 0 0 0.6rem; }
.tracker-intro .tracker-howto { color: var(--theme-text-primary); padding-left: 0.75rem; border-left: 2px solid var(--theme-accent); }
.tracker-intro kbd { font: inherit; font-size: 0.8em; padding: 0.05em 0.4em; border: 1px solid color-mix(in srgb, var(--theme-accent) 45%, transparent); border-bottom-width: 2px; border-radius: 0.25rem; background: rgba(0, 0, 0, 0.25); }
.notice { padding: 1rem; border: 1px solid var(--theme-border-ornate); border-radius: 0.5rem; color: var(--theme-text-secondary); }
.card { border: 1px solid var(--theme-border-ornate); border-radius: 0.5rem; padding: 1rem; margin-top: 1rem; background: var(--card-background, rgba(0,0,0,0.35)); }
.card h2 { font-size: 1rem; margin: 0 0 0.5rem; }
.toggle-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
.field { display: flex; flex-direction: column; gap: 0.25rem; }
.field-label { font-size: 0.8rem; color: var(--theme-text-secondary); }
.field-hint { font-size: 0.7rem; color: var(--theme-text-secondary); align-self: flex-end; }
.field-error { color: #ff9a8a; font-size: 0.8rem; margin: 0.25rem 0 0; }
.text-input { padding: 0.5rem 0.65rem; border-radius: 0.4rem; border: 1px solid var(--theme-border-ornate); background: rgba(0,0,0,0.3); color: var(--theme-text-primary); font-size: 1rem; }
.actions { display: flex; justify-content: flex-end; margin-top: 0.75rem; }
.btn-primary, .btn-secondary { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.5rem 0.9rem; border-radius: 0.4rem; border: 1px solid var(--theme-accent); background: transparent; color: var(--theme-accent); cursor: pointer; font-size: 0.9rem; }
.btn-primary { background: var(--theme-accent); color: #1a1610; }
.btn-primary:disabled, .btn-secondary:disabled { opacity: 0.5; cursor: default; }
.btn-link { background: none; border: none; color: var(--theme-text-secondary); text-decoration: underline; cursor: pointer; font-size: 0.8rem; padding: 0.25rem 0; }
.file-input { display: none; }
.media-row { display: flex; gap: 1rem; align-items: flex-start; }
.media-preview { width: 138px; height: 158px; object-fit: cover; border-radius: 0.4rem; background: #000; flex-shrink: 0; }
.media-controls { display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start; }
.preview-card { display: flex; flex-direction: column; align-items: center; }
.preview-card h2 { align-self: flex-start; }
.tracker-label { font-family: 'Cinzel', serif; letter-spacing: 0.08em; text-transform: uppercase; font-size: 0.75rem; color: var(--theme-accent); margin: 0 0 0.5rem; }

@media (max-width: 480px) {
  .media-row { flex-direction: column; align-items: center; }
  .media-controls { align-items: center; }
  .actions { justify-content: stretch; }
  .btn-primary { width: 100%; justify-content: center; }
}
</style>
