<template>
    <section v-if="editor" class="scandals-card" aria-labelledby="scandals-card-title">
        <div class="head">
            <h2 id="scandals-card-title">
                <span class="material-symbols-outlined" aria-hidden="true">campaign</span>
                Lorekeeper scandals
            </h2>
            <span v-if="loaded" class="switch">
                <input
                    :id="switchId"
                    type="checkbox"
                    role="switch"
                    :checked="on"
                    :disabled="saving"
                    aria-labelledby="scandals-card-label"
                    @change="toggle($event.target.checked, $event.target)"
                />
                <span class="track" aria-hidden="true"><span class="thumb"></span></span>
            </span>
        </div>
        <label id="scandals-card-label" :for="switchId" class="switch-label">
            Scandals in Lorekeeper chat: <strong>{{ on ? 'on' : 'off' }}</strong>
        </label>
        <p class="explain">
            Now and then, after answering a question, the Lorekeeper passes on some gossip about the realm's noble families.
            The scandals come from your family trees and session reports, and they cost no AI credits.
            Players only hear gossip about other people's families.
            Secrets like a hidden child or a different father start switched off, and you can edit or switch off any scandal on the
            <router-link :to="{ name: 'DynastyScandals' }">scandals page</router-link>.
        </p>
        <p v-if="loadFailed" class="card-error" role="alert">
            The scandal setting could not be loaded.
            <button type="button" class="retry" @click="load">Try again</button>
        </p>
        <p v-if="saveError" class="card-error" role="alert">{{ saveError }}</p>
    </section>
</template>

<script setup>
// The DM's on/off switch for Lorekeeper scandals, shown at the foot of Manage
// Races. Hidden from players. The switch stays put until the save succeeds.
import { computed, ref, watch } from 'vue';
import { useDynastiesStore } from '@shared/stores/dynasties';
import { useUserStore } from '@shared/stores/user';
import { scandalErrorMessage } from '@shared/utils/dynastyErrors';

const store = useDynastiesStore();
const userStore = useUserStore();
const editor = computed(() => Boolean(userStore.isDM || userStore.isAdmin));
const switchId = `scandals-switch-${Math.random().toString(36).slice(2, 8)}`;

const on = ref(false);
const loaded = ref(false);
const loadFailed = ref(false);
const saving = ref(false);
const saveError = ref('');

async function load() {
    loadFailed.value = false;
    try {
        const s = await store.getScandalSettings();
        on.value = !!s?.on;
        loaded.value = true;
    } catch (e) {
        loadFailed.value = true;
    }
}

async function toggle(next, input) {
    saving.value = true;
    saveError.value = '';
    try {
        const s = await store.setScandalSettings(next);
        on.value = s?.on ?? next;
    } catch (e) {
        saveError.value = scandalErrorMessage(store, e, 'The change was not saved. Try again.');
    } finally {
        saving.value = false;
        // The checkbox moved on its own: put it back in step with the saved value.
        if (input) input.checked = on.value;
    }
}

let started = false;
watch(
    editor,
    (isEditor) => {
        if (isEditor && !started) {
            started = true;
            load();
        }
    },
    { immediate: true }
);
</script>

<style scoped>
.scandals-card {
    margin: 2em 0 0;
    padding: 1em 1.1em 1.1em;
    box-sizing: border-box;
    border: 1px solid color-mix(in srgb, var(--theme-text) 15%, transparent);
    border-left: 3px solid var(--theme-accent);
    border-radius: 0 10px 10px 0;
    background: color-mix(in srgb, var(--theme-accent) 6%, transparent);
    color: var(--theme-text);
}
.head { display: flex; align-items: center; justify-content: space-between; gap: 0.75em; }
h2 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.4em;
    font-family: var(--theme-font-display, inherit);
    font-size: 1.2rem;
    overflow-wrap: anywhere;
}
h2 .material-symbols-outlined { color: var(--theme-accent); }
.switch-label { display: block; margin: 0.15em 0 0.5em; font-size: 0.88rem; cursor: pointer; }
.explain { margin: 0; max-width: 65ch; font-size: 0.92rem; line-height: 1.55; color: color-mix(in srgb, var(--theme-text) 85%, transparent); }
.explain a { color: var(--theme-accent); }
.card-error { margin: 0.6em 0 0; font-size: 0.85rem; color: var(--theme-danger, #e06c75); }
.retry { margin-left: 0.4em; padding: 0.4em 0; background: none; border: none; color: var(--theme-accent); font: inherit; text-decoration: underline; cursor: pointer; }

/* Same switch as the letters panel. */
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
@media (prefers-reduced-motion: reduce) { .track, .thumb { transition: none; } }
</style>
