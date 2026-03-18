<template>
    <div id="editorContainer">
        <Ckeditor
            :editor="ClassicEditor"
            v-model="editorData"
            :config="config"
        />
    </div>
</template>

<script setup>
import { defineProps, ref, watch, computed, onMounted } from 'vue';
import { Ckeditor } from '@ckeditor/ckeditor5-vue';

import {
	ClassicEditor, Alignment, Autosave, BlockQuote, Bold,
	Essentials, FontBackgroundColor, FontColor, FontFamily, FontSize,
	Heading, HorizontalLine, Indent, IndentBlock, Italic, Link,
	List, ListProperties, Paragraph, PasteFromOffice,
	Subscript, Superscript, Table, TableCaption, TableCellProperties,
	TableColumnResize, TableProperties, TableToolbar, Underline
} from 'ckeditor5';

import 'ckeditor5/ckeditor5.css';

const LICENSE_KEY = 'GPL';
const isLayoutReady = ref(false);

const editor = ClassicEditor;

const config = computed(() => ({
    toolbar: {
        items: [
            'heading', '|', 'bulletedList', 'numberedList', 'outdent',
            '|', 'fontSize', 'fontFamily', 'fontColor',
            'fontBackgroundColor', '|', 'bold', 'italic', 'underline',
            'subscript', 'superscript', '|', 'horizontalLine', 'link',
            'insertTable', 'blockQuote', '|', 'alignment',
            'indent'
        ],
        shouldNotGroupWhenFull: false
    },
    plugins: [
        Alignment, Autosave, BlockQuote, Bold, Essentials,
        FontBackgroundColor, FontColor, FontFamily, FontSize, Heading,
        HorizontalLine, Indent, IndentBlock, Italic, Link,
        List, ListProperties, Paragraph, PasteFromOffice,
        Subscript, Superscript, Table, TableCaption,
        TableCellProperties, TableColumnResize, TableProperties, TableToolbar,
        Underline
    ],
    licenseKey: 'GPL',
    fontFamily: {
        supportAllValues: true
    },
    fontSize: {
        options: [10, 12, 14, 'default', 18, 20, 22],
        supportAllValues: true
    },
    heading: {
        options: [
            { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
            { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
            { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
            { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
            { model: 'heading4', view: 'h4', title: 'Heading 4', class: 'ck-heading_heading4' },
            { model: 'heading5', view: 'h5', title: 'Heading 5', class: 'ck-heading_heading5' },
            { model: 'heading6', view: 'h6', title: 'Heading 6', class: 'ck-heading_heading6' }
        ]
    },
    link: {
        addTargetToExternalLinks: true,
        defaultProtocol: 'https://',
        decorators: {
            toggleDownloadable: {
                mode: 'manual',
                label: 'Downloadable',
                attributes: {
                    download: 'file'
                }
            }
        }
    },
    list: {
        properties: {
            styles: true,
            startIndex: true,
            reversed: true
        }
    },
    placeholder: props.placeholder,
    table: {
        contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells', 'tableProperties', 'tableCellProperties']
    }
}));

onMounted(() => {
	isLayoutReady.value = true;
});

// 1. Define props for v-model support:
const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: 'Type or paste your content here!',
  },
});

// 2. Define emits for v-model support:
const emits = defineEmits(['update:modelValue']);

// 3. Create a local ref that holds the current content of the editor:
const editorData = ref(props.modelValue);

// 4. Watch for changes in the editorData and emit an update when it changes:
watch(editorData, (newVal) => {
  emits('update:modelValue', newVal);
});

// 5. Update `editorData` whenever `props.modelValue` changes externally:
watch(() => props.modelValue, (newVal) => {
  if (newVal !== editorData.value) {
    editorData.value = newVal;
  }
});
</script>

<style>
#editorContainer {
    width: 100%;
    border: 1px solid var(--theme-bg-surface);
    border-radius: 5px;
    overflow: hidden;
}
div.ck div.ck-content {
    color: var(--theme-accent);
    background-color: var(--theme-bg-surface) !important;
    font-weight: normal;
    border: 1px inset var(--theme-accent);
    overflow: auto; /* Ensure content is scrollable if it overflows */
}

.ck.ck-toolbar {
    background-color: var(--theme-accent);
    border: 1px outset var(--theme-bg-surface);
}

.ck-editor__main {
    height: 100%; /* Ensure the main editor content takes the full height of the container */
    overflow: auto; /* Ensure content is scrollable if it overflows */
}

div.ck-content.ck-editor__editable {
    height: 20em;
}
</style>





<!-- <style scoped>
#editorContainer {
    height: 500px;
    width: 100%;
    border: 1px solid #182036;
    border-radius: 5px;
    overflow: hidden;
}
</style>
<style>
div.ck div.ck-content {
    color: #ffc581;
    background-color: #182036 !important;
    font-weight: normal;
    height: 500px;
    border: 1px inset #ffc581;
}

.ck.ck-toolbar {
    background-color: #ffc581;
    border: 1px outset #182036;
}

.ck-editor__main {
    max-height: 100%; /* Ensure the main editor content does not exceed the container height */
    overflow: hidden; /* Ensure content is scrollable if it overflows */
}
</style> -->