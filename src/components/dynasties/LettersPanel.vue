<template>
    <section class="letters" aria-labelledby="letters-title">
        <h3 id="letters-title">Letters</h3>
        <p class="hint">Players get a letter from the Lorekeeper after each saved year. They can also stop the letters themselves from any letter.</p>

        <p v-if="loading" class="hint" role="status">Loading the players…</p>
        <p v-else-if="loadFailed" class="field-error" role="alert">
            The players could not be loaded.
            <button type="button" class="retry" @click="load">Try again</button>
        </p>
        <p v-else-if="!players.length" class="empty-line">No players in this realm yet.</p>
        <ul v-else class="rows">
            <li v-for="p in players" :key="p.userId" class="row">
                <label :for="idFor(p.userId)" class="name">{{ p.name }}</label>
                <span class="switch">
                    <input
                        :id="idFor(p.userId)"
                        type="checkbox"
                        role="switch"
                        :checked="p.on"
                        :disabled="pending.has(p.userId)"
                        @change="toggle(p, $event.target.checked)"
                    />
                    <span class="track" aria-hidden="true"><span class="thumb"></span></span>
                </span>
            </li>
        </ul>
        <p v-if="saveError" class="field-error" role="alert">{{ saveError }}</p>
    </section>
</template>

<script setup>
// The DM's letters switches: one per player. A switch is locked while its
// own save is in flight, and the store puts it back if the save fails.
import { computed, onMounted, reactive, ref } from 'vue';
import { useDynastiesStore } from '@shared/stores/dynasties';

const store = useDynastiesStore();
const uid = Math.random().toString(36).slice(2, 8);
const idFor = (userId) => `letters-${uid}-${userId}`;

const loading = ref(true);
const loadFailed = ref(false);
const saveError = ref('');
const pending = reactive(new Set());
const players = computed(() => store.letters.players || []);

async function load() {
    loading.value = true;
    loadFailed.value = false;
    try {
        await store.fetchLetters();
    } catch (e) {
        loadFailed.value = true;
    } finally {
        loading.value = false;
    }
}

async function toggle(p, on) {
    pending.add(p.userId);
    saveError.value = '';
    try {
        await store.setLetters(p.userId, on);
    } catch (e) {
        saveError.value = `The change for ${p.name} was not saved.`;
    } finally {
        pending.delete(p.userId);
    }
}

onMounted(load);
</script>

<style scoped>
.letters {
    margin: 0 0 1.5em;
    padding-top: 0.9em;
    border-top: 1px solid color-mix(in srgb, var(--theme-text) 15%, transparent);
}
h3 { margin: 0 0 0.3em; font-family: var(--theme-font-display, inherit); font-size: 1.2rem; }
.hint { margin: 0 0 0.5em; font-size: 0.85rem; line-height: 1.5; color: color-mix(in srgb, var(--theme-text) 65%, transparent); }
.empty-line { margin: 0; }
.rows { list-style: none; margin: 0; padding: 0; }
.row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1em;
    min-height: 2.75rem;
    border-bottom: 1px solid color-mix(in srgb, var(--theme-text) 10%, transparent);
}
.name { flex: 1; min-width: 0; padding: 0.4em 0; overflow-wrap: anywhere; cursor: pointer; }
.switch { position: relative; flex: none; width: 2.75rem; height: 2.75rem; display: grid; place-items: center; }
.switch input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
.switch input:disabled { cursor: progress; }
.track {
    width: 2.5rem;
    height: 1.5rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--theme-text) 22%, transparent);
    transition: background 0.15s;
    pointer-events: none;
}
.thumb {
    display: block;
    width: 1.1rem;
    height: 1.1rem;
    margin: 0.2rem;
    border-radius: 50%;
    background: var(--theme-bg-primary, #fff);
    transition: transform 0.15s;
}
.switch input:checked + .track { background: var(--theme-accent); }
.switch input:checked + .track .thumb { transform: translateX(1rem); }
.switch input:disabled + .track { opacity: 0.55; }
.switch input:focus-visible + .track { outline: 2px solid var(--theme-accent); outline-offset: 2px; }
.field-error { margin: 0.5em 0 0; font-size: 0.85rem; color: var(--theme-danger, #e06c75); }
.retry { margin-left: 0.4em; padding: 0.4em 0; background: none; border: none; color: var(--theme-accent); font: inherit; text-decoration: underline; cursor: pointer; }
@media (prefers-reduced-motion: reduce) { .track, .thumb { transition: none; } }
</style>
