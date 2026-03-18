/**
 * Audio splitting utilities using FFmpeg.wasm
 * Splits long audio files into segments for Bedrock Data Automation processing.
 * Uses ffmpeg's segment muxer with stream copy (-c copy) for fast, lossless splitting.
 */
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// Reuse the singleton FFmpeg instance from videoCompressor.js
let ffmpeg = null;
let ffmpegLoaded = false;
let ffmpegLoading = false;

const SPLIT_THRESHOLD_SECONDS = 3.5 * 60 * 60; // 3.5 hours
const SEGMENT_DURATION_SECONDS = 3 * 60 * 60;   // 3-hour segments

/**
 * Load FFmpeg.wasm (lazy, singleton pattern)
 * Same pattern as videoCompressor.js
 * @returns {Promise<FFmpeg>}
 */
async function loadFFmpeg() {
    if (ffmpegLoaded && ffmpeg) {
        return ffmpeg;
    }

    if (ffmpegLoading) {
        while (ffmpegLoading) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return ffmpeg;
    }

    ffmpegLoading = true;

    try {
        ffmpeg = new FFmpeg();

        ffmpeg.on('log', ({ message }) => {
            console.log('[FFmpeg-Splitter]', message);
        });

        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        ffmpegLoaded = true;
        return ffmpeg;
    } catch (error) {
        ffmpegLoading = false;
        throw new Error(`Failed to load audio splitter: ${error.message}`);
    } finally {
        ffmpegLoading = false;
    }
}

/**
 * Get audio duration using HTML5 Audio, falling back to ffprobe if Infinity.
 * @param {FFmpeg} ffmpegInstance - loaded FFmpeg instance
 * @param {string} inputFileName - filename already written to ffmpeg's FS
 * @returns {Promise<number>} duration in seconds, or Infinity if undetermined
 */
async function probeDuration(ffmpegInstance, inputFileName) {
    // ffprobe via ffmpeg.wasm: run ffmpeg with duration detection
    // The -f null output discards output; we capture duration from logs
    let duration = NaN;

    const logHandler = ({ message }) => {
        // ffmpeg logs "Duration: HH:MM:SS.xx" during input analysis
        const match = message.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
        if (match) {
            const hours = parseInt(match[1], 10);
            const minutes = parseInt(match[2], 10);
            const seconds = parseInt(match[3], 10);
            const centis = parseInt(match[4], 10);
            duration = hours * 3600 + minutes * 60 + seconds + centis / 100;
        }
    };

    ffmpegInstance.on('log', logHandler);

    try {
        // Run a no-op transcode to trigger input analysis and log the duration
        await ffmpegInstance.exec(['-i', inputFileName, '-f', 'null', '-']);
    } catch {
        // ffmpeg may return non-zero for -f null, that's fine
    }

    ffmpegInstance.off('log', logHandler);

    if (!isNaN(duration) && isFinite(duration) && duration > 0) {
        console.log(`[FFmpeg-Splitter] Probed duration: ${Math.round(duration)}s (${Math.round(duration / 60)} min)`);
        return duration;
    }

    console.warn('[FFmpeg-Splitter] Could not determine duration via ffprobe, will split unconditionally');
    return Infinity;
}

/**
 * Split an audio file into segments if it exceeds the threshold duration.
 * Uses ffmpeg's segment muxer with -c copy for fast, lossless splitting.
 *
 * @param {File} file - The audio file to potentially split
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<File[]>} Array of File objects (1 element if no split needed)
 */
