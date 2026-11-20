// shared/src/components/dynasties/__tests__/PlayerCharactersDialog.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('@shared/utils/api', () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import PlayerCharactersDialog from '../PlayerCharactersDialog.vue';
import { useDynastiesStore } from '@shared/stores/dynasties';
import { upgradeUrl } from '@shared/utils/dynastyErrors';

const run = {
    id: 'r1',
    status: 'ready',
    year: 251,
    houses: { h1: 'Vane' },
    people: {
        p1: { name: 'Aldric Vane', houseId: 'h1', gender: 'male' },
        p2: { name: 'Mira Vane', houseId: 'h1', gender: 'female' },
        p3: { name: 'Tamsin', houseId: 'h1', gender: 'female' },
    },
    events: [{ kind: 'pregnancy', ref: 'dm:1', motherId: 'p3', unwed: true, byDm: true }],
    players: [
        { memberIds: ['p1'], spouses: [{ personId: 'p2', odds: 0.012 }], couples: [['p1', 'p2']] },
        { memberIds: ['p3'], spouses: [] },
    ],
};

let store;
beforeEach(() => {
    setActivePinia(createPinia());
    store = useDynastiesStore();
    store.addPlayerEvent = vi.fn(async () => run);
    store.removePlayerEvent = vi.fn(async () => run);
    store.editRun = vi.fn(async () => run);
    HTMLDialogElement.prototype.showModal = vi.fn(function showModal() { this.open = true; });
    HTMLDialogElement.prototype.close = vi.fn(function close() { this.open = false; });
});

function mountDialog(props = {}) {
    return mount(PlayerCharactersDialog, { props: { open: true, run, ...props }, attachTo: document.body });
}

const btns = (w, text) => w.findAll('button').filter((b) => b.text() === text);

describe('PlayerCharactersDialog', () => {
    it('lists the player characters and their spouses\' odds', () => {
        const w = mountDialog();
        expect(w.text()).toContain('Aldric Vane');
        expect(w.text()).toContain('Mira Vane');
        expect(w.text()).toContain('1.2% chance of a child outside the marriage');
        w.unmount();
    });

    it('adds a child for a couple', async () => {
        const w = mountDialog();
        await btns(w, 'Child')[0].trigger('click');
        await flushPromises();
        expect(store.addPlayerEvent).toHaveBeenCalledWith('r1', { kind: 'pregnancy', motherId: 'p2', fatherId: 'p1' });
        w.unmount();
    });

    it('adds an illegitimate child: a natural child for a man, a pregnancy for a woman', async () => {
        const w = mountDialog();
        const ill = btns(w, 'Illegitimate child');
        await ill[0].trigger('click');
        await flushPromises();
        expect(store.addPlayerEvent).toHaveBeenLastCalledWith('r1', { kind: 'natural', fatherId: 'p1' });
        await ill[1].trigger('click');
        await flushPromises();
        expect(store.addPlayerEvent).toHaveBeenLastCalledWith('r1', { kind: 'pregnancy', motherId: 'p2', other: true });
        w.unmount();
    });

    it('removes a child it added', async () => {
        const w = mountDialog();
        await btns(w, 'Remove')[0].trigger('click');
        await flushPromises();
        expect(store.removePlayerEvent).toHaveBeenCalledWith('r1', 'dm:1');
        w.unmount();
    });

    it('explains a TREE_FULL refusal', async () => {
        store.addPlayerEvent = vi.fn(async () => {
            store.error = { code: 'TREE_FULL', message: 'This family tree is full (30 living)', limit: 30 };
            throw new Error('409');
        });
        const w = mountDialog();
        await btns(w, 'Child')[0].trigger('click');
        await flushPromises();
        expect(w.find('[role="alert"]').text()).toContain('This family tree is full');
        expect(w.find('[role="alert"] a').exists()).toBe(false);
        w.unmount();
    });

    it('explains a GENERATION_LIMIT refusal with the upgrade link', async () => {
        store.addPlayerEvent = vi.fn(async () => {
            store.error = { code: 'GENERATION_LIMIT', message: 'A family tree can hold at most 3 generations', limit: 3, upgrade: true };
            throw new Error('409');
        });
        const w = mountDialog();
        await btns(w, 'Child')[0].trigger('click');
        await flushPromises();
        const alert = w.find('[role="alert"]');
        expect(alert.text()).toContain('generation limit');
        expect(alert.find('a').attributes('href')).toBe(upgradeUrl());
        w.unmount();
    });
});
