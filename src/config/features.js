export const features = {
  hasClasses: !!import.meta.env.VITE_HAS_CLASSES,
  hasRaces: !!import.meta.env.VITE_HAS_RACES,
  hasSpells: !!import.meta.env.VITE_HAS_SPELLS,
  hasMaps: !!import.meta.env.VITE_HAS_MAPS,
  hasShop: !!import.meta.env.VITE_HAS_SHOP,
  hasPayPal: !!import.meta.env.VITE_HAS_PAYPAL,
  hasCharacterSheets: !!import.meta.env.VITE_HAS_CHARACTER_SHEETS,
  hasGamingSystems: !!import.meta.env.VITE_HAS_GAMING_SYSTEMS,
  appName: import.meta.env.VITE_APP_NAME || 'RealmForge',
  appPrefix: import.meta.env.VITE_APP_PREFIX || 'rf',
  scribeName: import.meta.env.VITE_SCRIBE_NAME || 'Lorekeeper',
};
