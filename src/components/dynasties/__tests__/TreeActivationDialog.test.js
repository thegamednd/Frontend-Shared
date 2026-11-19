// shared/src/components/dynasties/__tests__/TreeActivationDialog.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import TreeActivationDialog from '../TreeActivationDialog.vue';

const houses = [
    { id: 'h1', name: 'Vane' },
    { id: 'h2', name: 'Ashford' },
    { id: 'h3', name: 'Corwen', frozen: true },
    { id: 'h4', name: 'Dunmere' },
];

beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function showModal() { this.open = true; });
    HTMLDialogElement.prototype.close = vi.fn(function close() { this.open = false; });
});

function mountDialog(props = {}) {
    return mount(TreeActivationDialog, { props: { houses, maxTrees: 3, open: true, ...props }, attachTo: document.body });
}

const saveBtn = (w) => w.find('button[type="submit"]');

describe('TreeActivationDialog', () => {
    it('disables Save with 4 checked and a limit of 3', async () => {
        const w = mountDialog();
        await flushPromises();
        const boxes = w.findAll('input[type="checkbox"]');
        for (const b of boxes) await b.setValue(true);
        expect(w.text()).toContain('4 of 3 selected');
        expect(saveBtn(w).attributes('disabled')).toBeDefined();
        w.unmount();
    });

    it('starts from the active trees and disables Save when nothing is chosen', async () => {
        const w = mountDialog();
        await flushPromises();
        expect(w.text()).toContain('3 of 3 selected');
        for (const b of w.findAll('input[type="checkbox"]')) await b.setValue(false);
        expect(w.text()).toContain('0 of 3 selected');
        expect(saveBtn(w).attributes('disabled')).toBeDefined();
        w.unmount();
    });

    it('emits the chosen ids on save', async () => {
        const w = mountDialog();
        await flushPromises();
        await w.find('input[value="h4"]').setValue(false);
        await w.find('input[value="h3"]').setValue(true);
        expect(saveBtn(w).attributes('disabled')).toBeUndefined();
        await w.find('form').trigger('submit');
        expect(w.emitted('save')[0][0].sort()).toEqual(['h1', 'h2', 'h3']);
        w.unmount();
    });
});
