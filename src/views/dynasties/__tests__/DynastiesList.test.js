// shared/src/views/dynasties/__tests__/DynastiesList.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }), useRoute: () => ({ params: {} }) }));
vi.mock('@shared/utils/api', () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('@shared/stores/realm', () => ({
    useRealmStore: () => ({ activeRealm: { DateSuffix: { Abbr: 'SF' }, Date: { y: 250 } } }),
}));
let role = { isDM: true, isAdmin: false };
vi.mock('@shared/stores/user', () => ({ useUserStore: () => role }));
vi.mock('@shared/stores/character', () => ({
    useCharacterStore: () => ({ fetchCharacters: vi.fn(), characters: {} }),
}));

import DynastiesList from '../DynastiesList.vue';
import { useDynastiesStore } from '@shared/stores/dynasties';

const limits = { family: 'free', maxTrees: 3, maxGenerations: 3, softCap: 20, hardCap: 30 };
const house = (id, name, extra = {}) => ({ id, name, personCount: 2, livingCount: 2, founderName: null, ...extra });

const stubs = { 'router-link': { props: ['to'], template: '<a class="rl" :data-to="typeof to === \'string\' ? to : to.name"><slot /></a>' } };

function setup({ houses, status }) {
    const store = useDynastiesStore();
    store.fetchHouses = vi.fn(async () => {
        store.houses = houses;
        store.status = status;
    });
    store.setActiveHouses = vi.fn(async () => {});
    return mount(DynastiesList, { global: { stubs }, attachTo: document.body });
}

const addBtn = (w) => w.findAll('button').find((b) => b.text().includes('Add house'));
const activationOpen = () => document.querySelector('.activation-dialog')?.open === true;

beforeEach(() => {
    setActivePinia(createPinia());
    role = { isDM: true, isAdmin: false };
    document.body.innerHTML = '';
    HTMLDialogElement.prototype.showModal = vi.fn(function showModal() { this.open = true; });
    HTMLDialogElement.prototype.close = vi.fn(function close() { this.open = false; });
});

const fourActive = [house('h1', 'Vane'), house('h2', 'Ashford'), house('h3', 'Corwen'), house('h4', 'Dunmere')];
const needs = { maxTrees: 3, total: 4, active: 4, needsSelection: true, limits };

describe('DynastiesList', () => {
    it('opens the activation dialog for a DM when trees need choosing, and blocks Add house', async () => {
        const w = setup({ houses: fourActive, status: needs });
        await flushPromises();
        expect(activationOpen()).toBe(true);
        expect(addBtn(w).attributes('disabled')).toBeDefined();
        expect(w.find('.notice a[href$="/pricing"][target="_blank"]').exists()).toBe(true);
        w.unmount();
    });

    it('does not show the dialog or any controls to a player', async () => {
        role = { isDM: false, isAdmin: false };
        const w = setup({ houses: fourActive, status: needs });
        await flushPromises();
        expect(activationOpen()).toBe(false);
        expect(addBtn(w)).toBeUndefined();
        expect(w.text()).not.toContain('Choose active trees');
        w.unmount();
    });

    it('disables Add house with an upgrade link when the realm has all its trees', async () => {
        const houses = [house('h1', 'Vane'), house('h2', 'Ashford'), house('h3', 'Corwen')];
        const w = setup({ houses, status: { maxTrees: 3, total: 3, active: 3, needsSelection: false, limits } });
        await flushPromises();
        expect(w.text()).toContain('Trees: 3 of 3');
        expect(addBtn(w).attributes('disabled')).toBeDefined();
        expect(w.find('a[href$="/pricing"][target="_blank"]').exists()).toBe(true);
        expect(activationOpen()).toBe(false);
        w.unmount();
    });

    it('tags frozen houses and offers DMs the chooser', async () => {
        const houses = [house('h1', 'Vane'), house('h2', 'Ashford', { frozen: true })];
        const w = setup({ houses, status: { maxTrees: 3, total: 2, active: 1, needsSelection: false, limits } });
        await flushPromises();
        expect(w.find('.frozen-tag').text()).toBe('Frozen');
        expect(w.findAll('button').some((b) => b.text() === 'Choose active trees')).toBe(true);
        expect(addBtn(w).attributes('disabled')).toBeUndefined();
        w.unmount();
    });
});
