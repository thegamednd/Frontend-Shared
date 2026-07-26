import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

const routerPush = vi.fn();
vi.mock('vue-router', () => ({
    useRouter: () => ({ push: routerPush }),
    useRoute: () => ({ params: { id: 'c1' } }),
}));

// The character the form loads. Each test replaces it before mounting.
let storedCharacter = { ID: 'c1', Name: 'Rhen', Group: 'NPC', Factions: [] };
vi.mock('@shared/stores/character', () => ({
    useCharacterStore: () => ({
        loaded: true,
        get characters() { return { c1: storedCharacter }; },
        get characterList() { return [storedCharacter]; },
        arSortedGroups: [{ Name: 'NPC' }, { Name: 'PC' }],
        loadCharactersForActiveRealm: vi.fn(async () => undefined),
        deleteCharacter: vi.fn(async () => undefined),
    }),
}));

let paid = true;
vi.mock('@shared/stores/realm', () => ({
    useRealmStore: () => ({
        get isOwner() { return true; },
        get isRealmDM() { return false; },
        get isPaidTier() { return paid; },
    }),
}));

vi.mock('@shared/stores/user', () => ({
    useUserStore: () => ({ activeRealmId: 'r1', realmUsers: [] }),
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

// vue-multiselect and its stylesheet are aliased to stubs in vitest.config.js —
// shared/ does not install the package itself.

import MemberEdit from './MemberEdit.vue';

async function mountEditFor(characterOverrides = {}) {
    storedCharacter = { ID: 'c1', Name: 'Rhen', Group: 'NPC', Factions: [], ...characterOverrides };
    const w = mount(MemberEdit);
    await flushPromises();
    return w;
}

beforeEach(() => {
    setActivePinia(createPinia());
    paid = true;
    vi.clearAllMocks();
});

describe('free-tier faction membership gating', () => {
    it('disables unheld faction checkboxes on the free tier', async () => {
        paid = false;
        const w = await mountEditFor({ Factions: [{ FactionID: 'f1', Known: true }] });
        const boxes = w.findAll('.faction-assign .faction-check input[type="checkbox"]');
        expect(boxes.length).toBe(2);
        // f1 is held, so it stays interactive; f2 is not held, so it is disabled.
        expect(w.find('.faction-assign[data-faction-id="f1"] .faction-check input[type="checkbox"]').attributes('disabled')).toBeUndefined();
        expect(w.find('.faction-assign[data-faction-id="f2"] .faction-check input[type="checkbox"]').attributes('disabled')).toBeDefined();
    });

    it('leaves all faction checkboxes interactive on a paid tier', async () => {
        paid = true;
        const w = await mountEditFor({ Factions: [{ FactionID: 'f1', Known: true }] });
        expect(w.find('.faction-assign[data-faction-id="f1"] .faction-check input[type="checkbox"]').attributes('disabled')).toBeUndefined();
        expect(w.find('.faction-assign[data-faction-id="f2"] .faction-check input[type="checkbox"]').attributes('disabled')).toBeUndefined();
    });

    it('shows an upgrade hint on the free tier', async () => {
        paid = false;
        const w = await mountEditFor({ Factions: [] });
        expect(w.find('.faction-upgrade-hint').exists()).toBe(true);
    });

    it('shows no upgrade hint on a paid tier', async () => {
        paid = true;
        const w = await mountEditFor({ Factions: [] });
        expect(w.find('.faction-upgrade-hint').exists()).toBe(false);
    });

    it('still lets a held membership be removed on the free tier', async () => {
        paid = false;
        const w = await mountEditFor({ Factions: [{ FactionID: 'f1', Known: true }] });
        const held = w.find('.faction-assign[data-faction-id="f1"] .faction-check input[type="checkbox"]');
        expect(held.element.checked).toBe(true);
        await held.setValue(false);
        expect(w.find('.faction-assign[data-faction-id="f1"] .faction-check input[type="checkbox"]').element.checked).toBe(false);
        // The nested "known member" row only renders for assigned factions.
        expect(w.find('.faction-assign[data-faction-id="f1"] .faction-known-check').exists()).toBe(false);
    });

    it('lets a membership unchecked in this session be re-checked on the free tier', async () => {
        paid = false;
        const w = await mountEditFor({ Factions: [{ FactionID: 'f1', Known: true }] });
        const sel = '.faction-assign[data-faction-id="f1"] .faction-check input[type="checkbox"]';
        await w.find(sel).setValue(false);
        // The server judges "new" against the stored memberships, so putting
        // f1 back is still a valid write and must not be blocked.
        expect(w.find(sel).attributes('disabled')).toBeUndefined();
        await w.find(sel).setValue(true);
        expect(w.find(sel).element.checked).toBe(true);
    });
});
