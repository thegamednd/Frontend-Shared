<template>
    <div id="scribePlatform">
        <h2>{{ features.scribeName }}</h2>

        <!-- Permission check -->
        <div v-if="!userStore.loaded" id="animLoading">
            <div v-for="index in 10" :key="index" class="wave"></div>
        </div>

        <div v-else-if="!canAccess" class="noAccess">
            <p>You do not have permission to access {{ features.scribeName }}.</p>
            <p>Only the DM or realm owner can use this feature.</p>
        </div>

        <div v-else class="scribeContent">

            <!-- Wallet Bar -->
            <div v-if="scribeStore.walletBalance !== null" class="creditBar">
                <span>{{ features.scribeName }} Wallet: <strong>{{ formatWalletBalance() }}</strong></span>
                <button class="btn-small" @click="showAddFundsModal = true">Add Funds</button>
            </div>

            <!-- IDLE STATE -->
            <div v-if="state === 'idle'" class="idlePanel">
                <div class="startSection">
                    <p>Record a game session, and {{ features.scribeName }} will transcribe and chronicle your adventures.</p>
                    <div class="startButtons">
                        <button class="btn-primary" @click="beginSession">
                            <span class="material-symbols-outlined">mic</span>
                            Start Session
                        </button>
                        <button class="btn-secondary" @click="fileInput?.click()">
                            <span class="material-symbols-outlined">upload_file</span>
                            Upload Recording
                        </button>
                        <input
                            ref="fileInput"
                            type="file"
                            accept="audio/*"
                            style="display: none"
                            @change="handleFileSelected"
                        />
                    </div>
                </div>

                <div v-if="scribeStore.sessions.length" class="pastSessions">
                    <h3>Past Sessions</h3>
                    <div
                        v-for="session in scribeStore.sessions"
                        :key="session.sessionId"
                        class="sessionItem"
                        @click="openSession(session)"
                    >
                        <span class="sessionDate">{{ formatDate(session.createdAt) }}</span>
                        <span v-if="session.userName" class="sessionUser">{{ session.userName }}</span>
                        <span :class="['sessionStatus', session.status]">{{ session.status }}</span>
                        <span v-if="session.audioDurationSeconds" class="sessionDuration">
                            {{ formatDuration(session.audioDurationSeconds) }}
                        </span>
                        <span v-if="showSessionCost(session)" class="sessionCost">
                            ~{{ getSessionCost(session) }}
                        </span>
                        <span v-if="session.inferredMeta?.summary" class="sessionSummary">
                            {{ session.inferredMeta.summary }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- RECORDING STATE -->
            <div v-if="state === 'recording'" class="recordingPanel">
                <div v-if="recorder.isPaused.value" class="pausedIndicator">
                    <span class="material-symbols-outlined pausedIcon">pause_circle</span>
                    Paused
                </div>
                <div v-else class="recordingIndicator">
                    <span class="recordingDot"></span>
                    Recording
                </div>
                <div class="timer">{{ formatDuration(recorder.duration.value) }}</div>
                <div class="chunkStatus">
                    Chunks uploaded: {{ chunksUploaded }}
                    <span v-if="scribeStore.uploading" class="uploadingIndicator">uploading...</span>
                </div>
                <div class="recordingActions">
                    <button v-if="!recorder.isPaused.value" class="btn-secondary" @click="pauseSession">
                        <span class="material-symbols-outlined">pause</span>
                        Pause
                    </button>
                    <button v-else class="btn-primary" @click="resumeSession">
                        <span class="material-symbols-outlined">play_arrow</span>
                        Resume
                    </button>
                    <button class="btn-danger" @click="endSession">
                        <span class="material-symbols-outlined">stop</span>
                        End Session
                    </button>
                </div>
                <p v-if="recorder.error.value" class="errorText">{{ recorder.error.value }}</p>
            </div>

            <!-- UPLOADING STATE -->
            <div v-if="state === 'uploading'" class="uploadingPanel">
                <div class="uploadingIndicatorLarge">
                    <span class="material-symbols-outlined">{{ scribeStore.isSplitting ? 'content_cut' : 'upload_file' }}</span>
                    {{ scribeStore.isSplitting ? 'Splitting audio...' : 'Uploading Recording...' }}
                </div>
                <div class="progressBar">
                    <div class="progressFill" :style="{ width: scribeStore.uploadProgress + '%' }"></div>
                </div>
                <div class="progressText">{{ scribeStore.uploadProgress }}%</div>
            </div>

            <!-- UPLOADED STATE -->
            <div v-if="state === 'uploaded'" class="uploadedPanel">
                <div class="uploadedIndicator">
                    <span class="material-symbols-outlined">cloud_done</span>
                    Audio Uploaded
                </div>
                <p v-if="scribeStore.currentSession?.audioDurationSeconds">
                    Audio duration: {{ formatDuration(scribeStore.currentSession.audioDurationSeconds) }}
                    — Estimated cost: <strong>{{ currentSessionCost }}</strong>
                </p>
                <p v-else>{{ scribeStore.currentSession?.chunkCount || 0 }} audio chunk(s) ready for processing.
                    — Estimated cost: <strong>{{ currentSessionCost }}</strong>
                </p>

                <div class="costEstimate">
                    <p>
                        <span v-if="scribeStore.walletBalance !== null">
                            Balance: {{ formatWalletBalance() }}
                        </span>
                    </p>
                    <p v-if="insufficientFunds" class="errorText">
                        Insufficient funds.
                        <button class="btn-small" @click="showAddFundsModal = true">Add Funds</button>
                    </p>
                </div>

                <div class="uploadedActions">
                    <button
                        class="btn-primary"
                        @click="handleProcessSession"
                        :disabled="insufficientFunds"
                    >
                        <span class="material-symbols-outlined">play_arrow</span>
                        Process Recording
                    </button>
                    <button class="btn-primary" @click="handleDownload" :disabled="isDownloading">
                        <span class="material-symbols-outlined">download</span>
                        <template v-if="isPreparing">Processing ({{ formatMss(elapsedSeconds) }}<template v-if="prepareEstimate"> / ~{{ formatMss(prepareEstimate) }}</template>)<span class="dots-anim"></span></template>
                        <template v-else-if="isDownloading">Downloading<span class="dots-anim"></span></template>
                        <template v-else>Download Audio</template>
                    </button>
                    <button class="btn-primary" @click="backToIdle">
                        <span class="material-symbols-outlined">arrow_back</span>
                        Back to Sessions
                    </button>
                    <button class="btn-danger" @click="openDeleteModal">
                        <span class="material-symbols-outlined">delete_forever</span>
                        Delete Session
                    </button>
                </div>
            </div>

            <!-- PROCESSING STATE -->
            <div v-if="state === 'processing'" class="processingPanel">
                <div id="animLoading">
                    <div v-for="index in 10" :key="index" class="wave"></div>
                </div>
                <div class="processingStatus">
                    <p v-if="scribeStore.currentSession?.status === 'processing'">
                        Preparing audio...
                    </p>
                    <p v-else-if="scribeStore.currentSession?.status === 'transcribing'">
                        Transcribing session...
                    </p>
                    <p v-else-if="scribeStore.currentSession?.status === 'generating'">
                        {{ features.scribeName }} is chronicling your adventures...
                    </p>
                    <p v-else>
                        Processing...
                    </p>
                </div>
                <button class="btn-secondary" @click="backToIdle">Back to Sessions</button>
            </div>

            <!-- REVIEW STATE -->
            <div v-if="state === 'review'" class="reviewPanel">
                <h3>Review &amp; Publish</h3>
                <div class="reviewStage">
                    <div class="reviewForm">
                        <label>
                            <span>From:</span>
                            <span class="date">
                                <input type="number" v-model="reportData.year" min="1" />
                                -
                                <select v-model="reportData.month">
                                    <option v-for="(month, index) in dateStore.arMonths" :key="index" :value="index">
                                        {{ month.Name }}
                                    </option>
                                </select>
                                -
                                <input type="number" v-model="reportData.dom" min="1"
                                    :max="dateStore.arMonths[reportData.month]?.Days || 31" />
                            </span>
                        </label>
                        <label>
                            <span>Until:</span>
                            <span class="date">
                                <input type="number" v-model="reportData.year_end" :min="reportData.year" />
                                -
                                <select v-model="reportData.month_end">
                                    <option v-for="(month, index) in dateStore.arMonths" :key="index" :value="index">
                                        {{ month.Name }}
                                    </option>
                                </select>
                                -
                                <input type="number" v-model="reportData.dom_end" min="1"
                                    :max="dateStore.arMonths[reportData.month_end]?.Days || 31" />
                            </span>
                        </label>
                        <label>
                            <span>Characters:</span>
                            <span>
                                <VueMultiselect
                                    v-model="reportData.characters"
                                    :options="characterStore.characterList"
                                    :multiple="true"
                                    label="Name"
                                    track-by="ID"
                                    placeholder="Search for characters..."
                                    selectLabel=""
                                />
                            </span>
                        </label>
                        <label>
                            <span>Ending:</span>
                            <span>
                                <textarea v-model="reportData.endingAt" maxlength="256" style="resize: none;"></textarea>
                            </span>
                        </label>
                    </div>
                    <div class="reportEditor">
                        <InlineEditor
                            :content="reportData.report"
                            @update-content="reportData.report = $event"
                        />
                    </div>
                </div>
                <div class="reviewActions">
                    <button class="btn-primary" @click="publishReport">
                        <span class="material-symbols-outlined">publish</span>
                        Publish Report
                    </button>
                    <button class="btn-primary" @click="saveDraft" :disabled="isSaving">
                        <span class="material-symbols-outlined">save</span>
                        {{ saveButtonLabel }}
                    </button>
                    <button class="btn-primary" @click="handleDownload" :disabled="isDownloading">
                        <span class="material-symbols-outlined">download</span>
                        <template v-if="isPreparing">Processing ({{ formatMss(elapsedSeconds) }}<template v-if="prepareEstimate"> / ~{{ formatMss(prepareEstimate) }}</template>)<span class="dots-anim"></span></template>
                        <template v-else-if="isDownloading">Downloading<span class="dots-anim"></span></template>
                        <template v-else>Download Audio</template>
                    </button>
                    <button class="btn-primary" @click="backToIdle">
                        <span class="material-symbols-outlined">arrow_back</span>
                        Back to Sessions
                    </button>
                    <button class="btn-danger" @click="openDeleteModal">
                        <span class="material-symbols-outlined">delete_forever</span>
                        Delete Session
                    </button>
                </div>
            </div>

            <!-- PUBLISHED STATE -->
            <div v-if="state === 'published'" class="publishedPanel">
                <h3>Report Published</h3>
                <p>Your session report has been published successfully.</p>
                <div class="publishedActions">
                    <router-link
                        v-if="scribeStore.currentSession?.publishedReportId"
                        :to="`/reports/report/${scribeStore.currentSession.publishedReportId}`"
                        class="btn-primary"
                    >
                        View Report
                    </router-link>
                    <button class="btn-primary" @click="revertToReview">
                        <span class="material-symbols-outlined">undo</span>
                        Revert to Review
                    </button>
                    <button class="btn-secondary" @click="backToIdle">Back to Sessions</button>
                </div>
            </div>

            <!-- FAILED STATE -->
            <div v-if="state === 'failed'" class="failedPanel">
                <h3>Processing Failed</h3>
                <p class="errorText">{{ scribeStore.currentSession?.error || 'An unknown error occurred.' }}</p>
                <p v-if="scribeStore.currentSession?.creditDeducted" class="costNote">
                    Funds were already charged. Retry is free.
                </p>
                <button class="btn-primary" @click="handleProcessSession">
                    <span class="material-symbols-outlined">refresh</span>
                    Retry Processing
                </button>
                <button class="btn-secondary" @click="backToIdle">Back to Sessions</button>
            </div>

            <!-- Add Funds Modal -->
            <div v-if="showAddFundsModal" class="purchaseOverlay" @click.self="closeAddFundsModal">
                <ScribeAddFunds @close="closeAddFundsModal" />
            </div>

            <!-- Mic Selection Dialog -->
            <dialog ref="micDialogRef" class="mic-modal" @close="onMicDialogClose">
                <div class="mic-modal-header">
                    <h4>Select Microphone</h4>
                    <button class="btn-close" @click="micDialogRef?.close()">&times;</button>
                </div>
                <div class="mic-modal-body">
                    <label
                        v-for="(mic, index) in availableMics"
                        :key="mic.deviceId"
                        class="mic-option"
                    >
                        <input
                            type="radio"
                            name="mic"
                            :value="mic.deviceId"
                            v-model="selectedMicId"
                        />
                        {{ mic.label || `Microphone ${index + 1}` }}
                    </label>
                </div>
                <div class="mic-modal-actions">
                    <button class="btn-primary" @click="micDialogRef?.close()">Cancel</button>
                    <button class="btn-primary" @click="confirmMicSelection">
                        <span class="material-symbols-outlined">mic</span>
                        Start Recording
                    </button>
                </div>
            </dialog>

            <!-- Activity Check Dialog -->
            <dialog ref="activityDialogRef" class="guard-modal">
                <div class="guard-modal-header">
                    <h4>Session Check</h4>
                </div>
                <div class="guard-modal-body">
                    <p>Your recording session is still running. Is it still in progress?</p>
                </div>
                <div class="guard-modal-actions">
                    <button class="btn-danger" @click="guard.handleEndFromDialog()">
                        <span class="material-symbols-outlined">stop</span>
                        End Session
                    </button>
                    <button class="btn-primary" @click="guard.handleKeepRecording()">
                        <span class="material-symbols-outlined">schedule</span>
                        Alert in 1 Hour
                    </button>
                </div>
            </dialog>

            <!-- Pause Check Dialog -->
            <dialog ref="pauseDialogRef" class="guard-modal">
                <div class="guard-modal-header">
                    <h4>Session Paused</h4>
                </div>
                <div class="guard-modal-body">
                    <p>Your session has been paused. Would you like to continue recording?</p>
                </div>
                <div class="guard-modal-actions">
                    <button class="btn-primary" @click="handleResumeFromPauseDialog">
                        <span class="material-symbols-outlined">play_arrow</span>
                        Continue Recording
                    </button>
                    <button class="btn-secondary" @click="guard.handleSnoozePause()">
                        <span class="material-symbols-outlined">snooze</span>
                        Snooze 15 Minutes
                    </button>
                </div>
            </dialog>

            <!-- Silence Detection Dialog -->
            <dialog ref="silenceDialogRef" class="guard-modal">
                <div class="guard-modal-header">
                    <h4>No Audio Detected</h4>
                </div>
                <div class="guard-modal-body">
                    <p>No sound has been detected for 30 seconds. Your microphone may not be working.</p>
                    <p class="silence-hint">Select a different microphone or dismiss this alert.</p>
                    <div class="silence-mic-list">
                        <label
                            v-for="(mic, index) in availableMics"
                            :key="mic.deviceId"
                            class="mic-option"
                        >
                            <input
                                type="radio"
                                name="silenceMic"
                                :value="mic.deviceId"
                                v-model="selectedMicId"
                            />
                            {{ mic.label || `Microphone ${index + 1}` }}
                        </label>
                    </div>
                </div>
                <div class="guard-modal-actions">
                    <button class="btn-primary" @click="handleSilenceSwitchMic">
                        <span class="material-symbols-outlined">mic</span>
                        Switch Mic
                    </button>
                    <button class="btn-secondary" @click="handleSilenceDismiss">
                        <span class="material-symbols-outlined">close</span>
                        Dismiss
                    </button>
                </div>
            </dialog>

            <!-- Silence Auto-Paused Dialog -->
            <dialog ref="silencePausedDialogRef" class="guard-modal">
                <div class="guard-modal-header">
                    <h4>Recording Paused</h4>
                </div>
                <div class="guard-modal-body">
                    <p>Your session has been automatically paused because no audio was detected.</p>
                </div>
                <div class="guard-modal-actions guard-modal-actions-single">
                    <button class="btn-primary" @click="handleSilencePausedResume">
                        <span class="material-symbols-outlined">play_arrow</span>
                        Resume Recording
                    </button>
                </div>
            </dialog>

            <!-- Delete Confirmation Dialog -->
            <dialog ref="deleteDialog" class="delete-modal" @close="onDeleteDialogClose">
                <div class="delete-modal-header">
                    <h4>Delete Session</h4>
                    <button class="btn-close" @click="deleteDialog?.close()">&times;</button>
                </div>
                <div class="delete-modal-body">
                    <p>This will permanently delete this session and all associated audio data.</p>
                    <p class="warning-text">This action cannot be undone.</p>
                    <p>If you haven't already, download the audio before deleting:</p>
                    <button class="btn-primary" @click="handleDownload" :disabled="isDownloading">
                        <span class="material-symbols-outlined">download</span>
                        <template v-if="isPreparing">Processing ({{ formatMss(elapsedSeconds) }}<template v-if="prepareEstimate"> / ~{{ formatMss(prepareEstimate) }}</template>)<span class="dots-anim"></span></template>
                        <template v-else-if="isDownloading">Downloading<span class="dots-anim"></span></template>
                        <template v-else>Download Audio</template>
                    </button>
                    <div class="delete-confirm-block">
                        <label class="delete-confirm-label">
                            <input
                                type="checkbox"
                                v-model="deleteConfirmChecked"
                                class="delete-confirm-checkbox"
                            />
                            I understand this action cannot be undone
                        </label>
                    </div>
                </div>
                <div class="delete-modal-actions">
                    <button class="btn-primary" @click="deleteDialog?.close()">Cancel</button>
                    <button
                        class="btn-danger"
                        @click="handleDeleteSession"
                        :disabled="!deleteConfirmChecked || isDeleting"
                    >
                        <span class="material-symbols-outlined">delete_forever</span>
                        {{ isDeleting ? 'Deleting...' : 'Delete Session' }}
                    </button>
                </div>
            </dialog>
        </div>
    </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { features } from '@shared/config/features';
import { useUserStore } from '@/stores/user';
import { useScribeStore } from '@/stores/scribe';
import { useCharacterStore } from '@/stores/character';
import { useRealmStore } from '@/stores/realm';
import { useDateStore } from '@/stores/date';
import { useAudioRecorder } from '@/composables/useAudioRecorder';
import { useSessionGuard } from '@/composables/useSessionGuard';
import { estimateCost, estimateCostFromChunks, formatCost } from '@/utils/scribeCost';
import VueMultiselect from 'vue-multiselect';
import 'vue-multiselect/dist/vue-multiselect.css';
import InlineEditor from '@/components/cms/InlineEditor.vue';
import ScribeAddFunds from '@/components/scribe/ScribeAddFunds.vue';
import { downloadSessionAudio } from '@/utils/audioDownloader';

const userStore = useUserStore();
const scribeStore = useScribeStore();
const characterStore = useCharacterStore();
const realmStore = useRealmStore();
const dateStore = useDateStore();
const recorder = useAudioRecorder();

const activityDialogRef = ref(null);
const pauseDialogRef = ref(null);
const silenceDialogRef = ref(null);
const silencePausedDialogRef = ref(null);

const guard = useSessionGuard({
    isRecording: recorder.isRecording,
    isPaused: recorder.isPaused,
    isSilent: recorder.isSilent,
    duration: recorder.duration,
    onEndSession: () => endSession(),
    onPauseSession: () => pauseSession(),
    getSessionId: () => scribeStore.currentSession?.sessionId,
});

const chunksUploaded = ref(0);
const fileInput = ref(null);
const isUploading = ref(false);
const showAddFundsModal = ref(false);
const isDownloading = ref(false);
const isPreparing = ref(false);
const prepareEstimate = ref(0);
const elapsedSeconds = ref(0);
let prepareTimer = null;
const deleteDialog = ref(null);
const deleteConfirmChecked = ref(false);
const isDeleting = ref(false);
const isSaving = ref(false);
const saveButtonLabel = ref('Save Draft');
const micDialogRef = ref(null);
const availableMics = ref([]);
const selectedMicId = ref(localStorage.getItem('preferredMicId') || '');
let sessionPollInterval = null;
let listPollInterval = null;
let pendingUpload = null;

const reportData = ref({
    author: null,
    dom: 1,
    dom_end: 1,
    endingAt: '',
    characters: [],
    month: 0,
    month_end: 0,
    report: '',
    year: 1,
    year_end: 1,
});

// Access check: user must be DM or realm owner
const canAccess = computed(() => {
    return realmStore.isRealmDM || realmStore.isOwner;
});

const hasActiveSessions = computed(() =>
    scribeStore.sessions.some(s =>
        ['processing', 'transcribing', 'generating'].includes(s.status)
    )
);

const state = computed(() => {
    if (isUploading.value) return 'uploading';

    const session = scribeStore.currentSession;
    if (!session) return 'idle';

    switch (session.status) {
        case 'recording': return 'recording';
        case 'uploaded': return 'uploaded';
        case 'processing':
        case 'transcribing':
        case 'generating':
            return 'processing';
        case 'review': return 'review';
        case 'published': return 'published';
        case 'failed': return 'failed';
        default: return 'idle';
    }
});

const currentSessionCost = computed(() => {
    const session = scribeStore.currentSession;
    if (!session) return formatCost(0);
    if (session.audioDurationSeconds) {
        return formatCost(estimateCost(session.audioDurationSeconds));
    }
    return formatCost(estimateCostFromChunks(session.chunkCount || 0));
});

const insufficientFunds = computed(() => {
    if (scribeStore.walletBalance === null) return false;
    const session = scribeStore.currentSession;
    if (!session || session.creditDeducted) return false;
    const cost = session.audioDurationSeconds
        ? estimateCost(session.audioDurationSeconds)
        : estimateCostFromChunks(session.chunkCount || 0);
    return scribeStore.walletBalance < cost;
});

onMounted(async () => {
    await Promise.all([
        scribeStore.listSessions(),
        scribeStore.getWallet().catch(() => {}),
    ]);
});

onUnmounted(() => {
    stopSessionPolling();
    stopListPolling();
});

// Poll a single session when user is viewing the processing spinner
watch(state, (newState) => {
    if (newState === 'processing') {
        startSessionPolling();
    } else {
        stopSessionPolling();
    }

    if (newState === 'review') {
        populateReviewForm();
    }
});

// Poll the full list every 60s while any session is actively processing
watch(hasActiveSessions, (active) => {
    if (active) {
        startListPolling();
    } else {
        stopListPolling();
    }
}, { immediate: true });

function startSessionPolling() {
    if (sessionPollInterval) return;
    sessionPollInterval = setInterval(async () => {
        if (scribeStore.currentSession?.sessionId) {
            await scribeStore.getSession(scribeStore.currentSession.sessionId);
        }
    }, 5000);
}

function stopSessionPolling() {
    if (sessionPollInterval) {
        clearInterval(sessionPollInterval);
        sessionPollInterval = null;
    }
}

function startListPolling() {
    if (listPollInterval) return;
    listPollInterval = setInterval(async () => {
        await scribeStore.listSessions();
    }, 60000);
}

function stopListPolling() {
    if (listPollInterval) {
        clearInterval(listPollInterval);
        listPollInterval = null;
    }
}

function populateReviewForm() {
    const session = scribeStore.currentSession;
    if (!session) return;

    reportData.value.report = session.draftReport || '';

    const meta = session.inferredMeta;
    const hasSavedMeta = meta && (meta.dom !== undefined || meta.characters !== undefined);

    if (hasSavedMeta) {
        // Restore previously saved metadata
        if (meta.year !== undefined) reportData.value.year = meta.year;
        if (meta.year_end !== undefined) reportData.value.year_end = meta.year_end;
        if (meta.month !== undefined) reportData.value.month = meta.month;
        if (meta.month_end !== undefined) reportData.value.month_end = meta.month_end;
        if (meta.dom !== undefined) reportData.value.dom = meta.dom;
        if (meta.dom_end !== undefined) reportData.value.dom_end = meta.dom_end;
        if (meta.endingAt !== undefined) reportData.value.endingAt = meta.endingAt;

        // Restore saved character IDs by matching to realm characters
        if (meta.characters?.length) {
            const matched = meta.characters
                .map(id => characterStore.characterList.find(c => c.ID === id))
                .filter(Boolean);
            if (matched.length) {
                reportData.value.characters = matched;
            }
        }

    } else {
        // First time in review — use AI-inferred defaults
        if (meta) {
            if (meta.players?.length) {
                const matched = meta.players
                    .map(name => characterStore.characterList.find(c =>
                        c.Name?.toLowerCase() === name.toLowerCase()
                    ))
                    .filter(Boolean);
                if (matched.length) {
                    reportData.value.characters = matched;
                }
            }

            if (meta.ending) {
                reportData.value.endingAt = meta.ending;
            }
        }

        // Default dates from date store
        reportData.value.year = dateStore.date.y;
        reportData.value.year_end = dateStore.date.y;
        reportData.value.month = dateStore.date.m;
        reportData.value.month_end = dateStore.date.m;
        reportData.value.dom = dateStore.date.d;
        reportData.value.dom_end = dateStore.date.d;

    }
}

async function beginSession() {
    try {
        // Request temporary permission so enumerateDevices returns labels
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach(t => t.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter(d => d.kind === 'audioinput');
        availableMics.value = mics;

        // Pre-select saved device if still present, otherwise first
        const saved = localStorage.getItem('preferredMicId');
        if (saved && mics.some(m => m.deviceId === saved)) {
            selectedMicId.value = saved;
        } else if (mics.length) {
            selectedMicId.value = mics[0].deviceId;
        }

        if (mics.length <= 1) {
            // Single mic (or none) — skip dialog, start directly
            await startRecordingWithMic(mics[0]?.deviceId || null);
        } else {
            // Multiple mics — show selection dialog
            micDialogRef.value?.showModal();
        }
    } catch (err) {
        console.error('Failed to start session:', err);
    }
}

async function confirmMicSelection() {
    micDialogRef.value?.close();
    localStorage.setItem('preferredMicId', selectedMicId.value);
    await startRecordingWithMic(selectedMicId.value);
}

function onMicDialogClose() {
    // No-op; cancel simply closes without starting
}

async function startRecordingWithMic(deviceId) {
    try {
        chunksUploaded.value = 0;
        const userName = userStore.user?.username || userStore.displayName || 'Unknown';
        const session = await scribeStore.startSession(userName);

        recorder.onChunkReady((blob, chunkIndex) => {
            const uploadPromise = scribeStore.uploadChunk(session.sessionId, chunkIndex, blob)
                .then(() => { chunksUploaded.value = chunkIndex + 1; })
                .catch(err => { console.error('Failed to upload chunk:', err); });
            pendingUpload = uploadPromise;
        });

        await recorder.startRecording(deviceId);
    } catch (err) {
        console.error('Failed to start recording:', err);
    }
}

async function endSession() {
    const sessionId = scribeStore.currentSession?.sessionId;

    // stopRecording resolves after the final dataavailable event fires,
    // which triggers the chunk upload via onChunkReady callback.
    await recorder.stopRecording();

    // Wait for any in-flight chunk upload to complete before ending the session.
    if (pendingUpload) {
        await pendingUpload;
    }

    if (sessionId) {
        const duration = recorder.duration.value;
        await scribeStore.endSession(sessionId, duration > 0 ? { audioDurationSeconds: duration } : undefined);
        await scribeStore.getSession(sessionId);
    }
}

function pauseSession() {
    recorder.pauseRecording();
}

function resumeSession() {
    recorder.resumeRecording();
}

function handleResumeFromPauseDialog() {
    guard.handleResumeFromPause();
    resumeSession();
}

async function refreshMicList() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        availableMics.value = devices.filter(d => d.kind === 'audioinput');
    } catch {
        // Keep existing list
    }
}

