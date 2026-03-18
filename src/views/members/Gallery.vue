<template>
    <div id="memberPlatform" v-if="realmStore.arActivePlayers.length === 0">
        <div class="harochTalk" v-if="isMemberEditor && isDesktop">
            <p>It looks like you have nothing in the gallery. Click the button below to add characters.</p>
            <button
                @click="goAddMember"
                title="Add Member"
                class="add-member-btn"
            >
                <span class="material-symbols-outlined">person_add</span>
                Add Character
            </button>
        </div>
        <div v-else>
            <p>Nothing has been added to this gallery.</p>
        </div>

    </div>
    <div id="memberPlatform" v-else>
        <header>
            <h2>
                Gallery
                <button
                    v-if="isMemberEditor && isDesktop"
                    @click="goAddMember"
                    title="Add Member"
                    class="add-member-btn"
                >
                    <span class="material-symbols-outlined">person_add</span>
                    Add Character
                </button>
            </h2>
            <nav :class="navClass">
                <div id="memberGroup">
                    <div>
                        <select id="selGroup" v-model="selectedGroup">
                            <option value="All">All</option>
                            <option v-for="group in characterStore.groups" :key="group.Name" :value="group.Name">
                                {{ group.Name }}
                            </option>
                        </select>
                    </div>
                    <div>
                        <button
                            id="sortName"
                            @click="sortName()"
                            :class="memberSortBy"
                        >
                            Name <span class="material-symbols-outlined">sort</span>
                        </button>
                        <button
                            v-if="sortButton == 'Died'"
                            id="sortDied"
                            @click="sortDied()"
                            :class="memberSortBy"
                        >
                            Died <span class="material-symbols-outlined">sort</span>
                        </button>
                        <button
                            v-else
                            @click="sortBorn()"
                            id="sortBorn"
                            :class="memberSortBy"
                        >
                            Born <span class="material-symbols-outlined">sort</span>
                        </button>
                    </div>
                </div>
                <div class="filter">
                    <input
                        type="text"
                        v-model="filterText"
                        id="psiFilter"
                        @keydown="handleKeyDown"
                    />
                    <button @click="clearFilter">
                        <i class="ra ra-x-mark"></i>
                    </button>
                </div>
            </nav>
        </header>
        <div id="memberList">
            <div
                v-for="member in filteredMembers"
                :key="member.id || member.ID"
                :class="member.elClass"
                :data-id="member.id || member.ID"
                class="member-card"
            >
                <router-link
                    :to="{ name: 'Member', params: { id: member.id || member.ID } }"
                >
                    <img
                        :src="`${imagesCdnUrl}/${member.image || member.Image}`"
                        loading="lazy"
                        v-if="isViewportMedium" class="memImg"
                    />
                    <span class="name">{{ member.name || member.Name }}</span>
                </router-link>

                <!-- Edit button for character editors -->
                <div v-if="isMemberEditor && isDesktop" class="member-actions">
                    <button
                        @click.stop="editCharacter(member.id || member.ID)"
                        class="edit-button"
                        :title="`Edit ${member.name || member.Name}`"
                    >
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useCharacterStore } from '@shared/stores/character';
import { useUserStore } from '@shared/stores/user';
import { useRealmStore } from '@shared/stores/realm';
import { useConfigStore } from '@shared/stores/config';

const emits = defineEmits(['set-room']);
const characterStore = useCharacterStore();
const userStore = useUserStore();
const realmStore = useRealmStore();
const configStore = useConfigStore();

const filterText = ref('');
const isDesktop = ref(false);
const isMemberEditor = ref(false);
const members = ref([]);
const navClass = ref({ active: true });
const router = useRouter();
const selectedGroup = ref('All');
const sortButton = ref('Born');
const viewportWidth = ref(0);
const memberSortBy = ref('name-asc'); // Default to name ascending
const imagesCdnUrl = import.meta.env.VITE_IMAGES_CDN_URL;
let user = null;

