import { describe, it, expect } from 'vitest';
import {
  MODEL_TIERS,
  DEFAULT_TIER,
  isValidTier,
  normalizeTier,
  tierMultiplierLabel,
} from './aiModelTiers.js';

describe('aiModelTiers', () => {
  it('lists two tiers with multipliers', () => {
    expect(MODEL_TIERS.map((t) => t.value)).toEqual(['standard', 'enhanced']);
    expect(MODEL_TIERS.map((t) => t.mult)).toEqual(['1×', '2×']);
  });

  it('defaults to standard', () => {
    expect(DEFAULT_TIER).toBe('standard');
  });

  it('validates tier slugs', () => {
    expect(isValidTier('enhanced')).toBe(true);
    expect(isValidTier('premium')).toBe(false); // retired slug
    expect(isValidTier('turbo')).toBe(false);
    expect(isValidTier(undefined)).toBe(false);
  });

  it('normalizes the retired premium slug to enhanced', () => {
    expect(normalizeTier('premium')).toBe('enhanced');
    expect(normalizeTier('enhanced')).toBe('enhanced');
    expect(normalizeTier('standard')).toBe('standard');
    expect(normalizeTier(undefined)).toBe('standard');
    expect(normalizeTier(null)).toBe('standard');
  });

  it('returns the multiplier label, falling back to 1×', () => {
    expect(tierMultiplierLabel('enhanced')).toBe('2×');
    expect(tierMultiplierLabel('premium')).toBe('2×'); // legacy pref shows Enhanced pricing
    expect(tierMultiplierLabel('nope')).toBe('1×');
  });
});
