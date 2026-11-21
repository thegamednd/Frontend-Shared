// shared/src/views/dynasties/__tests__/DynastyScandals.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

let router;
vi.mock('vue-router', () => ({ useRouter: () => router, useRoute: () => ({ params: {} }) }));
vi.mock('@shared/utils/api', () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}));
vi.mock('@shared/stores/realm', () => ({
    useRealmStore: () => ({ activeRealm: { DateSuffix: { Abbr: 'SF' } }, getRealmDMs: [{ UserID: 'dm-1' }] }),
}));
let role = { isDM: true, isAdmin: false };
vi.mock('@shared/stores/user', () => ({ useUserStore: () => role }));

import DynastyScandals from '../DynastyScandals.vue';
import { useDynastiesStore } from '@shared/stores/dynasties';

const stubs = { 'router-link': { props: ['to'], template: '<a class="rl" :data-to="to.name"><slot /></a>' } };

const scandal = (extra = {}) => ({
    id: 'tree:ageGap:p1:p2',
    source: 'tree',
    kind: 'ageGap',
    year: 248,
    houseIds: ['h1'],
    personIds: ['p1', 'p2'],
    characterIds: [],
    vague: 'An old lord took a very young bride.',
    detail: 'Aldric Vane married Mira when she was half his age, or so they say.',
    rumour: false,
    createdAt: '2026-11-01T00:00:00Z',
    about: ['Aldric Vane', 'Mira Vane'],
    secret: false,
    ...extra,
});

let store;
function setup({ on = true, scandals = [scandal()] } = {}) {
    store = useDynastiesStore();
    store.getScandalSettings = vi.fn(async () => ({ on }));
    store.listScandals = vi.fn(async () => scandals);
    store.updateScandal = vi.fn(async (id, patch) => ({ ...scandals.find((s) => s.id === id), ...patch, dmEdited: true }));
    store.deleteScandal = vi.fn(async (id) => ({ id }));
    return mount(DynastyScandals, { global: { stubs }, attachTo: document.body });
}

const btn = (w, text) => w.findAll('button').find((b) => b.text() === text);

beforeEach(() => {
    setActivePinia(createPinia());
    role = { isDM: true, isAdmin: false };
    router = { push: vi.fn(), replace: vi.fn() };
    document.body.innerHTML = '';
    HTMLDialogElement.prototype.showModal = vi.fn(function showModal() { this.open = true; });
    HTMLDialogElement.prototype.close = vi.fn(function close() { this.open = false; });
});

