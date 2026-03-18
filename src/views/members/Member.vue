<template>
    <div class="member-detail" v-if="member">
        <header>
            <div class="header-title">
                <button @click="goBack" class="header-action-btn back-btn" title="Back to Gallery">
                    <span class="material-symbols-outlined">arrow_back</span>
                </button>
                <h2>{{ member.Name }}</h2>
            </div>
            <div class="header-actions">
                <template v-if="features.hasCharacterSheets">
                    <button
                        @click="openCharacterSheet"
                        class="header-action-btn"
                        title="Character Sheet"
                    >
                        <span class="material-symbols-outlined">description</span>
                        Sheet
                    </button>
                </template>
                <button
                    v-if="canEdit"
                    @click="editCharacter"
                    class="header-action-btn"
                    title="Edit Character"
                >
                    <span class="material-symbols-outlined">edit</span>
                    Edit
                </button>
            </div>
        </header>

        <div class="member-content">
            <div class="member-image">
                <img
                    :src="`${imagesCdnUrl}/${member.Image}`"
                    :alt="member.Name"
                    v-if="member.Image"
                />
                <div v-else class="no-image">
                    <span class="material-symbols-outlined">person</span>
                    <p>No Image Available</p>
                </div>
            </div>

            <div class="member-info">
                <div class="info-section">
                    <h3>Basic Information</h3>
                    <div class="info-grid">
                        <div class="info-item" v-if="member.Title">
                            <label>Title:</label>
                            <span>{{ member.Title }}</span>
                        </div>
                        <div class="info-item" v-if="member.Pseudonym">
                            <label>Pseudonym:</label>
                            <span>{{ member.Pseudonym }}</span>
                        </div>
                        <div class="info-item" v-if="member.Group">
                            <label>Group:</label>
                            <span>{{ member.Group }}</span>
                        </div>
                        <div class="info-item" v-if="ownerName">
                            <label>Owner:</label>
                            <span>{{ ownerName }}</span>
                        </div>
                        <template v-if="features.hasClasses">
                            <div class="info-item" v-if="member.Races && member.Races.length">
                                <label>Race:</label>
                                <span>{{ member.Races.join(', ') }}</span>
                            </div>
                            <div class="info-item" v-if="member.Classes && member.Classes.length">
                                <label>Class:</label>
                                <span>{{ classDisplayNames.join(', ') }}</span>
                            </div>
                        </template>
                        <div class="info-item" v-if="member.Born">
                            <label>Born:</label>
                            <span>{{ member.Born }}</span>
                        </div>
                        <div class="info-item" v-if="member.Died">
                            <label>Died:</label>
                            <span>{{ member.Died }}</span>
                        </div>
                        <template v-if="features.hasClasses">
                            <div class="info-item" v-if="member.Level">
                                <label>Level:</label>
                                <span>{{ member.Level }}</span>
                            </div>
                            <div class="info-item" v-if="member.HP">
                                <label>HP:</label>
                                <span>{{ member.HP }}</span>
                            </div>
                        </template>
                        <div class="info-item" v-if="member.Religion">
                            <label>Religion:</label>
                            <span>{{ member.Religion }}</span>
                        </div>
                        <div class="info-item" v-if="member.Aura && member.Aura.Name">
                            <label>Aura:</label>
                            <span :style="{ color: member.Aura.Code }">{{ member.Aura.Name }}</span>
                        </div>
                    </div>
                </div>

                <div class="info-section" v-if="hasPhysicalInfo">
                    <h3>Physical Description</h3>
                    <div class="info-grid">
                        <div class="info-item" v-if="member.Ethnicity">
                            <label>Ethnicity:</label>
                            <span>{{ member.Ethnicity }}</span>
                        </div>
                        <div class="info-item" v-if="member.Eyes">
                            <label>Eyes:</label>
                            <span>{{ member.Eyes }}</span>
                        </div>
                        <div class="info-item" v-if="member.Hair">
                            <label>Hair:</label>
                            <span>{{ member.Hair }}</span>
                        </div>
                        <div class="info-item" v-if="member.Height">
                            <label>Height:</label>
                            <span>{{ member.Height }}</span>
                        </div>
                        <div class="info-item" v-if="member.Weight">
                            <label>Weight:</label>
                            <span>{{ member.Weight }}</span>
                        </div>
                    </div>
                </div>

                <div class="info-section" v-if="member.Bio">
                    <h3>Biography</h3>
                    <div class="bio-content" v-html="member.Bio"></div>
                </div>
            </div>
        </div>
    </div>

    <div v-else-if="loading" class="loading">
        <p>Loading character details...</p>
    </div>

    <div v-else class="not-found">
        <h2>Character Not Found</h2>
        <p>The requested character could not be found.</p>
        <button @click="goBack" class="header-action-btn">
            <span class="material-symbols-outlined">arrow_back</span>
            Back to Gallery
        </button>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCharacterStore } from '@shared/stores/character';
