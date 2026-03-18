<template>
  <div class="credit-balance-card stat-card">
    <div class="stat-icon">
      <span class="material-symbols-outlined">account_balance_wallet</span>
    </div>
    <div class="stat-content">
      <div class="stat-value">{{ formattedCreditBalance }}</div>
      <div class="stat-label">Account Credits</div>
      <div class="stat-meta">
        <span v-if="accountStore.creditBalance > 0">Available for subscription</span>
        <span v-else>No credits available</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useAccountStore } from '@shared/stores/account';

const accountStore = useAccountStore();

const formattedCreditBalance = computed(() => {
  const cents = accountStore.creditBalance || 0;
  const dollars = (cents / 100).toFixed(2);
  return `$${dollars}`;
});
</script>

<style scoped>
.credit-balance-card {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid #444;
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.credit-balance-card:hover {
  border-color: var(--theme-accent);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--theme-accent) 10%, transparent);
}

.stat-icon {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #28a745 0%, #20803d 100%);
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #28a745;
  line-height: 1;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.9rem;
  color: #ccc;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.stat-meta {
  font-size: 0.8rem;
  color: #888;
}
</style>
