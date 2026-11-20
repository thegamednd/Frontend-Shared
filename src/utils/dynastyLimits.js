// Mirrors Lambdas/API-Dynasties/src/services/limits.ts. Change both together.

const DEFAULT_PLAYERS = 6;
const PAID_MAX_GENERATIONS = 16;
const FAMILY_CAPS = { fellowship: 75, guild: 150, keep: 300 };

const planFamily = (plan) => {
    const p = String(plan ?? '').trim().toLowerCase().replace(/-(patreon|upgrade)$/, '');
    if (p === '' || p === 'free') return 'free';
    if (p === 'guild') return 'guild';
    if (p === 'keep') return 'keep';
    return 'fellowship';
};

export function dynastyLimitsFor(plan, players) {
    const family = planFamily(plan);
    if (family === 'free') return { family, maxTrees: 3, maxGenerations: 3, familyCap: 20 };
    const n = Number(players);
    const count = Number.isFinite(n) && n > 0 ? n : DEFAULT_PLAYERS;
    return { family, maxTrees: 2 * count, maxGenerations: PAID_MAX_GENERATIONS, familyCap: FAMILY_CAPS[family] };
}
