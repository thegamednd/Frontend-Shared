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

describe('autoDistribute — boundaries and fallbacks', () => {
  it('spends the full pool at exactly capacity (90)', () => {
    const stats = autoDistribute(90, [{ name: 'Warrior' }]);
    expect(sum(stats)).toBe(90);
    expect(POOL_STATS.every((s) => stats[s] === STAT_CAP)).toBe(true);
  });

  it('caps at 90 and discards overflow when pool is just over capacity (91)', () => {
    const stats = autoDistribute(91, [{ name: 'Warrior' }]);
    expect(sum(stats)).toBe(90);
    expect(inBounds(stats)).toBe(true);
  });

  it('keeps every stat at the floor when pool equals the floor baseline (30)', () => {
    const stats = autoDistribute(30, [{ name: 'Warrior' }]);
    expect(POOL_STATS.every((s) => stats[s] === STAT_FLOOR)).toBe(true);
    expect(sum(stats)).toBe(30);
  });

  it('never drops below the floor when pool is under the baseline (< 30)', () => {
    const stats = autoDistribute(20, [{ name: 'Warrior' }]);
    expect(POOL_STATS.every((s) => stats[s] === STAT_FLOOR)).toBe(true);
  });

  it('spreads evenly for an unknown class name (not in the map)', () => {
    const stats = autoDistribute(53, [{ name: 'Nonexistent Class' }]);
    const values = POOL_STATS.map((s) => stats[s]);
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
    expect(sum(stats)).toBe(53);
  });

  it('ignores unrecognized PrimaryAttributes and falls back to even spread', () => {
    const stats = autoDistribute(53, [{ name: 'Unknown', PrimaryAttributes: ['Banana'] }]);
    const values = POOL_STATS.map((s) => stats[s]);
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
    expect(sum(stats)).toBe(53);
  });
});
