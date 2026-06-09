import { describe, it, expect } from 'vitest';
import { rollDie, rollDice, rollStat, rollPool, MIN_POOL } from './diceRoller.js';

// Returns an rng that yields the queued fractions in order (wrapping).
function scriptedRng(fractions) {
  let i = 0;
  return () => fractions[i++ % fractions.length];
}
// Fraction that makes rollDie(sides) return `face`.
const f = (face, sides) => (face - 0.5) / sides;

describe('rollDie', () => {
  it('returns a value within 1..sides for the extreme rng values', () => {
    expect(rollDie(6, () => 0)).toBe(1);
    expect(rollDie(6, () => 0.999999)).toBe(6);
    expect(rollDie(3, () => 0)).toBe(1);
    expect(rollDie(3, () => 0.999999)).toBe(3);
  });
});

describe('rollDice', () => {
  it('returns an array of `count` rolls', () => {
    const rolls = rollDice(3, 6, scriptedRng([f(4, 6), f(5, 6), f(2, 6)]));
    expect(rolls).toEqual([4, 5, 2]);
  });
});

describe('rollStat', () => {
  it('rolls 3d6 + 1d3 and reports the dice and total', () => {
    // d6 = 4,5,2 (=11); d3 = 2; total = 13
    const result = rollStat(scriptedRng([f(4, 6), f(5, 6), f(2, 6), f(2, 3)]));
    expect(result).toEqual({ d6: [4, 5, 2], d3: 2, total: 13 });
  });

  it('produces a total in the 4..21 range at the extremes', () => {
    const min = rollStat(scriptedRng([f(1, 6), f(1, 6), f(1, 6), f(1, 3)]));
    const max = rollStat(scriptedRng([f(6, 6), f(6, 6), f(6, 6), f(3, 3)]));
    expect(min.total).toBe(4);
    expect(max.total).toBe(21);
  });
});

describe('rollPool', () => {
  it('sums five stat rolls into a pool', () => {
    // Five identical max rolls => 5 * 21 = 105
    const maxStat = [f(6, 6), f(6, 6), f(6, 6), f(3, 3)];
    const { rolls, total } = rollPool(scriptedRng(maxStat));
    expect(rolls).toHaveLength(5);
    expect(total).toBe(105);
  });

  it('re-rolls the whole pool when the total is below MIN_POOL', () => {
    const minStat = [f(1, 6), f(1, 6), f(1, 6), f(1, 3)]; // total 4 per stat
    const maxStat = [f(6, 6), f(6, 6), f(6, 6), f(3, 3)]; // total 21 per stat
    // First pool: five min rolls = 20 (< 53) -> reroll. Second: five max = 105.
    const fractions = [];
    for (let i = 0; i < 5; i++) fractions.push(...minStat);
    for (let i = 0; i < 5; i++) fractions.push(...maxStat);
    const { total } = rollPool(scriptedRng(fractions));
    expect(total).toBeGreaterThanOrEqual(MIN_POOL);
    expect(total).toBe(105);
  });
});
