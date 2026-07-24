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
