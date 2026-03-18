import { ref, watch, onUnmounted } from 'vue';
import { useUserStore } from '@shared/stores/user';

const SESSIONS_BASE_URL = import.meta.env.VITE_SESSIONS_API_BASE_URL || import.meta.env.VITE_API_BASE_URL;

const ACTIVITY_CHECK_MS = 2 * 60 * 60 * 1000;   // 2 hours
const ACTIVITY_SNOOZE_MS = 1 * 60 * 60 * 1000;   // 1 hour
const ACTIVITY_AUTO_END_MS = 10 * 60 * 1000;      // 10 minutes
const PAUSE_CHECK_MS = 15 * 60 * 1000;            // 15 minutes
const PAUSE_AUTO_END_MS = 1 * 60 * 60 * 1000;     // 1 hour
const SOUND_INTERVAL_MS = 15 * 1000;               // 15 seconds
const SILENCE_SOUND_MS = 10 * 1000;                 // 10 seconds
const SILENCE_AUTO_PAUSE_MS = 2 * 60 * 1000;        // 2 minutes

/**
 * Session guard: activity checks, pause idle detection, and tab close protection.
 * @param {Object} opts
 * @param {import('vue').Ref<boolean>} opts.isRecording
 * @param {import('vue').Ref<boolean>} opts.isPaused
 * @param {import('vue').Ref<boolean>} opts.isSilent
 * @param {import('vue').Ref<number>} opts.duration
 * @param {Function} opts.onEndSession - called to end the session
 * @param {Function} opts.onPauseSession - called to pause the session
 * @param {Function} opts.getSessionId - returns current session ID
 */
