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
	TableColumnResize, TableProperties, TableToolbar, Underline,
	AutoImage, FileRepository, ImageBlock, ImageCaption, ImageInline,
	ImageInsert, ImageInsertViaUrl, ImageResize, ImageStyle,
	ImageTextAlternative, ImageToolbar, ImageUpload, LinkImage
} from 'ckeditor5';

import 'ckeditor5/ckeditor5.css';
import { ReportsUploadAdapterPlugin } from '@shared/utils/ckeditorUploadAdapter';

const LICENSE_KEY = 'GPL';
const isLayoutReady = ref(false);

const editor = ClassicEditor;

const config = computed(() => {
    // Per-instance override: callers that need a different toolbar/plugin
    // set (e.g. the character sheet equipment editor) pass their own config.
    if (props.editorConfig) {
        return props.editorConfig;
    }
    // Image insertion is opt-in (e.g. report editors) so other InlineEditor
    // callers keep their current, image-free toolbar.
    const toolbarItems = [
        'heading', '|', 'bulletedList', 'numberedList', 'outdent',
        '|', 'fontSize', 'fontFamily', 'fontColor',
        'fontBackgroundColor', '|', 'bold', 'italic', 'underline',
        'subscript', 'superscript', '|', 'horizontalLine', 'link',
        'insertTable', 'blockQuote', '|', 'alignment',
        'indent'
    ];

    const plugins = [
        Alignment, Autosave, BlockQuote, Bold, Essentials,
        FontBackgroundColor, FontColor, FontFamily, FontSize, Heading,
        HorizontalLine, Indent, IndentBlock, Italic, Link,
        List, ListProperties, Paragraph, PasteFromOffice,
        Subscript, Superscript, Table, TableCaption,
        TableCellProperties, TableColumnResize, TableProperties, TableToolbar,
        Underline
    ];

    const extraPlugins = [];

    if (props.imageUpload) {
        toolbarItems.push('|', 'insertImage');
        // All image plugins except AutoImage. AutoImage auto-embeds pasted image
        // URLs via a direct model write that bypasses command interception, so it
        // is only loaded for unlocked (paid) users.
        plugins.push(
            FileRepository, ImageBlock, ImageCaption, ImageInline,
            ImageInsert, ImageInsertViaUrl, ImageResize, ImageStyle,
            ImageTextAlternative, ImageToolbar, ImageUpload, LinkImage
        );
        if (!props.imageUploadLocked) {
            plugins.push(AutoImage);
        }
        extraPlugins.push(ReportsUploadAdapterPlugin);
        if (props.imageUploadLocked) {
            extraPlugins.push(ImageUploadLockPlugin);
        }
    }

    return {
        toolbar: {
            items: toolbarItems,
            shouldNotGroupWhenFull: false
        },
        plugins,
        extraPlugins,
        image: {
            toolbar: [
                'toggleImageCaption', 'imageTextAlternative', '|',
                'imageStyle:inline', 'imageStyle:alignLeft',
                'imageStyle:alignRight', 'imageStyle:alignCenter', '|',
                'resizeImage'
            ]
        },
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
    };
});

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
  // Optional per-instance CKEditor config. When provided, overrides the
  // default config entirely — the caller is responsible for declaring all
  // plugins and toolbar items it needs.
  editorConfig: {
    type: Object,
    default: null,
  },
  // Opt-in image insertion + upload. When true, the toolbar gains an image
  // button and uploads are sent to the Reports API (resized, converted to
  // JPEG, stored in the media bucket). Off by default so existing editors
  // are unaffected.
  imageUpload: {
    type: Boolean,
    default: false,
  },
  // When true (free tier), the image button stays visible but attempting to
  // insert/upload an image is blocked and emits `upgrade-required` instead.
  imageUploadLocked: {
    type: Boolean,
    default: false,
  },
});

// 2. Define emits for v-model support:
const emits = defineEmits(['update:modelValue', 'upgrade-required']);

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

// CKEditor plugin that blocks image insertion/upload for locked (free-tier)
// users. The toolbar button stays visible; clicking it fires `upgrade-required`
// instead of opening the file dialog or inserting an image.
function ImageUploadLockPlugin(editor) {
  const blockedCommands = [
    'uploadImage', 'insertImage', 'imageUpload', 'imageInsert', 'replaceImageSource',
  ];
  for (const name of blockedCommands) {
    const command = editor.commands.get(name);
    if (command) {
      command.on('execute', (evt) => {
        evt.stop();
        emits('upgrade-required');
      }, { priority: 'highest' });
    }
  }
}
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

div.ck-content table {
    table-layout: fixed;
    width: 100%;
}

/* Framed illustration + engraved caption plaque, themed to match the report
   view so what authors see while editing matches the published report. */
div.ck-content figure.image {
    border: 3px solid color-mix(in srgb, var(--theme-accent) 65%, #000);
    border-radius: 3px;
    background: var(--theme-bg-surface);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
    overflow: hidden;
}

div.ck-content figure.image img {
    max-width: 100%;
    height: auto;
    display: block;
}

div.ck-content figure.image figcaption {
    background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--theme-accent) 22%, var(--theme-bg-surface)),
        var(--theme-bg-surface)
    );
    border-top: 1px solid var(--theme-accent);
    color: var(--theme-text-primary);
    font-size: 80%;
    font-style: italic;
    padding: 0.35em 0.6em;
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