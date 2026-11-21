// shared/src/components/dynasties/__tests__/ScandalsToggleCard.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('@shared/utils/api', () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}));
let role = { isDM: true, isAdmin: false };
vi.mock('@shared/stores/user', () => ({ useUserStore: () => role }));

import ScandalsToggleCard from '../ScandalsToggleCard.vue';
import { useDynastiesStore } from '@shared/stores/dynasties';

const stubs = { 'router-link': { props: ['to'], template: '<a class="rl" :data-to="to.name"><slot /></a>' } };

let store;
function setup(on = false) {
    store = useDynastiesStore();
    store.getScandalSettings = vi.fn(async () => ({ on }));
    store.setScandalSettings = vi.fn(async (v) => ({ on: v }));
    return mount(ScandalsToggleCard, { global: { stubs } });
}

beforeEach(() => {
    setActivePinia(createPinia());
    role = { isDM: true, isAdmin: false };
});

describe('ScandalsToggleCard', () => {
    it('shows the DM the switch, the explainer and the scandals link', async () => {
        const w = setup(false);
        await flushPromises();
        const input = w.find('input[role="switch"]');
        expect(input.element.checked).toBe(false);
        expect(w.find('.rl[data-to="DynastyScandals"]').exists()).toBe(true);
        expect(w.text()).not.toContain('—');
        await input.setValue(true);
        await flushPromises();
        expect(store.setScandalSettings).toHaveBeenCalledWith(true);
        expect(input.element.checked).toBe(true);
    });

    it('puts the switch back when the save fails', async () => {
        const w = setup(true);
        await flushPromises();
        store.setScandalSettings = vi.fn(async () => { throw new Error('x'); });
        const input = w.find('input[role="switch"]');
        await input.setValue(false);
        await flushPromises();
        expect(input.element.checked).toBe(true);
        expect(w.find('[role="alert"]').exists()).toBe(true);
    });

    it('shows nothing to a player', async () => {
        role = { isDM: false, isAdmin: false };
        const w = setup(true);
        await flushPromises();
        expect(w.find('input').exists()).toBe(false);
        expect(store.getScandalSettings).not.toHaveBeenCalled();
    });
});
