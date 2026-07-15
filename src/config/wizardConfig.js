/**
 * Per-realm wizard spell-school configuration.
 *
 * Schools are sorted into four categories — major, minor, non-opp (non-oppositional),
 * and opp (oppositional). This module owns the defaults (equal to the historical
 * hardcoded behavior), a resolver that merges a realm's stored overrides over those
 * defaults, and the single formula for a category's maximum learnable spell level.
 *
 * Storage location: realm.GamingSystem.spellsWizardConfig
 */

export const DEFAULT_WIZARD_CONFIG = {
  // Minimum schools a wizard must assign in each category before learning spells.
  ratioMinimums: { major: 1, minor: 2, opp: 2 },
  // Max learnable spell level = floor(wizard level / divisor).
  divisors: { major: 2, minor: 4, nonOpp: 8, opp: 12 },
  // Wizard level at which each tier becomes usable (major is always available).
  unlockLevels: { minor: 10, nonOpp: 10, opp: 10 },
  // When true, oppositional schools are never usable (max level 0).
  oppLocked: true,
};

/**
 * Merge a realm's stored wizard config over the defaults.
 * @param {object|null|undefined} realm - realm record (reads GamingSystem.spellsWizardConfig)
 * @returns {typeof DEFAULT_WIZARD_CONFIG} complete config
 */
export function resolveWizardConfig(realm) {
  const stored = realm?.GamingSystem?.spellsWizardConfig;
  const d = DEFAULT_WIZARD_CONFIG;
  return {
    ratioMinimums: { ...d.ratioMinimums, ...(stored?.ratioMinimums || {}) },
    divisors: { ...d.divisors, ...(stored?.divisors || {}) },
    unlockLevels: { ...d.unlockLevels, ...(stored?.unlockLevels || {}) },
    oppLocked: typeof stored?.oppLocked === 'boolean' ? stored.oppLocked : d.oppLocked,
  };
}

/**
 * Maximum learnable spell level for a school category at a given wizard level.
 * @param {'major'|'minor'|'non-opp'|'opp'} category
 * @param {number} level - wizard class level
 * @param {typeof DEFAULT_WIZARD_CONFIG} config - a resolved config
 * @returns {number} max spell level (0 = category unusable)
 */
export function maxSpellLevelForCategory(category, level, config) {
  const { divisors, unlockLevels, oppLocked } = config;
  switch (category) {
    case 'major':
      return Math.max(1, Math.floor(level / divisors.major));
    case 'minor':
      return level >= unlockLevels.minor ? Math.floor(level / divisors.minor) : 0;
    case 'non-opp':
      return level >= unlockLevels.nonOpp ? Math.floor(level / divisors.nonOpp) : 0;
    case 'opp':
    default:
      if (oppLocked) return 0;
      return level >= unlockLevels.opp ? Math.floor(level / divisors.opp) : 0;
  }
}
