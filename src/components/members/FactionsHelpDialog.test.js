// shared/src/components/members/FactionsHelpDialog.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import FactionsHelpDialog from './FactionsHelpDialog.vue';

beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function showModal() {
        this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function close() {
        this.open = false;
        this.dispatchEvent(new Event('close'));
    });
});

function mountDialog(open = true) {
    return mount(FactionsHelpDialog, { props: { open } });
}

describe('FactionsHelpDialog', () => {
    it('stays closed when open is false', async () => {
        const w = mountDialog(false);
        await w.vm.$nextTick();
        expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();
    });

    it('opens the native dialog when open becomes true', async () => {
        const w = mountDialog(false);
        await w.setProps({ open: true });
        await w.vm.$nextTick();
        expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
    });

    it('explains the faction, membership, and visibility settings', async () => {
        const w = mountDialog();
        await w.vm.$nextTick();
        const text = w.text();
        expect(text).toContain('Known to players');
        expect(text).toContain('turns it into an NPC');
        expect(text).toContain('known member of this faction');
        expect(text).toContain('Hidden from players');
    });

    it('names the dialog with its own heading', async () => {
        const w = mountDialog();
        await w.vm.$nextTick();
        const labelledBy = w.find('dialog.faction-help').attributes('aria-labelledby');
        expect(labelledBy).toBe('factionHelpTitle');
        expect(w.find(`#${labelledBy}`).text()).toBe('How factions work');
    });

    it('lists the three conditions a player needs to see a membership', async () => {
        const w = mountDialog();
        await w.vm.$nextTick();
        expect(w.findAll('.visibility-rule li')).toHaveLength(3);
    });

    it('emits close when the close button is clicked', async () => {
        const w = mountDialog();
        await w.vm.$nextTick();
        await w.find('.faction-help-close').trigger('click');
        expect(w.emitted('close')).toBeTruthy();
    });

    it('emits close when the backdrop is clicked', async () => {
        const w = mountDialog();
        await w.vm.$nextTick();
        await w.find('dialog.faction-help').trigger('click');
        expect(w.emitted('close')).toBeTruthy();
    });

    it('does not emit close when the panel itself is clicked', async () => {
        const w = mountDialog();
        await w.vm.$nextTick();
        await w.find('.faction-help-inner').trigger('click');
        expect(w.emitted('close')).toBeFalsy();
    });
});
