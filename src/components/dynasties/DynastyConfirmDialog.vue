<template>
    <dialog ref="dialogRef" class="dyn-dialog confirm-dialog" role="alertdialog" :aria-labelledby="titleId" @cancel.prevent="close">
        <div class="dyn-layout">
            <div class="dyn-header">
                <h3 :id="titleId">{{ title }}</h3>
            </div>
            <div class="dyn-body"><slot /></div>
            <div class="dyn-footer">
                <span class="spacer"></span>
                <button type="button" class="btn" :disabled="busy" @click="close">Cancel</button>
                <button type="button" class="btn btn-danger" :disabled="busy" @click="emit('confirm')">
                    {{ busy ? 'Deleting…' : confirmLabel }}
                </button>
            </div>
        </div>
    </dialog>
</template>

<script setup>
import { nextTick, onMounted, ref, watch } from 'vue';

const props = defineProps({
    open: { type: Boolean, default: false },
    title: { type: String, required: true },
    confirmLabel: { type: String, default: 'Delete' },
    busy: { type: Boolean, default: false },
});
const emit = defineEmits(['confirm', 'close']);

const dialogRef = ref(null);
const titleId = `dyn-confirm-${Math.random().toString(36).slice(2, 8)}`;

function sync(open) {
    const el = dialogRef.value;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
}
watch(() => props.open, (v) => nextTick(() => sync(v)));
onMounted(() => sync(props.open));

function close() {
    if (!props.busy) emit('close');
}
</script>

<style scoped src="./dynastyDialog.css"></style>
<style scoped>
@media (min-width: 40em) {
    .confirm-dialog { width: 28em; }
}
</style>
