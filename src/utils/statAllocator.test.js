import { describe, it, expect } from 'vitest';
import {
  autoDistribute,
  POOL_STATS,
  STAT_FLOOR,
  STAT_CAP,
} from './statAllocator.js';

const sum = (stats) => POOL_STATS.reduce((t, s) => t + stats[s], 0);
const inBounds = (stats) =>
  POOL_STATS.every((s) => stats[s] >= STAT_FLOOR && stats[s] <= STAT_CAP);

describe('autoDistribute — invariants', () => {
  it('keeps every stat within [floor, cap]', () => {
    const stats = autoDistribute(72, [{ name: 'Warrior' }]);
    expect(inBounds(stats)).toBe(true);
  });

  it('spends the whole pool when it fits within capacity', () => {
    const stats = autoDistribute(53, [{ name: 'Warrior' }]);
    expect(sum(stats)).toBe(53);
  });

  it('caps total at 90 (5x18) and discards the overflow', () => {
    const stats = autoDistribute(200, [{ name: 'Warrior' }]);
    expect(sum(stats)).toBe(90);
    expect(POOL_STATS.every((s) => stats[s] === STAT_CAP)).toBe(true);
  });
});

describe('autoDistribute — class weighting', () => {
  it('gives a single-class fighter the most in its primary stat', () => {
    const stats = autoDistribute(60, [{ name: 'Warrior' }]); // primary: str
    expect(stats.str).toBe(Math.max(...POOL_STATS.map((s) => stats[s])));
    expect(stats.str).toBeGreaterThan(stats.wis); // wis is baseline-only
  });

  it('treats a stat as primary if ANY class makes it primary (multiclass union)', () => {
    // Warrior primary = str; Wizard primary = int. Both should be high.
    const stats = autoDistribute(60, [{ name: 'Warrior' }, { name: 'Wizard' }]);
    expect(Math.min(stats.str, stats.int)).toBeGreaterThan(stats.wis);
  });

  it('lets a class PrimaryAttributes array override the built-in map', () => {
    // Warrior would normally favor str, but PrimaryAttributes overrides to int.
    const stats = autoDistribute(60, [
      { name: 'Warrior', PrimaryAttributes: ['Intelligence'] },
    ]);
    expect(stats.int).toBeGreaterThan(stats.str);
  });

  it('spreads evenly when there are no classes', () => {
    const stats = autoDistribute(53, []);
    const values = POOL_STATS.map((s) => stats[s]);
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
    expect(sum(stats)).toBe(53);
  });
});
