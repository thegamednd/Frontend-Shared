// shared/src/components/dynasties/__tests__/dialogs.test.js
// The marriage and house dialogs and the person panel: refusals from the
// server reach the user, and the panel renders a record.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('@shared/utils/api', () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('@shared/stores/realm', () => ({
    useRealmStore: () => ({ activeRealm: { DateSuffix: { Abbr: 'SF' }, Date: { y: 250 } } }),
}));
vi.mock('@shared/stores/user', () => ({ useUserStore: () => ({ isDM: true, isAdmin: false }) }));
vi.mock('@shared/stores/character', () => ({
    useCharacterStore: () => ({ fetchCharacters: vi.fn(), characters: { c1: { ID: 'c1', Name: 'Aldric', Born: '190' } } }),
}));

import MarriageEditDialog from '../MarriageEditDialog.vue';
import HouseEditDialog from '../HouseEditDialog.vue';
import PersonPanel from '../PersonPanel.vue';
import { useDynastiesStore } from '@shared/stores/dynasties';

const stubs = { 'router-link': { props: ['to'], template: '<a><slot /></a>' } };

beforeEach(() => {
    setActivePinia(createPinia());
    HTMLDialogElement.prototype.showModal = vi.fn(function showModal() { this.open = true; });
    HTMLDialogElement.prototype.close = vi.fn(function close() { this.open = false; });
});

describe('MarriageEditDialog', () => {
    it('shows the server message when the tree is frozen', async () => {
        const store = useDynastiesStore();
        store.saveMarriage = vi.fn(async () => {
            store.error = { code: 'TREE_FROZEN', message: 'This family tree is frozen and cannot be changed' };
            throw new Error('409');
        });
        const w = mount(MarriageEditDialog, { global: { stubs } });
        w.vm.open({
            anchor: { id: 'p1', name: 'Edda', houseId: 'h1' },
            marriage: { id: 'm1', spouseId: 'p2', spouse: { id: 'p2', name: 'Oswin' }, from: 230 },
        });
        await flushPromises();
        await w.find('form').trigger('submit');
        await flushPromises();
        expect(store.saveMarriage.mock.calls[0][0]).toMatchObject({ id: 'm1', personA: 'p1', personB: 'p2', from: 230 });
        expect(w.find('.save-error').text()).toContain('frozen');
    });
});

describe('HouseEditDialog', () => {
    it('creates a house, then its new founder, then sets the founder', async () => {
        const store = useDynastiesStore();
        store.saveHouse = vi.fn(async (h) => ({ id: 'h1', ...h }));
        store.savePerson = vi.fn(async (p) => ({ id: 'p1', ...p }));
        const w = mount(HouseEditDialog, { global: { stubs } });
        w.vm.open();
        await flushPromises();
        await w.find('#hf-name').setValue('Vane');
        await w.find('input[name="founder-mode"][value="new"]').setValue(true);
        await w.find('#hf-founder').setValue('Oswin');
        await w.find('#hf-founder-born').setValue('-12');
        await w.find('form').trigger('submit');
        await flushPromises();
        expect(store.savePerson).toHaveBeenCalledWith(expect.objectContaining({ name: 'Oswin', houseId: 'h1', born: -12 }));
        expect(store.saveHouse).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'h1', founderId: 'p1' }));
    });

    it('shows CHARACTER_LINKED from the server', async () => {
        const store = useDynastiesStore();
        store.saveHouse = vi.fn(async (h) => ({ id: 'h1', ...h }));
        store.savePerson = vi.fn(async () => {
            store.error = { code: 'CHARACTER_LINKED', message: 'That character is already in a family tree' };
            throw new Error('409');
        });
        const w = mount(HouseEditDialog, { global: { stubs } });
        w.vm.open();
        await flushPromises();
        await w.find('#hf-name').setValue('Vane');
        await w.find('input[name="founder-mode"][value="character"]').setValue(true);
        await w.find('.character-picker .rows button').trigger('click');
        await w.find('form').trigger('submit');
        await flushPromises();
        expect(w.find('.save-error').text()).toContain('already in a family tree');
    });
});

describe('PersonPanel', () => {
    it('shows the lifespan with the realm suffix and the age now', () => {
        const w = mount(PersonPanel, {
            props: { person: { id: 'p1', name: 'Edda', houseId: 'h1', gender: 'female', born: 212, titles: [] }, house: 'Vane' },
            global: { stubs },
        });
        expect(w.text()).toContain('born 212 SF, living, aged 38');
        expect(w.text()).toContain('House Vane');
    });
});