import { useUserStore } from '@shared/stores/user';
import { useRealmStore } from '@shared/stores/realm';
import { features } from '@shared/config/features';

const props = defineProps({
    id: {
        type: String,
        required: true
    }
});

const route = useRoute();
const router = useRouter();
const characterStore = useCharacterStore();
const userStore = useUserStore();
const realmStore = useRealmStore();
const imagesCdnUrl = import.meta.env.VITE_IMAGES_CDN_URL;

let classesStore = null;
if (features.hasClasses) {
    const { useClassesStore } = await import('@/stores/classes');
    classesStore = useClassesStore();
}

const member = ref(null);
const loading = ref(true);

const canEdit = computed(() => {
    return userStore.isCharacterEditor;
});

const hasPhysicalInfo = computed(() => {
    return member.value && (
        member.value.Ethnicity ||
        member.value.Eyes ||
        member.value.Hair ||
        member.value.Height ||
        member.value.Weight
    );
});

const ownerName = computed(() => {
    if (!member.value || !member.value.UserID) {
        return null;
    }

    const owner = realmStore.arAllRealmPlayers?.find(player => player.UserID === member.value.UserID);
    if (!owner) return null;

    // Format full name if we have both first and last name
    if (owner.NameFirst && owner.NameLast) {
        return `${owner.NameFirst} ${owner.NameLast}`;
    }

    // Use NameFirst if available, otherwise fallback to Name
    return owner.NameFirst || owner.Name || null;
});

/**
 * Get display names for character classes
 * Handles three formats:
 * 1. Array of UUIDs (new format) - look up in characterStore.classes
 * 2. Array of objects with ClassName (intermediate format)
 * 3. Array of class name strings (legacy format)
 */
const classDisplayNames = computed(() => {
    if (!member.value || !member.value.Classes || !member.value.Classes.length) {
        return [];
    }

    return member.value.Classes.map(c => {
        // Case 1: c is a UUID string - look it up in the store
        if (typeof c === 'string' && characterStore.isUUID(c)) {
            const classObj = classesStore?.getClassById(c);
            return classObj ? classObj.ClassName : c; // Fallback to UUID if not found
        }
        // Case 2: c is an object with ClassName property
        else if (c && typeof c === 'object' && c.ClassName) {
            return c.ClassName;
        }
        // Case 3: c is a plain string (class name)
        else if (typeof c === 'string') {
            return c;
        }

        return 'Unknown';
    }).filter(Boolean);
});

onMounted(async () => {
    loading.value = true;

    // Get the member ID from route params
    const memberId = props.id || route.params.id;
    console.log('Member ID:', memberId);

    // If no member ID is provided, redirect to gallery without adding to history
    if (!memberId) {
        router.replace('/gallery');
        return;
    }

    // Wait for characters to be loaded if they aren't already
    if (!characterStore.characterList || characterStore.characterList.length === 0) {
        if (userStore.activeRealmId) {
            await characterStore.loadCharactersForActiveRealm();
        } else {
            console.warn('No active realm set - cannot load characters');
            router.replace('/gallery');
            return;
        }
    }

    // Find the member in the character list
    member.value = characterStore.characterList.find(char => char.ID === memberId);

    // If member not found, redirect to gallery without adding to history
    if (!member.value) {
        router.replace('/gallery');
        return;
    }

    loading.value = false;
});

