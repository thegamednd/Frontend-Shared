import { describe, it, expect, vi, afterEach } from 'vitest';
import { upgradeUrl } from './dynastyErrors';

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
