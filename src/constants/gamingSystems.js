// RPG rulesets supported inside the RealmForge platform. Each entry powers
// a character-sheet schema; the realm stores its choice on `realm.RPGRuleset`.
// This is distinct from the platform-level GamingSystems concept (RealmForge
// vs The Game) carried via the X-Gaming-System-ID header.

export const DND5E_RULESET = 'dnd5e';

export const RPG_RULESETS = {
  DND5E: { value: DND5E_RULESET, name: 'Dungeons & Dragons 5e' },
};

export const REALMFORGE_GAMING_SYSTEM_ID = '80780e6c-c5dd-40fa-a39f-dbb0aac2f476';

// Child GamingSystems record id for the D&D 5e ruleset content (classes/races/spells).
export const DND5E_GAMING_SYSTEM_ID = import.meta.env.VITE_DND5E_GAMING_SYSTEM_ID || '650022a7-f9f7-4f61-aaca-fb0c901f3b24';

// Map an RPGRuleset value to its content GamingSystems child id.
export function gamingSystemIdForRuleset(ruleset) {
  if (ruleset === DND5E_RULESET) return DND5E_GAMING_SYSTEM_ID;
  return null;
}
