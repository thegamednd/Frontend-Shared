// shared/src/views/dynasties/__tests__/DynastyAdvance.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

let router;
vi.mock('vue-router', () => ({ useRouter: () => router, useRoute: () => ({ params: {} }) }));
vi.mock('@shared/utils/api', () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}));
vi.mock('@shared/stores/realm', () => ({
    useRealmStore: () => ({ activeRealm: { DateSuffix: { Abbr: 'SF' } }, getRealmDMs: [{ UserID: 'dm-1' }] }),
}));
let role = { isDM: true, isAdmin: false };
vi.mock('@shared/stores/user', () => ({ useUserStore: () => role }));

import DynastyAdvance from '../DynastyAdvance.vue';
import { useDynastiesStore } from '@shared/stores/dynasties';

const stubs = { 'router-link': { props: ['to'], template: '<a class="rl"><slot /></a>' } };

const base = { currentTo: 250, gameYear: 253, canSetYear: true, treeStatus: { needsSelection: false }, latestRun: null };

const readyRun = (extra = {}) => ({
    id: 'r1',
    status: 'ready',
    year: 251,
    houses: { h1: 'Vane', h2: 'Ashford' },
    people: {
        p1: { name: 'Aldric Vane', houseId: 'h1', gender: 'male' },
        p2: { name: 'Mira Vane', houseId: 'h1', gender: 'female' },
    },
    events: [{ kind: 'death', ref: 'e1', personId: 'p1', age: 70, cause: 'A fever' }],
    noRace: [{ personId: 'p2', name: 'Mira Vane' }],
    capState: { h1: { living: 30, pregnant: 0, softCap: 20, hardCap: 30, atHardCap: true } },
    prunes: { h2: { removed: [{ id: 'x1', name: 'Old Brannoc', alive: true }], elders: [] } },
    players: [{ memberIds: ['p2'], spouses: [] }],
    ...extra,
});

let store;
function setup(state = {}) {
    store = useDynastiesStore();
    const data = { ...base, ...state };
    store.fetchAdvance = vi.fn(async () => {
        store.advance.state = data;
        if (data.latestRun) store.advance.run = data.latestRun;
        return data;
    });
    store.pollRun = vi.fn(async () => store.advance.run);
    store.stopPolling = vi.fn();
    store.startAdvance = vi.fn(async () => {
        store.advance.run = { id: 'r2', status: 'running', year: 251, events: [], noRace: [] };
        return store.advance.run;
    });
    store.commitRun = vi.fn(async (id) => {
        store.advance.run = { ...store.advance.run, id, status: 'committing', commitAttempted: true };
        return store.advance.run;
    });
    store.discardRun = vi.fn(async () => { store.advance.run = null; });
    store.editRun = vi.fn(async () => store.advance.run);
    store.previewDrop = vi.fn(async () => ({ removed: [{ id: 'x1', name: 'Old Aldric', alive: true }], elders: [] }));
    store.dropGeneration = vi.fn(async () => ({ removed: [], elders: [] }));
    store.fetchHouses = vi.fn(async () => {
        store.houses = [{ id: 'h1', name: 'Vane' }, { id: 'h2', name: 'Ashford' }];
        store.status = { maxTrees: 1, total: 2, needsSelection: true };
    });
    store.setActiveHouses = vi.fn(async () => {});
    return mount(DynastyAdvance, { global: { stubs }, attachTo: document.body });
}

const btn = (w, text) => w.findAll('button').find((b) => b.text() === text);

beforeEach(() => {
    setActivePinia(createPinia());
    role = { isDM: true, isAdmin: false };
    router = { push: vi.fn(), replace: vi.fn() };
    document.body.innerHTML = '';
    HTMLDialogElement.prototype.showModal = vi.fn(function showModal() { this.open = true; });
    HTMLDialogElement.prototype.close = vi.fn(function close() { this.open = false; });
});

