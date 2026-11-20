// shared/src/views/dynasties/__tests__/DynastyViews.test.js
// The house and person pages: limits reach the tree, players get no controls.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

let params = {};
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }), useRoute: () => ({ params }) }));
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

import DynastyHouse from '../DynastyHouse.vue';
import DynastyPerson from '../DynastyPerson.vue';
import Hourglass from '@shared/components/dynasties/Hourglass.vue';
import PersonEditDialog from '@shared/components/dynasties/PersonEditDialog.vue';
import { useDynastiesStore } from '@shared/stores/dynasties';

const limits = { family: 'free', maxTrees: 3, maxGenerations: 3, softCap: 20, hardCap: 2 };
const stubs = { 'router-link': { props: ['to'], template: '<a><slot /></a>' } };

beforeEach(() => {
    setActivePinia(createPinia());
    role = { isDM: true, isAdmin: false };
    HTMLDialogElement.prototype.showModal = vi.fn(function showModal() { this.open = true; });
    HTMLDialogElement.prototype.close = vi.fn(function close() { this.open = false; });
});

function seed(store, houseExtra = {}) {
    store.houses = [{ id: 'h1', name: 'Vane', personCount: 2, livingCount: 1, ...houseExtra }];
    store.status = { maxTrees: 3, total: 1, active: 1, needsSelection: false, limits };
    store.fetchHouses = vi.fn(async () => {});
}

const person = { id: 'p1', name: 'Edda', houseId: 'h1', gender: 'female', born: 212, titles: [] };
const hourglass = { person, father: null, mother: null, siblings: [], grandparents: {}, marriages: [], childGroups: [], deletable: true, legitimacy: 'unknown' };

describe('DynastyPerson', () => {
    it('passes frozen to the tree for a frozen house', async () => {
        params = { personId: 'p1' };
        const store = useDynastiesStore();
        seed(store, { frozen: true });
        store.fetchPerson = vi.fn(async () => hourglass);
        const w = mount(DynastyPerson, { global: { stubs } });
        await flushPromises();
        expect(w.findComponent(Hourglass).props('canAdd')).toEqual({ reason: 'frozen' });
        expect(w.text()).toContain('Frozen');
    });

    it('passes full when the house is at its hard cap', async () => {
        params = { personId: 'p1' };
        const store = useDynastiesStore();
        seed(store, { livingCount: 2 });
        store.fetchPerson = vi.fn(async () => hourglass);
        const w = mount(DynastyPerson, { global: { stubs } });
        await flushPromises();
        expect(w.findComponent(Hourglass).props('canAdd')).toEqual({ reason: 'full' });
    });
});

describe('DynastyPerson adding a parent', () => {
    it('deletes the new parent and offers the upgrade link when linking hits the generation limit', async () => {
        params = { personId: 'p1' };
        const store = useDynastiesStore();
        seed(store);
        store.fetchPerson = vi.fn(async () => hourglass);
        store.savePerson = vi.fn(async () => {
            store.error = { code: 'GENERATION_LIMIT', message: 'A family tree can hold at most 3 generations', upgrade: true };
            throw new Error('409');
        });
        store.deletePerson = vi.fn(async () => {
            store.error = null;
        });
        const w = mount(DynastyPerson, { global: { stubs } });
        await flushPromises();
        w.findComponent(Hourglass).vm.$emit('add', { role: 'mother' });
        await flushPromises();
        w.findComponent(PersonEditDialog).vm.$emit('saved', { id: 'new1', name: 'Hild' });
        await flushPromises();
        expect(store.savePerson).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1', motherId: 'new1' }));
        expect(store.deletePerson).toHaveBeenCalledWith('new1');
        const err = w.find('.action-error');
        expect(err.text()).toContain('at most 3 generations');
        expect(err.find('a').attributes('href')).toMatch(/\/pricing$/);
    });

    it('keeps a plain error without an upgrade link for other link failures', async () => {
        params = { personId: 'p1' };
        const store = useDynastiesStore();
        seed(store);
        store.fetchPerson = vi.fn(async () => hourglass);
        store.savePerson = vi.fn(async () => {
            store.error = { code: 'VALIDATION', message: 'Born after the child' };
            throw new Error('400');
        });
        store.deletePerson = vi.fn(async () => {});
        const w = mount(DynastyPerson, { global: { stubs } });
        await flushPromises();
        w.findComponent(Hourglass).vm.$emit('add', { role: 'father' });
        await flushPromises();
        w.findComponent(PersonEditDialog).vm.$emit('saved', { id: 'new2', name: 'Oswin' });
        await flushPromises();
        expect(store.deletePerson).toHaveBeenCalledWith('new2');
        const err = w.find('.action-error');
        expect(err.text()).toContain('Born after the child');
        expect(err.find('a').exists()).toBe(false);
    });
});

