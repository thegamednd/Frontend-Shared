import { onMounted, ref, nextTick, watch } from 'vue';
import { sliceByFit } from '../utils/sliceByFit.js';

/**
 * Splits a list across the fixed-height regions of a printed sheet.
 *
 * The component supplies a hidden probe: a region styled exactly like the real
 * one, rendering whatever `probeItems` holds. This measures that probe for
 * candidate slice sizes, so a CSS multi-column region or one with mixed row
 * heights is sized as it will actually print rather than estimated.
 *
 * Until measurement succeeds — before mount, or where there is nothing to
 * measure against — `slices` holds the whole list as one slice. A sheet that
 * renders everything on one page is recoverable; a blank one is not.
 *
 * @param {object} options
 * @param {import('vue').Ref<Array>} options.items - the list to split
 * @param {import('vue').Ref<Array>} options.probeItems - written by this
 *   composable; the component renders it inside the probe region
 * @param {import('vue').Ref<HTMLElement|null>} options.probeEl - the probe
 *   region to measure
 * @param {(sliceIndex: number) => number} options.capacityFor - usable height
 *   of the region holding each slice, in px
 * @param {(start: number, count: number) => Array} [options.sliceItems] - how a
 *   slice is taken. Override to add rows a continued slice needs, such as a
 *   restated heading; measuring and rendering then agree on what a slice holds.
 * @returns {{slices: import('vue').Ref<Array<Array>>, measured: import('vue').Ref<boolean>, remeasure: () => Promise<void>}}
 */
export function useFittedSlices({ items, probeItems, probeEl, capacityFor, sliceItems }) {
    const measured = ref(false);
    const slices = ref([items.value ?? []]);

    const take = sliceItems ?? ((start, count) => items.value.slice(start, start + count));

    async function measure(start, count) {
        probeItems.value = take(start, count);
        await nextTick();
        return probeEl.value?.getBoundingClientRect().height ?? 0;
    }

    async function remeasure() {
        measured.value = false;
        slices.value = [items.value ?? []];

        // Nothing to split, and so nothing to measure — a region with no rows
        // would otherwise keep the whole page waiting on a probe.
        if (!items.value?.length) {
            measured.value = true;
            return;
        }

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
        if (!(capacityFor(0) > 0)) return;

        const fitted = await sliceByFit({
            total: items.value.length,
            capacityFor,
            measure,
        });

        probeItems.value = [];
        slices.value = fitted.map(s => take(s.start, s.count));
        measured.value = true;
    }

    onMounted(remeasure);
    watch(items, remeasure);

    return { slices, measured, remeasure };
}
