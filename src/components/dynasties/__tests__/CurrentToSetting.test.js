// shared/src/components/dynasties/__tests__/CurrentToSetting.test.js
import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import CurrentToSetting from '../CurrentToSetting.vue';

function mountSetting(props = {}) {
    return mount(CurrentToSetting, {
        props: { currentTo: 250, gameYear: 253, canEdit: true, abbr: 'SF', save: vi.fn(async () => {}), ...props },
    });
}

const btn = (w, text) => w.findAll('button').find((b) => b.text() === text);

describe('CurrentToSetting', () => {
    it('shows the year line', () => {
        const w = mountSetting();
        expect(w.text()).toContain('Trees are current to 250 SF. The game year is 253 SF.');
    });

    it('falls back to the game year when no year is stored', () => {
        const w = mountSetting({ currentTo: null });
        expect(w.text()).toContain('Trees are current to 253 SF.');
    });

    it('hides Change once the year is locked', () => {
        const w = mountSetting({ canEdit: false });
        expect(btn(w, 'Change')).toBeUndefined();
    });

    it('saves a new year', async () => {
        const save = vi.fn(async () => {});
        const w = mountSetting({ save });
        await btn(w, 'Change').trigger('click');
        await w.find('input').setValue('248');
        await w.find('form').trigger('submit');
        await flushPromises();
        expect(save).toHaveBeenCalledWith(248);
        expect(w.find('form').exists()).toBe(false);
    });

    it('refuses year 0 and a year past the game year', async () => {
        const save = vi.fn(async () => {});
        const w = mountSetting({ save });
        await btn(w, 'Change').trigger('click');
        await w.find('input').setValue('0');
        await w.find('form').trigger('submit');
        expect(w.find('[role="alert"]').exists()).toBe(true);
        await w.find('input').setValue('260');
        await w.find('form').trigger('submit');
        expect(w.find('[role="alert"]').text()).toContain('253 SF');
        expect(save).not.toHaveBeenCalled();
    });

    it('keeps the form open with the message when saving fails', async () => {
        const save = vi.fn(async () => { throw new Error('The year cannot be changed once an advance has been made.'); });
        const w = mountSetting({ save });
        await btn(w, 'Change').trigger('click');
        await w.find('form').trigger('submit');
        await flushPromises();
        expect(w.find('form').exists()).toBe(true);
        expect(w.find('[role="alert"]').text()).toContain('cannot be changed');
    });
});