async function handleSilenceSwitchMic() {
    if (!selectedMicId.value) return;
    try {
        localStorage.setItem('preferredMicId', selectedMicId.value);
        await recorder.switchMicrophone(selectedMicId.value);
        guard.handleSilenceDismiss();
    } catch (err) {
        console.error('Failed to switch microphone:', err);
    }
}

function handleSilenceDismiss() {
    guard.handleSilenceDismiss();
    recorder.resetSilenceDetection();
}

function handleSilencePausedResume() {
    guard.handleSilencePausedResume();
    resumeSession();
}

// Open/close guard dialogs via showModal/close
watch(() => guard.showActivityDialog.value, (show) => {
    if (show) activityDialogRef.value?.showModal();
    else activityDialogRef.value?.close();
});

watch(() => guard.showPauseDialog.value, (show) => {
    if (show) pauseDialogRef.value?.showModal();
    else pauseDialogRef.value?.close();
});

watch(() => guard.showSilenceDialog.value, async (show) => {
    if (show) {
        await refreshMicList();
        silenceDialogRef.value?.showModal();
    } else {
        silenceDialogRef.value?.close();
    }
});

watch(() => guard.showSilencePausedDialog.value, (show) => {
    if (show) silencePausedDialogRef.value?.showModal();
    else silencePausedDialogRef.value?.close();
});

