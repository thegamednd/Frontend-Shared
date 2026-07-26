import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

const routerPush = vi.fn();
vi.mock('vue-router', () => ({
    useRouter: () => ({ push: routerPush }),
    useRoute: () => ({ params: {} }),
}));

vi.mock('@shared/stores/character', () => ({
    useCharacterStore: () => ({
        loaded: true,
        default: {
            Name: { val: '' },
            Group: { val: null },
            Bio: { val: '' },
        },
        arSortedGroups: [{ Name: 'NPC' }, { Name: 'PC' }],
        createCharacter: vi.fn(async () => ({ ID: 'c1' })),
    }),
}));

let paid = true;
vi.mock('@shared/stores/realm', () => ({
    useRealmStore: () => ({
        get isOwner() { return true; },
        get isRealmDM() { return false; },
        get isPaidTier() { return paid; },
        activeRealmId: 'r1',
    }),
}));

vi.mock('@shared/stores/user', () => ({
    useUserStore: () => ({ loaded: true, userSub: 'u1', activeRealmId: 'r1', realmUsers: [] }),
}));

const loadFactions = vi.fn(async () => undefined);
vi.mock('@shared/stores/faction', () => ({
    useFactionStore: () => ({
        loadFactions,
        arFactionsAZ: [
            { ID: 'f1', Name: 'Harpers' },
            { ID: 'f2', Name: 'Zhentarim' },
        ],
        loaded: true,
    }),
}));

vi.mock('@shared/utils/api', () => ({
    default: { get: vi.fn(async () => ({ data: [] })), post: vi.fn(), put: vi.fn() },
}));

vi.mock('@shared/components/cms/InlineEditor.vue', () => ({
    default: { name: 'InlineEditor', props: ['modelValue'], template: '<div class="stub-editor"></div>' },
}));

// vue-multiselect and its stylesheet are aliased to stubs in vitest.config.js.

import MemberAdd from './MemberAdd.vue';

async function mountAdd() {
    const w = mount(MemberAdd);
    await flushPromises();
    return w;
}

beforeEach(() => {
    setActivePinia(createPinia());
    paid = true;
    vi.clearAllMocks();
});

describe('free-tier faction gating on the create form', () => {
    it('disables every faction checkbox on the free tier', async () => {
        paid = false;
        const w = await mountAdd();
        const boxes = w.findAll('.faction-assign .faction-check input[type="checkbox"]');
        expect(boxes.length).toBe(2);
        boxes.forEach((b) => expect(b.attributes('disabled')).toBeDefined());
        expect(w.find('.faction-upgrade-hint').exists()).toBe(true);
    });

    it('leaves every faction checkbox interactive on a paid tier', async () => {
        paid = true;
        const w = await mountAdd();
        const boxes = w.findAll('.faction-assign .faction-check input[type="checkbox"]');
        expect(boxes.length).toBe(2);
        boxes.forEach((b) => expect(b.attributes('disabled')).toBeUndefined());
        expect(w.find('.faction-upgrade-hint').exists()).toBe(false);
    });
});