export async function splitAudioIfNeeded(file, onProgress = () => {}) {
    // Quick check with HTML5 Audio first
    const htmlDuration = await getHtmlAudioDuration(file);

    if (isFinite(htmlDuration) && htmlDuration < SPLIT_THRESHOLD_SECONDS) {
        console.log(`[FFmpeg-Splitter] Short file (${Math.round(htmlDuration / 60)} min), no split needed`);
        return [file];
    }

    // HTML5 returned Infinity or duration exceeds threshold — need ffmpeg
    onProgress(5);
    const ffmpegInstance = await loadFFmpeg();
    onProgress(10);

    const ext = file.name.split('.').pop()?.toLowerCase() || 'mp3';
    const inputFileName = `input.${ext}`;

    await ffmpegInstance.writeFile(inputFileName, await fetchFile(file));
    onProgress(20);

    // If HTML5 returned Infinity, probe with ffmpeg to get real duration
    let duration = htmlDuration;
    if (!isFinite(duration)) {
        duration = await probeDuration(ffmpegInstance, inputFileName);
        onProgress(25);

        // If we now know the file is short, skip splitting
        if (isFinite(duration) && duration < SPLIT_THRESHOLD_SECONDS) {
            console.log(`[FFmpeg-Splitter] Probed duration ${Math.round(duration / 60)} min — under threshold, no split needed`);
            await ffmpegInstance.deleteFile(inputFileName);
            return [file];
        }
    }

    console.log(`[FFmpeg-Splitter] Splitting audio (${isFinite(duration) ? Math.round(duration / 60) + ' min' : 'unknown duration'})...`);
    onProgress(30);

    // Use ffmpeg segment muxer — no need to know exact duration or segment count
    await ffmpegInstance.exec([
        '-i', inputFileName,
        '-f', 'segment',
        '-segment_time', String(SEGMENT_DURATION_SECONDS),
        '-c', 'copy',
        '-reset_timestamps', '1',
        '-y',
        `segment_%03d.${ext}`,
    ]);

    onProgress(80);

    // Discover output segments via listDir
    const dirContents = await ffmpegInstance.listDir('/');
    const segmentNames = dirContents
        .filter(f => !f.isDir && f.name.startsWith('segment_'))
        .sort((a, b) => a.name.localeCompare(b.name));

    // If only 1 segment was produced, the file was actually short
    if (segmentNames.length <= 1) {
        console.log('[FFmpeg-Splitter] Only 1 segment produced — file does not need splitting');
        // Clean up
        for (const seg of segmentNames) {
            await ffmpegInstance.deleteFile(seg.name);
        }
        await ffmpegInstance.deleteFile(inputFileName);
        return [file];
    }

    // Read each segment into a File object
    const segments = [];
    for (let i = 0; i < segmentNames.length; i++) {
        const segName = segmentNames[i].name;
        const data = await ffmpegInstance.readFile(segName);
        const segmentFile = new File(
            [data.buffer],
            `${i}.${ext}`,
            { type: file.type, lastModified: Date.now() }
        );
        segments.push(segmentFile);
        await ffmpegInstance.deleteFile(segName);

        const segmentProgress = 80 + Math.round(((i + 1) / segmentNames.length) * 20);
        onProgress(Math.min(segmentProgress, 100));

        console.log(`[FFmpeg-Splitter] Segment ${i}: ${Math.round(segmentFile.size / 1_000_000)}MB`);
    }

    // Clean up input
    await ffmpegInstance.deleteFile(inputFileName);

    console.log(`[FFmpeg-Splitter] Split into ${segments.length} segments`);
    return segments;
}

/**
 * Quick HTML5 Audio duration check. Returns Infinity if unavailable.
 * @param {File} file
 * @returns {Promise<number>}
 */
function getHtmlAudioDuration(file) {
    return new Promise((resolve) => {
        const audio = new Audio();
        audio.preload = 'metadata';

        const cleanup = () => URL.revokeObjectURL(audio.src);

        audio.onloadedmetadata = () => {
            cleanup();
            resolve(isFinite(audio.duration) ? audio.duration : Infinity);
        };

        audio.onerror = () => {
            cleanup();
            // Can't read metadata — assume potentially long
            resolve(Infinity);
        };

        // Timeout: if metadata never loads, don't block forever
        setTimeout(() => {
            cleanup();
            resolve(Infinity);
        }, 5000);

        audio.src = URL.createObjectURL(file);
    });
}
