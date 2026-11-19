// shared/src/components/dynasties/__tests__/PersonPicker.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('@shared/utils/api', () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('@shared/stores/realm', () => ({ useRealmStore: () => ({ activeRealm: null }) }));

import PersonPicker from '../PersonPicker.vue';
import { useDynastiesStore } from '@shared/stores/dynasties';

beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('PersonPicker', () => {
    it('shows the error instead of "no matches" when the search fails', async () => {
        const store = useDynastiesStore();
        store.search = vi.fn(async () => {
            store.error = { code: 'UNKNOWN', message: 'Network Error' };
            throw new Error('Network Error');
        });
        const w = mount(PersonPicker);
        await w.find('input').setValue('Ed');
        vi.advanceTimersByTime(300);
        await flushPromises();
        expect(w.text()).toContain('Network Error');
        expect(w.text()).not.toContain('matches');
    });
});
