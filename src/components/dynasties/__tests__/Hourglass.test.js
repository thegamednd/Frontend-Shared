// shared/src/components/dynasties/__tests__/Hourglass.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('@shared/utils/api', () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('@shared/stores/realm', () => ({
    useRealmStore: () => ({ activeRealm: { DateSuffix: { Abbr: 'AR' } } }),
}));
vi.mock('@shared/stores/character', () => ({
    useCharacterStore: () => ({ characters: {} }),
}));

import Hourglass from '../Hourglass.vue';
import { useDynastiesStore } from '@shared/stores/dynasties';

const RouterLink = { props: ['to'], template: '<a class="rl" :data-to="to"><slot /></a>' };

const data = {
    person: { id: 'p1', name: 'Edda Vane', houseId: 'h1', gender: 'female', born: 212 },
    father: { id: 'p0', name: 'Oswin Vane', houseId: 'h1', gender: 'male', born: 180 },
    mother: null,
    grandparents: {},
    marriages: [],
    childGroups: [
        {
            relation: 'unknown', otherParent: null, truncated: false,
            children: [{ id: 'c1', name: 'Bran', houseId: 'h1', born: 240, legitimate: 'unknown', grandchildren: [], grandchildrenTruncated: false }],
        },
    ],
    siblings: [],
};

function mountHourglass(canAdd, status = { limits: { hardCap: 12, maxGenerations: 3, family: 'free' } }) {
    const store = useDynastiesStore();
    store.status = status;
    return mount(Hourglass, {
        props: { data, editable: true, canAdd },
        global: { stubs: { 'router-link': RouterLink, RouterLink } },
    });
}

beforeEach(() => {
    setActivePinia(createPinia());
});

const addButtons = (w, text) => w.findAll('button').filter((b) => b.text().includes(text));

describe('Hourglass', () => {
    it('shows enabled add slots when nothing blocks adding', () => {
        const w = mountHourglass({ reason: null });
        const child = addButtons(w, 'Add child');
        expect(child).toHaveLength(1);
        expect(child[0].attributes('disabled')).toBeUndefined();
    });

    it('disables every add slot and names the limit when the family is full', () => {
        const w = mountHourglass({ reason: 'full' });
        const enabledChild = addButtons(w, 'Add child').filter((b) => b.attributes('disabled') === undefined);
        expect(enabledChild).toHaveLength(0);
        expect(w.findAll('button.add-slot:not([disabled])')).toHaveLength(0);
        expect(w.find('.add-blocked').text()).toContain('12 living members');
    });

    it('says the tree is frozen', () => {
        const w = mountHourglass({ reason: 'frozen' });
        expect(w.find('.add-blocked').text()).toContain('This tree is frozen');
        expect(w.findAll('button.add-slot:not([disabled])')).toHaveLength(0);
    });

    it('names the generation limit with an upgrade link on a free family', () => {
        const w = mountHourglass({ reason: 'generation' });
        const note = w.find('.add-blocked');
        expect(note.text()).toContain('3 generations');
        expect(note.find('a').attributes('data-to')).toBe('/account/manage-realm');
    });

    it('leaves out the upgrade link on a paid family', () => {
        const w = mountHourglass({ reason: 'generation' }, { limits: { hardCap: 60, maxGenerations: 16, family: 'paid' } });
        const note = w.find('.add-blocked');
        expect(note.text()).toContain('16 generations');
        expect(note.find('a').exists()).toBe(false);
    });

    it('shows years with the realm date suffix', () => {
        const w = mountHourglass({ reason: null });
        expect(w.text()).toContain('212 AR');
    });
});
