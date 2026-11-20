// shared/src/views/dynasties/__tests__/DynastyHistory.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

let router;
vi.mock('vue-router', () => ({ useRouter: () => router, useRoute: () => ({ params: { houseId: 'h1' } }) }));
vi.mock('@shared/utils/api', () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}));
vi.mock('@shared/stores/realm', () => ({
    useRealmStore: () => ({ activeRealm: { DateSuffix: { Abbr: 'SF' } }, getRealmDMs: realmDMs }),
}));
let realmDMs = [{ UserID: 'dm-1' }];
let role = { isDM: true, isAdmin: false };
vi.mock('@shared/stores/user', () => ({ useUserStore: () => role }));

import DynastyHistory from '../DynastyHistory.vue';
import { useDynastiesStore } from '@shared/stores/dynasties';

const stubs = { 'router-link': { props: ['to'], template: '<a class="rl"><slot /></a>' } };

const byYear = {
    252: { entry: {}, lines: [] },
    251: { entry: {}, lines: [{ text: 'Aldric died.', type: 'event', personId: 'p1' }, { text: '~ ~ ~', type: 'divider' }, { text: 'Mira was born.', type: 'event', personId: 'p2' }] },
    250: { entry: {}, lines: [{ text: 'A quiet note.', type: 'note' }] },
};

let store;
function setup() {
    store = useDynastiesStore();
    store.fetchHouse = vi.fn(async () => ({ house: { id: 'h1', name: 'Vane' } }));
    store.fetchHistoryYears = vi.fn(async () => ({ years: [{ year: 250 }, { year: 252 }, { year: 251 }] }));
    store.fetchHistory = vi.fn(async (_h, y) => byYear[y]);
    return mount(DynastyHistory, { global: { stubs } });
}
const btn = (w, text) => w.findAll('button').find((b) => b.text() === text);

beforeEach(() => {
    setActivePinia(createPinia());
    role = { isDM: true, isAdmin: false };
    realmDMs = [{ UserID: 'dm-1' }];
    router = { push: vi.fn(), replace: vi.fn() };
});

describe('DynastyHistory', () => {
    it('opens on the newest year and says when nothing happened', async () => {
        const w = setup();
        await flushPromises();
        expect(w.find('.year-title').text()).toBe('252 SF');
        expect(w.text()).toContain('Nothing of note happened this year.');
    });

    it('steps through the years with Previous and Next', async () => {
        const w = setup();
        await flushPromises();
        expect(btn(w, 'Next').attributes('disabled')).toBeDefined();
        await btn(w, 'Previous').trigger('click');
        await flushPromises();
        expect(w.find('.year-title').text()).toBe('251 SF');
        expect(w.text()).toContain('Aldric died.');
        expect(w.text()).toContain('Mira was born.');
        expect(w.findAll('.divider')).toHaveLength(1);
        expect(w.findAll('a.rl')).toHaveLength(2 + 2);
        await btn(w, 'Next').trigger('click');
        await flushPromises();
        expect(w.find('.year-title').text()).toBe('252 SF');
    });

    it('jumps to a year from the list', async () => {
        const w = setup();
        await flushPromises();
        await w.find('#year-select').setValue('250');
        await flushPromises();
        expect(w.find('.year-title').text()).toBe('250 SF');
        expect(btn(w, 'Previous').attributes('disabled')).toBeDefined();
    });

    it('redirects a player once the user has loaded, even with no DMs listed', async () => {
        role = { isDM: false, isAdmin: false, loaded: true };
        realmDMs = [];
        setup();
        await flushPromises();
        expect(router.replace).toHaveBeenCalledWith({ name: 'DynastyHouse', params: { houseId: 'h1' } });
    });

    it('shows a failure when a year cannot be loaded', async () => {
        const w = setup();
        store.fetchHistory = vi.fn(async () => { throw new Error('boom'); });
        await flushPromises();
        expect(w.text()).toContain("Couldn't load this year.");
    });

    it('shows a failure when the house cannot be loaded', async () => {
        store = useDynastiesStore();
        store.fetchHouse = vi.fn(async () => { throw new Error('boom'); });
        store.fetchHistoryYears = vi.fn(async () => ({ years: [] }));
        const w = mount(DynastyHistory, { global: { stubs } });
        await flushPromises();
        expect(w.text()).toContain("Couldn't load this history.");
    });

    it('sends a player back to the house page', async () => {
        role = { isDM: false, isAdmin: false };
        const w = setup();
        await flushPromises();
        expect(router.replace).toHaveBeenCalledWith({ name: 'DynastyHouse', params: { houseId: 'h1' } });
        expect(store.fetchHistoryYears).not.toHaveBeenCalled();
        expect(w.find('.year-title').exists()).toBe(false);
    });
});
