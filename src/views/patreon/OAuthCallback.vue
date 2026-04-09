<template>
  <div class="oauth-callback">
    <div class="callback-container">
      <!-- Loading State -->
      <div v-if="processing" class="callback-card">
        <div class="card-glow loading-glow"></div>
        <div class="icon-ring loading-ring">
          <span class="material-symbols-outlined icon-spin">sync</span>
        </div>
        <h1 class="card-title">Connecting Patreon</h1>
        <p class="card-subtitle">Completing the handshake...</p>
        <div class="loading-track">
          <div class="loading-bar"></div>
        </div>
      </div>

      <!-- Success State -->
      <div v-else-if="success" class="callback-card appear">
        <div class="card-glow success-glow"></div>
        <div class="icon-ring success-ring">
          <span class="material-symbols-outlined">check</span>
        </div>
        <h1 class="card-title">Connected</h1>
        <p class="card-subtitle">{{ message }}</p>

        <div v-if="creditIssued" class="credit-badge">
          <span class="material-symbols-outlined credit-icon">toll</span>
          <span class="credit-text">{{ formattedCreditAmount }} credit added</span>
        </div>

        <div class="card-actions">
          <button @click="goToAccount" class="btn-accent">
            <span class="material-symbols-outlined">dashboard</span>
            Account Dashboard
          </button>
          <button @click="goToSettings" class="btn-ghost">
            <span class="material-symbols-outlined">tune</span>
            Patreon Settings
          </button>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="callback-card appear">
        <div class="card-glow error-glow"></div>
        <div class="icon-ring error-ring">
          <span class="material-symbols-outlined">close</span>
        </div>
        <h1 class="card-title">Connection Failed</h1>
        <p class="card-subtitle">{{ message }}</p>

        <code v-if="errorDetails" class="error-code">{{ errorDetails }}</code>

        <div class="card-actions">
          <button @click="retryConnection" class="btn-accent">
            <span class="material-symbols-outlined">refresh</span>
            Try Again
          </button>
          <button @click="goToSettings" class="btn-ghost">
            <span class="material-symbols-outlined">arrow_back</span>
            Back to Settings
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAccountStore } from '@shared/stores/account';
import { useNotifications } from '@shared/composables/useNotifications';

const router = useRouter();
const route = useRoute();
const accountStore = useAccountStore();
const { notifySuccess, notifyError } = useNotifications();

const processing = ref(true);
const success = ref(false);
const error = ref(false);
const message = ref('');
const errorDetails = ref('');
const creditIssued = ref(false);
const creditAmount = ref(0);

const formattedCreditAmount = computed(() => {
  const dollars = (creditAmount.value / 100).toFixed(2);
  return `$${dollars}`;
});

const goToAccount = () => {
  router.push('/account');
};

const goToSettings = () => {
  router.push({ path: '/account', query: { tab: 'settings' } });
};

const retryConnection = () => {
  router.push({ path: '/account', query: { tab: 'settings' } });
};

const processCallback = async () => {
  const errorParam = route.query.error;
  const errorDescription = route.query.error_description;

  if (errorParam) {
    processing.value = false;
    error.value = true;
    success.value = false;

    if (errorParam === 'access_denied') {
      message.value = 'You cancelled the Patreon connection.';
      errorDetails.value = 'Authorization was denied by user.';
    } else {
      message.value = 'An error occurred during Patreon authorization.';
      errorDetails.value = errorDescription || errorParam;
    }

    notifyError(message.value);
    return;
  }

  const successParam = route.query.success;
  const messageParam = route.query.message;
  const creditIssuedParam = route.query.credit_issued;
  const creditAmountParam = route.query.credit_amount;

  await new Promise(resolve => setTimeout(resolve, 1500));

  processing.value = false;

  if (successParam === 'true') {
    success.value = true;
    error.value = false;
    message.value = messageParam || 'Your Patreon account has been successfully connected!';

    if (creditIssuedParam === 'true' && creditAmountParam) {
      creditIssued.value = true;
      creditAmount.value = parseInt(creditAmountParam);
    }

    await accountStore.getAccount(true);
    await accountStore.fetchPatreonSubscription();

    notifySuccess('Patreon connected successfully!');
  } else if (successParam === 'false') {
    success.value = false;
    error.value = true;
    message.value = messageParam || 'Failed to connect Patreon account.';
    errorDetails.value = route.query.error_code || 'Unknown error';

    notifyError(message.value);
  } else {
    success.value = false;
    error.value = true;
    message.value = 'Invalid callback response from Patreon.';
    errorDetails.value = 'Missing success parameter in callback URL.';

    notifyError(message.value);
  }
};

onMounted(() => {
  processCallback();
});
</script>

