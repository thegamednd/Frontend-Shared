import { describe, it, expect, vi } from 'vitest';
import { sliceByFit } from './sliceByFit.js';

// A region whose height is simply `count * rowHeight`, standing in for a
// measured DOM node.
function uniformMeasure(rowHeight) {
    return (start, count) => Promise.resolve(count * rowHeight);
}

// A CSS multi-column region: rows are balanced across `columns`, so height
// grows in steps rather than linearly. This is the case plain arithmetic on
// per-row heights gets wrong, and the reason fit is measured instead.
function balancedMeasure(rowHeight, columns) {
    return (start, count) => Promise.resolve(Math.ceil(count / columns) * rowHeight);
}

describe('sliceByFit', () => {
    it('returns a single slice when everything fits', async () => {
        const slices = await sliceByFit({
            total: 5,
            capacityFor: () => 100,
            measure: uniformMeasure(10),
        });

        expect(slices).toEqual([{ start: 0, count: 5 }]);
    });

    it('returns nothing for an empty list', async () => {
        const slices = await sliceByFit({
            total: 0,
            capacityFor: () => 100,
            measure: uniformMeasure(10),
        });

        expect(slices).toEqual([]);
    });

    it('takes exactly what fits when the capacity lands on a boundary', async () => {
        const slices = await sliceByFit({
            total: 20,
            capacityFor: () => 100,
            measure: uniformMeasure(10),
        });

        expect(slices).toEqual([
            { start: 0, count: 10 },
            { start: 10, count: 10 },
        ]);
    });

    it('splits across as many slices as the list needs', async () => {
        const slices = await sliceByFit({
            total: 25,
            capacityFor: () => 100,
            measure: uniformMeasure(10),
        });

        expect(slices).toEqual([
            { start: 0, count: 10 },
            { start: 10, count: 10 },
            { start: 20, count: 5 },
        ]);
    });

    it('gives each slice its own capacity', async () => {
        const slices = await sliceByFit({
            total: 12,
            // The first page is short because the designed layout sits above
            // the region; continuation pages get the whole page.
            capacityFor: index => (index === 0 ? 20 : 100),
            measure: uniformMeasure(10),
        });

        expect(slices).toEqual([
            { start: 0, count: 2 },
            { start: 2, count: 10 },
        ]);
    });

    it('measures the real region rather than assuming rows stack', async () => {
        const slices = await sliceByFit({
            total: 30,
            capacityFor: () => 50,
            measure: balancedMeasure(10, 3),
        });

        // 15 rows balance into 3 columns of 5 rows = 50 tall, an exact fit.
        expect(slices).toEqual([
            { start: 0, count: 15 },
            { start: 15, count: 15 },
        ]);
    });

    it('advances by one when a single item is taller than the region', async () => {
        const slices = await sliceByFit({
            total: 3,
            capacityFor: () => 5,
            measure: uniformMeasure(10),
        });

        expect(slices).toEqual([
            { start: 0, count: 1 },
            { start: 1, count: 1 },
            { start: 2, count: 1 },
        ]);
    });

    it('costs one measurement when the whole list fits', async () => {
        const measure = vi.fn(uniformMeasure(10));

        await sliceByFit({ total: 5, capacityFor: () => 100, measure });

        expect(measure).toHaveBeenCalledTimes(1);
        expect(measure).toHaveBeenCalledWith(0, 5);
    });

    it('stops rather than looping forever on a nonsense capacity', async () => {
        const slices = await sliceByFit({
            total: 4,
            capacityFor: () => 0,
            measure: uniformMeasure(10),
        });

        expect(slices.map(s => s.count)).toEqual([1, 1, 1, 1]);
    });
});
