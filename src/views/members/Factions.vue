<template>
    <div id="factionsView">
        <header>
            <h2>
                Factions
                <button v-if="privileged" class="add-faction-btn" @click="openAdd">
                    <span class="material-symbols-outlined">group_add</span>
                    Add Faction
                </button>
                <button
                    v-if="privileged"
                    type="button"
                    class="faction-help-btn"
                    aria-label="How factions work"
                    title="How factions work"
                    @click="helpOpen = true"
                >
                    <span class="material-symbols-outlined">help</span>
                </button>
            </h2>
        </header>

        <p v-if="!factionStore.arFactionsAZ.length" class="empty">No factions yet.</p>

        <div v-for="faction in factionStore.arFactionsAZ" :key="faction.ID" class="faction-row">
            <button type="button" class="faction-open" @click="router.push({ name: 'Faction', params: { id: faction.ID } })">
                <img v-if="faction.Image" :src="faction.Image" class="faction-thumb" loading="lazy" alt="" />
                <span class="faction-name">
                    {{ faction.Name }}
                    <span v-if="privileged && faction.Known === false" class="hidden-badge">hidden from players</span>
                </span>
                <span class="faction-brief">{{ faction.BriefDescription }}</span>
                <span class="member-count">{{ memberCount(faction) }} known member{{ memberCount(faction) === 1 ? '' : 's' }}</span>
            </button>
            <button v-if="privileged" class="edit-faction-btn" :title="`Edit ${faction.Name}`" @click.stop="openEdit(faction)">
                <span class="material-symbols-outlined">edit</span>
            </button>
        </div>

        <FactionsHelpDialog v-if="privileged" :open="helpOpen" @close="helpOpen = false" />
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useFactionStore } from '@shared/stores/faction';
import { useCharacterStore } from '@shared/stores/character';
import { useRealmStore } from '@shared/stores/realm';
import { useNotifications } from '@shared/composables/useNotifications';
import { membersOfFaction } from '@shared/utils/factions';
import FactionsHelpDialog from '@shared/components/members/FactionsHelpDialog.vue';

const router = useRouter();
const factionStore = useFactionStore();
const characterStore = useCharacterStore();
const realmStore = useRealmStore();

const { notifyInfo } = useNotifications();

const privileged = computed(() => realmStore.isOwner || realmStore.isRealmDM);

const helpOpen = ref(false);

onMounted(() => {
    factionStore.loadFactions(true);
    characterStore.fetchCharacters();
});

const allCharacters = computed(() => Object.values(characterStore.characters || {}));
function memberCount(faction) {
    return membersOfFaction(allCharacters.value, faction.ID).length;
}

function openAdd() {
    if (!realmStore.isPaidTier) {
        notifyInfo('Factions are a paid feature. Upgrade your realm to create new factions.');
        return;
    }
    router.push({ name: 'FactionAdd' });
}

function openEdit(faction) {
    router.push({ name: 'FactionEdit', params: { id: faction.ID } });
}
</script>

<style scoped>
#factionsView { max-width: 900px; margin: 0 auto; padding: 1em; }
#factionsView header h2 { display: flex; align-items: center; gap: 0.75em; }
.add-faction-btn {
    display: inline-flex; align-items: center; gap: 0.35em;
    font-size: 0.6em; padding: 0.5em 0.9em; border-radius: 8px;
    background: transparent; border: 1px solid var(--theme-accent);
    color: var(--theme-text); cursor: pointer;
}
.add-faction-btn:hover { background: color-mix(in srgb, var(--theme-accent) 15%, transparent); }
.faction-help-btn {
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 0.6em; padding: 0.5em; line-height: 1; border-radius: 8px;
    background: transparent; border: 1px solid color-mix(in srgb, var(--theme-text) 25%, transparent);
    color: var(--theme-text); cursor: pointer;
}
.faction-help-btn:hover { border-color: var(--theme-accent); color: var(--theme-accent); }
.faction-help-btn:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: 2px; }
.empty { color: color-mix(in srgb, var(--theme-text) 60%, transparent); font-style: italic; }

.faction-row {
    display: flex; align-items: stretch; gap: 0.5em;
    margin-bottom: 0.6em;
}
.faction-open {
    flex: 1; text-align: left; cursor: pointer;
    display: flex; flex-direction: column; gap: 0.25em;
    padding: 0.75em 0.9em; border-radius: 10px;
    background: color-mix(in srgb, var(--theme-bg-surface) 50%, transparent);
    border: 1px solid color-mix(in srgb, var(--theme-text) 15%, transparent);
    color: var(--theme-text); font: inherit;
}
.faction-open:hover { border-color: var(--theme-accent); }
.faction-name { font-weight: 700; font-size: 1.05em; display: flex; align-items: center; gap: 0.5em; }
.faction-thumb {
    width: 48px; height: 48px; object-fit: cover;
    border-radius: 8px; margin-bottom: 0.35em;
    border: 1px solid color-mix(in srgb, var(--theme-text) 20%, transparent);
}
.hidden-badge {
    font-size: 0.62em; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;
    border: 1px solid #d8a657; color: #d8a657; border-radius: 4px; padding: 0.1em 0.4em;
}
.faction-brief { color: color-mix(in srgb, var(--theme-text) 75%, transparent); }
.member-count { font-size: 0.8em; color: color-mix(in srgb, var(--theme-text) 55%, transparent); }
.edit-faction-btn {
    background: transparent; border: 1px solid color-mix(in srgb, var(--theme-text) 20%, transparent);
    border-radius: 10px; padding: 0 0.7em; cursor: pointer; color: var(--theme-text);
}
.edit-faction-btn:hover { border-color: var(--theme-accent); color: var(--theme-accent); }
</style>