describe('DynastyAdvance', () => {
    it('sends a player back to the list without loading anything', async () => {
        role = { isDM: false, isAdmin: false };
        const w = setup();
        await flushPromises();
        expect(router.replace).toHaveBeenCalledWith({ name: 'Dynasties' });
        expect(store.fetchAdvance).not.toHaveBeenCalled();
        w.unmount();
    });

    it('with no run: shows the year line and starts an advance', async () => {
        const w = setup();
        await flushPromises();
        expect(w.text()).toContain('Trees are current to 250 SF. The game year is 253 SF.');
        const advance = w.find('.advance-btn');
        expect(advance.text()).toContain('Advance to 251 SF');
        expect(advance.attributes('disabled')).toBeUndefined();
        await advance.trigger('click');
        await flushPromises();
        expect(store.startAdvance).toHaveBeenCalled();
        expect(store.pollRun).toHaveBeenCalledWith('r2');
        expect(w.text()).toContain('Rolling 251 SF');
        w.unmount();
    });

    it('disables Advance with the reason when the trees are current to the game year', async () => {
        const w = setup({ currentTo: 253 });
        await flushPromises();
        expect(w.find('.advance-btn').attributes('disabled')).toBeDefined();
        expect(w.text()).toContain('The trees are already current to the game year.');
        w.unmount();
    });

    it('running: shows progress and polls', async () => {
        const w = setup({ latestRun: { id: 'r1', status: 'running', year: 251, events: [] } });
        await flushPromises();
        expect(store.pollRun).toHaveBeenCalledWith('r1');
        expect(w.find('[role="status"]').text()).toContain('Rolling 251 SF');
        w.unmount();
    });

    it('blocked: drops a generation, then offers to run again', async () => {
        const w = setup({
            latestRun: { id: 'r1', status: 'blocked', year: 251, events: [], blocked: [{ houseId: 'h1', houseName: 'Vane', reason: 'generation' }] },
        });
        await flushPromises();
        expect(w.text()).toContain('Vane');
        await btn(w, 'Drop or upgrade').trigger('click');
        await flushPromises();
        const drop = w.findAll('.generation-dialog button').find((b) => b.text() === 'Drop the oldest generation');
        await drop.trigger('click');
        await flushPromises();
        expect(store.dropGeneration).toHaveBeenCalledWith('h1');
        await btn(w, 'Run the advance again').trigger('click');
        await flushPromises();
        expect(store.startAdvance).toHaveBeenCalled();
        w.unmount();
    });

    it('ready: shows the review, notices and lists, and commits', async () => {
        const w = setup({ latestRun: readyRun() });
        await flushPromises();
        expect(w.text()).toContain('Aldric Vane dies aged 70');
        expect(w.text()).toContain('At the hard cap');
        expect(w.text()).toContain('Old Brannoc');
        expect(w.find('.no-race').text()).toContain('Mira Vane');
        expect(btn(w, 'Player characters')).toBeDefined();
        expect(btn(w, 'Discard')).toBeDefined();
        await btn(w, 'Commit 251 SF').trigger('click');
        await flushPromises();
        expect(store.commitRun).toHaveBeenCalledWith('r1');
        expect(store.pollRun).toHaveBeenCalledWith('r1');
        expect(w.text()).toContain('Saving 251 SF');
        w.unmount();
    });

    it('ready: saves an edit through editRun', async () => {
        const w = setup({ latestRun: readyRun() });
        await flushPromises();
        await btn(w, 'Leave out').trigger('click');
        await flushPromises();
        expect(store.editRun).toHaveBeenCalledWith('r1', [{ ref: 'e1', dropped: true }]);
        w.unmount();
    });

    it('ready: discards after confirming', async () => {
        const w = setup({ latestRun: readyRun() });
        await flushPromises();
        await btn(w, 'Discard').trigger('click');
        await flushPromises();
        const confirm = w.findAll('.confirm-dialog button').find((b) => b.text() === 'Discard preview');
        await confirm.trigger('click');
        await flushPromises();
        expect(store.discardRun).toHaveBeenCalledWith('r1');
        w.unmount();
    });

    it('after a commit attempt: offers only Commit again', async () => {
        const w = setup({ latestRun: readyRun({ commitAttempted: true, error: 'Write failed' }) });
        await flushPromises();
        expect(btn(w, 'Discard')).toBeUndefined();
        expect(btn(w, 'Player characters')).toBeUndefined();
        expect(btn(w, 'Leave out')).toBeUndefined();
        expect(w.text()).toContain('Write failed');
        await btn(w, 'Commit again').trigger('click');
        await flushPromises();
        expect(store.commitRun).toHaveBeenCalledWith('r1');
        w.unmount();
    });

    it('committing: shows progress', async () => {
        const w = setup({ latestRun: readyRun({ status: 'committing', commitAttempted: true }) });
        await flushPromises();
        expect(w.find('[role="status"]').text()).toContain('Saving 251 SF');
        expect(store.pollRun).toHaveBeenCalledWith('r1');
        w.unmount();
    });

    it('committed: shows a summary', async () => {
        const w = setup({
            currentTo: 251,
            canSetYear: false,
            latestRun: readyRun({ status: 'committed', result: { committedAt: 'x', characterErrors: [] } }),
        });
        await flushPromises();
        expect(w.text()).toContain('251 SF is recorded');
        w.unmount();
    });

    it('failed: shows the error and tries again', async () => {
        const w = setup({ latestRun: { id: 'r1', status: 'failed', year: 251, events: [], error: 'Bedrock timed out' } });
        await flushPromises();
        expect(w.text()).toContain('Bedrock timed out');
        await btn(w, 'Try again').trigger('click');
        await flushPromises();
        expect(store.startAdvance).toHaveBeenCalled();
        w.unmount();
    });

    it('opens the tree chooser on TREE_SELECTION_REQUIRED', async () => {
        const w = setup();
        await flushPromises();
        store.startAdvance = vi.fn(async () => {
            store.error = { code: 'TREE_SELECTION_REQUIRED', message: 'Choose' };
            throw new Error('409');
        });
        await w.find('.advance-btn').trigger('click');
        await flushPromises();
        expect(store.fetchHouses).toHaveBeenCalled();
        expect(document.querySelector('.activation-dialog')?.open).toBe(true);
        w.unmount();
    });

    it('offers a fresh preview on STALE_PREVIEW', async () => {
        const w = setup({ latestRun: readyRun() });
        await flushPromises();
        store.commitRun = vi.fn(async () => {
            store.error = { code: 'STALE_PREVIEW', message: 'stale' };
            throw new Error('409');
        });
        await btn(w, 'Commit 251 SF').trigger('click');
        await flushPromises();
        expect(w.text()).toContain('The trees changed after this preview was made');
        await btn(w, 'Run a fresh preview').trigger('click');
        await flushPromises();
        expect(store.startAdvance).toHaveBeenCalled();
        w.unmount();
    });
});
