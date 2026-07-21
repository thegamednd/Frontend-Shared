/**
 * Character HP is stored in one of two shapes: a plain number (older records)
 * or { current, total }. Profile and list views show the total only; current HP
 * belongs on the character sheet.
 *
 * @param {number|{current?: number, total?: number}|null|undefined} hp
 * @returns {number|null} the total, or null if there is nothing usable
 */
export function hpTotal(hp) {
    if (typeof hp === 'number') return hp;
    if (hp && typeof hp === 'object') {
        const total = hp.total ?? hp.current;
        return typeof total === 'number' ? total : null;
    }
    return null;
}
