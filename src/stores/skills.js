import { defineStore } from 'pinia';

/**
 * No-op skills store shim for RF.
 *
 * RF realms use the shared Classes table, which has no skills coupling, so
 * there is no skills API/data in this context. This shim exists purely so that
 * components ported from TheGame-Vue (e.g. ClassesCRUD.vue) which
 * `import { useSkillsStore } from '@shared/stores/skills'` resolve and run
 * without errors. Every member returns an empty value or is a no-op.
 *
 * It mirrors the public surface of TheGame-Vue's real skills store so it can be
 * swapped in/out transparently.
 */
export const useSkillsStore = defineStore('skills', {
    state: () => ({
        skills: {},
        skillListByType: {},
        skillListByCategory: {},
        loaded: false,
        isLoading: false,
        lastError: null,
    }),
    getters: {
        arSkills: () => [],
        getSkillById: () => () => null,
        getSkillsForCurrentGamingSystem: () => [],
        availableTypes: () => [],
        availableCategories: () => [],
        isLoadedForCurrentGamingSystem: (state) => state.loaded,
        getSkillByName: () => () => null,
    },
    actions: {
        async init() {
            // no-op: RF has no skills data
        },
        async loadSkills() {
            this.loaded = true;
            return [];
        },
        async getSkill() {
            return null;
        },
        addSkillToStore() {
            // no-op
        },
        removeSkillFromStore() {
            // no-op
        },
        replaceSkillInStore() {
            // no-op
        },
        clearSkills() {
            this.skills = {};
            this.skillListByType = {};
            this.skillListByCategory = {};
            this.loaded = false;
        },
    },
});