export function useSessionGuard({ isRecording, isPaused, isSilent, duration, onEndSession, onPauseSession, getSessionId }) {
    const showActivityDialog = ref(false);
    const showPauseDialog = ref(false);
    const showSilenceDialog = ref(false);
    const showSilencePausedDialog = ref(false);

    let activityTimer = null;
    let activityAutoEnd = null;
    let pauseTimer = null;
    let pauseAutoEnd = null;
    let silenceAutoPause = null;
    let soundInterval = null;
    let titleInterval = null;
    let originalTitle = '';
    let cachedToken = null;

    // Cache the auth token whenever the guard starts so pagehide can use it synchronously
    async function cacheToken() {
        const userStore = useUserStore();
        cachedToken = await userStore.getValidToken();
    }

    // --- Alert sound via Web Audio API ---
    function playAlertSound() {
        try {
            const ctx = new AudioContext();
            const gain = ctx.createGain();
            gain.gain.value = 0.3;
            gain.connect(ctx.destination);

            // First tone: 660Hz, 0.2s
            const osc1 = ctx.createOscillator();
            osc1.frequency.value = 660;
            osc1.type = 'sine';
            osc1.connect(gain);
            osc1.start(ctx.currentTime);
            osc1.stop(ctx.currentTime + 0.2);

            // Second tone: 880Hz, 0.2s after a 0.15s gap
            const osc2 = ctx.createOscillator();
            osc2.frequency.value = 880;
            osc2.type = 'sine';
            osc2.connect(gain);
            osc2.start(ctx.currentTime + 0.35);
            osc2.stop(ctx.currentTime + 0.55);

            // Clean up
            osc2.onended = () => ctx.close();
        } catch {
            // Web Audio not available — silently skip
        }
    }

    function startSoundLoop(intervalMs = SOUND_INTERVAL_MS) {
        stopSoundLoop();
        playAlertSound();
        soundInterval = setInterval(playAlertSound, intervalMs);
    }

    function stopSoundLoop() {
        if (soundInterval) {
            clearInterval(soundInterval);
            soundInterval = null;
        }
    }

    // --- Title flashing ---
    function startTitleFlash() {
        stopTitleFlash();
        originalTitle = document.title;
        let toggle = false;
        titleInterval = setInterval(() => {
            document.title = toggle ? originalTitle : '[!] Session Check';
            toggle = !toggle;
        }, 1000);
    }

    function stopTitleFlash() {
        if (titleInterval) {
            clearInterval(titleInterval);
            titleInterval = null;
            if (originalTitle) document.title = originalTitle;
        }
    }

    // --- Show dialog helpers ---
    function showDialog(dialogRef, soundIntervalMs) {
        dialogRef.value = true;
        window.focus();
        startSoundLoop(soundIntervalMs);
        startTitleFlash();
    }

    function dismissDialog(dialogRef) {
        dialogRef.value = false;
        stopSoundLoop();
        stopTitleFlash();
    }

    // --- Activity check ---
    function startActivityTimer(delay = ACTIVITY_CHECK_MS) {
        clearTimeout(activityTimer);
        activityTimer = setTimeout(() => {
            showDialog(showActivityDialog);
            // Auto-end after 10 minutes if ignored
            activityAutoEnd = setTimeout(() => {
                dismissDialog(showActivityDialog);
                onEndSession();
            }, ACTIVITY_AUTO_END_MS);
        }, delay);
    }

    function stopActivityTimer() {
        clearTimeout(activityTimer);
        activityTimer = null;
        clearTimeout(activityAutoEnd);
        activityAutoEnd = null;
    }

    // --- Pause check ---
    function startPauseTimer(delay = PAUSE_CHECK_MS) {
        clearTimeout(pauseTimer);
        pauseTimer = setTimeout(() => {
            showDialog(showPauseDialog);
            // Auto-end after 1 hour if ignored
            pauseAutoEnd = setTimeout(() => {
                dismissDialog(showPauseDialog);
                onEndSession();
            }, PAUSE_AUTO_END_MS);
        }, delay);
    }

    function stopPauseTimer() {
        clearTimeout(pauseTimer);
        pauseTimer = null;
        clearTimeout(pauseAutoEnd);
        pauseAutoEnd = null;
    }

    // --- beforeunload / pagehide ---
    function onBeforeUnload(e) {
        e.preventDefault();
    }

    function onPageHide() {
        const sessionId = getSessionId();
        if (!sessionId || !cachedToken) return;
        const url = `${SESSIONS_BASE_URL}/sessions/session/${sessionId}/end`;
        const body = duration.value > 0 ? JSON.stringify({ audioDurationSeconds: duration.value }) : '{}';
        try {
            fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${cachedToken}`,
                },
                body,
                keepalive: true,
            });
        } catch {
            // Fire-and-forget
        }
    }

    function attachPageHandlers() {
        window.addEventListener('beforeunload', onBeforeUnload);
        window.addEventListener('pagehide', onPageHide);
    }

    function detachPageHandlers() {
        window.removeEventListener('beforeunload', onBeforeUnload);
        window.removeEventListener('pagehide', onPageHide);
    }

    // --- Dialog action handlers ---

    /** "Alert Again in 1 Hour" */
    function handleKeepRecording() {
        dismissDialog(showActivityDialog);
        clearTimeout(activityAutoEnd);
        activityAutoEnd = null;
        startActivityTimer(ACTIVITY_SNOOZE_MS);
    }

    /** "End Session" from activity dialog */
    function handleEndFromDialog() {
        dismissDialog(showActivityDialog);
        stopActivityTimer();
        onEndSession();
    }

    /** "Continue Recording" from pause dialog — caller also resumes the recorder */
    function handleResumeFromPause() {
        dismissDialog(showPauseDialog);
        stopPauseTimer();
    }

    /** "Snooze 15 Minutes" */
    function handleSnoozePause() {
        dismissDialog(showPauseDialog);
        clearTimeout(pauseAutoEnd);
        pauseAutoEnd = null;
        startPauseTimer(PAUSE_CHECK_MS);
    }

    // --- Silence dialog handlers ---

    function stopSilenceTimers() {
        clearTimeout(silenceAutoPause);
        silenceAutoPause = null;
    }

    /** Dismiss the silence dialog (user picked a mic or dismissed) */
    function handleSilenceDismiss() {
        dismissDialog(showSilenceDialog);
        stopSilenceTimers();
    }

    /** Dismiss the silence-paused dialog (user will resume) */
    function handleSilencePausedResume() {
        showSilencePausedDialog.value = false;
    }

    // --- Watchers ---
    watch(isSilent, (silent) => {
        if (!isRecording.value || isPaused.value) return;
        if (silent && !showSilenceDialog.value) {
            showDialog(showSilenceDialog, SILENCE_SOUND_MS);
            // Auto-pause after 2 minutes if user doesn't respond
            silenceAutoPause = setTimeout(() => {
                dismissDialog(showSilenceDialog);
                onPauseSession();
                showSilencePausedDialog.value = true;
            }, SILENCE_AUTO_PAUSE_MS);
        } else if (!silent && showSilenceDialog.value) {
            dismissDialog(showSilenceDialog);
            stopSilenceTimers();
        }
    });

    watch(isRecording, (recording) => {
        if (recording) {
            cacheToken();
            startActivityTimer();
            attachPageHandlers();
        } else {
            cleanup();
        }
    });

    watch(isPaused, (paused) => {
        if (!isRecording.value) return;
        if (paused) {
            stopActivityTimer();
            // Dismiss silence dialog if it triggered the pause
            if (showSilenceDialog.value) {
                dismissDialog(showSilenceDialog);
                stopSilenceTimers();
            }
            startPauseTimer();
        } else {
            stopPauseTimer();
            dismissDialog(showPauseDialog);
            showSilencePausedDialog.value = false;
            startActivityTimer();
        }
    });

    // --- Cleanup ---
    function cleanup() {
        stopActivityTimer();
        stopPauseTimer();
        stopSilenceTimers();
        stopSoundLoop();
        stopTitleFlash();
        detachPageHandlers();
        showActivityDialog.value = false;
        showPauseDialog.value = false;
        showSilenceDialog.value = false;
        showSilencePausedDialog.value = false;
    }

    onUnmounted(cleanup);

    return {
        showActivityDialog,
        showPauseDialog,
        showSilenceDialog,
        showSilencePausedDialog,
        handleKeepRecording,
        handleEndFromDialog,
        handleResumeFromPause,
        handleSnoozePause,
        handleSilenceDismiss,
        handleSilencePausedResume,
        cleanup,
    };
}
