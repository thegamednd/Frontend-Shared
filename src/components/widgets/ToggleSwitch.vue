<template>
    <div class="toggler" :class="{ locked: locked }" @click="toggle">
        <span class="material-symbols-outlined">{{ mtlSmbl[0] }}</span>
        <span class="material-symbols-outlined">{{ mtlSmbl[1] }}</span>
        <span class="ball"></span>
    </div>
</template>

<script setup>
import { ref, watchEffect } from 'vue';

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false,
    },
    mtlSmbl: {
        type: Array,
        default: () => ['check', 'close'],
    },
});

const emits = defineEmits(['update:modelValue']);
const locked = ref(props.modelValue);
const arMtlSmbl = ref(props.mtlSmbl);

watchEffect(() => {
    locked.value = props.modelValue;
    arMtlSmbl.value = props.mtlSmbl;
});

const toggle = () => {
    locked.value = !locked.value;
    emits('update:modelValue', locked.value);
};
</script>

<style scoped>
.toggler {
    background-color: #140f2c;
    width: 51px;
    height: 27px;
    border-radius: 50px;
    position: relative;
    padding: 5px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    float: right;
    margin-top: 0.2em;
    margin: 0 0.5em;
    border: 1px solid green;
}

.toggler.locked {
    border-color: red;
}

/* body.dark .toggler {
   background-color: #c0c0c0;
   color: white;
} */

.toggler span.material-symbols-outlined {
    font-size: 20px;
}

.toggler .light {
    color: #f39c12;
}

.toggler .ball {
    background-color: #140f2c;
    width: 23px;
    height: 24px;
    position: absolute;
    left: 2px;
    top: 0px;
    border-radius: 50%;
    transition: transform 0.2s linear;
    transform: translateX(2px);
}

.toggler.locked .ball {
    transform: translateX(22px);
}
</style>
