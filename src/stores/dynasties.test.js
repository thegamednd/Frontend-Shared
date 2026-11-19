import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

const { get, post, put, del } = vi.hoisted(() => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
}));

vi.mock('@shared/utils/api', () => ({
    default: { get, post, put, delete: del },
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
