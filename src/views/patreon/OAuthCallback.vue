<template>
  <div class="oauth-callback">
    <div class="callback-container">
      <!-- Loading State -->
      <div v-if="processing" class="callback-state loading">
        <div class="state-icon">
          <span class="material-symbols-outlined spinning">hourglass_empty</span>
        </div>
        <h1>Connecting Your Patreon Account</h1>
        <p>Please wait while we complete the connection...</p>
        <div class="progress-bar">
          <div class="progress-fill"></div>
        </div>
      </div>

      <!-- Success State -->
      <div v-else-if="success" class="callback-state success">
        <div class="state-icon success-icon">
          <span class="material-symbols-outlined">check_circle</span>
        </div>
        <h1>Patreon Connected Successfully!</h1>
        <p class="success-message">{{ message }}</p>

        <div v-if="creditIssued" class="credit-notification">
          <div class="credit-icon">
            <span class="material-symbols-outlined">account_balance_wallet</span>
          </div>
          <div class="credit-info">
            <h3>Credit Issued!</h3>
            <p>You've received {{ formattedCreditAmount }} in account credits.</p>
          </div>
        </div>

        <div class="actions">
          <button @click="goToAccount" class="btn-primary">
            <span class="material-symbols-outlined">dashboard</span>
            Go to Account Dashboard
          </button>
          <button @click="goToSettings" class="btn-secondary">
            <span class="material-symbols-outlined">settings</span>
            View Patreon Settings
          </button>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="callback-state error">
        <div class="state-icon error-icon">
          <span class="material-symbols-outlined">error</span>
        </div>
        <h1>Connection Failed</h1>
        <p class="error-message">{{ message }}</p>

        <div class="error-details" v-if="errorDetails">
          <p class="details-label">Error Details:</p>
          <code>{{ errorDetails }}</code>
        </div>

        <div class="actions">
          <button @click="retryConnection" class="btn-primary">
            <span class="material-symbols-outlined">refresh</span>
            Try Again
          </button>
          <button @click="goToSettings" class="btn-secondary">
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

// Methods
const goToAccount = () => {
  router.push('/account');
};

const goToSettings = () => {
  router.push('/account/settings');
};

const retryConnection = () => {
  router.push('/account/settings');
};

const processCallback = async () => {
  // Check for error in query params (Patreon sends error if user cancels)
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

  // Check for success indicator (the backend handles the OAuth callback)
  // We're just showing a success/error page based on URL params
  const successParam = route.query.success;
  const messageParam = route.query.message;
  const creditIssuedParam = route.query.credit_issued;
  const creditAmountParam = route.query.credit_amount;

  // Simulate processing delay for better UX
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

    // Refresh account data to get updated credit balance
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
    // No clear success/error indicator, assume error
    success.value = false;
    error.value = true;
    message.value = 'Invalid callback response from Patreon.';
    errorDetails.value = 'Missing success parameter in callback URL.';

    notifyError(message.value);
  }
};

// Lifecycle
onMounted(() => {
  processCallback();
});
</script>

<style scoped>
.oauth-callback {
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.callback-container {
  max-width: 600px;
  width: 100%;
}

.callback-state {
  background: linear-gradient(135deg, var(--theme-bg-surface) 0%, #2a3a5a 100%);
  border: 1px solid var(--theme-border);
  border-radius: 1rem;
  padding: 3rem 2rem;
  text-align: center;
}

.state-icon {
  font-size: 5rem;
  margin-bottom: 1.5rem;
}

.state-icon.success-icon {
  color: #28a745;
}

.state-icon.error-icon {
  color: #dc3545;
}

.callback-state h1 {
  color: var(--theme-accent);
  font-size: 2rem;
  margin: 0 0 1rem 0;
}

.callback-state p {
  color: #ccc;
  font-size: 1rem;
  line-height: 1.6;
  margin: 0 0 1.5rem 0;
}

.success-message {
  color: #28a745;
  font-weight: 500;
}

.error-message {
  color: #dc3545;
  font-weight: 500;
}

/* Loading State */
.loading .state-icon {
  color: var(--theme-accent);
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: #333;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 2rem;
}

.progress-fill {
  height: 100%;
  width: 60%;
  background: linear-gradient(90deg, var(--theme-accent) 0%, #e6b373 100%);
  animation: progress 2s ease-in-out infinite;
}

@keyframes progress {
  0% { transform: translateX(-100%); }
  50% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}

/* Credit Notification */
.credit-notification {
  background: rgba(40, 167, 69, 0.1);
  border: 2px solid #28a745;
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin: 2rem 0;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.credit-icon {
  font-size: 2.5rem;
  color: #28a745;
}

.credit-info {
  text-align: left;
  flex: 1;
}

.credit-info h3 {
  color: #28a745;
  font-size: 1.2rem;
  margin: 0 0 0.5rem 0;
}

.credit-info p {
  color: #ffffff;
  margin: 0;
  font-size: 1rem;
}

/* Error Details */
.error-details {
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.3);
  border-radius: 0.5rem;
  padding: 1rem;
  margin: 1.5rem 0;
  text-align: left;
}

.details-label {
  color: #dc3545;
  font-weight: 600;
  font-size: 0.9rem;
  margin: 0 0 0.5rem 0;
}

.error-details code {
  display: block;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.75rem;
  border-radius: 0.25rem;
  color: #ff6b6b;
  font-family: monospace;
  font-size: 0.85rem;
  word-break: break-word;
}

/* Actions */
.actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-primary,
.btn-secondary {
  padding: 1rem 2rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: none;
  text-decoration: none;
}

.btn-primary {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #e6b373 100%);
  color: var(--theme-bg-surface);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #e6b373 0%, #d4a366 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.btn-secondary {
  background: transparent;
  border: 1px solid #666;
  color: #ccc;
}

.btn-secondary:hover {
  border-color: var(--theme-accent);
  color: var(--theme-accent);
  transform: translateY(-2px);
}

/* Spinning Animation */
.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 768px) {
  .oauth-callback {
    padding: 1rem;
  }

  .callback-state {
    padding: 2rem 1.5rem;
  }

  .callback-state h1 {
    font-size: 1.5rem;
  }

  .state-icon {
    font-size: 4rem;
  }

  .credit-notification {
    flex-direction: column;
    text-align: center;
  }

  .credit-info {
    text-align: center;
  }
}
</style>
