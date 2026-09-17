// shared/src/views/account/TrackerSettings.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';

vi.stubEnv('VITE_MEDIA_CDN_URL', 'https://media.test');

const put = vi.fn(async (url, body) => ({ data: { Enabled: body.Enabled, Label: body.Label, Count: 0 } }));
vi.mock('@shared/utils/api', () => ({ default: { put: (...a) => put(...a) } }));

const notifySuccess = vi.fn();
const notifyError = vi.fn();
vi.mock('@shared/composables/useNotifications', () => ({
    useNotifications: () => ({ notifySuccess, notifyError }),
}));

// RealmTracker.vue (imported by TrackerSettings.vue, even though it is
// stubbed at mount) pulls in useWebSocket -> aws-amplify/auth, which isn't
// resolvable in this test environment. Mock it out, mirroring RealmTracker.test.js.
vi.mock('@shared/composables/useWebSocket', () => ({ useWebSocket: () => ({ connect: vi.fn(), disconnect: vi.fn() }) }));

import TrackerSettings from './TrackerSettings.vue';
import { useRealmStore } from '@shared/stores/realm';

function setup({ isOwner = true, tracker = { Enabled: true, Label: 'Pendant Charges', Count: 3 } } = {}) {
    const pinia = createPinia(); setActivePinia(pinia);
    const realmStore = useRealmStore();
    realmStore.activeRealmId = 'r1';
    realmStore.realms = { r1: { RealmID: 'r1', AccountID: 'a1', Name: 'R', Tracker: tracker, Players: {} } };
    Object.defineProperty(realmStore, 'isOwner', { get: () => isOwner, configurable: true });
    const wrapper = mount(TrackerSettings, {
        global: {
            plugins: [pinia],
            stubs: { 'router-link': { template: '<a><slot /></a>' }, RealmTracker: true },
        },
    });
    return { wrapper, realmStore };
}

describe('TrackerSettings', () => {
    beforeEach(() => { put.mockClear(); notifySuccess.mockClear(); notifyError.mockClear(); window.scrollTo = vi.fn(); });

    it('scrolls to the top on mount so the description is visible', () => {
        setup();
        expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    });

    it('renders the toggle, label input, and both upload buttons for an owner', () => {
        const { wrapper } = setup({ isOwner: true });
        expect(wrapper.find('.toggle-row').exists()).toBe(true);
        expect(wrapper.find('input.text-input').exists()).toBe(true);
        const uploadButtons = wrapper.findAll('.btn-secondary');
        expect(uploadButtons).toHaveLength(2);
        expect(uploadButtons[0].text()).toContain('Choose MP4');
        expect(uploadButtons[1].text()).toContain('Choose image');
    });

    it('shows the owner-only notice for a non-owner', () => {
        const { wrapper } = setup({ isOwner: false });
        expect(wrapper.text()).toContain('Only the realm owner can change these settings.');
        expect(wrapper.find('.toggle-row').exists()).toBe(false);
    });

    it('saves the label and updates the store', async () => {
        const { wrapper, realmStore } = setup({ isOwner: true, tracker: { Enabled: true, Label: 'Pendant Charges', Count: 3 } });

        await wrapper.find('input.text-input').setValue('Mana');
        await wrapper.find('button.btn-primary').trigger('click');
        await flushPromises();

        expect(put).toHaveBeenCalledWith('/realms/realm/r1/tracker', { Enabled: true, Label: 'Mana' });
        expect(realmStore.realms.r1.Tracker.Label).toBe('Mana');
        expect(notifySuccess).toHaveBeenCalledWith('Tracker settings saved.');
    });

    it('does not clobber an unsaved label when unrelated tracker fields change (e.g. media upload)', async () => {
        const { wrapper, realmStore } = setup({ isOwner: true, tracker: { Enabled: true, Label: 'Pendant Charges', Count: 3 } });

        await wrapper.find('input.text-input').setValue('Draft');
        expect(wrapper.find('input.text-input').element.value).toBe('Draft');

        realmStore.setTracker('r1', { VideoFile: 'x.mp4' });
        await nextTick();
        expect(wrapper.find('input.text-input').element.value).toBe('Draft');

        realmStore.setTracker('r1', { Label: 'Server' });
        await nextTick();
        expect(wrapper.find('input.text-input').element.value).toBe('Server');
    });
});