async function openSession(session) {
    await scribeStore.getSession(session.sessionId);
}

async function publishReport() {
    const sessionId = scribeStore.currentSession?.sessionId;
    if (!sessionId) return;

    const data = {
        Author: reportData.value.author?.ID || null,
        Year: Number(reportData.value.year),
        Dates: {
            Start: {
                Y: Number(reportData.value.year),
                M: Number(reportData.value.month),
                D: Number(reportData.value.dom),
            },
            End: {
                Y: Number(reportData.value.year_end),
                M: Number(reportData.value.month_end),
                D: Number(reportData.value.dom_end),
            },
        },
        Characters: reportData.value.characters.map(c => c.ID || c),
        Report: reportData.value.report,
        Sanitized: reportData.value.report,
        EndingAt: reportData.value.endingAt,
    };

    await scribeStore.publishReport(sessionId, data);
}

async function saveDraft() {
    const sessionId = scribeStore.currentSession?.sessionId;
    if (!sessionId) return;

    const data = {
        author: reportData.value.author?.ID || null,
        report: reportData.value.report,
        characters: reportData.value.characters.map(c => c.ID || c),
        dom: Number(reportData.value.dom),
        month: Number(reportData.value.month),
        year: Number(reportData.value.year),
        dom_end: Number(reportData.value.dom_end),
        month_end: Number(reportData.value.month_end),
        year_end: Number(reportData.value.year_end),
        endingAt: reportData.value.endingAt,
    };

    try {
        isSaving.value = true;
        await scribeStore.saveDraft(sessionId, data);
        saveButtonLabel.value = 'Saved!';
        setTimeout(() => { saveButtonLabel.value = 'Save Draft'; }, 2000);
    } catch (err) {
        console.error('Failed to save draft:', err);
    } finally {
        isSaving.value = false;
    }
}

