// shared/src/components/dynasties/__tests__/PersonEditDialog.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('@shared/utils/api', () => ({
    default: { get: vi.fn(async () => ({ data: { data: {} } })), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('@shared/stores/realm', () => ({
    useRealmStore: () => ({ activeRealm: { DateSuffix: { Abbr: 'SF' } } }),
}));
vi.mock('@shared/stores/user', () => ({
    useUserStore: () => ({ isDM: true, isAdmin: false }),
}));
vi.mock('@shared/stores/character', () => ({
    useCharacterStore: () => ({
        fetchCharacters: vi.fn(),
        characters: {
            c1: { ID: 'c1', Name: 'Aldric Vane', Born: '190', Image: 'aldric.jpg' },
            c2: { ID: 'c2', Name: 'Mirel', Born: null },
        },
    }),
}));

import PersonEditDialog from '../PersonEditDialog.vue';
import { useDynastiesStore } from '@shared/stores/dynasties';

beforeEach(() => {
    setActivePinia(createPinia());
    HTMLDialogElement.prototype.showModal = vi.fn(function showModal() { this.open = true; });
    HTMLDialogElement.prototype.close = vi.fn(function close() {
        this.open = false;
        this.dispatchEvent(new Event('close'));
    });
});

function mountDialog() {
    const store = useDynastiesStore();
    store.houses = [{ id: 'h1', name: 'Vane', livingCount: 1 }];
    store.status = { limits: { hardCap: 12, maxGenerations: 3, family: 'free' } };
    store.savePerson = vi.fn(async (p) => ({ id: 'p9', ...p }));
    store.fetchHouses = vi.fn();
    const w = mount(PersonEditDialog, {
        attachTo: document.body,
        global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } },
    });
    return { w, store };
}

describe('PersonEditDialog', () => {
    it('saves born 212 as { born: 212 } with no approx keys', async () => {
        const { w, store } = mountDialog();
        w.vm.open({ defaults: { houseId: 'h1' } });
        await flushPromises();
        await w.find('input[data-field="name"]').setValue('Edda');
        await w.find('input[data-field="born"]').setValue('212');
        expect(w.find('input[data-field="bornApprox"]').exists()).toBe(false);
        await w.find('form').trigger('submit');
        await flushPromises();
        expect(store.savePerson).toHaveBeenCalledTimes(1);
        expect(store.savePerson.mock.calls[0][0]).toMatchObject({
            name: 'Edda', houseId: 'h1', born: 212,
        });
        expect(store.savePerson.mock.calls[0][0]).not.toHaveProperty('bornApprox');
        expect(store.savePerson.mock.calls[0][0]).not.toHaveProperty('diedApprox');
    });

    it('fills an empty name from the chosen character', async () => {
        const { w } = mountDialog();
        w.vm.open({ defaults: { houseId: 'h1' }, source: 'character' });
        await flushPromises();
        const row = w.findAll('.character-picker .rows button').find((b) => b.text().includes('Aldric Vane'));
        expect(row).toBeTruthy();
        await row.trigger('click');
        await flushPromises();
        expect(w.find('input[data-field="name"]').element.value).toBe('Aldric Vane');
        expect(w.find('input[data-field="born"]').element.value).toBe('190');
    });

    it('shows the server message when a save is refused with TREE_FULL', async () => {
        const { w, store } = mountDialog();
        store.savePerson = vi.fn(async () => {
            store.error = { code: 'TREE_FULL', message: 'This family tree is full (12 living)', limit: 12 };
            throw new Error('Request failed with status code 409');
        });
        w.vm.open({ defaults: { houseId: 'h1' } });
        await flushPromises();
        await w.find('input[data-field="name"]').setValue('Edda');
        await w.find('input[data-field="born"]').setValue('212');
        await w.find('form').trigger('submit');
        await flushPromises();
        expect(w.find('.save-error').text()).toContain('This family tree is full (12 living)');
    });

    it('offers the upgrade link on GENERATION_LIMIT when the server says so', async () => {
        const { w, store } = mountDialog();
        store.savePerson = vi.fn(async () => {
            store.error = { code: 'GENERATION_LIMIT', message: 'A family tree can hold at most 3 generations', upgrade: true };
            throw new Error('409');
        });
        w.vm.open({ defaults: { houseId: 'h1' } });
        await flushPromises();
        await w.find('input[data-field="name"]').setValue('Edda');
        await w.find('input[data-field="born"]').setValue('212');
        await w.find('form').trigger('submit');
        await flushPromises();
        const err = w.find('.save-error');
        expect(err.text()).toContain('at most 3 generations');
        expect(err.find('a').exists()).toBe(true);
    });

    it('limits the name to 120 characters', async () => {
        const { w } = mountDialog();
        w.vm.open({ defaults: { houseId: 'h1' } });
        await flushPromises();
        expect(w.find('input[data-field="name"]').attributes('maxlength')).toBe('120');
    });

    it('refuses year 0 before saving', async () => {
        const { w, store } = mountDialog();
        w.vm.open({ defaults: { houseId: 'h1' } });
        await flushPromises();
        await w.find('input[data-field="name"]').setValue('Edda');
        await w.find('input[data-field="born"]').setValue('0');
        await w.find('form').trigger('submit');
        await flushPromises();
        expect(store.savePerson).not.toHaveBeenCalled();
        expect(w.text()).toContain('Year 0 does not exist');
    });
});
