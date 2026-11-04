import { describe, it, expect } from 'vitest';
import { cleanFamilyName, joinName } from './names.js';

const google = [{ providerName: 'Google' }];

describe('cleanFamilyName', () => {
    it('strips the given name from a federated full name', () => {
        expect(cleanFamilyName('Neil', 'Neil Bayly', google)).toBe('Bayly');
    });

    it('keeps every remaining surname word', () => {
        expect(cleanFamilyName('Ana', 'Ana de la Cruz', google)).toBe('de la Cruz');
    });

    it('strips a given name Google placed last', () => {
        expect(cleanFamilyName('Taro', 'Yamada Taro', google)).toBe('Yamada');
    });

    it('returns empty for a federated account with a single name', () => {
        expect(cleanFamilyName('Neil', 'Neil', google)).toBe('');
    });

    it('leaves a real federated surname alone', () => {
        expect(cleanFamilyName('Neil', 'Bayly', google)).toBe('Bayly');
    });

    it('does not strip a surname that merely starts with the given name', () => {
        expect(cleanFamilyName('Neil', 'Neilson', google)).toBe('Neilson');
    });

    it('leaves email signups exactly as typed', () => {
        expect(cleanFamilyName('Neil', 'Neil', undefined)).toBe('Neil');
        expect(cleanFamilyName('Neil', 'Neil Bayly', [])).toBe('Neil Bayly');
    });

    it('accepts identities still in string form', () => {
        expect(cleanFamilyName('Neil', 'Neil Bayly', JSON.stringify(google))).toBe('Bayly');
    });

    it('returns empty when there is no family name', () => {
        expect(cleanFamilyName('Neil', null, google)).toBe('');
    });
});

describe('joinName', () => {
    it('joins first and last names', () => {
        expect(joinName('Neil', 'Bayly')).toBe('Neil Bayly');
    });

    it('omits a missing last name', () => {
        expect(joinName('Neil', null)).toBe('Neil');
        expect(joinName('Neil', '')).toBe('Neil');
    });

    it('omits a missing first name', () => {
        expect(joinName(null, 'Bayly')).toBe('Bayly');
    });
});
