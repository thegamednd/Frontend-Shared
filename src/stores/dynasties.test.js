import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

const { get, post, put, del, patch } = vi.hoisted(() => ({
    patch: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
}));

vi.mock('@shared/utils/api', () => ({
    default: { get, post, put, patch, delete: del },
}));

import { useDynastiesStore } from './dynasties';

const status = { maxTrees: 2, total: 2, active: 2, needsSelection: false, limits: { hardCap: 10 } };

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
});

describe('fetchHouses', () => {
    it('stores houses and status', async () => {
        get.mockResolvedValue({ data: { success: true, data: { houses: [{ id: 'h1' }], status } } });
        const store = useDynastiesStore();
        await store.fetchHouses();
        expect(get).toHaveBeenCalledWith('/dynasties/houses');
        expect(store.houses).toEqual([{ id: 'h1' }]);
        expect(store.status).toEqual(status);
    });
});

describe('savePerson', () => {
    it('keeps the error and rethrows on TREE_FULL', async () => {
        const err = {
            response: { status: 409, data: { success: false, error: { code: 'TREE_FULL', message: 'Full', extra: { limit: 10 } } } },
        };
        post.mockRejectedValue(err);
        const store = useDynastiesStore();
        await expect(store.savePerson({ name: 'A' })).rejects.toBe(err);
        expect(store.error.code).toBe('TREE_FULL');
        expect(store.error.limit).toBe(10);
    });

    it('creates then refetches the open house', async () => {
        post.mockResolvedValue({ data: { data: { id: 'p1' } } });
        get.mockResolvedValue({ data: { data: { house: { id: 'h1' }, people: [] } } });
        const store = useDynastiesStore();
        store.house = { house: { id: 'h1' } };
        const out = await store.savePerson({ name: 'A', houseId: 'h1' });
        expect(out).toEqual({ id: 'p1' });
        expect(get).toHaveBeenCalledWith('/dynasties/houses/h1');
    });
});

describe('saves whose refetch fails', () => {
    it('savePerson resolves once the write succeeds, even if the refetch fails', async () => {
        post.mockResolvedValue({ data: { data: { id: 'p1' } } });
        get.mockRejectedValue(new Error('Network Error'));
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const store = useDynastiesStore();
        store.house = { house: { id: 'h1' } };
        await expect(store.savePerson({ name: 'A', houseId: 'h1' })).resolves.toEqual({ id: 'p1' });
        expect(store.error).toBeNull();
        expect(store.loading).toBe(false);
        warn.mockRestore();
    });

    it('saveMarriage and saveHouse resolve too', async () => {
        post.mockResolvedValue({ data: { data: { id: 'x1' } } });
        get.mockRejectedValue(new Error('Network Error'));
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const store = useDynastiesStore();
        store.person = { person: { id: 'p1' } };
        await expect(store.saveMarriage({ personA: 'p1', personB: 'p2' })).resolves.toEqual({ id: 'x1' });
        await expect(store.saveHouse({ name: 'Vane' })).resolves.toEqual({ id: 'x1' });
        expect(store.error).toBeNull();
        warn.mockRestore();
    });
});

describe('limitReached', () => {
    it('reports full and frozen', () => {
        const store = useDynastiesStore();
        store.status = status;
        store.houses = [
            { id: 'a', livingCount: 10 },
            { id: 'b', livingCount: 3, frozen: true },
        ];
        expect(store.limitReached('a')).toEqual({ full: true, frozen: false });
        expect(store.limitReached('b')).toEqual({ full: false, frozen: true });
    });
});

