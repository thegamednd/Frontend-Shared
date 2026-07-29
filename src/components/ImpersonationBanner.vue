<template>
    <Transition name="impersonation-banner">
        <div
            v-if="isImpersonating && expanded"
            id="impersonation-banner"
            class="impersonation-banner"
            role="alert"
            aria-live="polite"
            @pointerenter="hold"
            @pointerleave="release"
            @focusin="hold"
            @focusout="release"
        >
            <div class="impersonation-banner__inner">
                <div class="impersonation-banner__mark" aria-hidden="true">
                    <span class="impersonation-banner__pulse" />
                    <svg
                        class="impersonation-banner__icon"
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 11l-3-3-3 3" />
                        <path d="M19 8v8" />
                    </svg>
                </div>
                <div class="impersonation-banner__copy">
                    <span class="impersonation-banner__label">Impersonating</span>
                    <span class="impersonation-banner__name">{{ impersonatedUserName || 'unnamed user' }}</span>
                </div>
                <button
                    type="button"
                    class="impersonation-banner__exit"
                    @click="exit"
                    :aria-label="`Exit impersonation of ${impersonatedUserName || 'user'}`"
                >
                    <span>Exit</span>
                    <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                    >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                </button>
            </div>
        </div>
    </Transition>

    <!-- Ember seal — the banner collapsed to a single mark. Stays put so the
         admin never loses track of whose account they're in, without covering
         the hamburger menu. -->
    <button
        v-if="isImpersonating"
        type="button"
        class="impersonation-seal"
        :class="{ 'impersonation-seal--tucked': expanded }"
        :aria-expanded="expanded"
        :aria-hidden="expanded"
        :tabindex="expanded ? -1 : 0"
        aria-controls="impersonation-banner"
        :aria-label="`Show impersonation bar for ${impersonatedUserName || 'user'}`"
        :title="`Impersonating ${impersonatedUserName || 'user'}`"
        @pointerenter="hold"
        @pointerleave="release"
        @focus="hold"
        @blur="release"
        @click="hold"
    >
        <span class="impersonation-seal__pulse" aria-hidden="true" />
        <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 11l-3-3-3 3" />
            <path d="M19 8v8" />
        </svg>
    </button>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';
import { useImpersonation } from '@shared/composables/useImpersonation';

const { impersonatedUserName, isImpersonating, clearImpersonation } = useImpersonation();

/* The bar covers app chrome (the hamburger menu sits underneath it), so it
 * announces itself for 5s and then tucks away into the seal at top right.
 * Hovering or focusing either the seal or the bar brings it back; leaving
 * tucks it away again 3s later. */
const AUTO_HIDE_MS = 5000;
const LEAVE_HIDE_MS = 3000;

const expanded = ref(false);
let hideTimer = null;

function cancelHide() {
    if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
    }
}

function scheduleHide(delay) {
    cancelHide();
    hideTimer = setTimeout(() => {
        expanded.value = false;
        hideTimer = null;
    }, delay);
}

// pointerenter / focus / tap on the seal — show it and stop any pending hide
function hold() {
    cancelHide();
    expanded.value = true;
}

// pointerleave / blur — tuck it away again shortly after
function release() {
    scheduleHide(LEAVE_HIDE_MS);
}

watch(
    isImpersonating,
    (on) => {
        cancelHide();
        expanded.value = on;
        if (on) scheduleHide(AUTO_HIDE_MS);
    },
    { immediate: true }
);

onBeforeUnmount(cancelHide);

function exit() {
    cancelHide();
    clearImpersonation();
    // Reload so cached user-scoped data (characters, prefs, realm membership)
    // is refetched under the admin's real identity.
    if (typeof window !== 'undefined') {
        window.location.reload();
    }
}
</script>

<style scoped>
/* Fixed top — sits above app chrome, sized to leave game UI usable.
 * Mobile-first: compact ~40px tall with horizontal layout that survives
 * narrow viewports without wrapping. */
.impersonation-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 99999;
    /* Interactive across its full width so pointerenter/leave drive the
     * show/hide timing, not just the centred inner strip. */
    pointer-events: auto;
    /* Two stacked layers for depth — woven amber light with a deep base */
    background:
        linear-gradient(
            90deg,
            rgba(102, 30, 18, 0.96) 0%,
            rgba(140, 60, 28, 0.96) 35%,
            rgba(170, 90, 30, 0.96) 65%,
            rgba(112, 38, 22, 0.96) 100%
        ),
        repeating-linear-gradient(
            -45deg,
            transparent 0,
            transparent 8px,
            rgba(255, 196, 96, 0.04) 8px,
            rgba(255, 196, 96, 0.04) 14px
        );
    color: #fff8e7;
    box-shadow:
        0 2px 0 rgba(255, 196, 96, 0.5),
        0 8px 18px rgba(0, 0, 0, 0.55);
    border-bottom: 1px solid rgba(255, 209, 138, 0.4);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
}

