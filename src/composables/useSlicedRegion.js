import { useFittedSlices } from './useFittedSlices.js';

// Sub-pixel slack so a region that measured as an exact fit does not spill
// over in the real page by a fraction of a point.
const FIT_TOLERANCE = 2;

function px(value) {
    return parseFloat(value) || 0;
}

function contentBottom(el) {
    const style = getComputedStyle(el);
    return (
        el.getBoundingClientRect().bottom -
        px(style.borderBottomWidth) -
        px(style.paddingBottom)
    );
}

/**
 * Splits one region of a designed printed page across continuation pages.
 *
 * How much room the region has is read off the page itself rather than
 * calculated: on the first page, whatever is left between the top of the region
 * and the foot of the page; on later pages, the same measurement taken against
 * an off-screen stage laid out as a continuation page. The probe inside that
 * stage sits in the same grid cell as the real region, so it measures at the
 * width and column count the rows will actually print at.
 *
 * @param {object} options
 * @param {import('vue').Ref<Array>} options.items - the rows to split
 * @param {import('vue').Ref<HTMLElement|null>} options.pageEl - the first page
 * @param {import('vue').Ref<HTMLElement|null>} options.regionEl - the region on
 *   the first page
 * @param {import('vue').Ref<HTMLElement|null>} options.stageEl - the off-screen
 *   stage laid out as a continuation page
 * @param {import('vue').Ref<HTMLElement|null>} options.probeEl - the region
 *   inside that stage, measured for candidate slices
 * @param {import('vue').Ref<Array>} options.probeItems - written by the
 *   composable; the component renders it inside the probe
 * @param {import('vue').Ref<HTMLElement|null>} [options.reserveEl] - a block
 *   that stays put below the region on the first page, such as a reference
 *   chart. The first slice is cut short enough to leave room for it.
 * @param {(start: number, count: number) => Array} [options.sliceItems]
 * @returns {{slices, measured, remeasure}}
 */
export function useSlicedRegion({
    items,
    pageEl,
    regionEl,
    stageEl,
    probeEl,
    probeItems,
    reserveEl = null,
    sliceItems,
}) {
    function capacityFor(sliceIndex) {
        const page = sliceIndex === 0 ? pageEl.value : stageEl.value;
        const region = sliceIndex === 0 ? regionEl.value : probeEl.value;
        if (!page || !region) return 0;

        const reserved =
            sliceIndex === 0 && reserveEl?.value
                ? reserveEl.value.getBoundingClientRect().height
                : 0;

        return (
            contentBottom(page) -
            region.getBoundingClientRect().top -
            reserved -
            FIT_TOLERANCE
        );
    }

    return useFittedSlices({ items, probeItems, probeEl, capacityFor, sliceItems });
}