describe('advance polling', () => {
    const runOf = (status) => ({ data: { data: { id: 'r1', status } } });
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        useDynastiesStore().stopPolling();
        vi.useRealTimers();
    });

    it('repeats every 2s while running, then stops on ready', async () => {
        get.mockResolvedValueOnce(runOf('running')).mockResolvedValueOnce(runOf('running')).mockResolvedValue(runOf('ready'));
        const store = useDynastiesStore();
        await store.pollRun('r1');
        expect(store.advance.polling).toBe(true);
        await vi.advanceTimersByTimeAsync(1999);
        expect(get).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);
        expect(get).toHaveBeenCalledTimes(2);
        await vi.advanceTimersByTimeAsync(2000);
        expect(get).toHaveBeenCalledTimes(3);
        expect(store.advance.polling).toBe(false);
        await vi.advanceTimersByTimeAsync(10000);
        expect(get).toHaveBeenCalledTimes(3);
        expect(store.advance.run.status).toBe('ready');
    });

    it.each(['ready', 'blocked', 'failed', 'committed'])('stops at once on %s', async (status) => {
        get.mockResolvedValue(runOf(status));
        const store = useDynastiesStore();
        await store.pollRun('r1');
        expect(store.advance.polling).toBe(false);
        await vi.advanceTimersByTimeAsync(6000);
        expect(get).toHaveBeenCalledTimes(1);
    });

    it('keeps polling while committing', async () => {
        get.mockResolvedValue(runOf('committing'));
        const store = useDynastiesStore();
        await store.pollRun('r1');
        await vi.advanceTimersByTimeAsync(4000);
        expect(get).toHaveBeenCalledTimes(3);
    });

    it('stopPolling cancels the next fetch', async () => {
        get.mockResolvedValue(runOf('running'));
        const store = useDynastiesStore();
        await store.pollRun('r1');
        store.stopPolling();
        await vi.advanceTimersByTimeAsync(6000);
        expect(get).toHaveBeenCalledTimes(1);
        expect(store.advance.polling).toBe(false);
    });

    it('two pollRun calls while a fetch is in flight leave one loop', async () => {
        let release;
        get.mockImplementationOnce(() => new Promise((r) => { release = r; }));
        get.mockResolvedValue(runOf('running'));
        const store = useDynastiesStore();
        const first = store.pollRun('r1');
        const second = store.pollRun('r1');
        await second;
        release(runOf('running'));
        await first;
        get.mockClear();
        await vi.advanceTimersByTimeAsync(2000);
        expect(get).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(2000);
        expect(get).toHaveBeenCalledTimes(2);
        store.stopPolling();
        await vi.advanceTimersByTimeAsync(6000);
        expect(get).toHaveBeenCalledTimes(2);
    });

    it('a response arriving after stopPolling writes nothing', async () => {
        let release;
        get.mockImplementationOnce(() => new Promise((r) => { release = r; }));
        const store = useDynastiesStore();
        const p = store.pollRun('r1');
        store.stopPolling();
        release(runOf('running'));
        await p;
        expect(store.advance.run).toBeNull();
        await vi.advanceTimersByTimeAsync(6000);
        expect(get).toHaveBeenCalledTimes(1);
    });

    it('stops and records the error when a poll fails', async () => {
        get.mockRejectedValue({ response: { data: { error: { code: 'X', message: 'bad' } } } });
        const store = useDynastiesStore();
        await store.pollRun('r1');
        expect(store.advance.error.message).toBe('bad');
        expect(store.advance.polling).toBe(false);
    });
});

describe('advance actions', () => {
    it('hits the right routes', async () => {
        const run = { id: 'r1', status: 'ready' };
        const ok = { data: { data: run } };
        post.mockResolvedValue(ok);
        patch.mockResolvedValue(ok);
        del.mockResolvedValue(ok);
        const store = useDynastiesStore();
        await store.startAdvance();
        expect(post).toHaveBeenCalledWith('/dynasties/advance/runs');
        await store.editRun('r1', [{ ref: 'a', dropped: true }]);
        expect(patch).toHaveBeenCalledWith('/dynasties/advance/runs/r1', { edits: [{ ref: 'a', dropped: true }] });
        await store.addPlayerEvent('r1', { kind: 'pregnancy' });
        expect(post).toHaveBeenCalledWith('/dynasties/advance/runs/r1/events', { kind: 'pregnancy' });
        await store.removePlayerEvent('r1', 'dm:1');
        await store.removePlayerEvent('r1', 'a:b');
        expect(del).toHaveBeenCalledWith('/dynasties/advance/runs/r1/events/a%3Ab');
        await store.commitRun('r1');
        expect(post).toHaveBeenCalledWith('/dynasties/advance/runs/r1/commit');
        await store.discardRun('r1');
        expect(del).toHaveBeenCalledWith('/dynasties/advance/runs/r1');
        expect(store.advance.run).toBeNull();
    });

    it('setCurrentTo puts the year then refetches state', async () => {
        put.mockResolvedValue({ data: { data: {} } });
        get.mockResolvedValue({ data: { data: { currentTo: 5, canSetYear: true } } });
        const store = useDynastiesStore();
        await store.setCurrentTo(5);
        expect(put).toHaveBeenCalledWith('/dynasties/advance/year', { year: 5 });
        expect(store.advance.state.currentTo).toBe(5);
    });

    it('drop and history routes', async () => {
        get.mockResolvedValue({ data: { data: { years: [1], removed: [], elders: [] } } });
        post.mockResolvedValue({ data: { data: { removed: [], elders: [] } } });
        const store = useDynastiesStore();
        await store.previewDrop('h1');
        expect(get).toHaveBeenCalledWith('/dynasties/houses/h1/drop-generation');
        await store.dropGeneration('h1');
        expect(post).toHaveBeenCalledWith('/dynasties/houses/h1/drop-generation');
        expect(await store.fetchHistoryYears('h1')).toEqual([1]);
        await store.fetchHistory('h1', -3);
        expect(get).toHaveBeenCalledWith('/dynasties/houses/h1/history/-3');
    });
});
