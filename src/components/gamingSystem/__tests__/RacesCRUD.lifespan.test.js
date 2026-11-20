import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

const put = vi.fn(async () => ({ data: {} }));
const post = vi.fn(async () => ({ data: {} }));
vi.mock('@shared/utils/api', () => ({ default: { put: (...a) => put(...a), post: (...a) => post(...a), get: vi.fn(async () => ({ data: {} })) } }));
vi.mock('@ckeditor/ckeditor5-vue', () => ({ Ckeditor: { template: '<div />' } }));

const RACES = [
    { ID: 'h', RaceName: 'Human', RealmID: 'r1', Content: 'x', Tags: [], LifespanPercent: 100 },
    { ID: 'd', RaceName: 'Dwarf', IsTemplate: true, Content: 'x', Tags: [], LifespanPercent: 400 },
    { ID: 'e', RaceName: 'Elf', RealmID: 'r1', Content: 'x', Tags: [], LifespanPercent: 750 },
];
vi.mock('@shared/stores/races', () => ({
    useRacesStore: () => ({
        loadRaces: async () => undefined,
        getRaceById: (id) => RACES.find(r => r.ID === id),
        getRace: async (id) => RACES.find(r => r.ID === id),
        getRacesForCurrentRealm: RACES, loaded: true,
        invalidate: () => undefined, fetchRaces: async () => RACES,
    }),
}));

import RacesCRUD from '../RacesCRUD.vue';
import { useRealmStore } from '@shared/stores/realm';

async function setup(lifespan = 80) {
    const pinia = createPinia(); setActivePinia(pinia);
    const realmStore = useRealmStore();
    realmStore.activeRealmId = 'r1';
    realmStore.realms = { r1: { RealmID: 'r1', HumanLifespan: lifespan } };
    HTMLDialogElement.prototype.showModal = HTMLDialogElement.prototype.showModal || function () {};
    HTMLDialogElement.prototype.close = HTMLDialogElement.prototype.close || function () {};
    const wrapper = mount(RacesCRUD, {
        props: { realmId: 'r1' },
        global: { plugins: [pinia], stubs: { DeleteRaceWarning: true, EntryListEditor: true, ckeditor: true } },
    });
    await flushPromises();
    await flushPromises();
    return wrapper;
}

async function openRace(wrapper, name) {
    const row = wrapper.findAll('.table-row').find(r => r.text().includes(name));
    await row.trigger('click');
    await flushPromises();
}

describe('RacesCRUD lifespan', () => {
    beforeEach(() => { put.mockClear(); post.mockClear(); });

    it('shows expected years in the list', async () => {
        const w = await setup();
        const elf = w.findAll('.table-row').find(r => r.text().includes('Elf'));
        expect(elf.text()).toContain('about 600 years');
    });

    it('sends LifespanPercent when editing Elf with 300', async () => {
        const w = await setup();
        await openRace(w, 'Elf');
        await w.find('#raceLifespan').setValue('300');
        await w.find('button.btn-primary').trigger('click');
        await flushPromises();
        expect(put).toHaveBeenCalledTimes(1);
        expect(put.mock.calls[0][1].LifespanPercent).toBe(300);
    });

    it('sends no LifespanPercent key when cleared', async () => {
        const w = await setup();
        await openRace(w, 'Elf');
        await w.find('#raceLifespan').setValue('');
        await w.find('button.btn-primary').trigger('click');
        await flushPromises();
        expect(put).toHaveBeenCalledTimes(1);
        expect('LifespanPercent' in put.mock.calls[0][1]).toBe(false);
    });

    it('disables the input for Human', async () => {
        const w = await setup();
        await openRace(w, 'Human');
        const input = w.find('#raceLifespan');
        expect(input.attributes('disabled')).toBeDefined();
        expect(w.text()).toContain('Always 100%');
    });

    it('override with a blank field carries the template value', async () => {
        const w = await setup();
        await openRace(w, 'Dwarf');
        await w.find('#raceLifespan').setValue('');
        await w.find('button.btn-primary').trigger('click');
        await flushPromises();
        expect(post).toHaveBeenCalledTimes(1);
        expect(post.mock.calls[0][1].LifespanPercent).toBe(400);
        expect(post.mock.calls[0][1].Replaces).toBe('d');
    });

    it('override with a typed value sends that value', async () => {
        const w = await setup();
        await openRace(w, 'Dwarf');
        await w.find('#raceLifespan').setValue('250');
        await w.find('button.btn-primary').trigger('click');
        await flushPromises();
        expect(post.mock.calls[0][1].LifespanPercent).toBe(250);
    });

    it('blank field on a race with a stored value keeps-current hint and years from the stored value', async () => {
        const w = await setup(62);
        await openRace(w, 'Dwarf');
        await w.find('#raceLifespan').setValue('');
        const text = w.text();
        expect(text).toContain('Leave blank to keep the current value.');
        expect(text).not.toContain('Leave blank for 100%.');
        expect(text).toContain('About 248 years');
    });

    it('typed value drives the preview', async () => {
        const w = await setup(62);
        await openRace(w, 'Dwarf');
        await w.find('#raceLifespan').setValue('200');
        expect(w.text()).toContain('About 124 years');
    });

    it('new race shows the 100% hint and 62 years', async () => {
        const w = await setup(62);
        await w.find('.add-btn').trigger('click');
        await flushPromises();
        const text = w.text();
        expect(text).toContain('Leave blank for 100%.');
        expect(text).toContain('About 62 years');
    });
});
