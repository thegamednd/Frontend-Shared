<template>
  <div class="member-card" :data-id="memberId">
    <router-link :to="{ name: 'Member', params: { id: memberId } }">
      <img
        v-if="showImage && (member.image || member.Image)"
        :src="`${imagesCdnUrl}/${member.image || member.Image}`"
        loading="lazy"
        class="memImg"
      />
      <span class="name">{{ member.name || member.Name }}</span>
      <span v-if="badge" class="member-badge">{{ badge }}</span>
    </router-link>
    <div v-if="editable" class="member-actions">
      <button
        @click.stop="$emit('edit', memberId)"
        class="edit-button"
        :title="`Edit ${member.name || member.Name}`"
      >
        <span class="material-symbols-outlined">edit</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    member: { type: Object, required: true },
    imagesCdnUrl: { type: String, default: '' },
    showImage: { type: Boolean, default: true },
    editable: { type: Boolean, default: false },
    badge: { type: String, default: '' },
});
defineEmits(['edit']);

const memberId = computed(() => props.member.id || props.member.ID);
</script>

<style scoped>
/* Card styles moved here from Gallery.vue so the gallery and faction views
   share one look. */
.member-card > a {
    color: var(--theme-accent);
    text-decoration: none;
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    min-height: 44px;
}

@media only screen and (min-width: 600px) {
    .member-card {
        width: 154px;
        height: 254px;
        position: relative;
        text-shadow:
            2px 2px 10px #fff,
            2px 2px 10px #ccc;
        color: black;
        border: 2px outset brown;
        overflow: hidden;
    }

    .memImg {
        position: absolute;
        top: 0px;
        left: 0px;
        height: 250px;
        width: 150px;
        z-index: 1;
    }
}

.member-card {
    background-color: rgba(55, 77, 125, 0.4);
    color: var(--theme-accent);
    cursor: pointer;
    border-bottom: 1px solid var(--theme-bg-surface-alt);
    margin-bottom: 1px;
}

.member-card:hover {
    background-color: rgba(55, 77, 125, 0.8);
}

.name {
    display: block;
}

@media only screen and (min-width: 600px) {
    .name {
        position: absolute;
        width: 100%;
        bottom: 0px;
        left: 0px;
        font-family: 'Pirata One', cursive;
        color: var(--theme-bg-surface);
        font-size: 150%;
        padding: 0.3em;
        padding-bottom: 0;
        z-index: 2;
    }
}

/* Member card edit functionality */
.member-card {
    position: relative;
}

.member-actions {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 10;
    opacity: 0;
    transition: opacity 0.2s ease;
}

.member-card:hover .member-actions {
    opacity: 1;
}

.edit-button {
    background: rgba(0, 0, 0, 0.8);
    color: #ffd700;
    border: 1px solid #ffd700;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    backdrop-filter: blur(4px);
}

.edit-button:hover {
    background: #ffd700;
    color: #000;
    transform: scale(1.1);
}

.edit-button .material-symbols-outlined {
    font-size: 18px;
    pointer-events: none;
}

.member-badge {
    display: inline-block;
    margin-top: 0.25em;
    font-size: 0.7em;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border: 1px solid color-mix(in srgb, var(--theme-text) 40%, transparent);
    border-radius: 4px;
    padding: 0.1em 0.4em;
    color: color-mix(in srgb, var(--theme-text) 65%, transparent);
}
</style>
