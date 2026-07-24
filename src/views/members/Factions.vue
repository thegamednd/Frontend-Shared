<template>
    <div id="factionsView">
        <header>
            <h2>
                Factions
                <button v-if="privileged" class="add-faction-btn" @click="openAdd">
                    <span class="material-symbols-outlined">group_add</span>
                    Add Faction
                </button>
            </h2>
        </header>

        <p v-if="!factionStore.arFactionsAZ.length" class="empty">No factions yet.</p>

        <div v-for="faction in factionStore.arFactionsAZ" :key="faction.ID" class="faction-row">
            <button type="button" class="faction-open" @click="router.push({ name: 'Faction', params: { id: faction.ID } })">
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

        <div v-if="dialogOpen" class="faction-dialog-backdrop" @click.self="dialogOpen = false">
            <form class="faction-dialog" @submit.prevent="save">
                <h3>{{ editing ? 'Edit Faction' : 'Add Faction' }}</h3>
                <label>Name
                    <input name="name" type="text" v-model="form.Name" required maxlength="128" />
                </label>
                <label>Brief description
                    <input name="brief" type="text" v-model="form.BriefDescription" maxlength="256" />
                </label>
                <label>Description
                    <textarea name="description" rows="6" v-model="form.Description"></textarea>
                </label>
                <label class="known-toggle">
                    <input type="checkbox" v-model="form.Known" />
                    Known to players
                </label>
                <div class="dialog-actions">
                    <button v-if="editing" type="button" class="delete-faction-btn" @click="remove">
                        {{ confirmingDelete ? 'Confirm delete?' : 'Delete' }}
                    </button>
                    <span class="spacer"></span>
                    <button type="button" @click="dialogOpen = false">Cancel</button>
                    <button type="submit" :disabled="!form.Name.trim()">Save</button>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useFactionStore } from '@shared/stores/faction';
import { useCharacterStore } from '@shared/stores/character';
import { useRealmStore } from '@shared/stores/realm';
import { membersOfFaction } from '@shared/utils/factions';

const router = useRouter();
const factionStore = useFactionStore();
const characterStore = useCharacterStore();
const realmStore = useRealmStore();

const privileged = computed(() => realmStore.isOwner || realmStore.isRealmDM);

const dialogOpen = ref(false);
const editing = ref(null); // faction ID being edited, or null for add
const confirmingDelete = ref(false);
const form = ref({ Name: '', BriefDescription: '', Description: '', Known: true });

onMounted(() => {
    factionStore.loadFactions(true);
    characterStore.fetchCharacters();
});

const allCharacters = computed(() => Object.values(characterStore.characters || {}));
function memberCount(faction) {
    return membersOfFaction(allCharacters.value, faction.ID).length;
}

function openAdd() {
    editing.value = null;
    confirmingDelete.value = false;
    form.value = { Name: '', BriefDescription: '', Description: '', Known: true };
    dialogOpen.value = true;
}

function openEdit(faction) {
    editing.value = faction.ID;
    confirmingDelete.value = false;
    form.value = {
        Name: faction.Name,
        BriefDescription: faction.BriefDescription || '',
        Description: faction.Description || '',
        Known: faction.Known !== false,
    };
    dialogOpen.value = true;
}

async function save() {
    const payload = { ...form.value };
    if (editing.value) await factionStore.updateFaction(editing.value, payload);
    else await factionStore.createFaction(payload);
    dialogOpen.value = false;
}

async function remove() {
    if (!confirmingDelete.value) {
        confirmingDelete.value = true;
        setTimeout(() => { confirmingDelete.value = false; }, 4000);
        return;
    }
    await factionStore.deleteFaction(editing.value);
    dialogOpen.value = false;
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

.faction-dialog-backdrop {
    position: fixed; inset: 0; z-index: 50;
    background: rgb(0 0 0 / 0.5);
    display: flex; align-items: center; justify-content: center; padding: 1em;
}
.faction-dialog {
    width: min(34em, 100%); display: flex; flex-direction: column; gap: 0.75em;
    background: var(--theme-bg-surface); border-radius: 12px; padding: 1.25em;
    border: 1px solid color-mix(in srgb, var(--theme-text) 20%, transparent);
}
.faction-dialog label { display: flex; flex-direction: column; gap: 0.25em; font-size: 0.9em; }
.faction-dialog input[type="text"], .faction-dialog textarea {
    background: color-mix(in srgb, var(--theme-bg-surface) 50%, transparent);
    border: 1px solid color-mix(in srgb, var(--theme-text) 20%, transparent);
    border-radius: 8px; padding: 0.5em 0.6em; color: var(--theme-text); font: inherit;
}
.known-toggle { flex-direction: row !important; align-items: center; gap: 0.5em !important; }
.dialog-actions { display: flex; gap: 0.6em; align-items: center; }
.dialog-actions .spacer { flex: 1; }
.dialog-actions button {
    padding: 0.5em 1em; border-radius: 8px; cursor: pointer; font: inherit;
    background: transparent; border: 1px solid color-mix(in srgb, var(--theme-text) 25%, transparent); color: var(--theme-text);
}
.dialog-actions button[type="submit"] { border-color: var(--theme-accent); }
.dialog-actions button:disabled { opacity: 0.5; cursor: not-allowed; }
.delete-faction-btn { border-color: #ef4444 !important; color: #ef4444 !important; }
</style>
