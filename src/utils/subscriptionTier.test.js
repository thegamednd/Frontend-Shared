import { describe, it, expect } from 'vitest';
import { isPaidPlan } from './subscriptionTier';

describe('isPaidPlan', () => {
  it('returns false for null/undefined/empty', () => {
    expect(isPaidPlan(null)).toBe(false);
    expect(isPaidPlan(undefined)).toBe(false);
    expect(isPaidPlan('')).toBe(false);
  });

  it('returns false for the free string plan (any case)', () => {
    expect(isPaidPlan('free')).toBe(false);
    expect(isPaidPlan('FREE')).toBe(false);
  });

  it('returns true for paid string plans', () => {
    expect(isPaidPlan('guild')).toBe(true);
    expect(isPaidPlan('base-patreon')).toBe(true);
  });

  it('handles object plan shapes', () => {
    expect(isPaidPlan({ Tier: 'keep' })).toBe(true);
    expect(isPaidPlan({ Tier: 'free' })).toBe(false);
    expect(isPaidPlan({ Status: 'cancelled' })).toBe(false);
    expect(isPaidPlan({ Status: 'inactive' })).toBe(false);
  });
});
