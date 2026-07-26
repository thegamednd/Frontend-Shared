// shared/src/views/members/Factions.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import Factions from './Factions.vue';

const routerPush = vi.fn();
vi.mock('vue-router', () => ({ useRouter: () => ({ push: routerPush }) }));
vi.mock('@shared/utils/api', () => ({
    default: {
        get: vi.fn(async () => ({ data: [
            { ID: 'f1', Name: 'Harpers', BriefDescription: 'Do-gooders', Known: true, Image: 'https://cdn/factions/harpers.jpg' },
            { ID: 'f2', Name: 'Zhentarim', BriefDescription: 'Shady', Known: false },
        ] })),
        post: vi.fn(), put: vi.fn(), delete: vi.fn(),
    },
}));

const notifyInfo = vi.fn();
vi.mock('@shared/composables/useNotifications', () => ({
    useNotifications: () => ({ notifyInfo, notifyError: vi.fn(), notifySuccess: vi.fn() }),
}));

let privileged = false;
let paid = true;
vi.mock('@shared/stores/realm', () => ({
    useRealmStore: () => ({
        get isOwner() { return privileged; },
        get isRealmDM() { return false; },
        get isPaidTier() { return paid; },
    }),
}));
vi.mock('@shared/stores/character', () => ({
    useCharacterStore: () => ({
        fetchCharacters: vi.fn(),
        characters: {
            c1: { ID: 'c1', Name: 'Bob', Factions: [{ FactionID: 'f1', Known: true }] },
            c2: { ID: 'c2', Name: 'Ann', Factions: [{ FactionID: 'f1', Known: true }] },
        },
    }),
}));

import { useFactionStore } from '@shared/stores/faction';

function mountView() {
    return mount(Factions, { global: { stubs: { teleport: true } } });
}

beforeEach(() => { setActivePinia(createPinia()); privileged = false; paid = true; vi.clearAllMocks(); });

beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function showModal() {
        this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function close() {
        this.open = false;
        this.dispatchEvent(new Event('close'));
    });
});

describe('Factions list', () => {
    it('shows name, brief description, and member count', async () => {
        const w = mountView();
        await flushPromises();
        const row = w.findAll('.faction-row')[0];
        expect(row.text()).toContain('Harpers');
        expect(row.text()).toContain('Do-gooders');
        expect(w.find('.member-count').text()).toContain('2');
    });

    it('hides Add/Edit controls and shows no badges for players', async () => {
        const w = mountView();
        await flushPromises();
        expect(w.find('.add-faction-btn').exists()).toBe(false);
        expect(w.find('.edit-faction-btn').exists()).toBe(false);
        expect(w.find('.hidden-badge').exists()).toBe(false);
    });

    it('shows Add/Edit and hidden badge for owner/DM', async () => {
        privileged = true;
        const w = mountView();
        await flushPromises();
        expect(w.find('.add-faction-btn').exists()).toBe(true);
        expect(w.findAll('.edit-faction-btn')).toHaveLength(2);
        expect(w.findAll('.hidden-badge')).toHaveLength(1);
    });

    it('clicking a faction navigates to its detail route', async () => {
        const w = mountView();
        await flushPromises();
        await w.findAll('.faction-row .faction-open')[0].trigger('click');
        expect(routerPush).toHaveBeenCalledWith({ name: 'Faction', params: { id: 'f1' } });
    });
});

describe('Factions help', () => {
    it('hides the help button from players', async () => {
        const w = mountView();
        await flushPromises();
        expect(w.find('.faction-help-btn').exists()).toBe(false);
        expect(w.find('dialog.faction-help').exists()).toBe(false);
    });

    it('shows the help button to owner/DM', async () => {
        privileged = true;
        const w = mountView();
        await flushPromises();
        expect(w.find('.faction-help-btn').exists()).toBe(true);
    });

    it('opens the help dialog when the button is clicked', async () => {
        privileged = true;
        const w = mountView();
        await flushPromises();
        expect(w.find('dialog.faction-help').attributes('open')).toBeUndefined();
        await w.find('.faction-help-btn').trigger('click');
        await flushPromises();
        expect(w.find('dialog.faction-help').attributes('open')).toBeDefined();
    });
});

describe('Factions list navigation', () => {
    it('navigates to the add form instead of opening a dialog', async () => {
        privileged = true;
        const w = mountView();
        await flushPromises();
        await w.find('.add-faction-btn').trigger('click');
        expect(routerPush).toHaveBeenCalledWith({ name: 'FactionAdd' });
        expect(w.find('.faction-dialog').exists()).toBe(false);
    });

    it('navigates to the edit form for a row', async () => {
        privileged = true;
        const w = mountView();
        await flushPromises();
        await w.findAll('.edit-faction-btn')[0].trigger('click');
        expect(routerPush).toHaveBeenCalledWith({ name: 'FactionEdit', params: { id: 'f1' } });
    });

    it('prompts to upgrade instead of navigating on the free tier', async () => {
        privileged = true;
        paid = false;
        const w = mountView();
        await flushPromises();
        await w.find('.add-faction-btn').trigger('click');
        expect(notifyInfo).toHaveBeenCalled();
        expect(routerPush).not.toHaveBeenCalledWith({ name: 'FactionAdd' });
    });

    it('shows a thumbnail for a faction that has an image', async () => {
        const w = mountView();
        await flushPromises();
        const img = w.find('.faction-thumb');
        expect(img.exists()).toBe(true);
        expect(img.attributes('src')).toBe('https://cdn/factions/harpers.jpg');
    });
});
