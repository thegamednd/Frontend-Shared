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
    store.fetchLetters = vi.fn(async () => { store.letters.players = []; });
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
        // Before the first save: point at the year setting, not at the realm's date.
        expect(w.find('.limit-note').text()).toBe('The trees are current to the game year. To start from an earlier year, set the year above. Otherwise, wait for the game year to move on.');
        expect(w.text()).not.toContain("Move the realm's date");
        w.unmount();
    });

    it('after the first save, at the game year: the next advance waits for the game year to move on', async () => {
        const w = setup({ currentTo: 253, canSetYear: false });
        await flushPromises();
        expect(w.find('.limit-note').text()).toBe('The trees are current to the game year. You can advance them again once the game year moves on.');
        w.unmount();
    });

    it('a preview running for over 10 minutes offers Try again, which starts a new one', async () => {
        const old = new Date(Date.now() - 11 * 60 * 1000).toISOString();
        const w = setup({ latestRun: { id: 'r1', status: 'running', year: 251, events: [], startedAt: old } });
        await flushPromises();
        expect(w.find('.stuck').text()).toContain('has probably stopped');
        await w.find('.stuck button').trigger('click');
        await flushPromises();
        expect(store.startAdvance).toHaveBeenCalled();
        w.unmount();
    });

    it('a save stuck for over 10 minutes offers Try again, which saves again; a fresh one does not', async () => {
        const fresh = setup({ latestRun: readyRun({ status: 'committing', commitAttempted: true, startedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), committingSince: new Date().toISOString() }) });
        await flushPromises();
        expect(fresh.find('.stuck').exists()).toBe(false);
        fresh.unmount();
        setActivePinia(createPinia());
        const old = new Date(Date.now() - 11 * 60 * 1000).toISOString();
        const w = setup({ latestRun: readyRun({ status: 'committing', commitAttempted: true, startedAt: old, committingSince: old }) });
        await flushPromises();
        expect(w.find('.stuck').text()).toContain('Nothing gets saved twice');
        await w.find('.stuck button').trigger('click');
        await flushPromises();
        expect(store.commitRun).toHaveBeenCalledWith('r1');
        w.unmount();
    });

    it('a failed save whose year step failed some other way can only be saved again', async () => {
        const w = setup({ latestRun: readyRun({ commitAttempted: true, treesWritten: true, error: 'throttled' }) });
        await flushPromises();
        expect(btn(w, 'Discard')).toBeUndefined();
        expect(w.text()).not.toContain("the trees keep");
        expect(w.text()).toContain('The save stopped partway.');
        w.unmount();
    });

    it('a save refused because the run is no longer ready says there is nothing to save', async () => {
        const w = setup({ latestRun: readyRun() });
        await flushPromises();
        store.commitRun = vi.fn(async () => {
            store.error = { code: 'RUN_STATE', message: 'Only a finished preview can be saved' };
            throw new Error('409');
        });
        await btn(w, 'Save 251 SF').trigger('click');
        await flushPromises();
        expect(w.text()).toContain("There's nothing to save in this advance any more.");
        expect(w.text()).not.toContain('The save has started');
        expect(btn(w, 'Refresh')).toBeDefined();
        w.unmount();
    });

    it('a failed save whose year was moved by someone else can be discarded', async () => {
        const w = setup({ latestRun: readyRun({ commitAttempted: true, treesWritten: true, yearMoved: true, error: 'moved' }) });
        await flushPromises();
        expect(w.text()).toContain('the "current to" year didn\'t move');
        await btn(w, 'Discard').trigger('click');
        await flushPromises();
        expect(w.find('.confirm-dialog').text()).toContain("The trees keep this year's changes.");
        const confirm = w.findAll('.confirm-dialog button').find((b) => b.text() === 'Discard preview');
        await confirm.trigger('click');
        await flushPromises();
        expect(store.discardRun).toHaveBeenCalledWith('r1');
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
        expect(w.text()).not.toMatch(/commit/i);
        await btn(w, 'Save 251 SF').trigger('click');
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

    it('after a save attempt: offers only Save again', async () => {
        const w = setup({ latestRun: readyRun({ commitAttempted: true, error: 'Write failed' }) });
        await flushPromises();
        expect(btn(w, 'Discard')).toBeUndefined();
        expect(btn(w, 'Player characters')).toBeUndefined();
        expect(btn(w, 'Leave out')).toBeUndefined();
        expect(w.text()).toContain('Write failed');
        expect(w.text()).not.toMatch(/commit/i);
        await btn(w, 'Save again').trigger('click');
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

    it('shows the Letters panel in every phase', async () => {
        const w = setup();
        await flushPromises();
        expect(w.text()).toContain('Letters');
        expect(w.text()).toContain('No players in this realm yet.');
        w.unmount();
        const w2 = setup({ latestRun: readyRun() });
        await flushPromises();
        expect(w2.text()).toContain('No players in this realm yet.');
        w2.unmount();
    });

    it.each([
        [{ letters: 'queued' }, 'Letters are being sent.'],
        [{ letters: 'sent', lettersSent: 1, lettersSkipped: 0 }, 'Letters sent to 1 player.'],
        [{ letters: 'sent', lettersSent: 3, lettersSkipped: 0 }, 'Letters sent to 3 players.'],
        [{ letters: 'sent', lettersSent: 3, lettersSkipped: 2 }, 'Letters sent to 3 players. 2 could not be sent.'],
        [{ letters: 'failed' }, 'The letters could not be sent.'],
    ])('committed letter status %j', async (res, text) => {
        const w = setup({
            currentTo: 251,
            latestRun: readyRun({ status: 'committed', result: { committedAt: new Date().toISOString(), ...res } }),
        });
        await flushPromises();
        expect(w.find('.letter-status').text()).toBe(text);
        w.unmount();
    });

    it('committed with no letters shows no status', async () => {
        const w = setup({ currentTo: 251, latestRun: readyRun({ status: 'committed', result: { committedAt: new Date().toISOString() } }) });
        await flushPromises();
        expect(w.find('.letter-status').exists()).toBe(false);
        w.unmount();
    });

    it('queued for over 10 minutes says the letters may not have gone out', async () => {
        const at = new Date(Date.now() - 11 * 60 * 1000).toISOString();
        const w = setup({ currentTo: 251, latestRun: readyRun({ status: 'committed', result: { committedAt: at, letters: 'queued' } }) });
        await flushPromises();
        expect(w.find('.letter-status').text()).toBe('Letters may not have gone out.');
        w.unmount();
    });

    it('resumes polling a committed run with queued letters', async () => {
        const w = setup({ currentTo: 251, latestRun: readyRun({ status: 'committed', result: { committedAt: new Date().toISOString(), letters: 'queued' } }) });
        await flushPromises();
        expect(store.pollRun).toHaveBeenCalledWith('r1');
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
        await btn(w, 'Save 251 SF').trigger('click');
        await flushPromises();
        expect(w.text()).toContain("The trees changed after this preview was made, so it can't be saved.");
        await btn(w, 'Run a fresh preview').trigger('click');
        await flushPromises();
        expect(store.startAdvance).toHaveBeenCalled();
        w.unmount();
    });
});