describe('DynastyPerson on a frozen tree, as a DM', () => {
    it('hides marriage edits and Edit but keeps the DM-only details', async () => {
        params = { personId: 'p1' };
        const store = useDynastiesStore();
        seed(store, { frozen: true });
        const spouse = { id: 'p2', name: 'Oswin', houseId: 'h1', gender: 'male' };
        store.fetchPerson = vi.fn(async () => ({
            ...hourglass,
            person: { ...person, fatherPresumed: true },
            marriages: [{ id: 'm1', personA: 'p1', personB: 'p2', spouseId: 'p2', spouse, from: 230 }],
        }));
        const w = mount(DynastyPerson, { global: { stubs } });
        await flushPromises();
        expect(w.text()).toContain('Oswin');
        expect(w.find('.edit-marriage').exists()).toBe(false);
        expect(w.text()).toContain('True father');
        expect(w.findAll('button').some((b) => b.text() === 'Edit')).toBe(false);
    });

    it('shows marriage edits on an active tree', async () => {
        params = { personId: 'p1' };
        const store = useDynastiesStore();
        seed(store);
        const spouse = { id: 'p2', name: 'Oswin', houseId: 'h1', gender: 'male' };
        store.fetchPerson = vi.fn(async () => ({
            ...hourglass,
            marriages: [{ id: 'm1', personA: 'p1', personB: 'p2', spouseId: 'p2', spouse, from: 230 }],
        }));
        const w = mount(DynastyPerson, { global: { stubs } });
        await flushPromises();
        expect(w.find('.edit-marriage').exists()).toBe(true);
    });
});

describe('when the house list fails to load', () => {
    function failing(store) {
        store.houses = [];
        store.status = null;
        store.fetchHouses = vi.fn(async () => { throw new Error('500'); });
    }

    it('keeps adding off on the person page and says why', async () => {
        params = { personId: 'p1' };
        const store = useDynastiesStore();
        failing(store);
        store.fetchPerson = vi.fn(async () => hourglass);
        const w = mount(DynastyPerson, { global: { stubs } });
        await flushPromises();
        expect(w.findComponent(Hourglass).props('canAdd')).toEqual({ reason: 'unknown' });
        expect(w.text()).toContain("limits could not be loaded");
    });

    it('blocks adds silently while the limits are still loading', async () => {
        params = { personId: 'p1' };
        const store = useDynastiesStore();
        store.houses = [];
        store.status = null;
        store.fetchHouses = vi.fn(() => new Promise(() => {}));
        store.fetchPerson = vi.fn(async () => hourglass);
        const w = mount(DynastyPerson, { global: { stubs } });
        await flushPromises();
        expect(w.findComponent(Hourglass).props('canAdd')).toEqual({ reason: 'loading' });
        expect(w.find('.add-blocked').exists()).toBe(false);
    });

    it('disables Add person on the house page with a notice', async () => {
        params = { houseId: 'h1' };
        const store = useDynastiesStore();
        failing(store);
        store.fetchHouse = vi.fn(async () => {
            store.house = { house: { id: 'h1', name: 'Vane' }, people: [], marriedIn: [], bornElsewhere: [] };
        });
        const w = mount(DynastyHouse, { global: { stubs } });
        await flushPromises();
        const add = w.findAll('button').find((b) => b.text() === 'Add person');
        expect(add.attributes('disabled')).toBeDefined();
        expect(w.text()).toContain('limits could not be loaded');
    });
});

describe('DynastyHouse', () => {
    const page = { house: { id: 'h1', name: 'Vane' }, people: [{ ...person }], marriedIn: [], bornElsewhere: [] };

    it('gives a DM the house controls', async () => {
        params = { houseId: 'h1' };
        const store = useDynastiesStore();
        seed(store);
        store.fetchHouse = vi.fn(async () => { store.house = page; });
        const w = mount(DynastyHouse, { global: { stubs } });
        await flushPromises();
        expect(w.text()).toContain('Add person');
        expect(w.text()).toContain('Edda');
    });

    it('shows a player no controls', async () => {
        role = { isDM: false, isAdmin: false };
        params = { houseId: 'h1' };
        const store = useDynastiesStore();
        seed(store, { frozen: true });
        store.fetchHouse = vi.fn(async () => { store.house = { ...page, house: { ...page.house, frozen: true } }; });
        const w = mount(DynastyHouse, { global: { stubs } });
        await flushPromises();
        expect(w.findAll('button')).toHaveLength(0);
        expect(w.find('.frozen-tag').exists()).toBe(true);
    });

    it('shows an Elders row once, apart from the general list', async () => {
        params = { houseId: 'h1' };
        const store = useDynastiesStore();
        seed(store);
        const elder = { id: 'p9', name: 'Old Brannoc', houseId: 'h1', gender: 'male', born: 180, titles: [] };
        store.fetchHouse = vi.fn(async () => { store.house = { ...page, people: [{ ...person }, elder], elders: [elder] }; });
        const w = mount(DynastyHouse, { global: { stubs } });
        await flushPromises();
        expect(w.find('.elders').text()).toContain('Old Brannoc');
        expect(w.text().split('Old Brannoc')).toHaveLength(2);
    });

    it('has no Elders row when there are none', async () => {
        params = { houseId: 'h1' };
        const store = useDynastiesStore();
        seed(store);
        store.fetchHouse = vi.fn(async () => { store.house = { ...page, elders: [] }; });
        const w = mount(DynastyHouse, { global: { stubs } });
        await flushPromises();
        expect(w.find('.elders').exists()).toBe(false);
    });

    it('gives a DM the History button and hides it from players', async () => {
        params = { houseId: 'h1' };
        const store = useDynastiesStore();
        seed(store);
        store.fetchHouse = vi.fn(async () => { store.house = page; });
        let w = mount(DynastyHouse, { global: { stubs } });
        await flushPromises();
        expect(w.find('.history-link').exists()).toBe(true);
        role = { isDM: false, isAdmin: false };
        w = mount(DynastyHouse, { global: { stubs } });
        await flushPromises();
        expect(w.find('.history-link').exists()).toBe(false);
    });
});
