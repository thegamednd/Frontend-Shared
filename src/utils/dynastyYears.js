// Years are signed integers: negative is before the era, positive is after,
// zero does not exist, and null means unknown.

const isBlank = (v) => v === null || v === undefined || String(v).trim() === '';

export function formatYear(y, { approx = false, abbr = 'SF' } = {}) {
    if (y === null || y === undefined) return '';
    const text = `${y} ${abbr}`;
    return approx ? `c. ${text}` : text;
}

export function toSignedYear(input) {
    if (isBlank(input)) return null;
    const n = Number(String(input).trim());
    if (!Number.isInteger(n)) throw new Error('Years are whole numbers');
    if (n === 0) throw new Error('Year 0 does not exist');
    return n;
}

// Age in years at `year`, accounting for the missing year 0.
export function ageAt(born, year) {
    if (born == null || year == null) return null;
    const diff = year - born;
    return born < 0 && year > 0 ? diff - 1 : diff;
}