async function handleProcessSession() {
    const sessionId = scribeStore.currentSession?.sessionId;
    if (!sessionId) return;

    try {
        await scribeStore.processSession(sessionId);
    } catch (err) {
        // Handle 402 Insufficient Funds
        if (err.response?.status === 402) {
            await scribeStore.getWallet().catch(() => {});
            scribeStore.error = 'Insufficient funds to process this recording.';
        } else {
            console.error('Failed to trigger processing:', err);
        }
    }
}

async function handleDownload() {
    const sessionId = scribeStore.currentSession?.sessionId;
    if (!sessionId) return;

    try {
        isDownloading.value = true;
        isPreparing.value = false;
        prepareEstimate.value = 0;
        elapsedSeconds.value = 0;
        await downloadSessionAudio(sessionId, scribeStore, (chunkCount) => {
            isPreparing.value = true;
            if (chunkCount > 0) {
                const audioDuration = chunkCount * 30;
                prepareEstimate.value = Math.ceil(audioDuration / 20) + 60;
            }
            prepareTimer = setInterval(() => {
                elapsedSeconds.value++;
            }, 1000);
        });
    } catch (err) {
        console.error('Failed to download audio:', err);
        scribeStore.error = 'Failed to download audio.';
    } finally {
        if (prepareTimer) {
            clearInterval(prepareTimer);
            prepareTimer = null;
        }
        isDownloading.value = false;
        isPreparing.value = false;
    }
}