onMounted(async () => {
    emits(`set-room`, `gallery`);

    updateViewportSize();
    window.addEventListener('resize', updateViewportSize);

    isMemberEditor.value = userStore.isCharacterEditor;

    const userAgent = window.navigator.userAgent;
    const desktopRegex = /(Win32|Win64|Mac|Linux x86_64)/i;
    isDesktop.value = desktopRegex.test(userAgent);

    // Load gallery preferences from localStorage
    loadGalleryPreferences();

    // Check if characters are loaded, if not and user has active realm, try to load them
    if (!characterStore.loaded && userStore.activeRealmId) {
        console.log('🔄 Gallery: Loading characters for active realm');
        await characterStore.loadCharactersForActiveRealm();
    }

    members.value = characterStore.characterList;
});

// Load gallery preferences from localStorage using our config store
const loadGalleryPreferences = () => {
    try {
        const preferences = configStore.uiPreferences.galleryPreferences || {};

        // Set defaults if preferences don't exist
        selectedGroup.value = preferences.selectedGroup || 'All';
        memberSortBy.value = preferences.memberSortBy || 'name-asc';

        console.log('Gallery preferences loaded:', {
            selectedGroup: selectedGroup.value,
            memberSortBy: memberSortBy.value
        });
    } catch (error) {
        console.warn('Failed to load gallery preferences:', error);
        // Use defaults
        selectedGroup.value = 'All';
        memberSortBy.value = 'name-asc';
    }
};

// Save gallery preferences to localStorage
const saveGalleryPreferences = () => {
    try {
        const preferences = {
            selectedGroup: selectedGroup.value,
            memberSortBy: memberSortBy.value
        };

        configStore.setUIPreference('galleryPreferences', preferences);
        console.log('Gallery preferences saved:', preferences);
    } catch (error) {
        console.error('Failed to save gallery preferences:', error);
    }
};

onBeforeUnmount(() => {
    window.removeEventListener('resize', updateViewportSize);
});

watch(() => characterStore.characterList, (newList, oldList) => {
    members.value = characterStore.characterList;
}, {
    deep: true // Use deep watcher if characterStore.list is an array or object
});

watch(memberSortBy, (newValue, oldValue) => {
    if (newValue !== oldValue) {
        saveGalleryPreferences();
    }
});

watch(selectedGroup, (newValue, oldValue) => {
    if (newValue !== oldValue) {
        console.log('selectedGroup changed:', newValue);

        const thisSelectedGroup = characterStore.groups.find(group => group.Name === newValue)?.Name || '';
        sortButton.value = ['Past', 'Heroes'].includes(thisSelectedGroup)
            ? 'Died'
            : 'Born';

        // Only adjust sort if we're switching to a group that has different sort requirements
        if (!memberSortBy.value) {
            memberSortBy.value = `${sortButton.value.toLowerCase()}-desc`;
        } else {
            if (!thisSelectedGroup) {
                // If switching to "All", keep current sort but ensure it's valid
                if (!memberSortBy.value.includes('name') && !memberSortBy.value.includes('born') && !memberSortBy.value.includes('died')) {
                    memberSortBy.value = 'name-asc';
                }
            } else if (
                thisSelectedGroup === 'Party' ||
                thisSelectedGroup === 'Alumni'
            ) {
                if (memberSortBy.value.includes('died')) {
                    memberSortBy.value = 'born-desc';
                }
            } else if (memberSortBy.value.includes('born')) {
                memberSortBy.value = 'died-desc';
            }
        }

        saveGalleryPreferences();
    }
});

const clearFilter = () => {
    filterText.value = '';
    selectedGroup.value = 'All';
    // saveGalleryPreferences will be called by the selectedGroup watcher
};

