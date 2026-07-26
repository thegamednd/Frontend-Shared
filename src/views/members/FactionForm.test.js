import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import { setActivePinia, createPinia } from 'pinia';

const routerPush = vi.fn();
let routeParams = {};
vi.mock('vue-router', () => ({
    useRouter: () => ({ push: routerPush }),
    useRoute: () => ({ params: routeParams }),
}));

const createFaction = vi.fn(async () => ({ ID: 'new' }));
const updateFaction = vi.fn(async () => ({ ID: 'f1' }));
const deleteFaction = vi.fn(async () => undefined);
const uploadFactionImage = vi.fn(async () => 'https://cdn/factions/a.jpg');
const loadFactions = vi.fn(async () => undefined);
let stored = { ID: 'f1', Name: 'Harpers', BriefDescription: 'Do-gooders', Description: '<p>Long</p>', Known: true, Image: 'https://cdn/factions/old.jpg' };
vi.mock('@shared/stores/faction', () => ({
    useFactionStore: () => ({
        loadFactions, createFaction, updateFaction, deleteFaction, uploadFactionImage,
        getFactionById: (id) => (id === 'f1' ? stored : null),
        loaded: true,
    }),
}));

let paid = true;
vi.mock('@shared/stores/realm', () => ({
    useRealmStore: () => ({
        get isOwner() { return true; },
        get isRealmDM() { return false; },
        get isPaidTier() { return paid; },
    }),
}));

const notifyInfo = vi.fn();
vi.mock('@shared/composables/useNotifications', () => ({
    useNotifications: () => ({ notifyInfo, notifyError: vi.fn(), notifySuccess: vi.fn() }),
}));

vi.mock('@shared/components/cms/InlineEditor.vue', () => ({
    default: { name: 'InlineEditor', props: ['modelValue'], template: '<div class="stub-editor"></div>' },
}));

import FactionForm from './FactionForm.vue';

function mountForm() {
    return mount(FactionForm, {
        global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } },
    });
}

beforeEach(() => {
    setActivePinia(createPinia());
    routeParams = {};
    paid = true;
    vi.clearAllMocks();
});

describe('FactionForm add mode', () => {
    it('renders empty fields with no faction id', async () => {
        const w = mountForm();
        await flushPromises();
        expect(w.find('input[name="name"]').element.value).toBe('');
        expect(w.find('.delete-faction-btn').exists()).toBe(false);
    });

    it('submits the entered name', async () => {
        const w = mountForm();
        await flushPromises();
        await w.find('input[name="name"]').setValue('Zhentarim');
        await w.find('form').trigger('submit');
        await flushPromises();
        expect(createFaction).toHaveBeenCalled();
        expect(createFaction.mock.calls[0][0].Name).toBe('Zhentarim');
    });

    it('submits the uploaded image url unmodified', async () => {
        const w = mountForm();
        await flushPromises();
        await w.find('input[name="name"]').setValue('Zhentarim');
        const file = new File(['x'], 'crest.png', { type: 'image/png' });
        const input = w.find('input[type="file"]');
        Object.defineProperty(input.element, 'files', { value: [file] });
        await input.trigger('change');
        await flushPromises();
        await w.find('form').trigger('submit');
        await flushPromises();
        expect(createFaction).toHaveBeenCalled();
        expect(createFaction.mock.calls[0][0].Image).toBe('https://cdn/factions/a.jpg');
    });

    it('disables save and warns on the free tier', async () => {
        paid = false;
        const w = mountForm();
        await flushPromises();
        await w.find('input[name="name"]').setValue('Zhentarim');
        expect(w.find('button[type="submit"]').attributes('disabled')).toBeDefined();
        expect(w.find('.upgrade-notice').exists()).toBe(true);
    });
});