function openDeleteModal() {
    deleteConfirmChecked.value = false;
    nextTick(() => { deleteDialog.value?.showModal(); });
}

function onDeleteDialogClose() {
    deleteConfirmChecked.value = false;
}

async function handleDeleteSession() {
    const sessionId = scribeStore.currentSession?.sessionId;
    if (!sessionId) return;

    try {
        isDeleting.value = true;
        await scribeStore.deleteSession(sessionId);
        deleteDialog.value?.close();
        scribeStore.clearCurrentSession();
        await scribeStore.listSessions();
    } catch (err) {
        console.error('Failed to delete session:', err);
    } finally {
        isDeleting.value = false;
    }
}

async function handleFileSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset file input so the same file can be re-selected
    event.target.value = '';

    if (!file.type.startsWith('audio/')) {
        scribeStore.error = 'Please select an audio file.';
        return;
    }

    try {
        isUploading.value = true;
        const userName = userStore.user?.username || userStore.displayName || 'Unknown';
        await scribeStore.uploadRecording(userName, file);
    } catch (err) {
        console.error('Failed to upload recording:', err);
    } finally {
        isUploading.value = false;
    }
}

async function revertToReview() {
    const sessionId = scribeStore.currentSession?.sessionId;
    if (!sessionId) return;
    await scribeStore.revertToReview(sessionId);
}

