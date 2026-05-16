import { ref, computed } from 'vue';

/**
 * Admin impersonation state.
 *
 * When an admin clicks "Enter as User" in Admin-Vue, the destination app
 * receives `?impersonate=<userId>&impersonateName=<displayName>` query
 * params and stores them here. The API interceptor then attaches an
 * `X-Impersonate-User` header to every outbound request, and each Lambda's
 * authService swaps in that user ID *only* if the JWT belongs to an admin.
 *
 * State lives in `sessionStorage` so it's tab-scoped — closing the tab
 * ends the impersonation session.
 */

const KEY_ID = 'rf:impersonate:userId';
const KEY_NAME = 'rf:impersonate:userName';

function readStorage(key) {
    try {
        return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) : null;
    } catch {
        return null;
    }
}

// Singleton reactive state — shared across every consumer in the app.
const _id = ref(readStorage(KEY_ID));
const _name = ref(readStorage(KEY_NAME));

export function setImpersonation(userId, name) {
    _id.value = userId || null;
    _name.value = name || null;
    try {
        if (userId) {
            sessionStorage.setItem(KEY_ID, userId);
        } else {
            sessionStorage.removeItem(KEY_ID);
        }
        if (name) {
            sessionStorage.setItem(KEY_NAME, name);
        } else {
            sessionStorage.removeItem(KEY_NAME);
        }
    } catch {
        // sessionStorage may be unavailable (e.g. SSR) — non-fatal
    }
}

export function clearImpersonation() {
    _id.value = null;
    _name.value = null;
    try {
        sessionStorage.removeItem(KEY_ID);
        sessionStorage.removeItem(KEY_NAME);
    } catch {
        // ignore
    }
}

/**
 * Synchronous getters — for use inside non-reactive contexts like
 * axios interceptors where you don't want to subscribe to changes.
 */
export function getImpersonatedUserId() {
    return _id.value;
}

export function getImpersonatedUserName() {
    return _name.value;
}

/**
 * Composable — for use inside Vue components and Pinia stores.
 * Returns reactive computed refs.
 */
export function useImpersonation() {
    return {
        impersonatedUserId: computed(() => _id.value),
        impersonatedUserName: computed(() => _name.value),
        isImpersonating: computed(() => !!_id.value),
        setImpersonation,
        clearImpersonation,
    };
}
