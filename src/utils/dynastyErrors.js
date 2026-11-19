// Turns a failed dynasties save into what a dialog shows: the server's message
// (TREE_FULL, TREE_FROZEN, GENERATION_LIMIT, CHARACTER_LINKED and the rest),
// and whether to offer the upgrade link.
export const UPGRADE_PATH = '/account/manage-realm';

export function saveFailure(store, err, fallback) {
    const e = store?.error;
    return {
        message: e?.message || err?.message || fallback,
        code: e?.code || null,
        upgrade: e?.code === 'GENERATION_LIMIT' && !!e?.upgrade,
    };
}
