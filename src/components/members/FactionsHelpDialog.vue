<template>
    <dialog ref="dialogRef" class="faction-help" aria-labelledby="factionHelpTitle" @close="emit('close')" @click="onBackdropClick">
        <div class="faction-help-inner" @click.stop>
            <header class="faction-help-header">
                <h2 id="factionHelpTitle">How factions work</h2>
                <button type="button" class="faction-help-close" aria-label="Close" @click="close">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </header>

            <div class="faction-help-body">
                <section>
                    <h3>Setting up a faction</h3>
                    <p>Every faction needs a name. The brief description shows in this list. The longer description shows on the faction's own page.</p>
                    <p>"Known to players" controls whether players can see the faction at all. Uncheck it and the faction disappears from their view. You still see it here, with a <span class="help-badge">hidden from players</span> badge.</p>
                    <p>Deleting a faction also removes it from every character who belonged to it.</p>
                </section>

                <section>
                    <h3>Adding members</h3>
                    <p>You assign members from a character's edit page, not from here. Open a character and you get a checkbox for each faction in your realm.</p>
                    <p>Giving a character a faction turns it into an NPC. That is why the group selector locks while the character belongs to a faction. Clear its factions first if you need to change the group back.</p>
                </section>

                <section>
                    <h3>What players see</h3>
                    <p>Two settings control secrecy, and they work independently.</p>
                    <p>"This character is a known member of this faction" sits under each faction checkbox. It starts unchecked, so a new member stays secret until you change it.</p>
                    <p>"Hidden from players" sits on the character itself and only shows for NPCs. It hides the character completely.</p>

                    <div class="visibility-rule">
                        <p class="visibility-rule-lead">A player sees "Member of the Harpers" on a character only when all three are true:</p>
                        <ul>
                            <li>The character is visible to players</li>
                            <li>That membership is marked known</li>
                            <li>The faction is known to players</li>
                        </ul>
                    </div>

                    <p>Move a character out of the NPC group and it stops being hidden. The member count in this list counts the members you can see, which is why it says known members. Players see a smaller count.</p>
                </section>
            </div>
        </div>
    </dialog>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';

const props = defineProps({
    open: { type: Boolean, default: false },
});
const emit = defineEmits(['close']);

const dialogRef = ref(null);

watch(() => props.open, (isOpen) => {
    nextTick(() => {
        const dlg = dialogRef.value;
        if (!dlg) return;
        if (isOpen && !dlg.open) dlg.showModal();
        else if (!isOpen && dlg.open) dlg.close();
    });
}, { immediate: true });

function close() {
    dialogRef.value?.close();
}

function onBackdropClick(event) {
    // A native <dialog> reports backdrop clicks as clicks on the dialog element itself.
    if (event.target === dialogRef.value) close();
}
</script>

<style scoped>
.faction-help {
    padding: 0;
    width: 100vw;
    max-width: 100vw;
    max-height: 90vh;
    overflow: hidden;
    background: var(--theme-bg-surface);
    color: var(--theme-text);
    border: 1px solid color-mix(in srgb, var(--theme-text) 20%, transparent);
    border-radius: 0;
}

.faction-help::backdrop { background: rgb(0 0 0 / 0.6); }

.faction-help-inner {
    display: grid;
    grid-template-rows: auto 1fr;
    max-height: 90vh;
}

.faction-help-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5em;
    padding: 0.9em 1em;
    border-bottom: 1px solid color-mix(in srgb, var(--theme-text) 15%, transparent);
}

.faction-help-header h2 {
    margin: 0;
    font-size: 1.05rem;
}

.faction-help-close {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25em;
    background: transparent;
    border: 1px solid color-mix(in srgb, var(--theme-text) 20%, transparent);
    border-radius: 8px;
    color: var(--theme-text);
    cursor: pointer;
}

.faction-help-close:hover { border-color: var(--theme-accent); color: var(--theme-accent); }
.faction-help-close:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: 2px; }

.faction-help-body {
    padding: 1em;
    overflow-y: auto;
    line-height: 1.55;
}

.faction-help-body section + section { margin-top: 1.6em; }

.faction-help-body h3 {
    margin: 0 0 0.5em;
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: var(--theme-accent);
}

.faction-help-body p { margin: 0 0 0.7em; }

.help-badge {
    display: inline-block;
    padding: 0.1em 0.4em;
    font-size: 0.72em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
    border: 1px solid #d8a657;
    border-radius: 4px;
    color: #d8a657;
}

.visibility-rule {
    margin: 0.9em 0;
    padding: 0.8em 0.9em;
    border-left: 3px solid #d8a657;
    border-radius: 0 8px 8px 0;
    background: color-mix(in srgb, #d8a657 8%, transparent);
}

.visibility-rule-lead { margin: 0 0 0.5em; }
.visibility-rule ul { margin: 0; padding-left: 1.1em; }
.visibility-rule li { margin-bottom: 0.25em; }
.visibility-rule li::marker { color: #d8a657; }

@media (min-width: 40em) {
    .faction-help {
        width: 38em;
        max-width: 92vw;
        max-height: 85vh;
        border-radius: 12px;
    }
    .faction-help-inner { max-height: 85vh; }
    .faction-help-body { padding: 1.25em; }
}
</style>