<style scoped>
.oauth-callback {
  min-height: 100vh;
  background: var(--theme-bg-primary, #161D26);
  color: var(--theme-text-primary, #e1e1ed);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.callback-container {
  max-width: 420px;
  width: 100%;
}

/* ── Card ── */
.callback-card {
  position: relative;
  background: var(--theme-bg-surface, #182036);
  border: 1px solid var(--theme-border, #343434);
  border-radius: 0.75rem;
  padding: 2.5rem 2rem 2rem;
  text-align: center;
  overflow: hidden;
}

.card-glow {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 3px;
  border-radius: 0 0 4px 4px;
}

.success-glow { background: var(--theme-success, #2ecc71); box-shadow: 0 0 24px var(--theme-success, #2ecc71); }
.error-glow   { background: var(--theme-danger, #ff4444);  box-shadow: 0 0 24px var(--theme-danger, #ff4444); }
.loading-glow { background: var(--theme-accent, #ffc581);  box-shadow: 0 0 24px var(--theme-accent, #ffc581); }

/* ── Icon ring ── */
.icon-ring {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.25rem;
}

.icon-ring .material-symbols-outlined {
  font-size: 32px;
  font-weight: 600;
}

.success-ring {
  background: color-mix(in srgb, var(--theme-success, #2ecc71) 15%, transparent);
  border: 2px solid var(--theme-success, #2ecc71);
  color: var(--theme-success, #2ecc71);
}

.error-ring {
  background: color-mix(in srgb, var(--theme-danger, #ff4444) 15%, transparent);
  border: 2px solid var(--theme-danger, #ff4444);
  color: var(--theme-danger, #ff4444);
}

.loading-ring {
  background: color-mix(in srgb, var(--theme-accent, #ffc581) 12%, transparent);
  border: 2px solid var(--theme-accent, #ffc581);
  color: var(--theme-accent, #ffc581);
}

/* ── Typography ── */
.card-title {
  font-family: var(--theme-font-display, 'Lobster', cursive);
  color: var(--theme-accent, #ffc581);
  font-size: 1.6rem;
  margin: 0 0 0.4rem;
  font-weight: 400;
}

.card-subtitle {
  color: var(--theme-text-secondary, #a6a1da);
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0 0 1.5rem;
}

/* ── Loading track ── */
.loading-track {
  height: 3px;
  background: var(--theme-border, #343434);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 0.5rem;
}

.loading-bar {
  height: 100%;
  width: 40%;
  background: var(--theme-accent, #ffc581);
  border-radius: 2px;
  animation: slide 1.4s ease-in-out infinite;
}

@keyframes slide {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}

/* ── Credit badge ── */
.credit-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: color-mix(in srgb, var(--theme-success, #2ecc71) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-success, #2ecc71) 40%, transparent);
  border-radius: 2rem;
  padding: 0.5rem 1rem;
  margin-bottom: 1.5rem;
}

.credit-icon {
  font-size: 1.2rem;
  color: var(--theme-success, #2ecc71);
}

.credit-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--theme-success, #2ecc71);
}

/* ── Error code ── */
.error-code {
  display: block;
  background: color-mix(in srgb, var(--theme-danger, #ff4444) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-danger, #ff4444) 25%, transparent);
  border-radius: 0.4rem;
  padding: 0.6rem 0.8rem;
  margin-bottom: 1.5rem;
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--theme-danger, #ff4444);
  word-break: break-word;
  text-align: left;
}

/* ── Actions ── */
.card-actions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.btn-accent,
.btn-ghost {
  padding: 0.7rem 1.2rem;
  border-radius: 0.4rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border: none;
}

.btn-accent .material-symbols-outlined,
.btn-ghost .material-symbols-outlined {
  font-size: 1.1rem;
}

.btn-accent {
  background: var(--theme-accent, #ffc581);
  color: var(--theme-bg-surface, #182036);
}

.btn-accent:hover {
  background: var(--theme-accent-hover, #ffd9a6);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--theme-accent, #ffc581) 25%, transparent);
}

.btn-ghost {
  background: transparent;
  border: 1px solid var(--theme-border, #343434);
  color: var(--theme-text-secondary, #a6a1da);
}

.btn-ghost:hover {
  border-color: var(--theme-accent, #ffc581);
  color: var(--theme-accent, #ffc581);
}

/* ── Animations ── */
.icon-spin {
  animation: spin 1.2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.appear {
  animation: fadeUp 0.4s ease-out;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Mobile ── */
@media (max-width: 480px) {
  .callback-card {
    padding: 2rem 1.25rem 1.5rem;
  }

  .card-title {
    font-size: 1.35rem;
  }

  .icon-ring {
    width: 56px;
    height: 56px;
  }

  .icon-ring .material-symbols-outlined {
    font-size: 28px;
  }
}
</style>
