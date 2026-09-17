// Test stub for '@aws-amplify/auth'.
//
// shared/ is a source-only package: the consuming apps install aws-amplify,
// shared's own devDependencies do not. Vite's import analysis fails to resolve
// the bare specifier before vi.mock can intercept it (and several stores/composables
// import it unconditionally at module scope), so vitest.config.js aliases the
// package to this stub. Individual tests can still vi.mock('@aws-amplify/auth', ...)
// to override these defaults.
export const fetchAuthSession = async () => ({ tokens: undefined });
export const fetchUserAttributes = async () => ({});
export const getCurrentUser = async () => ({});
export const updateUserAttributes = async () => ({});
export const signOut = async () => undefined;