const filteredMembers = computed(() => {
    let filteredMembers = members?.value || [];
    const filter = filterText.value.toLowerCase();

    if (filterText.value) {
        filteredMembers = filteredMembers.filter((member) => {
            const name = member.name || member.Name || '';
            return name.toLowerCase().includes(filter);
        });
    }
    if (selectedGroup.value) {
        const selectedGroupName = selectedGroup.value;
        if (selectedGroupName !== 'All') {
            filteredMembers = filteredMembers.filter((member) => {
                const group = member.group || member.Group || '';
                return group === selectedGroupName;
            });
        }
    }
    switch (memberSortBy.value) {
        case 'name-asc':
            filteredMembers.sort((a, b) => {
                const aName = a.name || a.Name || '';
                const bName = b.name || b.Name || '';
                return aName.localeCompare(bName);
            });
            break;
        case 'name-desc':
            filteredMembers.sort((a, b) => {
                const aName = a.name || a.Name || '';
                const bName = b.name || b.Name || '';
                return bName.localeCompare(aName);
            });
            break;
        case 'born-asc':
            filteredMembers.sort((a, b) => {
                const aBorn = a.born || a.Born;
                const bBorn = b.born || b.Born;
                return aBorn > bBorn ? 1 : aBorn < bBorn ? -1 : 0;
            });
            break;
        case 'born-desc':
            filteredMembers.sort((a, b) => {
                const aBorn = a.born || a.Born;
                const bBorn = b.born || b.Born;
                return aBorn < bBorn ? 1 : aBorn > bBorn ? -1 : 0;
            });
            break;
        case 'died-asc':
            filteredMembers.sort((a, b) => {
                const aDied = a.died || a.Died;
                const bDied = b.died || b.Died;
                return aDied > bDied ? 1 : aDied < bDied ? -1 : 0;
            });
            break;
        case 'died-desc':
            filteredMembers.sort((a, b) => {
                const aDied = a.died || a.Died;
                const bDied = b.died || b.Died;
                return aDied < bDied ? 1 : aDied > bDied ? -1 : 0;
            });
            break;
    }

    return filteredMembers;
});

const goAddMember = () => {
    router.push('/gallery/add');
};

const editCharacter = (characterId) => {
    router.push(`/gallery/edit/${characterId}`);
};

const isViewportMedium = computed(() => viewportWidth.value > 599);

const setPermissions = () => {
    const userGroups =
        user.signInUserSession.accessToken.payload['cognito:groups'];
    if (
        userGroups &&
        (userGroups.includes('MemberEditors') ||
            userGroups.includes('Deity') ||
            userGroups.includes('Administrator'))
    ) {
        isMemberEditor.value = true;
    }
};

const sortBorn = () => {
    if (
        memberSortBy.value == 'born-desc' ||
        memberSortBy.value.includes('name') ||
        memberSortBy.value.includes('died')
    ) {
        memberSortBy.value = 'born-asc';
    } else {
        memberSortBy.value = 'born-desc';
    }
};

const sortDied = () => {
    if (
        !memberSortBy.value.includes('died') ||
        memberSortBy.value == 'died-desc'
    ) {
        memberSortBy.value = 'died-asc';
    } else {
        memberSortBy.value = 'died-desc';
    }
};

const sortName = () => {
    if (
        memberSortBy.value == 'name-desc' ||
        memberSortBy.value.includes('born') ||
        memberSortBy.value.includes('died')
    ) {
        memberSortBy.value = 'name-asc';
    } else {
        memberSortBy.value = 'name-desc';
    }
};

const updateViewportSize = () => {
    viewportWidth.value = window.innerWidth;
};
</script>

<style scoped>
button > * {
    pointer-events: none;
}

select:focus,
input:focus {
    outline: none;
}

h2 {
    margin: 0px 0.25em 0.25em 0.25em;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 1em;
}

h2::after {
    content: "";
    display: table;
    clear: both;
}

h2 > button {
    float: right;
    height: 100%;
}

@media only screen and (min-width: 600px) {
    h2 button {
        background: linear-gradient(-45deg, var(--theme-bg-surface), var(--theme-accent), #761111, #700070);
        background-size: 400% 400%;
    }
}

#memberPlatform {
    display: flex;
    height: 100%;
    flex-direction: column;
}