describe('FactionForm edit mode', () => {
    beforeEach(() => { routeParams = { id: 'f1' }; });

    it('prefills from the stored faction', async () => {
        const w = mountForm();
        await flushPromises();
        expect(w.find('input[name="name"]').element.value).toBe('Harpers');
        expect(w.find('textarea[name="brief"]').element.value).toBe('Do-gooders');
    });

    it('shows the existing image', async () => {
        const w = mountForm();
        await flushPromises();
        expect(w.find('.image-preview img').attributes('src')).toBe('https://cdn/factions/old.jpg');
    });

    it('submits an update rather than a create', async () => {
        const w = mountForm();
        await flushPromises();
        await w.find('form').trigger('submit');
        await flushPromises();
        expect(updateFaction).toHaveBeenCalledWith('f1', expect.objectContaining({ Name: 'Harpers' }));
        expect(createFaction).not.toHaveBeenCalled();
    });

    it('allows editing on the free tier', async () => {
        paid = false;
        const w = mountForm();
        await flushPromises();
        expect(w.find('button[type="submit"]').attributes('disabled')).toBeUndefined();
        expect(w.find('.upgrade-notice').exists()).toBe(false);
    });

    it('uploads on file select and stores the returned url', async () => {
        const w = mountForm();
        await flushPromises();
        const file = new File(['x'], 'crest.png', { type: 'image/png' });
        const input = w.find('input[type="file"]');
        Object.defineProperty(input.element, 'files', { value: [file] });
        await input.trigger('change');
        await flushPromises();
        expect(uploadFactionImage).toHaveBeenCalledWith(file);
        expect(w.find('.image-preview img').attributes('src')).toBe('https://cdn/factions/a.jpg');
    });

    it('rejects a non-image file without uploading', async () => {
        const w = mountForm();
        await flushPromises();
        const file = new File(['x'], 'notes.txt', { type: 'text/plain' });
        const input = w.find('input[type="file"]');
        Object.defineProperty(input.element, 'files', { value: [file] });
        await input.trigger('change');
        await flushPromises();
        expect(uploadFactionImage).not.toHaveBeenCalled();
        expect(w.find('.file-error').text()).toContain('image');
    });

    it('requires a second click to delete', async () => {
        const w = mountForm();
        await flushPromises();
        await w.find('.delete-faction-btn').trigger('click');
        expect(deleteFaction).not.toHaveBeenCalled();
        await w.find('.delete-faction-btn').trigger('click');
        await flushPromises();
        expect(deleteFaction).toHaveBeenCalledWith('f1');
    });

    it('shows an uploading indication when replacing an image that is already present', async () => {
        let resolveUpload;
        uploadFactionImage.mockImplementationOnce(() => new Promise((resolve) => { resolveUpload = resolve; }));
        const w = mountForm();
        await flushPromises();
        expect(w.find('.image-preview img').exists()).toBe(true);

        const file = new File(['x'], 'crest.png', { type: 'image/png' });
        const input = w.find('input[type="file"]');
        Object.defineProperty(input.element, 'files', { value: [file] });
        await input.trigger('change');
        await nextTick();

        expect(w.find('.image-uploading-overlay').exists()).toBe(true);
        expect(w.find('.image-uploading-overlay').text()).toContain('Uploading');

        resolveUpload('https://cdn/factions/new.jpg');
        await flushPromises();
        expect(w.find('.image-uploading-overlay').exists()).toBe(false);
        expect(w.find('.image-preview img').attributes('src')).toBe('https://cdn/factions/new.jpg');
    });
});

describe('FactionForm load failure', () => {
    beforeEach(() => { routeParams = { id: 'missing' }; });

    it('shows an error state instead of a blank prefilled form, and blocks save and delete', async () => {
        const w = mountForm();
        await flushPromises();
        expect(w.find('.load-failed').exists()).toBe(true);
        expect(w.find('form').exists()).toBe(false);
        expect(w.find('.delete-faction-btn').exists()).toBe(false);
        expect(w.find('button[type="submit"]').exists()).toBe(false);
        expect(updateFaction).not.toHaveBeenCalled();
        expect(deleteFaction).not.toHaveBeenCalled();
    });

    it('forces a fresh reload rather than trusting a stale store', async () => {
        mountForm();
        await flushPromises();
        expect(loadFactions).toHaveBeenCalledWith(true);
    });
});

describe('FactionForm save and delete errors', () => {
    beforeEach(() => { routeParams = { id: 'f1' }; });

    it('renders a save error next to the actions and does not navigate', async () => {
        updateFaction.mockRejectedValueOnce(new Error('boom'));
        const w = mountForm();
        await flushPromises();
        await w.find('form').trigger('submit');
        await flushPromises();
        expect(w.find('.save-error').text()).toContain('Failed to save faction');
        expect(w.find('.file-error').exists()).toBe(false);
        expect(routerPush).not.toHaveBeenCalled();
    });

    it('shows upgrade wording for a 403 save failure', async () => {
        const error = new Error('forbidden');
        error.response = { status: 403 };
        updateFaction.mockRejectedValueOnce(error);
        const w = mountForm();
        await flushPromises();
        await w.find('form').trigger('submit');
        await flushPromises();
        expect(w.find('.save-error').text()).toContain('Upgrade your realm');
    });

    it('shows a retry message for a 503 save failure without paywall wording', async () => {
        const error = new Error('unavailable');
        error.response = { status: 503 };
        updateFaction.mockRejectedValueOnce(error);
        const w = mountForm();
        await flushPromises();
        await w.find('form').trigger('submit');
        await flushPromises();
        const message = w.find('.save-error').text();
        expect(message).toContain('try again');
        expect(message.toLowerCase()).not.toContain('upgrade');
    });

    it('surfaces a delete failure instead of an unhandled rejection', async () => {
        deleteFaction.mockRejectedValueOnce(new Error('boom'));
        const w = mountForm();
        await flushPromises();
        await w.find('.delete-faction-btn').trigger('click');
        await w.find('.delete-faction-btn').trigger('click');
        await flushPromises();
        expect(w.find('.save-error').exists()).toBe(true);
        expect(routerPush).not.toHaveBeenCalled();
        expect(w.find('.delete-faction-btn').text()).toBe('Delete');
    });
});
