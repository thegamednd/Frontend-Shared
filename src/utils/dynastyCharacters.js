// Helpers for linking dynasty people to the realm's characters.

const cdn = () => import.meta.env.VITE_IMAGES_CDN_URL || '';

// Characters store their image as a key under the images CDN, as the gallery shows it.
export function characterImageUrl(character) {
    const image = character?.Image || character?.image;
    if (!image) return '';
    return /^https?:\/\//.test(image) ? image : `${cdn()}/${image}`;
}

// Born and Died on a character are free text; take the first signed whole
// number, as the server does. Year 0 does not exist.
export function characterYear(value) {
    if (value === null || value === undefined) return null;
    const m = String(value).match(/-?\d+/);
    if (!m) return null;
    const n = Number(m[0]);
    return n === 0 ? null : n;
}

export const characterId = (c) => c?.ID || c?.id || null;
export const characterName = (c) => c?.Name || c?.name || '';
