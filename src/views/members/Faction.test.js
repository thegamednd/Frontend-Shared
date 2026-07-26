// shared/src/views/members/Faction.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import Faction from './Faction.vue';

vi.mock('@shared/utils/api', () => ({
    default: {
        get: vi.fn(async () => ({ data: [
            { ID: 'f1', Name: 'Harpers', Description: '<p>A <strong>bold</strong> group</p>', Image: 'https://cdn/factions/harpers.jpg', Known: true },
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
        expect(w.text()).toContain('bold');
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

describe('faction detail presentation', () => {
    it('renders the faction image when present', async () => {
        const w = mountView();
        await flushPromises();
        const img = w.find('.faction-image');
        expect(img.exists()).toBe(true);
        expect(img.attributes('src')).toBe('https://cdn/factions/harpers.jpg');
    });

    it('renders the description as html', async () => {
        const w = mountView();
        await flushPromises();
        expect(w.find('.description').html()).toContain('<strong>bold</strong>');
    });
});
