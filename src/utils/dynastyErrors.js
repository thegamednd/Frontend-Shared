// Turns a failed dynasties save into what a dialog shows: the server's message
// (TREE_FULL, TREE_FROZEN, GENERATION_LIMIT, CHARACTER_LINKED and the rest),
// and whether to offer the upgrade link.

const FALLBACK_UPGRADE_URL = 'https://realmforge.io/pricing';

// Upgrades are bought on the RealmForge hub, not in the gameplay app: the
// pricing page on the same origin as the app's register link. Opened in a new
// tab, so it is a plain <a href>, never a router-link.
export function upgradeUrl() {
    const base = import.meta.env.VITE_REGISTER_URL;
    if (!base) return FALLBACK_UPGRADE_URL;
    try {
        return `${new URL(base).origin}/pricing`;
    } catch {
        return FALLBACK_UPGRADE_URL;
    }
}

export function saveFailure(store, err, fallback) {
    const e = store?.error;
    return {
        message: e?.message || err?.message || fallback,
        code: e?.code || null,
        upgrade: e?.code === 'GENERATION_LIMIT' && !!e?.upgrade,
    };
}
