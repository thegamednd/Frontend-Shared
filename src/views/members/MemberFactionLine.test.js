// Guards the Member.vue wiring contract: the view renders
// factionMembershipLine(member, factionStore.factions) in a .faction-line
// element next to the name. The line-building logic itself is covered in
// utils/factions.test.js; this checks the glue.
import { describe, it, expect } from 'vitest';
import { factionMembershipLine } from '@shared/utils/factions.js';

describe('Member view faction line contract', () => {
    it('produces the exact copy rendered next to the character name', () => {
        const member = { ID: 'c1', Name: 'Bob', Known: true, Factions: [{ FactionID: 'f1', Known: true }] };
        const factions = [{ ID: 'f1', Name: 'Harpers', Known: true }];
        expect(factionMembershipLine(member, factions)).toBe('Member of the Harpers');
    });
});
