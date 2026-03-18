/**
 * Theme definitions for TheGame-Vue.
 *
 * Each theme maps CSS custom property names (--theme-*) to values.
 * The 'dark-fantasy' theme matches the original hardcoded design.
 *
 * To add a new theme:
 * 1. Add a new entry to the `themes` object below
 * 2. Copy the dark-fantasy token set and adjust values
 * 3. Optionally add a `backgroundFolder` to point at a CDN subfolder
 */

export const themes = {
  'dark-fantasy': {
    label: 'Dark Fantasy',
    backgroundFolder: 'default',
    tokens: {
      '--theme-bg-primary': '#161D26',
      '--theme-bg-surface': '#182036',
      '--theme-bg-surface-alt': 'rgb(22, 37, 70)',
      '--theme-bg-surface-hover': '#1e2a4a',
      '--theme-bg-overlay': 'rgba(0, 0, 0, 0.75)',

      '--theme-text-primary': '#e1e1ed',
      '--theme-text-secondary': '#a6a1da',
      '--theme-text-accent': '#ffc581',

      '--theme-accent': '#ffc581',
      '--theme-accent-hover': '#ffd9a6',
      '--theme-accent-muted': '#374d7d',

      '--theme-border': '#343434',
      '--theme-border-accent': '#ffc581',

      '--theme-success': '#2ecc71',
      '--theme-danger': '#ff4444',
      '--theme-info': '#428bca',

      '--theme-input-bg': '#e1e1ed',
      '--theme-input-border': '#343434',
      '--theme-input-text': '#f0f0ec',

      '--theme-bg-tag': '#16055a',

      '--theme-font-display': "'Lobster', cursive",
      '--theme-font-body': 'Arial, Helvetica, sans-serif',
      '--theme-font-fantasy': "'New Rocker', cursive",
    },
  },

  'parchment': {
    label: 'Parchment',
    backgroundFolder: 'default',
    tokens: {
      '--theme-bg-primary': '#2c2416',
      '--theme-bg-surface': '#3a3122',
      '--theme-bg-surface-alt': '#4a3f2e',
      '--theme-bg-surface-hover': '#524636',
      '--theme-bg-overlay': 'rgba(20, 15, 8, 0.8)',

      '--theme-text-primary': '#e8dcc8',
      '--theme-text-secondary': '#b8a88a',
      '--theme-text-accent': '#d4a054',

      '--theme-accent': '#d4a054',
      '--theme-accent-hover': '#e0b878',
      '--theme-accent-muted': '#6b5a3e',

      '--theme-border': '#5a4d38',
      '--theme-border-accent': '#d4a054',

      '--theme-success': '#6aab5c',
      '--theme-danger': '#c0392b',
      '--theme-info': '#5b8db8',

      '--theme-input-bg': '#e8dcc8',
      '--theme-input-border': '#5a4d38',
      '--theme-input-text': '#3a3122',

      '--theme-bg-tag': '#4a3020',

      '--theme-font-display': "'Lobster', cursive",
      '--theme-font-body': 'Arial, Helvetica, sans-serif',
      '--theme-font-fantasy': "'New Rocker', cursive",
    },
  },

  'midnight': {
    label: 'Midnight',
    backgroundFolder: 'default',
    tokens: {
      '--theme-bg-primary': '#0a0e17',
      '--theme-bg-surface': '#101624',
      '--theme-bg-surface-alt': '#151d30',
      '--theme-bg-surface-hover': '#1a2540',
      '--theme-bg-overlay': 'rgba(0, 0, 0, 0.85)',

      '--theme-text-primary': '#c8d0e0',
      '--theme-text-secondary': '#7a8aaa',
      '--theme-text-accent': '#8ab4f8',

      '--theme-accent': '#8ab4f8',
      '--theme-accent-hover': '#aecbfa',
      '--theme-accent-muted': '#2a3a5c',

      '--theme-border': '#1e2a42',
      '--theme-border-accent': '#8ab4f8',

      '--theme-success': '#34d399',
      '--theme-danger': '#f87171',
      '--theme-info': '#60a5fa',

      '--theme-input-bg': '#c8d0e0',
      '--theme-input-border': '#1e2a42',
      '--theme-input-text': '#101624',

      '--theme-bg-tag': '#1a1040',

      '--theme-font-display': "'Lobster', cursive",
      '--theme-font-body': 'Arial, Helvetica, sans-serif',
      '--theme-font-fantasy': "'New Rocker', cursive",
    },
  },
};

