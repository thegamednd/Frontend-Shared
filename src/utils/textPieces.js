/**
 * Splits prose into pieces a page break can land between.
 *
 * Each piece is one word plus the whitespace that followed it, so any run of
 * pieces joined back together is exactly the original text — paragraph breaks
 * and all. That matters on printed panels, which render `white-space: pre-wrap`
 * and would otherwise lose their shape when text carries onto another page.
 *
 * @param {string} text
 * @returns {Array<string>}
 */
export function toTextPieces(text) {
    if (!text) return [];
    const matches = String(text).match(/\S+\s*/g);
    return matches || [];
}

/**
 * Rebuilds a run of pieces, without the whitespace a page would start on.
 *
 * @param {Array<string>} pieces
 * @param {number} start
 * @param {number} count
 * @returns {string}
 */
export function joinTextPieces(pieces, start, count) {
    return pieces.slice(start, start + count).join('').replace(/\s+$/, '');
}
