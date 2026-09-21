import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';

vi.stubEnv('VITE_MEDIA_CDN_URL', 'https://media.test');

const put = vi.fn(async () => ({ data: { Count: 5 } }));
vi.mock('@shared/utils/api', () => ({ default: { put: (...a) => put(...a) } }));
const connect = vi.fn(); const disconnect = vi.fn();
vi.mock('@shared/composables/useWebSocket', () => ({ useWebSocket: () => ({ connect, disconnect }) }));

import RealmTracker from './RealmTracker.vue';
import { useRealmStore } from '@shared/stores/realm';

function setup({ isOwner = false, isRealmDM = false, tracker = { Enabled: true, Label: 'Charges', Count: 3 }, trackerPlayed = ref(true), props = {} } = {}) {
    const pinia = createPinia(); setActivePinia(pinia);
    const realmStore = useRealmStore();
    realmStore.activeRealmId = 'r1';
    realmStore.realms = { r1: { RealmID: 'r1', AccountID: 'a1', Name: 'R', Tracker: tracker, Players: {} } };
    Object.defineProperty(realmStore, 'isOwner', { get: () => isOwner, configurable: true });
    Object.defineProperty(realmStore, 'isRealmDM', { get: () => isRealmDM, configurable: true });
    const wrapper = mount(RealmTracker, { props, global: { plugins: [pinia], provide: { trackerPlayed } } });
    return { wrapper, realmStore, trackerPlayed };
}

describe('RealmTracker', () => {
    beforeEach(() => { put.mockClear(); connect.mockClear(); });

    it('renders the count and the realm image url', () => {
        const { wrapper } = setup();
        expect(wrapper.find('.charge-numeral').text()).toBe('3');
        expect(wrapper.find('img.tracker-image').attributes('src')).toBe('https://media.test/tracker/default/pendant.jpg');
    });

    it('subscribes to tracker:{realmId}', () => {
        setup();
        expect(connect).toHaveBeenCalledWith('tracker:r1', expect.any(Function));
    });

    it('does not allow editing for players', async () => {
        const { wrapper } = setup();
        await wrapper.find('.charge-numeral').trigger('dblclick');
        expect(wrapper.find('input.charge-input').exists()).toBe(false);
    });

    it('lets the DM edit and saves optimistically', async () => {
        const { wrapper, realmStore } = setup({ isRealmDM: true });
        await wrapper.find('.charge-numeral').trigger('dblclick');
        const input = wrapper.find('input.charge-input');
        await input.setValue('5');
        await input.trigger('keydown.enter');
        await flushPromises();
        expect(put).toHaveBeenCalledWith('/realms/realm/r1/tracker/count', { count: 5 });
        expect(realmStore.realms.r1.Tracker.Count).toBe(5);
    });

    it('rolls back when the save fails', async () => {
        put.mockImplementationOnce(async () => { throw new Error('nope'); });
        const { wrapper, realmStore } = setup({ isOwner: true });
        await wrapper.find('.charge-numeral').trigger('dblclick');
        await wrapper.find('input.charge-input').setValue('9');
        await wrapper.find('input.charge-input').trigger('keydown.enter');
        await flushPromises();
        expect(realmStore.realms.r1.Tracker.Count).toBe(3);
        expect(wrapper.find('.charge-error').text()).toContain('Could not save');
    });

    it('cancels instead of saving when the input is cleared', async () => {
        const { wrapper, realmStore } = setup({ isOwner: true });
        await wrapper.find('.charge-numeral').trigger('dblclick');
        const input = wrapper.find('input.charge-input');
        await input.setValue('');
        await input.trigger('blur');
        await flushPromises();
        expect(put).not.toHaveBeenCalled();
        expect(realmStore.realms.r1.Tracker.Count).toBe(3);
        expect(wrapper.find('input.charge-input').exists()).toBe(false);
        expect(wrapper.find('.charge-numeral').text()).toBe('3');
    });

    it('applies a broadcast count unless editing', async () => {
        const { wrapper, realmStore } = setup({ isOwner: true });
        const handler = connect.mock.calls[0][1];
        handler({ type: 'trackerUpdate', realmId: 'r1', count: 8 });
        expect(realmStore.realms.r1.Tracker.Count).toBe(8);
        await wrapper.find('.charge-numeral').trigger('dblclick');
        handler({ type: 'trackerUpdate', realmId: 'r1', count: 1 });
        expect(realmStore.realms.r1.Tracker.Count).toBe(8);
    });

    it('plays the intro when trackerPlayed is false, then reveals on ended', async () => {
        const trackerPlayed = ref(false);
        const { wrapper } = setup({ trackerPlayed });

        expect(wrapper.find('video.tracker-video').exists()).toBe(true);
        expect(wrapper.find('.realm-tracker').classes()).not.toContain('intro-complete');
        expect(wrapper.find('img.tracker-image').classes()).toContain('is-hidden');

        await wrapper.find('video').trigger('ended');

        expect(wrapper.find('video').exists()).toBe(false);
        expect(wrapper.find('.realm-tracker').classes()).toContain('intro-complete');
        expect(wrapper.find('img.tracker-image').classes()).not.toContain('is-hidden');
        expect(trackerPlayed.value).toBe(true);
    });

    it('sets 2x playback rate on loadedmetadata', async () => {
        const { wrapper } = setup({ trackerPlayed: ref(false) });
        await wrapper.find('video').trigger('loadedmetadata');
        expect(wrapper.find('video').element.playbackRate).toBe(2);
    });

    it('falls through to the reveal when the video errors before a frame loads', async () => {
        const { wrapper } = setup({ trackerPlayed: ref(false) });
        const videoEl = wrapper.find('video').element;
        Object.defineProperty(videoEl, 'readyState', { value: 0, configurable: true });

        await wrapper.find('video').trigger('error');

        expect(wrapper.find('video').exists()).toBe(false);
        expect(wrapper.find('.realm-tracker').classes()).toContain('intro-complete');
    });

    it('skips the video when trackerPlayed is already true', () => {
        const { wrapper } = setup();
        expect(wrapper.find('video').exists()).toBe(false);
        expect(wrapper.find('.realm-tracker').classes()).toContain('intro-complete');
    });

    it('renders the finished state when intro is false, even in preview', () => {
        const { wrapper } = setup({ props: { preview: true, intro: false }, trackerPlayed: ref(false) });
        expect(wrapper.find('video').exists()).toBe(false);
        expect(wrapper.find('.realm-tracker').classes()).toContain('intro-complete');
        expect(wrapper.find('img.tracker-image').classes()).not.toContain('is-hidden');
        expect(wrapper.find('.charge-numeral').text()).toBe('3');
    });

    it('preview mode always plays the intro', () => {
        const { wrapper } = setup({ props: { preview: true }, trackerPlayed: ref(true) });
        expect(wrapper.find('video').exists()).toBe(true);
        expect(connect).not.toHaveBeenCalled();
    });
});
