/**
 * Distributes a rolled stat pool across the five pool stats (str, dex, int,
 * wis, con), weighted by the character's chosen classes. Cha and Com are not
 * part of the pool and are never allocated here.
 */

export const STAT_FLOOR = 6;
export const STAT_CAP = 18;
export const POOL_STATS = ['str', 'dex', 'int', 'wis', 'con'];

const PRIMARY = 4;
const SECONDARY = 2;
const TERTIARY = 1;
const BASELINE = 0.5; // unlisted stats get a little, so they aren't all at floor

/** Built-in class -> stat priority map (keys are lowercased class names). */
export const CLASS_PRIORITIES = {
  warrior: { str: PRIMARY, con: SECONDARY, dex: TERTIARY },
  'holy warrior': { str: PRIMARY, con: SECONDARY, wis: TERTIARY },
  wizard: { int: PRIMARY, dex: SECONDARY, con: TERTIARY },
  'battle mage': { int: PRIMARY, str: SECONDARY, con: TERTIARY },
  witch: { int: PRIMARY, dex: SECONDARY, con: TERTIARY },
  cleric: { wis: PRIMARY, con: SECONDARY, str: TERTIARY },
  healer: { wis: PRIMARY, con: SECONDARY, int: TERTIARY },
  druid: { wis: PRIMARY, con: SECONDARY, dex: TERTIARY },
  shaman: { wis: PRIMARY, con: SECONDARY, dex: TERTIARY },
  thief: { dex: PRIMARY, int: SECONDARY, str: TERTIARY },
  assassin: { dex: PRIMARY, int: SECONDARY, str: TERTIARY },
  ranger: { dex: PRIMARY, str: SECONDARY, con: TERTIARY },
  monk: { dex: PRIMARY, wis: SECONDARY, str: TERTIARY },
  psionicist: { wis: PRIMARY, int: SECONDARY, con: TERTIARY },
  mystic: { wis: PRIMARY, int: SECONDARY, con: TERTIARY },
  seer: { wis: PRIMARY, int: SECONDARY, con: TERTIARY },
  bard: { dex: PRIMARY, int: SECONDARY, con: TERTIARY },
  alchemist: { int: PRIMARY, dex: SECONDARY, con: TERTIARY },
  'shape-shifter': { con: PRIMARY, dex: SECONDARY, str: TERTIARY },
};

/** Map a free-text attribute name (full or abbreviated) to a pool stat key. */
const ATTR_ALIASES = {
  str: 'str', strength: 'str',
  dex: 'dex', dexterity: 'dex',
  int: 'int', intelligence: 'int',
  wis: 'wis', wisdom: 'wis',
  con: 'con', constitution: 'con',
};

function normalizeAttr(name) {
  if (!name) return null;
  return ATTR_ALIASES[String(name).trim().toLowerCase()] || null;
}

/**
 * Resolve one class entry to a { stat: weight } map.
 * A usable PrimaryAttributes array overrides the built-in priority map
 * (first listed attribute = primary, the rest = secondary).
 */
function weightsForClass(cls) {
  const primaryAttrs = (cls?.PrimaryAttributes || [])
    .map(normalizeAttr)
    .filter(Boolean);
  if (primaryAttrs.length > 0) {
    const weights = {};
    primaryAttrs.forEach((stat, i) => {
      const w = i === 0 ? PRIMARY : SECONDARY;
      weights[stat] = Math.max(weights[stat] || 0, w);
    });
    return weights;
  }
  const name = String(cls?.name || cls?.ClassName || '').trim().toLowerCase();
  return CLASS_PRIORITIES[name] || {};
}

/** Combine class weights via union: max weight per stat across all classes. */
function combineWeights(classes) {
  const combined = {};
  for (const cls of classes || []) {
    const weights = weightsForClass(cls);
    for (const stat of POOL_STATS) {
      if (weights[stat]) {
        combined[stat] = Math.max(combined[stat] || 0, weights[stat]);
      }
    }
  }
  return combined;
}

/**
 * Distribute `pool` points across the five pool stats.
 * Returns { str, dex, int, wis, con }, each within [STAT_FLOOR, STAT_CAP].
 * Uses largest-remainder proportional allocation, re-run as stats hit the cap,
 * so the result tracks class weights while always respecting the bounds. Any
 * points beyond the 5x18 capacity (pool > 90) are discarded.
 */
export function autoDistribute(pool, classes) {
  const stats = {};
  POOL_STATS.forEach((s) => { stats[s] = STAT_FLOOR; });

  let remaining = pool - STAT_FLOOR * POOL_STATS.length;
  if (remaining <= 0) return stats;

  const combined = combineWeights(classes);
  const weights = {};
  POOL_STATS.forEach((s) => { weights[s] = combined[s] || BASELINE; });

  while (remaining > 0) {
    const open = POOL_STATS.filter((s) => stats[s] < STAT_CAP);
    if (open.length === 0) break; // pool exceeds capacity; discard the rest
    const totalW = open.reduce((t, s) => t + weights[s], 0);

    const quotas = open.map((s) => {
      const exact = remaining * (weights[s] / totalW);
      return { s, base: Math.floor(exact), frac: exact - Math.floor(exact) };
    });

    let placed = 0;
    // Place each quota's whole part, respecting the cap.
    for (const q of quotas) {
      const give = Math.min(q.base, STAT_CAP - stats[q.s]);
      stats[q.s] += give;
      placed += give;
    }
    // Hand out the rounding remainder by largest fractional part.
    let rem = remaining - placed;
    quotas.sort((a, b) => b.frac - a.frac);
    for (const q of quotas) {
      if (rem <= 0) break;
      if (stats[q.s] < STAT_CAP) {
        stats[q.s] += 1;
        placed += 1;
        rem -= 1;
      }
    }
    if (placed === 0) break; // safety: no forward progress
    remaining -= placed;
  }

  return stats;
}
