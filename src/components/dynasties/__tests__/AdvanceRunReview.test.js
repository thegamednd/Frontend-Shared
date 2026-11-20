// shared/src/components/dynasties/__tests__/AdvanceRunReview.test.js
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AdvanceRunReview from '../AdvanceRunReview.vue';
import { groupEvents } from '@shared/utils/dynastyAdvance';

const run = {
    id: 'r1',
    year: 251,
    houses: { h1: 'Vane' },
    people: {
        p1: { name: 'Aldric Vane', houseId: 'h1', gender: 'male' },
        p2: { name: 'Mira Vane', houseId: 'h1', gender: 'female' },
        p3: { name: 'Edric Vane', houseId: 'h1', gender: 'male' },
    },
    events: [
        { kind: 'death', ref: 'e1', personId: 'p1', age: 70, cause: 'A fever' },
        { kind: 'birth', ref: 'e2', motherId: 'p2', fatherId: 'p3', houseId: 'h1', gender: 'female', name: 'Elsa', stillborn: false, defect: false },
        { kind: 'pregnancy', ref: 'dm:1', motherId: 'p2', fatherId: 'p3', byDm: true },
    ],
};
const house = groupEvents(run)[0];

function mountReview(props = {}) {
    return mount(AdvanceRunReview, { props: { house, run, editable: true, ...props } });
}

const btn = (w, text) => w.findAll('button').find((b) => b.text() === text);

describe('AdvanceRunReview', () => {
    it('shows the house, its groups and one line per event', () => {
        const w = mountReview();
        expect(w.find('h3').text()).toBe('Vane');
        expect(w.text()).toContain('Deaths');
        expect(w.text()).toContain('Aldric Vane dies aged 70');
        expect(w.text()).toContain('A daughter is born to Mira Vane and Edric Vane');
    });

    it('emits a rename when a name changes', async () => {
        const w = mountReview();
        const input = w.find('input[data-field="name"]');
        await input.setValue('Elspeth');
        await input.trigger('change');
        expect(w.emitted('edit')[0][0]).toEqual([{ ref: 'e2', name: 'Elspeth' }]);
    });

    it('emits a reworded cause and ignores a blank one', async () => {
        const w = mountReview();
        const input = w.find('input[data-field="cause"]');
        await input.setValue('   ');
        await input.trigger('change');
        expect(w.emitted('edit')).toBeUndefined();
        expect(input.element.value).toBe('A fever');
        await input.setValue('Old age');
        await input.trigger('change');
        expect(w.emitted('edit')[0][0]).toEqual([{ ref: 'e1', cause: 'Old age' }]);
    });

    it('leaves a rolled event out and removes an added one', async () => {
        const w = mountReview();
        await w.findAll('button').filter((b) => b.text() === 'Leave out')[0].trigger('click');
        expect(w.emitted('edit')[0][0]).toEqual([{ ref: 'e1', dropped: true }]);
        await btn(w, 'Remove').trigger('click');
        expect(w.emitted('remove')[0][0]).toBe('dm:1');
    });

    it('offers Put back on a dropped event', async () => {
        const dropped = { ...run, events: [{ ...run.events[0], dropped: true }] };
        const w = mountReview({ run: dropped, house: groupEvents(dropped)[0] });
        await btn(w, 'Put back').trigger('click');
        expect(w.emitted('edit')[0][0]).toEqual([{ ref: 'e1', dropped: false }]);
    });

    it('is read only when not editable', () => {
        const w = mountReview({ editable: false });
        expect(btn(w, 'Leave out')).toBeUndefined();
        expect(btn(w, 'Remove')).toBeUndefined();
        expect(w.find('input[data-field="name"]').attributes('disabled')).toBeDefined();
    });

    it('shows the hard cap notice and the prune lists', () => {
        const w = mountReview({
            capState: { living: 30, pregnant: 0, softCap: 20, hardCap: 30, atHardCap: true },
            prune: {
                removed: [{ id: 'x1', name: 'Old Brannoc', alive: true }, { id: 'x2', name: 'Ysolde', alive: false }],
                elders: [{ id: 'x3', name: 'Corin' }],
            },
        });
        expect(w.text()).toContain('At the hard cap: no marriages or pregnancies this year.');
        expect(w.text()).toContain('Saving removes its oldest generation');
        expect(w.find('.prune-living').text()).toContain('Old Brannoc');
        expect(w.find('.prune-elders').text()).toContain('Corin');
        expect(w.text()).toContain('1 person who has already died');
    });

    it('marks a pregnancy whose marriage is left out, and a prune nothing sets off any more, as won\'t happen', () => {
        const marked = { ...run, skipped: ['dm:1'], prunesOff: ['h1'] };
        const w = mountReview({
            run: marked,
            house: groupEvents(marked)[0],
            prune: { removed: [{ id: 'x1', name: 'Old Brannoc', alive: true }], elders: [] },
        });
        const preg = w.findAll('li.event').find((li) => li.text().includes('is expecting'));
        expect(preg.classes()).toContain('skipped');
        expect(preg.text()).toContain("Won't happen");
        expect(preg.text()).toContain('Its marriage is left out.');
        expect(w.find('.prune-off').text()).toContain("Won't happen");
        expect(w.find('.prune').exists()).toBe(false);
        expect(w.text()).not.toContain('Old Brannoc');
        expect(w.text()).not.toMatch(/commit/i);
    });

    it('shows the soft cap notice when over it', () => {
        const w = mountReview({ capState: { living: 24, pregnant: 1, softCap: 20, hardCap: 30, atHardCap: false } });
        expect(w.text()).toContain('Over the soft cap');
    });
});