/** List of theme IDs */
export const themeIds = Object.keys(themes);

/** Default theme */
export const defaultThemeId = 'dark-fantasy';

/**
 * Apply a theme by setting CSS custom properties on the document root.
 * @param {string} themeId - Key from the `themes` object
 * @returns {boolean} True if the theme was applied successfully
 */
export function applyTheme(themeId) {
  const theme = themes[themeId];
  if (!theme) {
    console.warn(`Unknown theme: "${themeId}", falling back to "${defaultThemeId}"`);
    return applyTheme(defaultThemeId);
  }

  const root = document.documentElement;
  for (const [property, value] of Object.entries(theme.tokens)) {
    root.style.setProperty(property, value);
  }

  // Update background image folder if the theme specifies one
  if (theme.backgroundFolder) {
    updateBackgroundFolder(theme.backgroundFolder);
  }

  return true;
}

/**
 * Update the CDN background image variables to use a different theme folder.
 * @param {string} folder - Subfolder name under themes/ on the CDN
 */
function updateBackgroundFolder(folder) {
  const existingStyle = document.getElementById('media-cdn-variables');
  if (!existingStyle) return;

  const base = import.meta.env.VITE_MEDIA_CDN_URL || 'https://media.realmforge.io';

  // Re-generate the background variables with the new folder
  const bgMappings = {
    '--bg-hearthroom': 'bg_hearthroom.jpg',
    '--bg-hearth': 'bg_hearthroom.jpg',
    '--bg-account': 'bg_hearthroom.jpg',
    '--bg-admin': 'bg_hearthroom.jpg',
    '--bg-default': 'bg_hearthroom.jpg',
    '--bg-maps': 'bg_maps.jpg',
    '--bg-study': 'bg_study.jpg',
    '--bg-alchemy': 'bg_alchemy.jpg',
    '--bg-avatarium': 'bg_avatarium.jpg',
    '--bg-armoury': 'bg_armoury.jpg',
    '--bg-dungeon': 'bg_dungeon.jpg',
    '--bg-gallery': 'bg_gallery.jpg',
    '--bg-gnomish': 'bg_gnomish.jpg',
    '--bg-illusions': 'bg_illusions.jpg',
    '--bg-kitchen': 'bg_kitchen.jpg',
    '--bg-library': 'bg_library.jpg',
    '--bg-lorekeeper': 'lorekeeper_icon.jpg',
    '--bg-music-hall': 'music-hall/bg.jpg',
    '--bg-pendant-estate': 'bg_estate.jpg',
    '--bg-psionics': 'bg_psionics.jpg',
    '--bg-ranger-den': 'bg_rangerden.jpg',
    '--bg-rats': 'bg_rats.jpg',
    '--bg-smithy': 'bg_smithy.jpg',
    '--bg-spells': 'bg_spells.jpg',
    '--bg-stables': 'bg_stables.jpg',
    '--bg-temple': 'bg_temple.jpg',
    '--bg-training': 'bg_training.jpg',
    '--bg-vault': 'bg_vault.jpg',
    '--bg-hearth-horn': 'bg_hearth-horn.jpg',
  };

  const lines = Object.entries(bgMappings)
    .map(([prop, file]) => `            ${prop}: url(${base}/themes/${folder}/${file});`)
    .join('\n');

  existingStyle.textContent = `
        :root {
${lines}
        }
    `;
}
