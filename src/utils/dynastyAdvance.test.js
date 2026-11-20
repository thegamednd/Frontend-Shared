import { describe, it, expect } from 'vitest';
import { groupEvents, eventLine, advanceErrorMessage } from './dynastyAdvance';

const run = {
    houses: { h1: 'Vane', h2: 'Arden' },
    people: {
        p1: { name: 'Alys', houseId: 'h1', gender: 'female' },
        p2: { name: 'Bram', houseId: 'h1', gender: 'male' },
        p3: { name: 'Cora', houseId: 'h2', gender: 'female', fatherId: 'p2' },
    },
    events: [
        { kind: 'death', ref: 'd1', personId: 'p1', age: 80 },
        { kind: 'comesForward', ref: 'c1', personId: 'p3' },
        { kind: 'barren', ref: 'b1', personId: 'p1', age: 50 },
        { kind: 'pregnancy', ref: 'pg1', motherId: 'p1', fatherId: 'p2' },
        { kind: 'marriage', ref: 'm:p2', personId: 'p2', spouse: { gender: 'female', houseId: 'h1' } },
        { kind: 'natural', ref: 'n1', fatherId: 'p2', houseId: 'h1', gender: 'male' },
        { kind: 'birth', ref: 'bi1', motherId: 'p1', fatherId: 'p2', houseId: 'h1', gender: 'female', stillborn: false },
        { kind: 'death', ref: 'd2', personId: 'p3', age: 20 },
    ],
};

describe('groupEvents', () => {
    it('sorts houses by name and orders the kinds', () => {
        const out = groupEvents(run);
        expect(out.map((h) => h.name)).toEqual(['Arden', 'Vane']);
        expect(out[1].groups.map((g) => g.id)).toEqual([
            'death', 'birth', 'natural', 'marriage', 'pregnancy', 'barren',
        ]);
        expect(out[0].groups.map((g) => g.id)).toEqual(['death', 'comesForward']);
    });
    it('copes with no run', () => {
        expect(groupEvents(null)).toEqual([]);
    });
});

describe('eventLine', () => {
    it('writes plain lines', () => {
        expect(eventLine(run.events[0], run)).toBe('Alys dies aged 80');
        expect(eventLine(run.events[4], run)).toBe('Bram marries a new wife');
        expect(eventLine(run.events[6], run)).toBe('A daughter is born to Alys and Bram');
        expect(eventLine(run.events[1], run)).toBe('Cora, a child of Bram, comes forward');
    });
    it('says "her" or "his" father for a child left with him, by the child\'s gender', () => {
        const left = (gender) => ({ kind: 'natural', ref: 'n2', fatherId: 'p2', houseId: 'h1', gender, disclosure: 'left' });
        expect(eventLine(left('female'), run)).toBe('Bram fathers a natural daughter by a woman outside the family (left with her father)');
        expect(eventLine(left('male'), run)).toBe('Bram fathers a natural son by a woman outside the family (left with his father)');
    });
});

describe('advanceErrorMessage', () => {
    const codes = [
        'YEAR_AT_LIMIT', 'RUN_BUSY', 'TREE_SELECTION_REQUIRED', 'STALE_PREVIEW',
        'RUN_NOT_READY', 'YEAR_LOCKED', 'TREE_FULL', 'GENERATION_LIMIT',
    ];
    it.each(codes)('maps %s', (code) => {
        const msg = advanceErrorMessage({ code, message: 'server text' });
        expect(msg).not.toBe('server text');
        expect(msg).not.toMatch(/—/);
    });
    it('never says "commit", and never tells the DM to raise the cap', () => {
        for (const code of codes) expect(advanceErrorMessage({ code })).not.toMatch(/commit/i);
        expect(advanceErrorMessage({ code: 'RUN_NOT_READY' })).toBe('The save has started. You can only try saving again.');
        expect(advanceErrorMessage({ code: 'TREE_FULL' })).not.toMatch(/raise|cap/i);
        expect(advanceErrorMessage({ code: 'TREE_FULL' })).toMatch(/dies|upgrade/);
    });
    it('reads a raw axios error too', () => {
        expect(advanceErrorMessage({ response: { data: { error: { code: 'RUN_BUSY' } } } })).toMatch(/in progress/);
    });
    it('falls back to the server message', () => {
        expect(advanceErrorMessage({ code: 'WEIRD', message: 'Nope' })).toBe('Nope');
    });
});
