import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from './user.js';

const storeWith = (attributes) => {
    const store = useUserStore();
    store.user = { attributes };
    return store;
};

const google = [{ providerName: 'Google' }];

describe('user store names', () => {
    beforeEach(() => setActivePinia(createPinia()));

    it('does not repeat the first name for a Google user', () => {
        const store = storeWith({ given_name: 'Neil', family_name: 'Neil Bayly', identities: google });
        expect(store.fullName).toBe('Neil Bayly');
        expect(store.lastName).toBe('Bayly');
    });

    it('shows one name for a single-name Google user', () => {
        const store = storeWith({ given_name: 'Neil', family_name: 'Neil', identities: google });
        expect(store.fullName).toBe('Neil');
        expect(store.lastName).toBeNull();
    });

    it('shows an email user exactly as typed', () => {
        expect(storeWith({ given_name: 'Neil', family_name: 'Neil' }).fullName).toBe('Neil Neil');
    });

    it('falls back when no name is set', () => {
        expect(storeWith({}).fullName).toBe('UNKNOWN');
    });
});
