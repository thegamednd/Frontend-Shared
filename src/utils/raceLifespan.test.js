import { describe, it, expect } from 'vitest';
import {
    DEFAULT_HUMAN_LIFESPAN, isHuman, lifespanPercentOf, expectedYears,
    toPercentPayload, validPercent, validHumanLifespan,
} from './raceLifespan';

describe('raceLifespan', () => {
    it('defaults human lifespan to 62', () => expect(DEFAULT_HUMAN_LIFESPAN).toBe(62));
    it('computes expected years', () => {
        expect(expectedYears(62, 400)).toBe(248);
        expect(expectedYears(62, 100)).toBe(62);
        expect(expectedYears(62, 33)).toBe(20);
    });
    it('detects Human by trimmed, case-insensitive name', () => {
        expect(isHuman(' HUMAN ')).toBe(true);
        expect(isHuman('Elf')).toBe(false);
        expect(isHuman(undefined)).toBe(false);
    });
    it('lifespanPercentOf: human 100, absent 100, else value', () => {
        expect(lifespanPercentOf({ RaceName: 'Human', LifespanPercent: 50 })).toBe(100);
        expect(lifespanPercentOf({ RaceName: 'Elf' })).toBe(100);
        expect(lifespanPercentOf({ RaceName: 'Elf', LifespanPercent: 300 })).toBe(300);
    });
    it('toPercentPayload: blank is undefined, never 0 or NaN', () => {
        expect(toPercentPayload('')).toBeUndefined();
        expect(toPercentPayload('   ')).toBeUndefined();
        expect(toPercentPayload(null)).toBeUndefined();
        expect(toPercentPayload(undefined)).toBeUndefined();
        expect(toPercentPayload('abc')).toBeUndefined();
        expect(toPercentPayload('300')).toBe(300);
        expect(toPercentPayload(250)).toBe(250);
    });
    it('validates ranges', () => {
        expect(validPercent(10)).toBe(true);
        expect(validPercent(10000)).toBe(true);
        expect(validPercent(9)).toBe(false);
        expect(validPercent(10001)).toBe(false);
        expect(validPercent(12.5)).toBe(false);
        expect(validHumanLifespan(20)).toBe(true);
        expect(validHumanLifespan(500)).toBe(true);
        expect(validHumanLifespan(19)).toBe(false);
        expect(validHumanLifespan(501)).toBe(false);
        expect(validHumanLifespan(NaN)).toBe(false);
    });
});
