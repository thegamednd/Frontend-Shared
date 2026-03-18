<template>
    <div v-if="contentStore.active && (!props.isEditor || !contentStore.isEditing)" class="contentDisplay">
        <div class="content" v-html="contentStore.active.content || ''"></div>
        <div
            class="children"
            :class="{ short: !userStore.prefs?.showIntro }"
            v-if="userStore && contentStore.active.children?.length"
        >
            <header>
                <button v-if="userStore.prefs.showIntro" @click="toggleIntro">
                    <span class="material-symbols-outlined deg270">logout</span>
                </button>
                <button v-else @click="toggleIntro">
                    <span class="material-symbols-outlined deg90">login</span>
                </button>
            </header>
            <div class="contentStage">
                <div
                    v-for="child in contentStore.active.children?.filter(
                        (child) => child.published === 1
                    )"
                    :key="child.id"
                >
                    <template v-if="child.link">
                        <header
                            v-if="props.isEditor"
                            class="col100"
                            :title="child.name"
                        >
                            <span>{{ child.name }}</span>
                            <span
                                class="material-symbols-outlined"
                                @click="activate(child.path, false)"
                                >visibility</span
                            >
                            <span
                                class="material-symbols-outlined"
                                @click="activate(child.path, true)"
                                >open_in_new</span
                            >
                        </header>
                        <header
                            v-else
                            @click="activate(child.path, true)"
                            class="col10"
                            :title="child.name"
                        >
                            <span>{{ child.name }}</span>
                            <span class="material-symbols-outlined"
                                >open_in_new</span
                            >
                        </header>
                    </template>
                    <template v-else>
                        <header
                            @click="activate(child.path)"
                            :title="child.name"
                        >
                            {{ child.name }}
                        </header>
                    </template>
                    <div
                        v-if="userStore.prefs.showIntro && !child.link"
                        @click="activate(child.path)"
                        class="intro"
                        v-html="child.intro || 'NO INTRO CONTENT'"
                    ></div>
                    <div
                        v-else-if="userStore.prefs.showIntro && child.link"
                        @click="activate(child.path, true)"
                        class="intro"
                        v-html="child.intro || 'NO INTRO CONTENT'"
                    ></div>
                </div>
            </div>
        </div>
        <div
            class="unpublished"
            v-if="
                props.isEditor &&
                contentStore.active.children?.filter( (child) => !Boolean(child.published)).length
            "
        >
            <div
                v-for="child in contentStore.active.children.filter( (child) => child.published === 0 )"
                :key="child.id"
            >
                <header v-if="child.link" class="col100" :title="child.name">
                    <span>{{ child.name }}</span>
                    <span
                        class="material-symbols-outlined"
                        @click="activate(child.path, false)"
                        >visibility</span
                    >
                    <span
                        class="material-symbols-outlined"
                        @click="activate(child.path)"
                        >open_in_new</span
                    >
                </header>
                <header
                    v-else
                    @click="activate(child.path)"
                    :title="child.name"
                >
                    {{ child.name }}
                </header>
            </div>
        </div>
    </div>
    <ContentEdit
        v-else-if="props.isEditor && contentStore.isEditing"
        :isEditor="props.isEditor" />
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
// import axios from 'axios';
// import { Auth } from 'aws-amplify';
import { useRoute, useRouter } from 'vue-router';
import { useContentStore } from '@/store/content';
import { useUserStore } from '@/store/user';
import ContentEdit from '@/components/cms/ContentEdit.vue';

const props = defineProps({
    isEditor: { type: Boolean, default: false },
});

// const emits = defineEmits([
//     'activate',
// ]);
const isEditorActive = ref(false);
const route = useRoute();
const router = useRouter();
const addingArticle = ref(false);
const contentStore = useContentStore();
const currentContent = ref({});
const userStore = useUserStore();


onMounted(async () => {
    isEditorActive.value = contentStore.isEditor;
});

watch(() => userStore.isEditor, (newVal) => {
    isEditorActive.value = newVal;
});

const activate = async (path, activateExternal) => {
    const newActive = await contentStore.getContent(path);
    if (!newActive) {
        this.activate('/404');
        return;
    }
    if (newActive.link && activateExternal) {
        window.open(newActive.link, '_blank');
        return;
    }

    await contentStore.setActive(path);
    router.push(newActive.path);
};

const cancelAddArticle = () => {
    addingArticle.value = false;
    newItem.value = {
        id: '',
        name: '',
        content: '',
        published: 0,
        link: '',
        path: null,
    };
};

const toggleIntro = () => {
    userStore.setPref('showIntro', !userStore.prefs?.showIntro);
};
</script>

