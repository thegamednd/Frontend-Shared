import { describe, it, expect } from 'vitest';
import { dynastyLimitsFor } from './dynastyLimits';

describe('dynastyLimitsFor', () => {
    it('free', () => expect(dynastyLimitsFor('free', 4)).toEqual({ family: 'free', maxTrees: 3, maxGenerations: 3, familyCap: 20 }));
    it('free ignores players', () => expect(dynastyLimitsFor('free', 10).maxTrees).toBe(3));
    it('blank plan', () => {
        expect(dynastyLimitsFor(undefined, 6).family).toBe('free');
        expect(dynastyLimitsFor('  ', 6).family).toBe('free');
    });
    it('fellowship-like names', () => {
        for (const p of ['base', 'base-patreon', 'potp', 'whatever']) {
            expect(dynastyLimitsFor(p, 6)).toEqual({ family: 'fellowship', maxTrees: 12, maxGenerations: 16, familyCap: 75 });
        }
    });
    it('guild and keep', () => {
        expect(dynastyLimitsFor('guild', 9)).toEqual({ family: 'guild', maxTrees: 18, maxGenerations: 16, familyCap: 150 });
        expect(dynastyLimitsFor('keep', 13)).toEqual({ family: 'keep', maxTrees: 26, maxGenerations: 16, familyCap: 300 });
    });
    it('suffixes', () => {
        expect(dynastyLimitsFor('guild-patreon', 9).familyCap).toBe(150);
        expect(dynastyLimitsFor('Keep-Upgrade', 13).familyCap).toBe(300);
    });
    it('players as a string', () => expect(dynastyLimitsFor('guild', '9').maxTrees).toBe(18));
    it('missing players', () => {
        expect(dynastyLimitsFor('guild', null).maxTrees).toBe(12);
        expect(dynastyLimitsFor('guild', 'abc').maxTrees).toBe(12);
    });
});
