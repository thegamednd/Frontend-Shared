// Display text for dynasty records. Years carry the realm's date suffix,
// passed in as `abbr` (see formatYear in dynastyYears.js).
import { ageAt, formatYear } from './dynastyYears';

export const END_REASON_LABELS = {
    death: 'Death',
    annulment: 'Annulment',
    divorce: 'Divorce',
    separation: 'Separation',
    other: 'Other',
};

const has = (v) => v !== null && v !== undefined;

export function marriageCaption(marriage, abbr = 'SF') {
    const { from, to, fromApprox, toApprox, endReason } = marriage || {};
    if (!has(from) && !has(to)) return 'married, dates unknown';
    const parts = [];
    if (has(from)) parts.push(`m. ${formatYear(from, { approx: fromApprox, abbr })}`);
    if (has(to)) {
        let ended = `ended ${formatYear(to, { approx: toApprox, abbr })}`;
        if (endReason) ended += ` (${endReason})`;
        parts.push(ended);
    }
    return parts.join(', ');
}

export function childGroupHeading(group) {
    const name = group?.otherParent?.name;
    if (group?.relation === 'spouse') return name ? `with ${name}` : 'other parent unknown';
    if (group?.relation === 'outside') return name ? `outside marriage, with ${name}` : 'outside marriage';
    return 'other parent unknown';
}

export function legitimacyText(value) {
    if (value === 'yes') return 'Born in wedlock';
    if (value === 'no') return 'Born outside marriage';
    return 'Legitimacy unknown';
}

// The short form for cards and lists: "190 SF to 240 SF", or "b. 190 SF".
export function shortLifespan(person, abbr = 'SF') {
    const { born, died } = person || {};
    const b = formatYear(born, { abbr });
    const d = formatYear(died, { abbr });
    if (b && d) return `${b} to ${d}`;
    if (b) return `b. ${b}`;
    if (d) return `d. ${d}`;
    return 'dates unknown';
}

// The long form for the person panel. currentYear is optional.
export function lifespanText(person, abbr = 'SF', currentYear = null) {
    const { born, died } = person || {};
    const b = formatYear(born, { abbr });
    const d = formatYear(died, { abbr });
    if (b && d) return `${b} to ${d}, aged ${ageAt(born, died)}`;
    if (d) return `died ${d}`;
    if (!b) return 'dates unknown';
    const text = `born ${b}, living`;
    return currentYear == null ? text : `${text}, aged ${ageAt(born, currentYear)}`;
}
