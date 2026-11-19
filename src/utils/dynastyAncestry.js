// Ancestry is a map of race name to percentage, always totalling 100.
// The same rules live in API-Dynasties src/services/ancestry.ts; keep the two
// in step so the dialog shows exactly what the server will save.

// A race share below this is dropped and spread over the person's other races.
export const MIN_SHARE = 10;

const round2 = (n) => Math.round(n * 100) / 100;

export function normalizeAncestry(input) {
    let entries = Object.entries(input || {}).filter(([, v]) => Number.isFinite(v) && v > 0);
    if (!entries.length) return {};
    for (;;) {
        const total = entries.reduce((s, [, v]) => s + v, 0);
        entries = entries.map(([k, v]) => [k, (v * 100) / total]);
        const kept = entries.filter(([, v]) => v >= MIN_SHARE);
        if (kept.length === entries.length) break;
        entries = kept.length ? kept : [entries.reduce((a, b) => (b[1] > a[1] ? b : a))];
    }
    const rounded = entries.map(([k, v]) => [k, round2(v)]);
    const diff = round2(100 - rounded.reduce((s, [, v]) => s + v, 0));
    if (diff !== 0) {
        const largest = rounded.reduce((a, b) => (b[1] > a[1] ? b : a));
        largest[1] = round2(largest[1] + diff);
    }
    return Object.fromEntries(rounded.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

// A child's mix: the average of both parents, then the 10% rule.
export function mixAncestry(a, b) {
    if (!a || !b || !Object.keys(a).length || !Object.keys(b).length) return null;
    const mixed = {};
    for (const [k, v] of Object.entries(a)) mixed[k] = (mixed[k] ?? 0) + v / 2;
    for (const [k, v] of Object.entries(b)) mixed[k] = (mixed[k] ?? 0) + v / 2;
    return normalizeAncestry(mixed);
}

// "Elf 75%, Dwarf 25%", largest share first.
export function ancestryText(ancestry) {
    return Object.entries(ancestry || {})
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([race, share]) => `${race} ${share}%`)
        .join(', ');
}
