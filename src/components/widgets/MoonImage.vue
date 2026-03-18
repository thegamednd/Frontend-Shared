<template>
    <div :style="`background-image: url(${moonImageUrl})`">
    </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useDateStore } from '@shared/stores/date';

const dateStore = useDateStore();
const moonImg = ref("Moon00.webp");
const moonImageUrl = ref('https://img.potp.org/moon/Moon00.webp');

onMounted(() => {
    moonImg.value = dateStore.date.moon;
    moonImageUrl.value = `https://img.potp.org/moon/Moon${String(dateStore.date.moon).padStart(2, '0')}.webp`;
});

watch(() => dateStore.date.moon, (newVal) => {
    moonImg.value = newVal;
    moonImageUrl.value = `https://img.potp.org/moon/Moon${String(newVal).padStart(2, '0')}.webp`;
});
</script>

<style scoped>
div {
    height: 100%;
    width: 100%;
    background-size: 70%;
    background-repeat: no-repeat;
    background-position: center;
}
</style>