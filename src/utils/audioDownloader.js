/**
 * Audio download utility for Scribe sessions.
 *
 * The backend prepares a single MP3 file server-side. If the MP3 isn't ready
 * yet, the backend triggers preparation and returns status: 'preparing'.
 * We poll until it's ready, then download the single file.
 */

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Calculate max poll attempts from chunk count.
 * Each chunk is ~30s of audio; FFmpeg transcodes roughly 20x realtime.
 * Adds 60s buffer for S3 download/upload overhead.
 * Floors at 60 attempts (3 min minimum), caps at 400 (20 min absolute max).
 */
function calcMaxAttempts(chunkCount, pollIntervalMs) {
    const audioDuration = chunkCount * 30;
    const estimatedSeconds = audioDuration / 20 + 60;
    const attempts = Math.ceil(estimatedSeconds / (pollIntervalMs / 1000));
    return Math.max(60, Math.min(400, attempts));
}

/**
 * Download session audio as a single MP3 file.
 * If the MP3 is still being prepared server-side, polls until ready.
 * @param {string} sessionId
 * @param {object} scribeStore - Pinia scribe store instance
 * @param {function} [onPreparing] - Called with chunkCount when MP3 is being prepared (for UI feedback)
 */
export async function downloadSessionAudio(sessionId, scribeStore, onPreparing) {
    const POLL_INTERVAL_MS = 3000;
    const DEFAULT_MAX_ATTEMPTS = 200;

    let data = await scribeStore.getDownloadUrls(sessionId);

    if (data.status === 'preparing') {
        const chunkCount = data.chunkCount || 0;
        const maxAttempts = chunkCount > 0
            ? calcMaxAttempts(chunkCount, POLL_INTERVAL_MS)
            : DEFAULT_MAX_ATTEMPTS;

        if (onPreparing) onPreparing(chunkCount);

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
            data = await scribeStore.getDownloadUrls(sessionId);
            if (data.status !== 'preparing') break;
        }

        if (data.status === 'preparing') {
            throw new Error('Audio preparation timed out. Please try again.');
        }
    }

    const { urls, extension } = data;
    const filename = `session-${sessionId}.${extension}`;

    // Single file download (expected path — server returns one MP3 URL)
    const response = await fetch(urls[0]);
    const blob = await response.blob();
    triggerDownload(blob, filename);
}
