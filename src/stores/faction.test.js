import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

const { post } = vi.hoisted(() => ({
    post: vi.fn(),
}));

vi.mock('@shared/utils/api', () => ({
    default: { get: vi.fn(), post, put: vi.fn(), delete: vi.fn() },
}));

import { useFactionStore } from './faction';

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
});

describe('uploadFactionImage', () => {
    it('posts the file as base64 and returns the url', async () => {
        post.mockResolvedValue({ data: { url: 'https://cdn/factions/a.jpg' } });
        const store = useFactionStore();
        const file = new File(['bytes'], 'crest.png', { type: 'image/png' });

        const url = await store.uploadFactionImage(file);

        expect(url).toBe('https://cdn/factions/a.jpg');
        expect(post).toHaveBeenCalledTimes(1);
        const [path, body] = post.mock.calls[0];
        expect(path).toBe('/characters/factions/images');
        expect(body.imageData).toMatch(/^data:image\/png;base64,/);
    });

    it('throws when the response carries no url', async () => {
        post.mockResolvedValue({ data: {} });
        const store = useFactionStore();
        const file = new File(['bytes'], 'crest.png', { type: 'image/png' });
        await expect(store.uploadFactionImage(file)).rejects.toThrow();
    });
});
