/**
 * Dice rolling utilities for TheGame character stat generation.
 * Every function accepts an injectable `rng` (default Math.random) that returns
 * a float in [0, 1), so callers/tests can make rolls deterministic.
 */

export const MIN_POOL = 53;

/** Roll a single die with `sides` faces. Returns 1..sides. */
export function rollDie(sides, rng = Math.random) {
  return Math.floor(rng() * sides) + 1;
}

/** Roll `count` dice with `sides` faces. Returns an array of results. */
export function rollDice(count, sides, rng = Math.random) {
  const rolls = [];
  for (let i = 0; i < count; i++) {
    rolls.push(rollDie(sides, rng));
  }
  return rolls;
}

/**
 * Roll one stat: 3d6 + 1d3 (range 4..21).
 * Returns { d6: number[], d3: number, total: number }.
 */
export function rollStat(rng = Math.random) {
  const d6 = rollDice(3, 6, rng);
  const d3 = rollDie(3, rng);
  const total = d6[0] + d6[1] + d6[2] + d3;
  return { d6, d3, total };
}

/**
 * Roll the five-stat pool: five `rollStat` rolls summed.
 * Re-rolls the entire set until the summed total is >= MIN_POOL.
 * Returns { rolls: Array<{d6,d3,total}>, total: number }.
 */
export function rollPool(rng = Math.random) {
  let rolls;
  let total;
  do {
    rolls = [rollStat(rng), rollStat(rng), rollStat(rng), rollStat(rng), rollStat(rng)];
    total = rolls.reduce((sum, r) => sum + r.total, 0);
  } while (total < MIN_POOL);
  return { rolls, total };
}
