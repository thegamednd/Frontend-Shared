<template>
    <div id="factionView">
        <template v-if="faction">
            <header>
                <h2>
                    {{ faction.Name }}
                    <span v-if="privileged && faction.Known === false" class="hidden-badge">hidden from players</span>
                </h2>
            </header>
            <p class="description">{{ faction.Description || faction.BriefDescription }}</p>

            <h3>Known members</h3>
            <p v-if="!members.length" class="empty">No known members yet.</p>
            <div class="faction-members">
                <MemberCard
                    v-for="member in members"
                    :key="member.ID"
                    :member="member"
                    :images-cdn-url="imagesCdnUrl"
                    :badge="privileged && isHiddenMember(member, id) ? 'hidden' : ''"
                />
            </div>
        </template>
        <div v-else-if="factionStore.loaded" class="not-found">
            <h2>Faction not found</h2>
            <router-link :to="{ name: 'Factions' }">Back to factions</router-link>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import MemberCard from '@shared/components/MemberCard.vue';
import { useFactionStore } from '@shared/stores/faction';
import { useCharacterStore } from '@shared/stores/character';
import { useRealmStore } from '@shared/stores/realm';
import { membersOfFaction, isHiddenMember } from '@shared/utils/factions';

const props = defineProps({
    id: { type: String, required: true },
});

const factionStore = useFactionStore();
const characterStore = useCharacterStore();
const realmStore = useRealmStore();

const privileged = computed(() => realmStore.isOwner || realmStore.isRealmDM);
const imagesCdnUrl = import.meta.env.VITE_IMAGES_CDN_URL;
const faction = computed(() => factionStore.getFactionById(props.id));
const members = computed(() => membersOfFaction(Object.values(characterStore.characters || {}), props.id));

onMounted(() => {
    factionStore.loadFactions();
    characterStore.fetchCharacters();
});
</script>

<style scoped>
#factionView { max-width: 1000px; margin: 0 auto; padding: 1em; }
#factionView header h2 { display: flex; align-items: center; gap: 0.6em; }
.hidden-badge {
    font-size: 0.55em; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;
    border: 1px solid #d8a657; color: #d8a657; border-radius: 4px; padding: 0.1em 0.4em;
}
.description { white-space: pre-wrap; line-height: 1.5; margin-bottom: 1.25em; }
.empty { color: color-mix(in srgb, var(--theme-text) 60%, transparent); font-style: italic; }
.faction-members {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 1em;
}
.not-found { text-align: center; padding: 3em 1em; }
.not-found a { color: var(--theme-accent); }
</style>
