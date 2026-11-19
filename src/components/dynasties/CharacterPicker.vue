<template>
    <div class="character-picker">
        <div v-if="chosen" class="chosen">
            <img v-if="thumb(chosen)" class="thumb" :src="thumb(chosen)" alt="" />
            <span v-else class="thumb blank" aria-hidden="true"></span>
            <span class="chosen-name">{{ nameOf(chosen) }}</span>
            <button type="button" class="clear" aria-label="Unlink character" @click="emit('update:modelValue', null)">
                &times;
            </button>
        </div>
        <template v-else>
            <input v-model="query" type="text" autocomplete="off" aria-label="Filter characters by name" placeholder="Filter characters by name" />
            <ul v-if="rows.length" class="rows">
                <li v-for="c in rows" :key="idOf(c)">
                    <button type="button" :class="{ linked: isLinked(c) }" @click="pick(c)">
                        <img v-if="thumb(c)" class="thumb" :src="thumb(c)" alt="" loading="lazy" />
                        <span v-else class="thumb blank" aria-hidden="true"></span>
                        <span class="name">{{ nameOf(c) }}</span>
                        <span v-if="bornText(c)" class="born">{{ bornText(c) }}</span>
                        <span v-if="isLinked(c)" class="linked-note">already in a tree</span>
                    </button>
                </li>
            </ul>
            <p v-else class="hint">
                {{ query.trim() ? `No character matches "${query.trim()}".` : 'This realm has no characters yet.' }}
            </p>
        </template>
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useCharacterStore } from '@shared/stores/character';
import { useRealmStore } from '@shared/stores/realm';
import { formatYear } from '@shared/utils/dynastyYears';
import { characterId as idOf, characterImageUrl, characterName as nameOf, characterYear } from '@shared/utils/dynastyCharacters';

// Picks one of the realm's characters (the gallery) to link to a person.
const props = defineProps({
    modelValue: { type: String, default: null },
    // Characters already linked to a person; shown dimmed but still selectable.
    linkedCharacterIds: { type: [Array, Set], default: () => [] },
});
const emit = defineEmits(['update:modelValue', 'selected']);

const characterStore = useCharacterStore();
const realmStore = useRealmStore();
const abbr = computed(() => realmStore.activeRealm?.DateSuffix?.Abbr || 'SF');
const query = ref('');

onMounted(() => {
    if (!Object.keys(characterStore.characters || {}).length && typeof characterStore.fetchCharacters === 'function') {
        characterStore.fetchCharacters();
    }
});

const all = computed(() =>
    Object.values(characterStore.characters || {}).sort((a, b) => nameOf(a).localeCompare(nameOf(b)))
);

const chosen = computed(() => (props.modelValue ? characterStore.characters?.[props.modelValue] || null : null));

const rows = computed(() => {
    const q = query.value.trim().toLowerCase();
    const found = q ? all.value.filter((c) => nameOf(c).toLowerCase().includes(q)) : all.value;
    return found.slice(0, 30);
});

const linked = computed(() => new Set(props.linkedCharacterIds || []));
const isLinked = (c) => linked.value.has(idOf(c));
const thumb = (c) => characterImageUrl(c);

function bornText(c) {
    const y = characterYear(c.Born);
    return y === null ? '' : `b. ${formatYear(y, { abbr: abbr.value })}`;
}

function pick(c) {
    emit('update:modelValue', idOf(c));
    emit('selected', c);
    query.value = '';
}
</script>

<style scoped>
.character-picker { display: flex; flex-direction: column; gap: 0.4em; color: var(--theme-text); }
input {
    width: 100%;
    box-sizing: border-box;
    padding: 0.5em 0.6em;
    font: inherit;
    font-size: 16px;
    color: var(--theme-text);
    background: color-mix(in srgb, var(--theme-bg-primary, #000) 55%, transparent);
    border: 1px solid color-mix(in srgb, var(--theme-text) 22%, transparent);
    border-radius: 8px;
}
input:focus-visible,
.rows button:focus-visible,
.clear:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: 2px; }
.rows {
    max-height: 18em;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    list-style: none;
    border: 1px solid color-mix(in srgb, var(--theme-text) 18%, transparent);
    border-radius: 8px;
}
.rows button {
    display: flex;
    align-items: center;
    gap: 0.6em;
    width: 100%;
    min-height: 2.9em;
    padding: 0.35em 0.65em;
    border: none;
    border-bottom: 1px solid color-mix(in srgb, var(--theme-text) 10%, transparent);
    background: none;
    color: var(--theme-text);
    font: inherit;
    text-align: left;
    cursor: pointer;
}
.rows li:last-child button { border-bottom: none; }
.rows button:hover { background: color-mix(in srgb, var(--theme-accent) 12%, transparent); }
.thumb {
    width: 2.25em;
    height: 2.25em;
    flex: none;
    border-radius: 6px;
    object-fit: cover;
    object-position: top;
}
.thumb.blank {
    box-sizing: border-box;
    border: 1px dashed color-mix(in srgb, var(--theme-text) 25%, transparent);
}
.name { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.born, .linked-note { font-size: 0.8em; color: color-mix(in srgb, var(--theme-text) 60%, transparent); }
.linked-note { font-style: italic; }
.rows button.linked { color: color-mix(in srgb, var(--theme-text) 60%, transparent); }
.rows button.linked .thumb { opacity: 0.5; }
.chosen {
    display: flex;
    align-items: center;
    gap: 0.6em;
    padding: 0.4em 0.6em;
    border-left: 3px solid var(--theme-accent);
    border-radius: 0 8px 8px 0;
    background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
}
.chosen-name { flex: 1; min-width: 0; font-weight: 600; overflow-wrap: anywhere; }
.clear {
    width: 2em;
    height: 2em;
    padding: 0;
    border: none;
    background: none;
    color: var(--theme-text);
    font-size: 1.2em;
    line-height: 1;
    cursor: pointer;
}
.clear:hover { color: var(--theme-accent); }
.hint { margin: 0; font-size: 0.82rem; color: color-mix(in srgb, var(--theme-text) 60%, transparent); }
</style>
