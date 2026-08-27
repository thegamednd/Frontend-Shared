/**
 * Splits a list into the slices that fit successive fixed-height regions.
 *
 * Printed pages are a fixed box with hidden overflow, and the regions on them
 * are often CSS multi-column, where the height of a list is not the sum of its
 * rows. So rather than model heights, this measures the region as it would
 * actually render for a candidate number of items and binary-searches the
 * largest prefix that fits.
 *
 * @param {object} options
 * @param {number} options.total - how many items there are
 * @param {(sliceIndex: number) => number} options.capacityFor - usable height
 *   of the region holding slice `sliceIndex`, in px
 * @param {(start: number, count: number) => Promise<number>} options.measure -
 *   rendered height of items `[start, start + count)`
 * @returns {Promise<Array<{start: number, count: number}>>}
 */
export async function sliceByFit({ total, capacityFor, measure }) {
    const slices = [];
    let start = 0;

    while (start < total) {
        const capacity = capacityFor(slices.length);
        const remaining = total - start;

        // The common case is that everything left fits, so ask that first and
        // spend no further measurements on it.
        if ((await measure(start, remaining)) <= capacity) {
            slices.push({ start, count: remaining });
            break;
        }

        // Largest prefix that fits. An item taller than the region on its own
        // still has to go somewhere, so a slice never carries less than one.
        let low = 1;
        let high = remaining;
        let best = 1;
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if ((await measure(start, mid)) <= capacity) {
                best = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        slices.push({ start, count: best });
        start += best;
    }

    return slices;
}
