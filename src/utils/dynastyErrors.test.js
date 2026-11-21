import { describe, it, expect, vi, afterEach } from 'vitest';
import { upgradeUrl, scandalErrorMessage } from './dynastyErrors';

afterEach(() => vi.unstubAllEnvs());

describe('upgradeUrl', () => {
    it('points at the pricing page on the register URL origin', () => {
        vi.stubEnv('VITE_REGISTER_URL', 'https://dev.realmforge.io/register');
        expect(upgradeUrl()).toBe('https://dev.realmforge.io/pricing');
    });

    it('falls back to realmforge.io when the env var is missing', () => {
        vi.stubEnv('VITE_REGISTER_URL', '');
        expect(upgradeUrl()).toBe('https://realmforge.io/pricing');
    });

    it('falls back to realmforge.io when the env var is not a URL', () => {
        vi.stubEnv('VITE_REGISTER_URL', 'not a url');
        expect(upgradeUrl()).toBe('https://realmforge.io/pricing');
    });
});

describe('scandalErrorMessage', () => {
    it('maps the scandal codes and keeps validation text', () => {
        expect(scandalErrorMessage({ error: { code: 'NOT_FOUND', message: 'Scandal not found' } }, null, 'x')).toContain('no longer there');
        expect(scandalErrorMessage({ error: { code: 'FORBIDDEN' } }, null, 'x')).toContain('Only the DM');
        expect(scandalErrorMessage({ error: { code: 'VALIDATION', message: 'vague is too long' } }, null, 'x')).toBe('vague is too long');
        expect(scandalErrorMessage({ error: null }, new Error(''), 'Fallback')).toBe('Fallback');
    });
});
