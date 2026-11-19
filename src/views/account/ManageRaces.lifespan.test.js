import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('@shared/utils/api', () => ({ default: { get: vi.fn(async () => ({ data: {} })), put: vi.fn() } }));
vi.mock('@shared/composables/useNotifications', () => ({ useNotifications: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }) }));
vi.mock('@shared/components/gamingSystem/RacesCRUD.vue', () => ({ default: { template: '<div />' } }));

import ManageRaces from './ManageRaces.vue';
import { useRealmStore } from '@shared/stores/realm';
import { useUserStore } from '@shared/stores/user';

function setup({ editor }) {
    const pinia = createPinia(); setActivePinia(pinia);
    const realmStore = useRealmStore();
    realmStore.activeRealmId = 'r1';
    realmStore.realms = { r1: { RealmID: 'r1', HumanLifespan: 80 } };
    Object.defineProperty(realmStore, 'isOwner', { get: () => editor, configurable: true });
    Object.defineProperty(realmStore, 'isRealmDM', { get: () => false, configurable: true });
    const setAttr = vi.spyOn(realmStore, 'setAttr').mockResolvedValue({});
    const wrapper = mount(ManageRaces, { global: { plugins: [pinia], mocks: { $router: { back: vi.fn() } } } });
    return { wrapper, setAttr, userStore: useUserStore() };
}

describe('ManageRaces lifespans card', () => {
    it('non-editor sees the value but no Save button', async () => {
        const { wrapper } = setup({ editor: false });
        await flushPromises();
        expect(wrapper.find('.lifespan-card').exists()).toBe(true);
        expect(wrapper.find('#humanLifespan').exists()).toBe(false);
        expect(wrapper.find('.btn-save-lifespan').exists()).toBe(false);
        expect(wrapper.text()).toContain('Humans live about 80 years.');
    });

    it('editor saves via setAttr and sees range error', async () => {
        const { wrapper, setAttr } = setup({ editor: true });
        await flushPromises();
        await wrapper.find('#humanLifespan').setValue('900');
        expect(wrapper.find('.lifespan-error').exists()).toBe(true);
        expect(wrapper.find('.btn-save-lifespan').attributes('disabled')).toBeDefined();
        await wrapper.find('#humanLifespan').setValue('90');
        await wrapper.find('.btn-save-lifespan').trigger('click');
        await flushPromises();
        expect(setAttr).toHaveBeenCalledWith('r1', 'HumanLifespan', 90);
    });
});