describe('DynastyScandals', () => {
    it('lists the active scandals with names, year and source', async () => {
        const w = setup();
        await flushPromises();
        expect(store.listScandals).toHaveBeenCalledWith({ status: 'active', q: '' });
        const card = w.find('.scandal');
        expect(card.text()).toContain('An old lord took a very young bride.');
        expect(card.text()).toContain('Aldric Vane');
        expect(card.text()).toContain('248 SF');
        expect(card.text()).toContain('Family tree');
        w.unmount();
    });

    it('renders secret badge', async () => {
        const w = setup({ scandals: [scandal({ id: 'tree:otherFather:p3', kind: 'otherFather', disabled: true, secret: true })] });
        await flushPromises();
        expect(w.find('.secret-tag').exists()).toBe(true);
        expect(w.find('.secret-tag').text()).toContain('Secret');
        w.unmount();
    });

    it('switches status tabs', async () => {
        const w = setup();
        await flushPromises();
        await w.findAll('[role="tab"]').find((t) => t.text() === 'Disabled').trigger('click');
        await flushPromises();
        expect(store.listScandals).toHaveBeenLastCalledWith({ status: 'disabled', q: '' });
        w.unmount();
    });

    it('edit sends patch', async () => {
        const w = setup();
        await flushPromises();
        await btn(w, 'Edit').trigger('click');
        await w.find('textarea.vague-input').setValue('A lord wed a girl of sixteen.');
        await btn(w, 'Save').trigger('click');
        await flushPromises();
        expect(store.updateScandal).toHaveBeenCalledWith('tree:ageGap:p1:p2', { vague: 'A lord wed a girl of sixteen.' });
        expect(w.find('.scandal').text()).toContain('A lord wed a girl of sixteen.');
        expect(w.find('textarea').exists()).toBe(false);
        w.unmount();
    });

    it('blocks a save the server would refuse', async () => {
        const w = setup();
        await flushPromises();
        await btn(w, 'Edit').trigger('click');
        await w.find('textarea.vague-input').setValue('A lord — old and grey.');
        expect(w.text()).toContain('long dash');
        expect(btn(w, 'Save').attributes('disabled')).toBeDefined();
        await w.find('textarea.vague-input').setValue('x'.repeat(401));
        expect(btn(w, 'Save').attributes('disabled')).toBeDefined();
        await w.find('textarea.vague-input').setValue('A <b>lord</b>');
        expect(btn(w, 'Save').attributes('disabled')).toBeDefined();
        await w.find('textarea.vague-input').setValue('  ');
        expect(btn(w, 'Save').attributes('disabled')).toBeDefined();
        await w.find('textarea.detail-input').setValue('y'.repeat(4001));
        await w.find('textarea.vague-input').setValue('Fine.');
        expect(btn(w, 'Save').attributes('disabled')).toBeDefined();
        w.unmount();
    });

    it('disables a scandal and drops it from the active tab', async () => {
        const w = setup();
        await flushPromises();
        await btn(w, 'Disable').trigger('click');
        await flushPromises();
        expect(store.updateScandal).toHaveBeenCalledWith('tree:ageGap:p1:p2', { disabled: true });
        expect(w.find('.scandal').exists()).toBe(false);
        w.unmount();
    });

    it('delete asks first', async () => {
        const w = setup();
        await flushPromises();
        await btn(w, 'Delete').trigger('click');
        await flushPromises();
        expect(store.deleteScandal).not.toHaveBeenCalled();
        const dialog = document.querySelector('.confirm-dialog');
        expect(dialog.open).toBe(true);
        expect(dialog.textContent).toContain('Disable');
        expect(dialog.textContent).toContain('still true in the family tree');
        expect(dialog.textContent).not.toContain('session report');
        const confirm = [...dialog.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Delete scandal');
        confirm.click();
        await flushPromises();
        expect(store.deleteScandal).toHaveBeenCalledWith('tree:ageGap:p1:p2');
        expect(w.find('.scandal').exists()).toBe(false);
        w.unmount();
    });

    it('delete of a report scandal says it can come back from its report', async () => {
        const w = setup({ scandals: [scandal({ id: 'report:rep1:1', source: 'report', kind: 'report', reportId: 'rep1' })] });
        await flushPromises();
        await btn(w, 'Delete').trigger('click');
        await flushPromises();
        const dialog = document.querySelector('.confirm-dialog');
        expect(dialog.textContent).toContain('next time that report is edited or rescanned');
        expect(dialog.textContent).toContain('use Disable instead');
        expect(dialog.textContent).not.toContain('family tree');
        expect(dialog.textContent).not.toContain('\u2014');
        w.unmount();
    });

    it('shows the server refusal through the dynasty error text', async () => {
        const w = setup();
        await flushPromises();
        store.updateScandal = vi.fn(async () => {
            store.error = { code: 'NOT_FOUND', message: 'Scandal not found' };
            throw new Error('x');
        });
        await btn(w, 'Disable').trigger('click');
        await flushPromises();
        expect(w.find('[role="alert"]').text()).toContain('no longer there');
        w.unmount();
    });

    it('when scandals are off: says so and links to Manage Races', async () => {
        const w = setup({ on: false });
        await flushPromises();
        expect(store.listScandals).not.toHaveBeenCalled();
        expect(w.find('.rl[data-to="ManageRaces"]').exists()).toBe(true);
        w.unmount();
    });

    it('player sees no actions', async () => {
        role = { isDM: false, isAdmin: false };
        const w = setup();
        await flushPromises();
        expect(router.replace).toHaveBeenCalledWith({ name: 'Dynasties' });
        expect(store.getScandalSettings).not.toHaveBeenCalled();
        expect(store.listScandals).not.toHaveBeenCalled();
        expect(btn(w, 'Edit')).toBeUndefined();
        expect(btn(w, 'Delete')).toBeUndefined();
        w.unmount();
    });
});
