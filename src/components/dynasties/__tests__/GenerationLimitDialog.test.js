// shared/src/components/dynasties/__tests__/GenerationLimitDialog.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('@shared/utils/api', () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import GenerationLimitDialog from '../GenerationLimitDialog.vue';
import { useDynastiesStore } from '@shared/stores/dynasties';
import { upgradeUrl } from '@shared/utils/dynastyErrors';

const plan = {
    removed: [
        { id: 'p1', name: 'Old Aldric', alive: true },
        { id: 'p2', name: 'Berta', alive: false },
        { id: 'p3', name: 'Cuthbert', alive: false },
    ],
    elders: [{ id: 'p4', name: 'Dorian' }],
};

let store;
beforeEach(() => {
    setActivePinia(createPinia());
    store = useDynastiesStore();
    store.previewDrop = vi.fn(async () => plan);
    store.dropGeneration = vi.fn(async () => plan);
    HTMLDialogElement.prototype.showModal = vi.fn(function showModal() { this.open = true; });
    HTMLDialogElement.prototype.close = vi.fn(function close() { this.open = false; });
});

function mountDialog(props = {}) {
    return mount(GenerationLimitDialog, { props: { open: true, houseId: 'h1', houseName: 'Vane', ...props }, attachTo: document.body });
}

const dropBtn = (w) => w.findAll('button').find((b) => b.text() === 'Drop the oldest generation');

describe('GenerationLimitDialog', () => {
    it('lists who goes and who stays', async () => {
        const w = mountDialog();
        await flushPromises();
        expect(store.previewDrop).toHaveBeenCalledWith('h1');
        expect(w.find('.drop-living').text()).toContain('Old Aldric');
        expect(w.find('.drop-elders').text()).toContain('Dorian');
        expect(w.text()).toContain('2 people who have already died');
        w.unmount();
    });

    it('links to the upgrade page', async () => {
        const w = mountDialog();
        await flushPromises();
        const link = w.find('a[target="_blank"]');
        expect(link.attributes('href')).toBe(upgradeUrl());
        w.unmount();
    });

    it('drops the generation and reports it', async () => {
        const w = mountDialog();
        await flushPromises();
        await dropBtn(w).trigger('click');
        await flushPromises();
        expect(store.dropGeneration).toHaveBeenCalledWith('h1');
        expect(w.emitted('dropped')[0][0]).toBe('h1');
        w.unmount();
    });

    it('shows the refusal when the drop fails', async () => {
        store.dropGeneration = vi.fn(async () => {
            store.error = { code: 'TREE_FROZEN', message: 'This family tree is frozen and cannot be changed' };
            throw new Error('409');
        });
        const w = mountDialog();
        await flushPromises();
        await dropBtn(w).trigger('click');
        await flushPromises();
        expect(w.find('[role="alert"]').text()).toContain('frozen');
        expect(w.emitted('dropped')).toBeUndefined();
        w.unmount();
    });
});
