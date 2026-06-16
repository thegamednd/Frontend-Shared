import { describe, it, expect } from 'vitest';
import { MODEL_TIERS, DEFAULT_TIER, isValidTier, tierMultiplierLabel } from './aiModelTiers.js';

describe('aiModelTiers', () => {
  it('lists three tiers with multipliers', () => {
    expect(MODEL_TIERS.map((t) => t.value)).toEqual(['standard', 'enhanced', 'premium']);
    expect(MODEL_TIERS.map((t) => t.mult)).toEqual(['1×', '3×', '5×']);
  });

  it('defaults to standard', () => {
    expect(DEFAULT_TIER).toBe('standard');
  });

  it('validates tier slugs', () => {
    expect(isValidTier('enhanced')).toBe(true);
    expect(isValidTier('turbo')).toBe(false);
    expect(isValidTier(undefined)).toBe(false);
  });

  it('returns the multiplier label, falling back to 1×', () => {
    expect(tierMultiplierLabel('premium')).toBe('5×');
    expect(tierMultiplierLabel('nope')).toBe('1×');
  });
});