#memberPlatform > h2 {
    padding-top: 0.1em;
}

#memberPlatform nav {
    display: none;
    flex: 1;
    flex-direction: column;
    overflow: hidden;
}

#memberPlatform nav.active {
    display: flex;
}

#memberPlatform nav > div {
    margin: 1px 0px;
}

#memberPlatform nav > div:last-child {
    margin-bottom: 0;
}

#memberPlatform nav > #memberGroup {
    display: grid !important;
    grid-template-columns: 1fr 1fr;
    gap: 0;
}

#memberPlatform nav > #memberGroup > div:nth-child(2) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
}

#memberPlatform nav > #memberGroup > div:nth-child(1) {
    display: flex;
}

#memberPlatform nav > #memberGroup > div > button {
    flex: 1;
    background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
    color: var(--theme-accent);
    margin: 0 0.1em;
    border: 1px solid var(--theme-accent);
    border-radius: 0.3em;
    padding: 0.6em 1em;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9em;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5em;
}

#memberPlatform nav > #memberGroup > div > button:hover {
    background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
    color: var(--theme-bg-surface);
    transform: translateY(-1px);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
}

#memberPlatform nav > #memberGroup > div > button > span {
    font-size: 1em;
    transition: transform 0.2s ease;
}

#memberPlatform nav > #memberGroup > div > button.asc > span {
    transform: scaleY(-1);
}

#memberPlatform nav > #memberGroup > div > button#sortName.name-asc,
#memberPlatform nav > #memberGroup > div > button#sortName.name-desc,
#memberPlatform nav > #memberGroup > div > button#sortBorn.born-asc,
#memberPlatform nav > #memberGroup > div > button#sortBorn.born-desc,
#memberPlatform nav > #memberGroup > div > button#sortDied.died-asc,
#memberPlatform nav > #memberGroup > div > button#sortDied.died-desc {
    background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
    color: #000;
    border-color: #ffd700;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

#memberPlatform nav > #memberGroup > div > button#sortName.name-asc span {
    transform: scaleY(-1);
}

#memberPlatform nav > #memberGroup > div > button#sortName.name-desc span {
    transform: none;
}

#memberPlatform nav > #memberGroup > div > button#sortBorn.born-asc span,
#memberPlatform nav > #memberGroup > div > button#sortDied.died-asc span {
    transform: scaleY(-1);
}

#memberPlatform nav > #memberGroup > div > button#sortBorn.born-desc span,
#memberPlatform nav > #memberGroup > div > button#sortDied.died-desc span {
    transform: none;
}

#memberPlatform nav > #memberGroup > div > select {
    width: 100%;
    background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
    color: var(--theme-accent);
    margin: 0 0.1em;
    border: 1px solid var(--theme-accent);
    border-radius: 0.3em;
    padding: 0.6em 1em;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9em;
    font-weight: 600;
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
}

#memberPlatform nav > #memberGroup > div > select:hover {
    background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
    color: var(--theme-bg-surface);
    transform: translateY(-1px);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
}

#memberPlatform nav > #memberGroup > div > select:focus {
    outline: none;
    background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
    color: var(--theme-bg-surface);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
}

#memberPlatform nav > #memberGroup > div > select > option {
    background-color: var(--theme-bg-surface);
    color: var(--theme-accent);
}

#memberPlatform nav > .filter {
    display: flex;
    flex-direction: row;
}

h2 > span.material-symbols-outlined {
    background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
    color: var(--theme-accent);
    border: 1px solid var(--theme-accent);
    border-radius: 0.3em;
    padding: 0.3em;
    margin-right: 0.5em;
    cursor: pointer;
    transition: all 0.2s ease;
}

h2 > span.material-symbols-outlined:hover {
    background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
    color: var(--theme-bg-surface);
    transform: translateY(-1px);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
}

