import { describe, it, expect } from 'vitest';
import { formatYear, toSignedYear, ageAt } from './dynastyYears';

describe('formatYear', () => {
    it('formats with the default abbreviation', () => {
        expect(formatYear(212)).toBe('212 SF');
    });
    it('formats approximate years with a custom abbreviation', () => {
        expect(formatYear(-40, { approx: true, abbr: 'AR' })).toBe('c. -40 AR');
    });
    it('returns empty for null', () => {
        expect(formatYear(null)).toBe('');
        expect(formatYear(undefined)).toBe('');
    });
});

describe('toSignedYear', () => {
    it('returns null for blank input', () => {
        expect(toSignedYear('')).toBeNull();
        expect(toSignedYear('  ')).toBeNull();
        expect(toSignedYear(null)).toBeNull();
    });
    it('parses signed integers', () => {
        expect(toSignedYear('212')).toBe(212);
        expect(toSignedYear('-40')).toBe(-40);
    });
    it('throws on zero and non-integers', () => {
        expect(() => toSignedYear('0')).toThrow();
        expect(() => toSignedYear('1.5')).toThrow();
        expect(() => toSignedYear('abc')).toThrow();
    });
});

describe('ageAt', () => {
    it('returns the difference', () => {
        expect(ageAt(100, 130)).toBe(30);
    });
    it('skips the nonexistent year 0', () => {
        expect(ageAt(-5, 5)).toBe(9);
    });
    it('returns null when either year is unknown', () => {
        expect(ageAt(null, 10)).toBeNull();
        expect(ageAt(10, null)).toBeNull();
    });
});