function backToIdle() {
    scribeStore.clearCurrentSession();
    scribeStore.listSessions();
}

function closeAddFundsModal() {
    showAddFundsModal.value = false;
    scribeStore.getWallet().catch(() => {});
}

function formatWalletBalance() {
    const balance = scribeStore.walletBalance ?? 0;
    return `$${balance.toFixed(2)} USD`;
}

function showSessionCost(session) {
    return (session.status === 'uploaded' || session.status === 'failed') && !session.creditDeducted;
}

function getSessionCost(session) {
    if (session.audioDurationSeconds) {
        return formatCost(estimateCost(session.audioDurationSeconds));
    }
    return formatCost(estimateCostFromChunks(session.chunkCount || 0));
}

function formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts = [];
    if (h > 0) parts.push(String(h).padStart(2, '0'));
    parts.push(String(m).padStart(2, '0'));
    parts.push(String(s).padStart(2, '0'));
    return parts.join(':');
}

function formatMss(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}
</script>

<style scoped>
@import '@/assets/css/loadanim.css';

#scribePlatform {
    padding: 1em;
    max-width: 1200px;
    margin: 0 auto;
}

#scribePlatform h2 {
    color: gold;
    text-align: center;
    margin-bottom: 1em;
}

.noAccess {
    text-align: center;
    color: bisque;
    padding: 2em;
}

.scribeContent {
    color: bisque;
}

/* Credit Bar */
.creditBar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1em;
    padding: 0.6em 1em;
    background: rgba(76, 31, 51, 0.4);
    border: 1px solid rgba(212, 175, 55, 0.4);
    border-radius: 0.5em;
    margin-bottom: 1em;
    color: var(--theme-accent);
}

.creditBar strong {
    color: gold;
}

/* IDLE */
.startSection {
    text-align: center;
    padding: 2em;
}

.startSection p {
    margin-bottom: 1.5em;
    font-size: 1.1em;
}

.btn-primary {
    background: #4c1f33;
    color: gold;
    border: 1px outset gold;
    padding: 0.8em 1.5em;
    font-size: 1em;
    cursor: pointer;
    border-radius: 0.5em;
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    text-decoration: none;
}

.btn-primary:hover:not(:disabled) {
    background: #6a2d48;
}

.btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-secondary {
    background: var(--theme-bg-surface);
    color: bisque;
    border: 1px outset var(--theme-accent);
    padding: 0.6em 1.2em;
    font-size: 1em;
    cursor: pointer;
    border-radius: 0.5em;
    margin-top: 1em;
}

.btn-secondary:hover {
    background: #242e4a;
}

.btn-danger {
    background: #6b1a1a;
    color: gold;
    border: 1px outset gold;
    padding: 0.8em 1.5em;
    font-size: 1em;
    cursor: pointer;
    border-radius: 0.5em;
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    text-decoration: none;
}

.btn-danger:hover:not(:disabled) {
    background: #8b2a2a;
}

.btn-danger:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-small {
    background: #4c1f33;
    color: gold;
    border: 1px outset gold;
    padding: 0.3em 0.8em;
    font-size: 0.85em;
    cursor: pointer;
    border-radius: 0.3em;
}

.btn-small:hover {
    background: #6a2d48;
}

/* Past Sessions */
.pastSessions {
    margin-top: 2em;
}

.pastSessions h3 {
    color: var(--theme-accent);
    border-bottom: 1px solid var(--theme-accent);
    padding-bottom: 0.3em;
    margin-bottom: 0.5em;
}

.sessionItem {
    display: grid;
    grid-template-columns: auto auto auto auto 1fr;
    gap: 1em;
    padding: 0.6em 0.8em;
    background: color-mix(in srgb, var(--theme-bg-surface) 60%, transparent);
    border: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
    border-radius: 0.3em;
    margin-bottom: 0.3em;
    cursor: pointer;
    align-items: center;
}