.impersonation-banner__inner {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.45rem 0.75rem;
    padding-top: max(0.45rem, env(safe-area-inset-top));
    padding-left: max(0.75rem, env(safe-area-inset-left));
    padding-right: max(0.75rem, env(safe-area-inset-right));
    max-width: 1200px;
    margin: 0 auto;
    font-family:
        ui-sans-serif,
        system-ui,
        -apple-system,
        'Segoe UI',
        Roboto,
        sans-serif;
    font-size: 0.82rem;
    line-height: 1.2;
}

.impersonation-banner__mark {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 209, 138, 0.45);
    flex-shrink: 0;
    color: #ffe9b8;
}

.impersonation-banner__pulse {
    position: absolute;
    inset: -4px;
    border-radius: 999px;
    border: 1px solid rgba(255, 209, 138, 0.5);
    animation: impersonation-pulse 2.4s ease-out infinite;
    pointer-events: none;
}

@keyframes impersonation-pulse {
    0% {
        transform: scale(0.85);
        opacity: 0.9;
    }
    80%,
    100% {
        transform: scale(1.6);
        opacity: 0;
    }
}

.impersonation-banner__icon {
    display: block;
}

.impersonation-banner__copy {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}

.impersonation-banner__label {
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 0.68rem;
    color: rgba(255, 232, 196, 0.85);
    font-weight: 700;
    flex-shrink: 0;
}

.impersonation-banner__name {
    font-weight: 700;
    color: #fff8e7;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.92rem;
    letter-spacing: 0.01em;
}

.impersonation-banner__exit {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.85rem;
    min-height: 32px;
    border-radius: 999px;
    border: 1px solid rgba(255, 232, 196, 0.55);
    background: linear-gradient(
        180deg,
        rgba(255, 244, 220, 0.95) 0%,
        rgba(248, 222, 174, 0.95) 100%
    );
    color: #5a1c08;
    font-family: inherit;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.7),
        0 2px 4px rgba(0, 0, 0, 0.3);
    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.impersonation-banner__exit:hover {
    transform: translateY(-1px);
    background: linear-gradient(
        180deg,
        #ffffff 0%,
        rgba(252, 232, 190, 0.98) 100%
    );
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.85),
        0 4px 10px rgba(0, 0, 0, 0.35);
}

.impersonation-banner__exit:active {
    transform: translateY(0);
    box-shadow:
        inset 0 2px 4px rgba(0, 0, 0, 0.25);
}

.impersonation-banner__exit:focus-visible {
    outline: 2px solid #fff8e7;
    outline-offset: 2px;
}

/* The tucked-away state: same ember mark as the banner, one object collapsed.
 * Small enough to clear app chrome, warm enough to stay noticeable. */
.impersonation-seal {
    position: fixed;
    top: max(0.35rem, env(safe-area-inset-top));
    right: max(0.35rem, env(safe-area-inset-right));
    z-index: 99998;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    padding: 0;
    border-radius: 999px;
    border: 1px solid rgba(255, 209, 138, 0.55);
    background: linear-gradient(
        160deg,
        rgba(140, 60, 28, 0.95) 0%,
        rgba(102, 30, 18, 0.95) 100%
    );
    color: #ffe9b8;
    cursor: pointer;
    box-shadow:
        inset 0 1px 0 rgba(255, 209, 138, 0.35),
        0 3px 10px rgba(0, 0, 0, 0.45);
    transition: opacity 0.25s ease, transform 0.25s ease, background 0.15s ease;
}

.impersonation-seal:hover {
    background: linear-gradient(
        160deg,
        rgba(170, 90, 30, 0.98) 0%,
        rgba(122, 40, 22, 0.98) 100%
    );
}

.impersonation-seal:focus-visible {
    outline: 2px solid #ffd18a;
    outline-offset: 2px;
}

/* Out of the way while the bar itself is on screen */
.impersonation-seal--tucked {
    opacity: 0;
    transform: scale(0.8);
    pointer-events: none;
}

.impersonation-seal__pulse {
    position: absolute;
    inset: -3px;
    border-radius: 999px;
    border: 1px solid rgba(255, 209, 138, 0.55);
    animation: impersonation-pulse 2.8s ease-out infinite;
    pointer-events: none;
}

/* Narrower phones — let the name take all remaining room and shrink labels */
@media (max-width: 380px) {
    .impersonation-banner__label {
        display: none;
    }
    .impersonation-banner__name {
        font-size: 0.85rem;
    }
    .impersonation-banner__exit > span {
        display: none;
    }
    .impersonation-banner__exit {
        padding: 0.4rem 0.55rem;
    }
}

/* Slide-in/out */
.impersonation-banner-enter-active,
.impersonation-banner-leave-active {
    transition: transform 0.25s ease, opacity 0.25s ease;
}
.impersonation-banner-enter-from,
.impersonation-banner-leave-to {
    transform: translateY(-100%);
    opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
    .impersonation-banner__pulse,
    .impersonation-seal__pulse {
        animation: none;
    }
    .impersonation-banner-enter-active,
    .impersonation-banner-leave-active,
    .impersonation-seal,
    .impersonation-banner__exit {
        transition-duration: 0.01ms;
    }
}
</style>