<style scoped>
textarea {
    width: 100%;
    height: 3em;
    padding: 0.5em;
    margin: 0;
    border: 1px inset var(--theme-accent);
    background-color: var(--theme-bg-surface);
    color: var(--theme-accent);
    font-size: 80%;
    resize: none;
}

textarea:focus {
    outline: none;
}

.contentDisplay .children > header {
    text-align: right;
    margin-bottom: 0.5em;
}

.contentDisplay .unpublished header {
    font-size: 100%;
}

.contentDisplay .children > header button {
    background-color: var(--theme-bg-surface);
    border: 1px outset var(--theme-accent);
    border-radius: 50%;
    transition: all 0.4s ease-in-out;
    font-size: 50%;
}

.contentDisplay .children header button .material-symbols-outlined {
    font-size: 1.5em;
    color: var(--theme-accent);
    background-color: var(--theme-bg-surface);
    border: 1px outset var(--theme-accent);
    border-radius: 50%;
    padding: 0.2em;
    margin: 0.2em;
    transition: all 0.4s ease-in-out;
}

.contentDisplay .children .contentStage {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(13em, 1fr));
    grid-auto-rows: 7em;
    gap: 0.2em;
}

.contentDisplay .children.short .contentStage {
    grid-auto-rows: 2em;
}

.contentDisplay .children .contentStage > div {
    background-image: url(https://img.potp.org/rooms/article_scroll.gif);
    background-repeat: none;
    background-size: 100% 100%;
    font-size: 70%;
    color: #000;
    font-weight: 700;
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 30% 1fr;
    gap: 0.1em;
    height: 100%;
    transition: all 0.4s ease-in-out;
    cursor: pointer;
}

.contentDisplay .children.short .contentStage > div {
    display: block;
    background-image: url(https://img.potp.org/rooms/article.gif);
}

.vault .contentDisplay .children .contentStage > div {
    background-image: url(https://img.potp.org/rooms/vault/btn-content.png);
    border: 1px outset #737373;
}

.contentDisplay .children .contentStage > div header {
    align-items: center;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    padding: 0.5em 10%;
    text-shadow: 0 0 6px #d5b072;
    font-size: 120%;
}

.contentDisplay .children .contentStage .intro {
    padding: 0.3em 22% 0.1em 22%;
    overflow: hidden;
    text-overflow: ellipsis;
    box-sizing: border-box;
    font-weight: 400;
    line-height: 1;
    font-size: 90%;
    text-shadow: 0 0 6px #252423;
}

.vault .contentDisplay .children .contentStage .intro {
    border-top: 2px inset #737373;
    padding: 0.3em 10% 0.1em 10%;
    margin: 0 0.2em 0.2em 0.2em;
    font-size: 100%;
    font-weight: bold;
    text-shadow: 2px 2px 4px white;
    line-height: 1.2;
}

.contentDisplay .children.short .contentStage .intro {
    display: none;
}

.contentDisplay .unpublished {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10em, 1fr));
    gap: 0.2em;
    margin-top: 1em;
}

.contentDisplay .unpublished > div {
    font-size: 70%;
    color: #737373;
    background-color: var(--theme-bg-surface);
    font-weight: 700;
    transition: all 0.4s ease-in-out;
    cursor: pointer;
    border: 1px outset #737373;
}

.contentDisplay .unpublished > div header {
    /* padding: .5em 10%; */
    font-size: 100%;
}


</style>
<style>
figcaption {
    font-size: 80%;
    color: #737373;
    text-align: center;
    padding: 0.5em;
    background: color-mix(in srgb, var(--theme-bg-primary) 50%, transparent);
    border: none;
}

/* CKEditor image styles */
.content .image-style-inline {
    display: inline-block;
    max-width: 100%;
}

.content .image-style-block {
    display: block;
    margin: 1rem auto;
    max-width: 100%;
}

.content .image-style-side {
    float: right;
    margin-left: 1rem;
    margin-bottom: 1rem;
    max-width: 50%;
}

/* Clear floats after content */
.content::after {
    content: "";
    display: table;
    clear: both;
}

/* CKEditor image captions */
.content figure {
    margin: 0;
    display: table;
}

.content figure.image-style-side {
    float: right;
    margin-left: 1rem;
    margin-bottom: 1rem;
    max-width: 50%;
}

.content figure.image-style-block {
    margin: 1rem auto;
    max-width: 100%;
}

.content figure figcaption {
    display: table-caption;
    caption-side: bottom;
    font-size: 0.9em;
    color: #888;
    font-style: italic;
    padding: 0.5rem 0;
    text-align: center;
    background: transparent;
    border: none;
}
</style>
