import { ref, onUnmounted } from 'vue';

/**
 * Composable for recording audio from the microphone.
 * Captures chunks every 30s using MediaRecorder timeslice.
 */
export function useAudioRecorder() {
    const isRecording = ref(false);
    const isPaused = ref(false);
    const isSilent = ref(false);
    const duration = ref(0);
    const error = ref(null);
    const audioLevel = ref(0);

    let mediaRecorder = null;
    let stream = null;
    let durationInterval = null;
    let chunkCallback = null;
    let accumulatedTime = 0;
    let startTime = 0;

    // Silence detection
    let audioContext = null;
    let analyserNode = null;
    let audioSource = null;
    let silenceCheckInterval = null;
    let silenceStartTime = null;
    const SILENCE_THRESHOLD = 0.01;
    const SILENCE_DURATION_MS = 30000;

    /**
     * Register a callback that fires each time a chunk is ready
     * @param {Function} callback - receives (Blob chunk, number chunkIndex)
     */
    function onChunkReady(callback) {
        chunkCallback = callback;
    }

    /**
     * Start recording audio from the microphone
     * @param {string} [deviceId] - optional audio input device ID
     */
    async function startRecording(deviceId) {
        error.value = null;
        duration.value = 0;

        try {
            const audioConstraints = deviceId ? { deviceId: { exact: deviceId } } : true;
            stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';

            mediaRecorder = new MediaRecorder(stream, { mimeType });

            let chunkIndex = 0;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0 && chunkCallback) {
                    chunkCallback(event.data, chunkIndex);
                    chunkIndex++;
                }
            };

            mediaRecorder.onerror = (event) => {
                error.value = event.error?.message || 'Recording error';
                stopRecording();
            };

            // Start with 30-second timeslice for chunked recording
            mediaRecorder.start(30000);
            isRecording.value = true;
            isPaused.value = false;

            startSilenceDetection();

            // Track duration with pause/resume support
            accumulatedTime = 0;
            startTime = Date.now();
            durationInterval = setInterval(() => {
                duration.value = Math.floor(accumulatedTime + (Date.now() - startTime) / 1000);
            }, 1000);
        } catch (err) {
            error.value = err.message || 'Failed to access microphone';
            throw err;
        }
    }

    function startSilenceDetection() {
        stopSilenceDetection();
        if (!stream) return;

        try {
            if (!audioContext || audioContext.state === 'closed') {
                audioContext = new AudioContext();
            }
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            analyserNode = audioContext.createAnalyser();
            analyserNode.fftSize = 2048;
            audioSource = audioContext.createMediaStreamSource(stream);
            audioSource.connect(analyserNode);

            const dataArray = new Uint8Array(analyserNode.fftSize);
            silenceStartTime = null;
            isSilent.value = false;

            silenceCheckInterval = setInterval(() => {
                analyserNode.getByteTimeDomainData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    const sample = (dataArray[i] - 128) / 128;
                    sum += sample * sample;
                }
                const rms = Math.sqrt(sum / dataArray.length);
                audioLevel.value = Math.min(1, rms * 5);

                if (rms < SILENCE_THRESHOLD) {
                    if (!silenceStartTime) silenceStartTime = Date.now();
                    if (Date.now() - silenceStartTime >= SILENCE_DURATION_MS) {
                        isSilent.value = true;
                    }
                } else {
                    silenceStartTime = null;
                    isSilent.value = false;
                }
            }, 150);
        } catch {
            // AudioContext not available — skip silence detection
        }
    }

    function stopSilenceDetection() {
        if (silenceCheckInterval) {
            clearInterval(silenceCheckInterval);
            silenceCheckInterval = null;
        }
        if (audioSource) {
            audioSource.disconnect();
            audioSource = null;
        }
        if (analyserNode) {
            analyserNode = null;
        }
        silenceStartTime = null;
    }

    function resetSilenceDetection() {
        silenceStartTime = null;
        isSilent.value = false;
    }

    async function switchMicrophone(deviceId) {
        if (!stream) return;

        const newStream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: { exact: deviceId } },
        });

        const oldTrack = stream.getAudioTracks()[0];
        const newTrack = newStream.getAudioTracks()[0];
        stream.removeTrack(oldTrack);
        stream.addTrack(newTrack);
        oldTrack.stop();

        // Reconnect analyser to new track
        if (audioSource) audioSource.disconnect();
        if (audioContext && analyserNode) {
            audioSource = audioContext.createMediaStreamSource(stream);
            audioSource.connect(analyserNode);
        }

        resetSilenceDetection();
    }

    function pauseRecording() {
        if (!mediaRecorder || mediaRecorder.state !== 'recording') return;
        mediaRecorder.pause();
        accumulatedTime = duration.value;
        if (durationInterval) {
            clearInterval(durationInterval);
            durationInterval = null;
        }
        isPaused.value = true;
        stopSilenceDetection();
    }

    function resumeRecording() {
        if (!mediaRecorder || mediaRecorder.state !== 'paused') return;
        mediaRecorder.resume();
        startTime = Date.now();
        startSilenceDetection();
        durationInterval = setInterval(() => {
            duration.value = Math.floor(accumulatedTime + (Date.now() - startTime) / 1000);
        }, 1000);
        isPaused.value = false;
    }

    /**
     * Stop recording. Returns a promise that resolves after the final
     * dataavailable event fires (i.e. the last chunk is ready).
     */
    function stopRecording() {
        return new Promise((resolve) => {
            if (!mediaRecorder || mediaRecorder.state === 'inactive') {
                cleanup();
                resolve();
                return;
            }

            // Listen for the onstop event which fires after the final dataavailable
            mediaRecorder.onstop = () => {
                cleanup();
                resolve();
            };

            mediaRecorder.stop();
        });
    }

    function cleanup() {
        stopSilenceDetection();
        if (audioContext) {
            audioContext.close().catch(() => {});
            audioContext = null;
        }

        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }

        if (durationInterval) {
            clearInterval(durationInterval);
            durationInterval = null;
        }

        isRecording.value = false;
        isPaused.value = false;
        isSilent.value = false;
        audioLevel.value = 0;
    }

    // Cleanup on unmount
    onUnmounted(() => {
        stopRecording();
    });

    return {
        isRecording,
        isPaused,
        isSilent,
        audioLevel,
        duration,
        error,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        switchMicrophone,
        resetSilenceDetection,
        onChunkReady,
    };
}
