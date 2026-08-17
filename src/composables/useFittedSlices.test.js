import { describe, it, expect } from 'vitest';
import { defineComponent, h, ref, computed } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { useFittedSlices } from './useFittedSlices.js';

const ROW_HEIGHT = 10;

// A probe whose height is its row count, standing in for a laid-out region.
function harness({ rows, capacity, measurable = true }) {
    return defineComponent({
        setup() {
            const items = ref(Array.from({ length: rows }, (_, i) => `row-${i}`));
            const probeItems = ref([]);
            const probeEl = ref(null);

            const { slices, measured } = useFittedSlices({
                items,
                probeItems,
                probeEl,
                capacityFor: () => capacity,
            });

            const probeHeight = computed(() => probeItems.value.length * ROW_HEIGHT);

            return { items, probeItems, probeEl, slices, measured, probeHeight };
        },
        render() {
            const probe = measurable
                ? [
                      h('div', {
                          ref: 'probeEl',
                          class: 'probe',
                          // Read back by the stubbed getBoundingClientRect below.
                          'data-height': this.probeHeight,
                      }),
                  ]
                : [];
            return h('div', [
                ...probe,
                ...this.slices.map((slice, i) =>
                    h('div', { class: 'page', key: i }, slice.map(row => h('p', row)))
                ),
            ]);
        },
    });
}

const originalRect = Element.prototype.getBoundingClientRect;
Element.prototype.getBoundingClientRect = function getRect() {
    const declared = this.getAttribute?.('data-height');
    if (declared === null || declared === undefined) return originalRect.call(this);
    const height = Number(declared);
    return { top: 0, left: 0, right: 0, bottom: height, width: 0, height };
};

async function mountHarness(options) {
    const wrapper = mount(harness(options));
    await flushPromises();
    return wrapper;
}

describe('useFittedSlices', () => {
    it('keeps a list that fits as a single slice', async () => {
        const wrapper = await mountHarness({ rows: 5, capacity: 100 });

        expect(wrapper.vm.measured).toBe(true);
        expect(wrapper.findAll('.page')).toHaveLength(1);
        expect(wrapper.findAll('.page p')).toHaveLength(5);
    });

    it('splits a list that does not fit across slices', async () => {
        const wrapper = await mountHarness({ rows: 25, capacity: 100 });

        const pages = wrapper.findAll('.page');
        expect(pages).toHaveLength(3);
        expect(pages[0].findAll('p')).toHaveLength(10);
        expect(pages[2].findAll('p')).toHaveLength(5);
    });

    it('loses no rows when it splits', async () => {
        const wrapper = await mountHarness({ rows: 25, capacity: 100 });

        const rendered = wrapper.findAll('.page p').map(p => p.text());
        expect(rendered).toEqual(wrapper.vm.items);
    });

    it('empties the probe once measuring is done', async () => {
        const wrapper = await mountHarness({ rows: 25, capacity: 100 });

        expect(wrapper.vm.probeItems).toEqual([]);
    });

    it('renders the whole list when there is nothing to measure', async () => {
        const wrapper = await mountHarness({ rows: 25, capacity: 100, measurable: false });

        expect(wrapper.vm.measured).toBe(false);
        expect(wrapper.findAll('.page')).toHaveLength(1);
        expect(wrapper.findAll('.page p')).toHaveLength(25);
    });

    it('renders the whole list when the region has no usable height', async () => {
        const wrapper = await mountHarness({ rows: 25, capacity: 0 });

        expect(wrapper.vm.measured).toBe(false);
        expect(wrapper.findAll('.page p')).toHaveLength(25);
    });

    it('re-slices when the list changes', async () => {
        const wrapper = await mountHarness({ rows: 5, capacity: 100 });
        expect(wrapper.findAll('.page')).toHaveLength(1);

        wrapper.vm.items = Array.from({ length: 25 }, (_, i) => `row-${i}`);
        await flushPromises();

        expect(wrapper.findAll('.page')).toHaveLength(3);
    });
});
