// Helpers for the Dynasties yearly-advance review: grouping a run's events by
// house, one plain line per event, and the copy for the server's refusals.

// Groups in the order the review page shows them. 'death' also holds
// 'motherDied'.
const GROUPS = [
    { id: 'death', label: 'Deaths', kinds: ['death', 'motherDied'] },
    { id: 'birth', label: 'Births', kinds: ['birth'] },
    { id: 'natural', label: 'Natural births', kinds: ['natural'] },
    { id: 'marriage', label: 'Marriages', kinds: ['marriage'] },
    { id: 'pregnancy', label: 'Pregnancies', kinds: ['pregnancy'] },
    { id: 'barren', label: 'Can no longer bear children', kinds: ['barren'] },
    { id: 'comesForward', label: 'Come forward', kinds: ['comesForward'] },
];

// What became of a married-in man's natural child. `left` names the child, so
// it follows the child's gender.
const DISCLOSURE = {
    left: (event) => `left with ${event.gender === 'female' ? 'her' : 'his'} father`,
    support: () => 'the mother demands support',
    secret: () => 'kept secret, the family will not know',
};

const MARRIAGE_PREFIX = 'm:';

// A marriage event's ref ("m:<personId>") stands for the spouse it creates,
// who has no record yet.
function spouseText(spouse) {
    if (spouse?.name) return spouse.name;
    return `a new ${spouse?.gender === 'male' ? 'husband' : 'wife'}`;
}

function nameOf(id, run) {
    if (typeof id === 'string' && id.startsWith(MARRIAGE_PREFIX)) {
        const m = (run?.events || []).find((e) => e.kind === 'marriage' && e.ref === id);
        return m ? spouseText(m.spouse) : 'Someone';
    }
    return run?.people?.[id]?.name || 'Someone';
}

function houseOfPerson(id, run) {
    if (typeof id === 'string' && id.startsWith(MARRIAGE_PREFIX)) {
        const m = (run?.events || []).find((e) => e.kind === 'marriage' && e.ref === id);
        return m?.spouse?.houseId || run?.people?.[m?.personId]?.houseId;
    }
    return run?.people?.[id]?.houseId;
}

function houseIdFor(event, run) {
    switch (event.kind) {
        case 'birth':
            return event.houseId || houseOfPerson(event.motherId, run) || houseOfPerson(event.fatherId, run);
        case 'pregnancy':
            return houseOfPerson(event.motherId, run) || houseOfPerson(event.fatherId, run);
        case 'natural':
            return event.houseId || houseOfPerson(event.fatherId, run);
        default:
            return houseOfPerson(event.personId, run);
    }
}

// [{ houseId, name, groups: [{ id, label, events }] }], houses by name, empty
// groups left out, the server's order kept within a group.
export function groupEvents(run) {
    const byHouse = new Map();
    for (const event of run?.events || []) {
        const houseId = houseIdFor(event, run) || 'unknown';
        if (!byHouse.has(houseId)) byHouse.set(houseId, []);
        byHouse.get(houseId).push(event);
    }
    return [...byHouse.entries()]
        .map(([houseId, list]) => ({
            houseId,
            name: run?.houses?.[houseId] || 'Unknown house',
            groups: GROUPS.map((g) => ({
                id: g.id,
                label: g.label,
                events: list.filter((e) => g.kinds.includes(e.kind)),
            })).filter((g) => g.events.length),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

// One plain sentence for an event. `abbr` is the realm's year abbreviation;
// no event carries a year today, so it is accepted for callers and unused.
// eslint-disable-next-line no-unused-vars
export function eventLine(event, run, { abbr } = {}) {
    const name = (id) => nameOf(id, run);
    switch (event.kind) {
        case 'death':
            return `${name(event.personId)} dies aged ${event.age}`;
        case 'barren': {
            if (event.age == null) return `${name(event.personId)} can no longer bear children`;
            const human =
                event.humanAge != null && event.humanAge !== event.age
                    ? ` (${event.humanAge} in human years)`
                    : '';
            return `${name(event.personId)}, aged ${event.age}${human}, can no longer bear children`;
        }
        case 'pregnancy':
            return event.unwed || !event.fatherId
                ? `${name(event.motherId)}, unmarried, is with child`
                : `${name(event.motherId)} is expecting a child with ${name(event.fatherId)}`;
        case 'birth': {
            const child = event.gender === 'male' ? 'son' : 'daughter';
            const verb = event.stillborn ? 'is stillborn' : 'is born';
            return event.fatherId
                ? `A ${child} ${verb} to ${name(event.motherId)} and ${name(event.fatherId)}`
                : `A natural ${child} ${verb} to ${name(event.motherId)}, unmarried`;
        }
        case 'natural': {
            const child = event.gender === 'male' ? 'son' : 'daughter';
            const mother = event.motherFamily
                ? `a woman of the ${event.motherFamily} family`
                : 'a woman outside the family';
            const note = DISCLOSURE[event.disclosure]?.(event);
            return `${name(event.fatherId)} fathers a natural ${child} by ${mother}${note ? ` (${note})` : ''}`;
        }
        case 'comesForward': {
            const fatherId = run?.people?.[event.personId]?.fatherId;
            const father = fatherId ? `, a child of ${name(fatherId)},` : '';
            return `${name(event.personId)}${father} comes forward`;
        }
        case 'motherDied':
            return `${name(event.personId)} dies in childbirth`;
        case 'marriage':
            return `${name(event.personId)} marries ${spouseText(event.spouse)}`;
        default:
            return 'Something happens';
    }
}

const MESSAGES = {
    YEAR_AT_LIMIT: 'The year is already at its limit and cannot go any further.',
    RUN_BUSY: 'Another advance is already in progress. Give it a moment and try again.',
    TREE_SELECTION_REQUIRED: 'Choose which family trees are active before advancing the year.',
    STALE_PREVIEW: 'The trees changed after this preview was made. Discard it and preview again.',
    RUN_NOT_READY: 'The save has started. You can only try saving again.',
    YEAR_LOCKED: 'The year cannot be changed once an advance has been made.',
    TREE_FULL: 'This family tree is full. It has room again when someone in it dies, or you can upgrade your plan for a bigger tree.',
    GENERATION_LIMIT: 'This tree is at its generation limit. Upgrade to keep more generations.',
};

// Accepts a thrown error or the store's { code, message } and returns the
// text to show.
export function advanceErrorMessage(err) {
    const code = err?.response?.data?.error?.code || err?.code;
    if (code && MESSAGES[code]) return MESSAGES[code];
    return err?.response?.data?.error?.message || err?.message || 'Something went wrong. Please try again.';
}
