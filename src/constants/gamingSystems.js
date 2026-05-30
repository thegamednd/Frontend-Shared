// RPG rulesets supported inside the RealmForge platform. Each entry powers
// a character-sheet schema; the realm stores its choice on `realm.RPGRuleset`.
// This is distinct from the platform-level GamingSystems concept (RealmForge
// vs The Game) carried via the X-Gaming-System-ID header.

export const DND5E_RULESET = 'dnd5e';

export const RPG_RULESETS = {
  DND5E: { value: DND5E_RULESET, name: 'Dungeons & Dragons 5e' },
};
