import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MemberCard from './MemberCard.vue';

const member = { ID: 'c1', Name: 'Bob', Image: 'bob.jpg' };

function mountCard(props = {}) {
    return mount(MemberCard, {
        props: { member, imagesCdnUrl: 'https://cdn', ...props },
        global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } },
    });
}

describe('MemberCard', () => {
    it('renders name and image', () => {
        const w = mountCard();
        expect(w.find('.name').text()).toBe('Bob');
        expect(w.find('img.memImg').attributes('src')).toBe('https://cdn/bob.jpg');
    });
    it('hides the edit button unless editable', () => {
        expect(mountCard().find('.edit-button').exists()).toBe(false);
        expect(mountCard({ editable: true }).find('.edit-button').exists()).toBe(true);
    });
    it('emits edit with the member id', async () => {
        const w = mountCard({ editable: true });
        await w.find('.edit-button').trigger('click');
        expect(w.emitted('edit')[0]).toEqual(['c1']);
    });
    it('shows a badge when provided', () => {
        expect(mountCard({ badge: 'hidden' }).find('.member-badge').text()).toBe('hidden');
        expect(mountCard().find('.member-badge').exists()).toBe(false);
    });
});

describe('faction crests', () => {
    const harpers = { ID: 'f1', Name: 'Harpers', Known: true, Image: 'https://cdn/factions/harpers.jpg' };
    const zhents = { ID: 'f2', Name: 'Zhentarim', Known: false, Image: 'https://cdn/factions/zhents.jpg' };

    it('renders a crest for a known membership using the unprefixed url', () => {
        const w = mountCard({
            member: { ID: 'c1', Name: 'Bob', Known: true, Factions: [{ FactionID: 'f1', Known: true }] },
            factions: [harpers],
        });
        const crest = w.find('.faction-crest');
        expect(crest.exists()).toBe(true);
        expect(crest.attributes('src')).toBe('https://cdn/factions/harpers.jpg');
    });

    it('renders no crest for a secret membership', () => {
        const w = mountCard({
            member: { ID: 'c1', Name: 'Bob', Known: true, Factions: [{ FactionID: 'f1', Known: false }] },
            factions: [harpers],
        });
        expect(w.find('.faction-crest').exists()).toBe(false);
    });

    it('renders no crest for a hidden faction', () => {
        const w = mountCard({
            member: { ID: 'c1', Name: 'Bob', Known: true, Factions: [{ FactionID: 'f2', Known: true }] },
            factions: [zhents],
        });
        expect(w.find('.faction-crest').exists()).toBe(false);
    });

    it('renders no crest when the faction has no image', () => {
        const w = mountCard({
            member: { ID: 'c1', Name: 'Bob', Known: true, Factions: [{ FactionID: 'f1', Known: true }] },
            factions: [{ ID: 'f1', Name: 'Harpers', Known: true }],
        });
        expect(w.find('.faction-crest').exists()).toBe(false);
    });

    it('renders nothing extra when no factions are passed', () => {
        const w = mountCard({
            member: { ID: 'c1', Name: 'Bob', Known: true, Factions: [{ FactionID: 'f1', Known: true }] },
        });
        expect(w.find('.faction-crest').exists()).toBe(false);
    });
});
