/**
 * Pure helpers for the realm tracker widget (ported from potp Pendant Charges).
 * Keep this file browser-agnostic except readVideoDuration.
 */
export const DEFAULT_TRACKER = Object.freeze({ Enabled: false, Label: 'Pendant Charges', Count: 0 });
export const TRACKER_LABEL_MAX = 40;
export const MAX_VIDEO_SECONDS = 10;
export const MAX_VIDEO_BYTES = 60 * 1024 * 1024;
export const TRACKER_WIDTH = 138;
export const TRACKER_HEIGHT = 158;

function cdn() {
    return (import.meta.env.VITE_MEDIA_CDN_URL || '').replace(/\/$/, '');
}

export function trackerVideoUrl(realmId, tracker) {
    return tracker?.VideoFile
        ? `${cdn()}/tracker/realms/${realmId}/${tracker.VideoFile}`
        : `${cdn()}/tracker/default/pendant.mp4`;
}

export function trackerImageUrl(realmId, tracker) {
    return tracker?.ImageFile
        ? `${cdn()}/tracker/realms/${realmId}/${tracker.ImageFile}`
        : `${cdn()}/tracker/default/pendant.jpg`;
}

// Numeral colour shifts from alarm-red (1) to warm gold (20); above 20 stays
// gold; 0 is the engraved-silver "no power" tone. Values are rounded to one
// decimal so they are stable for tests and CSS.
export function numeralStyle(count) {
    if (!count || count <= 0) {
        return {
            '--numeral-color': '#9aa1a8',
            '--numeral-glow-1': 'transparent',
            '--numeral-glow-2': 'transparent',
            '--numeral-glow-3': 'transparent',
        };
    }
    const t = Math.min(count, 20) / 20;
    const r1 = (n) => Math.round(n * 10) / 10;
    const hue = r1(6 + (40 - 6) * t);
    const sat = r1(88 + (96 - 88) * t);
    const light = r1(56 + (72 - 56) * t);
    return {
        '--numeral-color': `hsl(${hue}, ${sat}%, ${light}%)`,
        '--numeral-glow-1': `hsla(${hue}, ${sat}%, ${light}%, 0.65)`,
        '--numeral-glow-2': `hsla(${hue}, ${sat}%, ${light}%, 0.35)`,
        '--numeral-glow-3': `hsla(${hue}, ${sat}%, ${Math.max(40, r1(light - 18))}%, 0.22)`,
    };
}

export function validateLabel(label) {
    const value = String(label ?? '').trim();
    if (value.length < 1) return { ok: false, error: 'Label is required.' };
    if (value.length > TRACKER_LABEL_MAX) return { ok: false, error: `Label must be ${TRACKER_LABEL_MAX} characters or fewer.` };
    return { ok: true, value };
}

/**
 * Read a video file's duration in the browser without uploading it.
 * Resolves seconds; rejects if metadata cannot be read.
 */
export function readVideoDuration(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.onloadedmetadata = () => {
            const d = video.duration;
            URL.revokeObjectURL(url);
            if (Number.isFinite(d) && d > 0) resolve(d);
            else reject(new Error('Could not read the video length.'));
        };
        video.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('That file is not a playable MP4.'));
        };
        video.src = url;
    });
}
