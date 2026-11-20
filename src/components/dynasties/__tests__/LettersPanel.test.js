import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('@shared/utils/api', () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}));

import LettersPanel from '../LettersPanel.vue';
import { useDynastiesStore } from '@shared/stores/dynasties';

let store;
function setup(players) {
    store = useDynastiesStore();
    store.fetchLetters = vi.fn(async () => { store.letters.players = players; });
    store.setLetters = vi.fn(async () => {});
    return mount(LettersPanel);
}

beforeEach(() => setActivePinia(createPinia()));

describe('LettersPanel', () => {
    it('renders a labelled switch per player and the help line', async () => {
        const w = setup([{ userId: 'u1', name: 'Ann', on: true }, { userId: 'u2', name: 'Bo', on: false }]);
        await flushPromises();
        const boxes = w.findAll('input[type="checkbox"]');
        expect(boxes).toHaveLength(2);
        expect(boxes[0].element.checked).toBe(true);
        expect(boxes[1].element.checked).toBe(false);
        expect(w.find('label[for="' + boxes[0].attributes('id') + '"]').text()).toContain('Ann');
        expect(w.text()).toContain('Players get a letter from the Lorekeeper after each saved year. They can also stop the letters themselves from any letter.');
    });

    it('shows the empty text', async () => {
        const w = setup([]);
        await flushPromises();
        expect(w.text()).toContain('No players in this realm yet.');
        expect(w.findAll('input')).toHaveLength(0);
    });

    it('saves a change and disables the switch while it is in flight', async () => {
        const w = setup([{ userId: 'u1', name: 'Ann', on: true }]);
        await flushPromises();
        let release;
        store.setLetters = vi.fn(() => new Promise((r) => { release = r; }));
        await w.find('input').setValue(false);
        expect(store.setLetters).toHaveBeenCalledWith('u1', false);
        expect(w.find('input').element.disabled).toBe(true);
        release();
        await flushPromises();
        expect(w.find('input').element.disabled).toBe(false);
    });
});
