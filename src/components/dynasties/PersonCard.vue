<template>
    <button
        type="button"
        class="person-card"
        :class="{
            'placeholder-card': !person,
            linked: Boolean(person?.characterId),
            other: otherHouse,
            hidden: Boolean(person?.hidden),
            focus,
        }"
        :disabled="!person"
        :title="otherHouseName ? `Recorded in the ${otherHouseName} tree` : null"
        @click="person && $emit('select', person.id)"
    >
        <template v-if="person">
            <img v-if="imageUrl" class="portrait" :src="imageUrl" alt="" />
            <span class="text">
                <span class="name">
                    <span v-if="mark === 'bastard'" class="mark" title="Born outside marriage">&#9670;</span>{{ person.name }}
                </span>
                <span class="years">{{ years }}</span>
                <span v-if="caption" class="caption">{{ caption }}</span>
                <span v-if="note" class="note">{{ note }}</span>
                <span v-if="otherHouseName" class="house-tag">House {{ otherHouseName }}</span>
            </span>
        </template>
        <template v-else>{{ placeholder }}</template>
    </button>
</template>

<script setup>
import { computed } from 'vue';
import { useCharacterStore } from '@shared/stores/character';
import { useDynastiesStore } from '@shared/stores/dynasties';
import { useRealmStore } from '@shared/stores/realm';
import { shortLifespan } from '@shared/utils/dynastyLabels';
import { characterImageUrl } from '@shared/utils/dynastyCharacters';

const props = defineProps({
    person: { type: Object, default: null },
    caption: { type: String, default: '' },
    note: { type: String, default: '' },
    focus: { type: Boolean, default: false },
    placeholder: { type: String, default: 'unknown' },
    mark: { type: String, default: '' },
    houseId: { type: String, default: '' },
});
defineEmits(['select']);

const characterStore = useCharacterStore();
const dynastiesStore = useDynastiesStore();
const realmStore = useRealmStore();
const abbr = computed(() => realmStore.activeRealm?.DateSuffix?.Abbr || 'SF');

const imageUrl = computed(() => {
    const id = props.person?.characterId;
    return id ? characterImageUrl(characterStore.characters?.[id]) : '';
});

const otherHouse = computed(
    () => Boolean(props.houseId) && Boolean(props.person?.houseId) && props.person.houseId !== props.houseId
);

const otherHouseName = computed(() =>
    otherHouse.value ? dynastiesStore.houses.find((h) => h.id === props.person.houseId)?.name || '' : ''
);

const years = computed(() => shortLifespan(props.person, abbr.value));
</script>

<style scoped>
/* A name plate: surface card with an accent rule on the left. Linked
   characters get a doubled rule; people from another house a cooler tint. */
.person-card {
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    min-width: 7em;
    max-width: 13em;
    min-height: 2.75em;
    padding: 0.35em 0.65em 0.35em 0.55em;
    border: 1px solid color-mix(in srgb, var(--theme-text) 22%, transparent);
    border-left: 3px solid var(--theme-accent);
    border-radius: 8px;
    background: color-mix(in srgb, var(--theme-bg-surface) 85%, var(--theme-text) 4%);
    color: var(--theme-text);
    font: inherit;
    font-size: 0.8rem;
    line-height: 1.3;
    text-align: left;
    cursor: pointer;
}
.person-card:hover { border-color: var(--theme-accent); }
.person-card:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: 2px; }
.person-card.linked { border-left: 6px double var(--theme-accent); }
.person-card.other {
    border-left-color: color-mix(in srgb, var(--theme-text) 45%, transparent);
    background: color-mix(in srgb, var(--theme-bg-surface) 80%, #5b7fb5 12%);
}
.person-card.hidden { border-style: dashed; border-left-style: solid; }
.person-card.focus {
    box-shadow: 0 0 0 2px var(--theme-accent);
    font-size: 0.9rem;
    min-width: 9em;
}
.portrait {
    width: 2.25em;
    height: 2.25em;
    flex: none;
    border-radius: 6px;
    object-fit: cover;
    object-position: top;
}
.text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.name { font-weight: 700; overflow-wrap: anywhere; }
.years, .caption, .note, .house-tag {
    font-size: 0.85em;
    color: color-mix(in srgb, var(--theme-text) 65%, transparent);
}
.caption, .house-tag { font-style: italic; }
.note { overflow-wrap: anywhere; }
.mark { margin-right: 0.3em; color: var(--theme-accent); font-size: 0.75em; vertical-align: 1px; }
.placeholder-card {
    justify-content: center;
    border: 1px dashed color-mix(in srgb, var(--theme-text) 30%, transparent);
    background: transparent;
    color: color-mix(in srgb, var(--theme-text) 50%, transparent);
    font-style: italic;
    cursor: default;
}
.placeholder-card:hover { border-color: color-mix(in srgb, var(--theme-text) 30%, transparent); }
</style>
