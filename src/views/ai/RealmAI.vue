<template>
  <div class="realm-ai-page">
    <AIChat
      v-if="!showPurchase"
      @show-purchase="showPurchase = true"
    />
    <AIPurchaseCredits
      v-else
      @close="showPurchase = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAIStore } from '@shared/stores/ai';
import AIChat from '@shared/components/ai/AIChat.vue';
import AIPurchaseCredits from '@shared/components/ai/AIPurchaseCredits.vue';

const emits = defineEmits(['set-room']);
const aiStore = useAIStore();
const showPurchase = ref(false);

onMounted(async () => {
  emits('set-room', 'hearth-horn');
  await aiStore.getCredits();
});
</script>

<style scoped>
.realm-ai-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
