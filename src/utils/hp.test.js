import { describe, it, expect } from 'vitest';
import { hpTotal } from './hp.js';

describe('hpTotal', () => {
    it('returns the total from the { current, total } shape', () => {
        expect(hpTotal({ current: 9, total: 17 })).toBe(17);
    });

    it('ignores current HP entirely', () => {
        expect(hpTotal({ current: -12, total: 17 })).toBe(17);
        expect(hpTotal({ current: 40, total: 17 })).toBe(17);
    });

    it('passes a plain number through', () => {
        expect(hpTotal(17)).toBe(17);
        expect(hpTotal(0)).toBe(0);
    });

    it('falls back to current when total is missing', () => {
        expect(hpTotal({ current: 11 })).toBe(11);
    });

    it('returns null for missing or unusable values', () => {
        expect(hpTotal(null)).toBeNull();
        expect(hpTotal(undefined)).toBeNull();
        expect(hpTotal({})).toBeNull();
        expect(hpTotal('nonsense')).toBeNull();
    });
});
