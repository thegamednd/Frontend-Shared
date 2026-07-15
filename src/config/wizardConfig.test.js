import { describe, it, expect } from 'vitest';
import {
  DEFAULT_WIZARD_CONFIG,
  resolveWizardConfig,
  maxSpellLevelForCategory,
} from './wizardConfig.js';

describe('DEFAULT_WIZARD_CONFIG', () => {
  it('matches the historical hardcoded values', () => {
    expect(DEFAULT_WIZARD_CONFIG).toEqual({
      ratioMinimums: { major: 1, minor: 2, opp: 2 },
      divisors: { major: 2, minor: 4, nonOpp: 8, opp: 12 },
      unlockLevels: { minor: 10, nonOpp: 10, opp: 10 },
      oppLocked: true,
    });
  });
});

describe('resolveWizardConfig', () => {
  it('returns defaults when realm is null', () => {
    expect(resolveWizardConfig(null)).toEqual(DEFAULT_WIZARD_CONFIG);
  });

  it('returns defaults when no config stored', () => {
    expect(resolveWizardConfig({ GamingSystem: {} })).toEqual(DEFAULT_WIZARD_CONFIG);
  });

  it('deep-merges partial stored config over defaults', () => {
    const realm = { GamingSystem: { spellsWizardConfig: {
      divisors: { major: 3 },
      oppLocked: false,
    } } };
    const cfg = resolveWizardConfig(realm);
    expect(cfg.divisors).toEqual({ major: 3, minor: 4, nonOpp: 8, opp: 12 });
    expect(cfg.oppLocked).toBe(false);
    expect(cfg.ratioMinimums).toEqual({ major: 1, minor: 2, opp: 2 });
  });

  it('does not mutate DEFAULT_WIZARD_CONFIG', () => {
    resolveWizardConfig({ GamingSystem: { spellsWizardConfig: { divisors: { major: 9 } } } });
    expect(DEFAULT_WIZARD_CONFIG.divisors.major).toBe(2);
  });
});

describe('maxSpellLevelForCategory (default config)', () => {
  const c = DEFAULT_WIZARD_CONFIG;
  it('major is floor(level/2) with a floor of 1', () => {
    expect(maxSpellLevelForCategory('major', 1, c)).toBe(1);
    expect(maxSpellLevelForCategory('major', 20, c)).toBe(10);
  });
  it('minor is 0 below unlock, floor(level/4) at/above', () => {
    expect(maxSpellLevelForCategory('minor', 9, c)).toBe(0);
    expect(maxSpellLevelForCategory('minor', 20, c)).toBe(5);
  });
  it('non-opp is 0 below unlock, floor(level/8) at/above', () => {
    expect(maxSpellLevelForCategory('non-opp', 9, c)).toBe(0);
    expect(maxSpellLevelForCategory('non-opp', 20, c)).toBe(2);
  });
  it('opp is 0 when locked', () => {
    expect(maxSpellLevelForCategory('opp', 20, c)).toBe(0);
  });
  it('opp uses divisor/unlock when unlocked', () => {
    const unlocked = { ...c, oppLocked: false };
    expect(maxSpellLevelForCategory('opp', 9, unlocked)).toBe(0);
    expect(maxSpellLevelForCategory('opp', 24, unlocked)).toBe(2);
  });
});