.sessionItem:hover {
    background: color-mix(in srgb, var(--theme-bg-surface) 90%, transparent);
    border-color: gold;
}

.sessionUser {
    font-size: 0.85em;
    color: #d4af37;
}

.sessionDate {
    font-size: 0.9em;
    color: #aaa;
}

.sessionStatus {
    font-size: 0.8em;
    padding: 0.2em 0.5em;
    border-radius: 0.3em;
    text-transform: uppercase;
    font-weight: bold;
}

.sessionStatus.recording { background: #6b1a1a; color: #ff6b6b; }
.sessionStatus.processing,
.sessionStatus.transcribing,
.sessionStatus.generating { background: #4a3f1a; color: #ffd700; }
.sessionStatus.review { background: #1a4a2a; color: #6bff6b; }
.sessionStatus.published { background: #1a2a4a; color: #6b9fff; }
.sessionStatus.uploaded { background: #4a3a1a; color: #daa520; }
.sessionStatus.failed { background: #4a1a1a; color: var(--theme-danger); }

.sessionDuration {
    font-size: 0.85em;
    color: #aaa;
    font-family: monospace;
}

.sessionCost {
    font-size: 0.85em;
    color: #d4af37;
    font-family: monospace;
}

.sessionSummary {
    font-size: 0.85em;
    color: #ccc;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* RECORDING */
.recordingPanel {
    text-align: center;
    padding: 2em;
}

.recordingActions {
    display: flex;
    gap: 1em;
    justify-content: center;
    flex-wrap: wrap;
    align-items: center;
    margin-top: 1em;
}

.recordingIndicator {
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    font-size: 1.2em;
    color: #ff6b6b;
    margin-bottom: 1em;
}

.recordingDot {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--theme-danger);
    animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
}

.timer {
    font-size: 3em;
    font-family: monospace;
    color: gold;
    margin: 0.5em 0;
}

.chunkStatus {
    font-size: 0.9em;
    color: #aaa;
    margin-bottom: 1em;
}

.uploadingIndicator {
    color: #ffd700;
    margin-left: 0.5em;
}

/* UPLOADED */
.uploadedPanel {
    text-align: center;
    padding: 2em;
}

.uploadedIndicator {
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    font-size: 1.3em;
    color: #daa520;
    margin-bottom: 1em;
}

.uploadedPanel p {
    color: #ccc;
    margin-bottom: 1.5em;
}

.costEstimate {
    margin-bottom: 1.5em;
    padding: 0.8em;
    background: rgba(76, 31, 51, 0.3);
    border: 1px solid rgba(212, 175, 55, 0.3);
    border-radius: 0.5em;
    display: inline-block;
}

.costEstimate p {
    margin: 0.3em 0;
}

.costEstimate strong {
    color: gold;
}

.uploadedActions {
    display: flex;
    gap: 1em;
    justify-content: center;
    flex-wrap: wrap;
    align-items: center;
}

/* PROCESSING */
.processingPanel {
    text-align: center;
    padding: 2em;
}

.processingStatus p {
    font-size: 1.2em;
    color: var(--theme-accent);
    margin-top: 1em;
}

/* REVIEW */
.reviewPanel h3 {
    background: var(--theme-bg-surface);
    color: bisque;
    margin: 0;
    border: 1px outset gold;
    font-size: 1em;
    border-radius: 0.5em;
    text-align: center;
    padding: 0.3em;
}

.reviewActions {
    display: flex;
    gap: 1em;
    justify-content: center;
    flex-wrap: wrap;
    align-items: center;
    margin-top: 1em;
}

.reviewStage {
    margin-top: 0.5em;
    display: grid;
    gap: 0.5em;
    min-width: 0;
}

.reviewForm {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.1em;
}

.reviewForm label {
    display: grid;
    grid-template-columns: 1fr 4fr;
    gap: 0.2em;
    margin: 0;
    background-color: color-mix(in srgb, var(--theme-bg-surface) 50%, transparent);
    color: bisque;
    padding: 0.2em;
    min-width: 0;
}

.reviewForm label span input,
.reviewForm label span select,
.reviewForm label span textarea {
    background-color: var(--theme-bg-surface);
    color: bisque;
    box-shadow: 0 0 4px gold;
    padding: 0.2em;
    font-size: 1em;
}

.reviewForm label span textarea {
    width: 95%;
    height: 3em;
}

.reviewForm label span.date input {
    width: 4.5em;
    font-size: 80%;
}

.reviewForm label span.date input:last-child {
    width: 3em;
}

.reviewForm label span.date select {
    max-width: 8em;
}

.reportEditor {
    border: 1px inset var(--theme-accent);
    min-height: 300px;
    padding: 0.5em;
    min-width: 0;
}

/* PUBLISHED */
.publishedPanel {
    text-align: center;
    padding: 2em;
}

.publishedPanel h3 {
    color: #6bff6b;
    margin-bottom: 1em;
}

.publishedActions {
    display: flex;
    gap: 1em;
    justify-content: center;
    flex-wrap: wrap;
    align-items: center;
}

/* FAILED */
.failedPanel {
    text-align: center;
    padding: 2em;
}

.failedPanel h3 {
    color: #ff6b6b;
    margin-bottom: 1em;
}

.errorText {
    color: #ff6b6b;
}

.costNote {
    color: #6bff6b;
    font-style: italic;
    margin-bottom: 1em;
}

/* START BUTTONS */
.startButtons {
    display: flex;
    gap: 1em;
    justify-content: center;
    flex-wrap: wrap;
    align-items: center;
}

.startButtons .btn-secondary {
    margin-top: 0;
    padding: 0.8em 1.5em;
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
}

/* UPLOADING */
.uploadingPanel {
    text-align: center;
    padding: 2em;
}

.uploadingIndicatorLarge {
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    font-size: 1.2em;
    color: var(--theme-accent);
    margin-bottom: 1.5em;
}

.progressBar {
    width: 100%;
    max-width: 400px;
    height: 1.2em;
    background: color-mix(in srgb, var(--theme-bg-surface) 80%, transparent);
    border: 1px solid var(--theme-accent);
    border-radius: 0.6em;
    margin: 0 auto;
    overflow: hidden;
}

.progressFill {
    height: 100%;
    background: linear-gradient(90deg, #4c1f33, #c9973b);
    border-radius: 0.6em;
    transition: width 0.3s ease;
}

.progressText {
    font-size: 1.1em;
    color: gold;
    margin-top: 0.5em;
    font-family: monospace;
}

/* Add Funds Modal Overlay */
.purchaseOverlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

/* Mic Selection Dialog */
.mic-modal[open] {
    display: flex;
    flex-direction: column;
    background-color: var(--theme-bg-surface);
    color: var(--theme-accent);
    border-radius: 8px;
    padding: 0;
    max-width: 420px;
    width: 80%;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(212, 175, 55, 0.4);
    position: fixed;
    top: 50%;
    left: 50%;
    right: auto;
    bottom: auto;
    transform: translate(-50%, -50%);
    margin: 0;
    overflow-y: auto;
}

.mic-modal::backdrop {
    background: rgba(0, 0, 0, 0.7);
}

.mic-modal-header {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    background-color: #4c1f33;
    padding: 0.4rem 0.5rem 0.4rem 1.2rem;
    border-bottom: 1px solid rgba(212, 175, 55, 0.4);
    border-radius: 8px 8px 0 0;
}

.mic-modal-header h4 {
    margin: 0;
    color: gold;
    font-size: 1.1rem;
}

.mic-modal-body {
    padding: 1.2rem;
    display: flex;
    flex-direction: column;
    gap: 0.6em;
}

.mic-option {
    display: flex;
    align-items: center;
    gap: 0.6em;
    padding: 0.6em 0.8em;
    background: color-mix(in srgb, var(--theme-bg-surface) 60%, transparent);
    border: 1px solid color-mix(in srgb, var(--theme-accent) 20%, transparent);
    border-radius: 0.4em;
    cursor: pointer;
    color: bisque;
}

.mic-option:hover {
    background: color-mix(in srgb, var(--theme-bg-surface) 90%, transparent);
    border-color: gold;
}

.mic-option input[type="radio"] {
    accent-color: gold;
    width: 1.1em;
    height: 1.1em;
}

.mic-modal-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    padding: 1rem 1.2rem;
}

.mic-modal-actions .btn-primary {
    justify-content: center;
}

/* Delete Confirmation Dialog */
.delete-modal[open] {
    background-color: var(--theme-bg-surface);
    color: var(--theme-accent);
    border-radius: 8px;
    padding: 0;
    max-width: 420px;
    width: 80%;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    border: 1px solid #8b2635;
    position: fixed;
    top: 50%;
    left: 50%;
    right: auto;
    bottom: auto;
    transform: translate(-50%, -50%);
    margin: 0;
    overflow-y: auto;
}

.delete-modal::backdrop {
    background: rgba(0, 0, 0, 0.7);
}

.delete-modal-header {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    background-color: #4c1f33;
    padding: 0.4rem 0.5rem 0.4rem 1.2rem;
    border-bottom: 1px solid #8b2635;
    border-radius: 8px 8px 0 0;
}

.delete-modal-header h4 {
    margin: 0;
    color: gold;
    font-size: 1.1rem;
    background: none;
    border: none;
}

.btn-close {
    background: #6b1a1a;
    border: 1px outset gold;
    color: gold;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0.2em 0.5em;
    border-radius: 0.3em;
    line-height: 1;
}

.btn-close:hover {
    background: #8b2a2a;
}

.delete-modal-body {
    padding: 1.2rem 1.2rem 0.5rem;
    text-align: left;
}

.delete-modal-body p {
    margin: 0.5rem 0;
}

.delete-modal-body .warning-text {
    color: #ff6b6b;
    font-style: italic;
    font-size: 0.9rem;
}

.delete-modal-body .btn-primary {
    margin-top: 0.5em;
}

.delete-confirm-block {
    margin-top: 1em;
    padding: 0.8em;
    background-color: #242e4a;
    border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
    border-radius: 0.4em;
}

.delete-confirm-label {
    display: flex;
    align-items: center;
    gap: 0.5em;
    margin: 0;
    color: var(--theme-accent);
    cursor: pointer;
}

.delete-confirm-checkbox {
    width: 1.1em;
    height: 1.1em;
    accent-color: #8b2635;
    cursor: pointer;
}

.delete-modal-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    padding: 1rem 1.2rem;
}

.delete-modal-actions .btn-primary,
.delete-modal-actions .btn-danger {
    justify-content: center;
}

.dots-anim::after {
    content: '';
    animation: dots 1.5s steps(4, end) infinite;
}

@keyframes dots {
    0%   { content: ''; }
    25%  { content: '.'; }
    50%  { content: '..'; }
    75%  { content: '...'; }
}

/* Paused Indicator */
.pausedIndicator {
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    font-size: 1.2em;
    color: var(--theme-accent);
    margin-bottom: 1em;
}

.pausedIcon {
    font-size: 1.2em;
    color: var(--theme-accent);
}

/* Guard Dialogs (Activity Check / Pause Check) */
.guard-modal[open] {
    display: flex;
    flex-direction: column;
    background-color: var(--theme-bg-surface);
    color: var(--theme-accent);
    border-radius: 8px;
    padding: 0;
    max-width: 420px;
    width: 80%;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(212, 175, 55, 0.4);
    position: fixed;
    top: 50%;
    left: 50%;
    right: auto;
    bottom: auto;
    transform: translate(-50%, -50%);
    margin: 0;
}

.guard-modal::backdrop {
    background: rgba(0, 0, 0, 0.7);
}

.guard-modal-header {
    background-color: #4c1f33;
    padding: 0.4rem 1.2rem;
    border-bottom: 1px solid rgba(212, 175, 55, 0.4);
    border-radius: 8px 8px 0 0;
}

.guard-modal-header h4 {
    margin: 0;
    color: gold;
    font-size: 1.1rem;
}

.guard-modal-body {
    padding: 1.2rem;
}

.guard-modal-body p {
    margin: 0;
    color: bisque;
}

.guard-modal-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    padding: 1rem 1.2rem;
}

.guard-modal-actions .btn-primary,
.guard-modal-actions .btn-danger,
.guard-modal-actions .btn-secondary {
    justify-content: center;
}

.guard-modal-actions-single {
    grid-template-columns: 1fr;
}

/* Silence dialog extras */
.silence-hint {
    margin-top: 0.8em;
    font-size: 0.9em;
    color: #aaa;
}

.silence-mic-list {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    margin-top: 0.8em;
}
</style>