/* Add Member Button Styling */
.add-member-btn {
    display: flex;
    align-items: center;
    gap: 0.4em;
    background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
    color: var(--theme-accent);
    border: 1px solid var(--theme-accent);
    border-radius: 0.3em;
    padding: 0.4em 0.8em;
    cursor: pointer;
    text-decoration: none;
    font-size: 0.5em;
    font-weight: 600;
    margin-left: auto;
}

.add-member-btn:hover {
    background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
    color: var(--theme-bg-surface);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
}

.harochTalk .add-member-btn {
    margin-left: 0;
    margin-top: 1em;
    align-self: center;
}

#memberPlatform nav > .filter > input,
nav > .filter > button {
    background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
    color: var(--theme-accent);
    border: 1px solid var(--theme-accent);
    border-radius: 0.3em;
    padding: 0.6em 1em;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9em;
    font-weight: 600;
}

#memberPlatform nav > .filter > input {
    flex: 1;
    margin-right: 0.25em;
    cursor: text;
}

#memberPlatform nav > .filter > input:focus {
    outline: none;
    background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
    color: var(--theme-bg-surface);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
}

#memberPlatform nav > .filter > button:hover {
    background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
    color: var(--theme-bg-surface);
    transform: translateY(-1px);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
}

#memberPlatform nav > #memberList {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

#memberPlatform nav > #memberList > header {
    display: none;
}

#memberPlatform #memberList {
    flex: 1;
    overflow: hidden;
    overflow-y: scroll;
    padding-top: 0.5em;
}

#memberPlatform #memberList > div > a {
    color: var(--theme-accent);
    text-decoration: none;
}

@media only screen and (min-width: 600px) {
    #memberPlatform #memberList {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-around;
        gap: 1em;
    }

    #memberPlatform #memberList > div {
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

    #memberPlatform .memImg {
        position: absolute;
        top: 0px;
        left: 0px;
        height: 250px;
        width: 150px;
        z-index: 1;
    }

    #memberPlatform a > .deathshroud {
        position: absolute;
        height: 250px;
        width: 150px;
        top: 0px;
        background-color: rgba(55, 77, 125, 0.4);
        z-index: 10;
        display: block;
    }
}

/* #memberPlatform #memberList > div > a > span {
    display: none;
} */

#memberPlatform #memberList > div {
    background-color: rgba(55, 77, 125, 0.4);
    color: var(--theme-accent);
    cursor: pointer;
    border-bottom: 1px solid var(--theme-bg-surface-alt);
    margin-bottom: 1px;
}

#memberPlatform #memberList > div:hover {
    background-color: rgba(55, 77, 125, 0.8);
}

#memberPlatform #memberList > div > a > span.name {
    display: block;
}

@media only screen and (min-width: 600px) {
    #memberPlatform
        > nav
        > #memberList
        > #memberListStage
        > div
        > a
        > .deathshroud {
        position: absolute;
        height: 250px;
        width: 150px;
        top: 0px;
        left: 0px;
        display: block;
    }

    #memberPlatform #memberList a span.name {
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

/* Responsive Design */
@media (max-width: 768px) {
    h2 {
        flex-direction: column;
        gap: 1em;
        text-align: center;
        align-items: center;
    }

    .add-member-btn {
        margin-left: 0;
        width: auto;
    }

    .harochTalk {
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    /* Ensure member tabs stay side-by-side on mobile */
    #memberPlatform nav > #memberGroup {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        grid-template-rows: auto !important;
        gap: 0 !important;
    }

    #memberPlatform nav > #memberGroup > div {
        display: flex !important;
        flex-direction: row !important;
    }

    #memberPlatform nav > #memberGroup > div:nth-child(1) {
        display: flex !important;
        flex-direction: row !important;
    }

    #memberPlatform nav > #memberGroup > div:nth-child(2) {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        grid-template-rows: auto !important;
        gap: 0 !important;
    }

    /* Make sure buttons don't stack */
    #memberPlatform nav > #memberGroup > div > button,
    #memberPlatform nav > #memberGroup > div > select {
        min-width: 0 !important;
        flex: 1 !important;
    }
}
</style>
