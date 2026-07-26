// Test stub for the host app's gaming-system stores.
//
// Some shared views dynamically import `@/stores/classes` and `@/stores/races`,
// which resolve inside the consuming app, not inside shared/. Vite's import
// analysis rejects the unresolvable specifier even when the branch never runs,
// so vitest.config.js aliases both to this module.
export const useClassesStore = () => ({ loaded: true, getSortedClasses: [], init: async () => undefined });
export const useRacesStore = () => ({ loaded: true, getSortedRaces: [], init: async () => undefined });
