import { onMounted, nextTick, ref, watch } from 'vue';
import { sliceByFit } from '../utils/sliceByFit.js';
import { toTextPieces, joinTextPieces } from '../utils/textPieces.js';

/**
 * Splits the prose of fixed-height panels across continuation pages.
 *
 * A printed panel is a fixed box with hidden overflow, so a long backstory
 * simply stops being visible partway down. This measures how much of each
 * panel's text the panel can actually show — by rendering candidate lengths
 * into a hidden probe of the same width and style — and returns the text in
 * page-sized slices.
 *
 * Until measurement succeeds, every panel keeps its whole text as one slice,
 * which is the sheet as it prints today.
 *
 * @param {object} options
 * @param {import('vue').Ref<Array<{key: string, text: string, el: import('vue').Ref, className?: string}>>} options.panels
 * @param {import('vue').Ref<HTMLElement|null>} options.probeEl
 * @param {import('vue').Ref<string>} options.probeText - rendered in the probe
 * @param {import('vue').Ref<string>} options.probeClass - styles the probe like
 *   the panel being measured
 * @param {import('vue').Ref<number>} options.probeWidth - in px
 * @param {(panel: object, sliceIndex: number) => number} options.capacityFor
 * @returns {{slices: import('vue').Ref<Record<string, Array<string>>>, measured: import('vue').Ref<boolean>, remeasure: () => Promise<void>}}
 */
export function useSlicedText({
    panels,
    probeEl,
    probeText,
    probeClass,
    probeWidth,
    capacityFor,
}) {
    const measured = ref(false);
    const slices = ref({});

    function wholeText() {
        const out = {};
        for (const panel of panels.value || []) out[panel.key] = [panel.text || ''];
        return out;
    }

    async function measurePanel(panel) {
        const pieces = toTextPieces(panel.text);
        if (!pieces.length) return [''];

        const el = panel.el?.value;
        if (!el) return [panel.text || ''];

        const width = el.clientWidth;
        if (!(width > 0)) return [panel.text || ''];

        probeClass.value = panel.className || '';
        probeWidth.value = width;

        const fitted = await sliceByFit({
            total: pieces.length,
            capacityFor: sliceIndex => capacityFor(panel, sliceIndex),
            measure: async (start, count) => {
                probeText.value = joinTextPieces(pieces, start, count);
                await nextTick();
                return probeEl.value?.getBoundingClientRect().height ?? 0;
            },
        });

        return fitted.map(s => joinTextPieces(pieces, s.start, s.count));
    }

    async function remeasure() {
        measured.value = false;
        slices.value = wholeText();
        await nextTick();

        // Font metrics decide where the breaks land, so wait for the webfonts.
        if (typeof document !== 'undefined' && document.fonts?.ready) {
            try {
                await document.fonts.ready;
            } catch {
                /* fall through and measure with whatever is loaded */
            }
            await nextTick();
        }

        if (!probeEl.value) return;

        const measuredSlices = {};
        let anyMeasured = false;

        for (const panel of panels.value || []) {
            // A panel that is not on the page — an empty one the sheet leaves
            // out — has nothing to measure against, so its text stays whole.
            if (!(capacityFor(panel, 0) > 0)) {
                measuredSlices[panel.key] = [panel.text || ''];
                continue;
            }
            measuredSlices[panel.key] = await measurePanel(panel);
            anyMeasured = true;
        }

        if (!anyMeasured) return;

        probeText.value = '';
        slices.value = measuredSlices;
        measured.value = true;
    }

    onMounted(remeasure);
    watch(panels, remeasure);

    return { slices, measured, remeasure };
}
