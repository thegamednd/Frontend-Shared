// Race lifespans are stored as a percentage of the realm's human lifespan.
export const DEFAULT_HUMAN_LIFESPAN = 62;
export const MIN_PERCENT = 10;
export const MAX_PERCENT = 10000;
export const MIN_HUMAN_LIFESPAN = 20;
export const MAX_HUMAN_LIFESPAN = 500;

export function isHuman(name) {
    return typeof name === 'string' && name.trim().toLowerCase() === 'human';
}

export function lifespanPercentOf(race) {
    if (!race || isHuman(race.RaceName)) return 100;
    const n = Number(race.LifespanPercent);
    return Number.isFinite(n) && race.LifespanPercent != null && race.LifespanPercent !== '' ? n : 100;
}

export function expectedYears(humanLifespan, percent) {
    return Math.round(humanLifespan * percent / 100);
}

// Blank or non-numeric input yields undefined so the key is omitted, never 0 or NaN.
export function toPercentPayload(input) {
    if (input === null || input === undefined) return undefined;
    if (typeof input === 'string' && input.trim() === '') return undefined;
    const n = Number(input);
    return Number.isFinite(n) ? n : undefined;
}

export function validPercent(n) {
    return Number.isInteger(n) && n >= MIN_PERCENT && n <= MAX_PERCENT;
}

export function validHumanLifespan(n) {
    return Number.isInteger(n) && n >= MIN_HUMAN_LIFESPAN && n <= MAX_HUMAN_LIFESPAN;
}
