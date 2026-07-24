import { describe, it, expect } from 'vitest';
import {
    membershipsOf, isMemberOfFaction, membersOfFaction,
    isHiddenMember, factionMembershipLine,
} from './factions.js';
import { toggleMembership, setMembershipKnown } from './factions.js';

const harpers = { ID: 'f1', Name: 'Harpers', Known: true };
const zhent = { ID: 'f2', Name: 'Zhentarim', Known: false };
const bob = { ID: 'c1', Name: 'Bob', Known: true, Factions: [{ FactionID: 'f1', Known: true }] };
const spy = { ID: 'c2', Name: 'Spy', Known: true, Factions: [{ FactionID: 'f1', Known: false }, { FactionID: 'f2', Known: true }] };
const ghost = { ID: 'c3', Name: 'Ghost', Known: false, Factions: [{ FactionID: 'f1', Known: true }] };

describe('membership helpers', () => {
    it('membershipsOf tolerates missing arrays', () => {
        expect(membershipsOf({})).toEqual([]);
        expect(membershipsOf(null)).toEqual([]);
    });
    it('isMemberOfFaction matches by FactionID', () => {
        expect(isMemberOfFaction(bob, 'f1')).toBe(true);
        expect(isMemberOfFaction(bob, 'f2')).toBe(false);
    });
    it('membersOfFaction filters a character list', () => {
        expect(membersOfFaction([bob, spy, ghost], 'f1').map(c => c.ID)).toEqual(['c1', 'c2', 'c3']);
    });
});

describe('isHiddenMember (DM badge)', () => {
    it('false for a known member of the faction who is a known character', () => {
        expect(isHiddenMember(bob, 'f1')).toBe(false);
    });
    it('true when the membership is secret', () => {
        expect(isHiddenMember(spy, 'f1')).toBe(true);
    });
    it('true when the character is unknown', () => {
        expect(isHiddenMember(ghost, 'f1')).toBe(true);
    });
});

describe('factionMembershipLine', () => {
    const factions = [harpers, zhent];
    it('names only known memberships in known factions', () => {
        expect(factionMembershipLine(bob, factions)).toBe('Member of the Harpers');
    });
    it('empty when the only memberships are secret or in unknown factions', () => {
        expect(factionMembershipLine(spy, factions)).toBe('');
    });
    it('empty for unknown characters and characters without factions', () => {
        expect(factionMembershipLine(ghost, factions)).toBe('');
        expect(factionMembershipLine({ ID: 'x', Name: 'X' }, factions)).toBe('');
    });
    it('joins multiple factions with commas', () => {
        const multi = { ...bob, Factions: [{ FactionID: 'f1', Known: true }, { FactionID: 'f3', Known: true }] };
        expect(factionMembershipLine(multi, [...factions, { ID: 'f3', Name: 'Lords', Known: true }]))
            .toBe('Member of the Harpers, Lords');
    });
});

describe('membership editing helpers', () => {
    it('toggleMembership adds with Known=false and removes cleanly', () => {
        let list = toggleMembership([], 'f1', true);
        expect(list).toEqual([{ FactionID: 'f1', Known: false }]);
        list = toggleMembership(list, 'f2', true);
        expect(list).toHaveLength(2);
        list = toggleMembership(list, 'f1', false);
        expect(list).toEqual([{ FactionID: 'f2', Known: false }]);
    });
    it('setMembershipKnown flips one entry immutably', () => {
        const list = [{ FactionID: 'f1', Known: false }, { FactionID: 'f2', Known: false }];
        const next = setMembershipKnown(list, 'f1', true);
        expect(next[0]).toEqual({ FactionID: 'f1', Known: true });
        expect(next[1]).toEqual({ FactionID: 'f2', Known: false });
        expect(list[0].Known).toBe(false);
    });
});
