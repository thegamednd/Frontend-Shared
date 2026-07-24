// shared/src/views/members/Faction.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import Faction from './Faction.vue';

vi.mock('@shared/utils/api', () => ({
    default: {
        get: vi.fn(async () => ({ data: [
            { ID: 'f1', Name: 'Harpers', Description: 'Long lore here', Known: true },
        ] })),
    },
}));
let privileged = false;
vi.mock('@shared/stores/realm', () => ({
    useRealmStore: () => ({ get isOwner() { return privileged; }, get isRealmDM() { return false; } }),
}));
vi.mock('@shared/stores/character', () => ({
    useCharacterStore: () => ({
        fetchCharacters: vi.fn(),
        characters: {
            c1: { ID: 'c1', Name: 'Bob', Image: 'bob.jpg', Factions: [{ FactionID: 'f1', Known: true }] },
            c2: { ID: 'c2', Name: 'Spy', Image: 'spy.jpg', Factions: [{ FactionID: 'f1', Known: false }] },
        },
    }),
}));

function mountView(id = 'f1') {
    return mount(Faction, {
        props: { id },
        global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } },
    });
}

beforeEach(() => { setActivePinia(createPinia()); privileged = false; vi.clearAllMocks(); });

describe('Faction detail', () => {
    it('renders the long description and member cards', async () => {
        privileged = true;
        const w = mountView();
        await flushPromises();
        expect(w.text()).toContain('Long lore here');
        expect(w.findAll('.member-card')).toHaveLength(2);
    });

    it('badges secret members for owner/DM', async () => {
        privileged = true;
        const w = mountView();
        await flushPromises();
        const badges = w.findAll('.member-badge');
        expect(badges).toHaveLength(1);
        expect(badges[0].text()).toBe('hidden');
    });

    it('shows a not-found state for a missing faction', async () => {
        const w = mountView('nope');
        await flushPromises();
        expect(w.find('.not-found').exists()).toBe(true);
    });
});