const goBack = () => {
    router.push('/gallery');
};

const editCharacter = () => {
    if (member.value && member.value.ID) {
        router.push(`/gallery/edit/${member.value.ID}`);
    }
};

const openCharacterSheet = () => {
    if (member.value && member.value.ID) {
        router.push(`/gallery/${member.value.ID}/sheet`);
    }
};
</script>

<style scoped>
.member-detail {
    height: 100%;
    overflow-y: auto;
    background: linear-gradient(135deg, color-mix(in srgb, var(--theme-bg-surface) 10%, transparent) 0%, rgba(42, 58, 90, 0.1) 100%);
    padding: 1em;
}

header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2em;
    padding-bottom: 1em;
    border-bottom: 2px solid var(--theme-accent);
}

.header-title {
    display: flex;
    align-items: center;
    gap: 0.5em;
}

.header-action-btn.back-btn {
    padding: 0.5em 0.3em;
}

.header-actions {
    display: flex;
    gap: 0.75rem;
    align-items: center;
}

header h2 {
    color: var(--theme-accent);
    font-size: 2em;
    margin: 0;
    text-shadow: 2px 2px 4px color-mix(in srgb, var(--theme-bg-primary) 50%, transparent);
}

.header-action-btn {
    display: flex;
    align-items: center;
    gap: 0.4em;
    background: color-mix(in srgb, var(--theme-accent) 8%, transparent);
    color: var(--theme-accent);
    border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
    border-radius: 0.3em;
    padding: 0.5em 1em;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9em;
    font-weight: 600;
}

.header-action-btn:hover {
    background: color-mix(in srgb, var(--theme-accent) 18%, transparent);
    border-color: var(--theme-accent);
}

.header-action-btn .material-symbols-outlined {
    font-size: 1.15em;
}

.member-content {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 2em;
    align-items: start;
}

.member-image {
    width: 300px;
    height: 500px;
    border: 2px solid var(--theme-accent);
    border-radius: 0.5em;
    overflow: hidden;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.member-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.no-image {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: color-mix(in srgb, var(--theme-bg-surface) 50%, transparent);
    color: var(--theme-accent);
}

.no-image .material-symbols-outlined {
    font-size: 4em;
    margin-bottom: 0.5em;
}

.member-info {
    display: flex;
    flex-direction: column;
    gap: 2em;
}

.info-section {
    background: color-mix(in srgb, var(--theme-bg-surface) 30%, transparent);
    border: 1px solid #444;
    border-radius: 0.5em;
    padding: 1.5em;
}

.info-section h3 {
    color: var(--theme-accent);
    margin: 0 0 1em 0;
    font-size: 1.3em;
    border-bottom: 1px solid var(--theme-accent);
    padding-bottom: 0.5em;
}

.info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1em;
}

.info-item {
    display: flex;
    flex-direction: column;
    gap: 0.3em;
}

.info-item label {
    color: var(--theme-accent);
    font-weight: 600;
    font-size: 0.9em;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.info-item span {
    color: #ffffff;
    font-size: 1.1em;
    padding: 0.3em 0;
}

.bio-content {
    color: #ffffff;
    line-height: 1.6;
    font-size: 1.1em;
}

.bio-content p {
    margin: 0 0 1em 0;
}

.loading, .not-found {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    color: var(--theme-accent);
    text-align: center;
}

.loading p, .not-found p {
    font-size: 1.2em;
    margin: 1em 0;
}

.not-found h2 {
    color: var(--theme-accent);
    margin: 0 0 0.5em 0;
}

/* Responsive design */
@media (max-width: 768px) {
    .member-content {
        grid-template-columns: 1fr;
        gap: 1em;
    }

    .member-image {
        width: 100%;
        max-width: 300px;
        margin: 0 auto;
    }

    header {
        flex-direction: column;
        gap: 1em;
        text-align: center;
    }

    .header-actions {
        width: 100%;
        justify-content: center;
    }

    .info-grid {
        grid-template-columns: 1fr;
    }
}
</style>
