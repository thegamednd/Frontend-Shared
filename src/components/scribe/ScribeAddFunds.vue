<template>
  <div class="purchase-credits">
    <h3>Fund The Scribe</h3>

    <!-- Admin set balance -->
    <div v-if="userStore.isAdministrator" class="admin-section">
      <h4>Set Wallet Balance (Admin)</h4>
      <p class="current-balance">Current balance: <strong>${{ currentBalance }}</strong> USD</p>
      <div class="amount-input">
        <label>
          New balance (USD):
          <input
            type="text"
            inputmode="decimal"
            :value="adminDisplay"
            @input="onAdminInput"
            @blur="onAdminBlur"
          />
        </label>
        <button @click="handleAdminSetBalance" :disabled="adminBalance === null || adminBalance < 0" class="btn-admin">
          Set Balance
        </button>
      </div>
    </div>

    <!-- PayPal purchase (all editors) -->
    <div class="paypal-section">
      <h4>Add Funds via PayPal</h4>
      <div v-if="!paypalConfirmed" class="amount-input">
        <label>
          Amount (USD):
          <input
            type="text"
            inputmode="decimal"
            :value="paypalDisplay"
            @input="onPaypalInput"
            @blur="onPaypalBlur"
          />
        </label>
        <button @click="confirmPaypalAmount" :disabled="!paypalAmount || paypalAmount < 3 || !paypalReady" class="btn-admin">
          Continue
        </button>
      </div>
      <div v-if="!paypalConfirmed && (!paypalAmount || paypalAmount < 3)">
        <p class="hint">Enter an amount ($3.00 minimum) to add funds.</p>
      </div>
      <div v-if="paypalConfirmed" class="selected-summary">
        <p>Add: <strong>${{ paypalAmount.toFixed(2) }} USD</strong> to Scribe wallet</p>
        <div id="scribe-paypal-button-container"></div>
        <button @click="changePaypalAmount" class="change-amount">Change amount</button>
      </div>
    </div>

    <button @click="$emit('close')" class="cancel-button">Cancel</button>

    <!-- Result Modal -->
    <dialog ref="modalDialog" :class="['modal-dialog', modal.type]" @close="onDialogClose">
      <div class="modal-icon">
        <span class="material-symbols-outlined">{{ modal.type === 'success' ? 'check_circle' : 'error' }}</span>
      </div>
      <h4>{{ modal.type === 'success' ? 'Funds Added!' : 'Error' }}</h4>
      <p>{{ modal.message }}</p>
      <button @click="closeModal" class="modal-button">
        {{ modal.type === 'success' ? 'Continue' : 'Try Again' }}
      </button>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '@shared/stores/user';
import { useScribeStore } from '@shared/stores/scribe';

const userStore = useUserStore();
const scribeStore = useScribeStore();

const emit = defineEmits(['close']);

const adminBalance = ref(scribeStore.walletBalance ?? 0);
const adminDisplay = ref((scribeStore.walletBalance ?? 0).toFixed(2));
const paypalAmount = ref(5);
const paypalConfirmed = ref(false);
const modalDialog = ref(null);
const modal = ref({ type: 'success', message: '' });
const paypalReady = ref(false);
let scribePaypalScript = null;

// Load a separate PayPal SDK instance with intent=capture for one-time payments
// (the global one uses intent=subscription which doesn't support actions.order.create)
function loadScribePayPal() {
  return new Promise((resolve, reject) => {
    // If a capture-intent SDK is already loaded, reuse it
    if (window._scribePaypal) {
      paypalReady.value = true;
      resolve(window._scribePaypal);
      return;
    }

    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
    if (!clientId) {
      reject(new Error('PayPal client ID not configured'));
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    // Use a different namespace to avoid colliding with the subscription SDK
    const params = new URLSearchParams({
      'client-id': clientId,
      currency: 'USD',
      intent: 'capture',
      'data-namespace': 'scribePaypal',
    });
    script.src = `https://www.paypal.com/sdk/js?${params.toString()}`;

    script.onload = () => {
      if (window.scribePaypal) {
        window._scribePaypal = window.scribePaypal;
        paypalReady.value = true;
        resolve(window.scribePaypal);
      } else {
        reject(new Error('PayPal SDK (capture) failed to initialize'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
    scribePaypalScript = script;
    document.head.appendChild(script);
  });
}

onMounted(() => {
  loadScribePayPal().catch(err => console.error('PayPal load error:', err));
});

function showResultModal(type, message) {
  modal.value = { type, message };
  nextTick(() => { modalDialog.value?.showModal(); });
}

function closeModal() {
  modalDialog.value?.close();
}

function onDialogClose() {
  if (modal.value.type === 'success') {
    emit('close');
  }
}

function onAdminInput(e) {
  const raw = e.target.value.replace(/[^0-9.]/g, '');
  adminDisplay.value = raw;
  const num = parseFloat(raw);
  adminBalance.value = isNaN(num) ? 0 : num;
}

function onAdminBlur() {
  const num = parseFloat(adminDisplay.value);
  if (isNaN(num) || num < 0) {
    adminBalance.value = 0;
    adminDisplay.value = '0.00';
  } else {
    adminBalance.value = Math.round(num * 100) / 100;
    adminDisplay.value = adminBalance.value.toFixed(2);
  }
}

const paypalDisplay = ref('5.00');

function onPaypalInput(e) {
  const raw = e.target.value.replace(/[^0-9.]/g, '');
  paypalDisplay.value = raw;
  const num = parseFloat(raw);
  paypalAmount.value = isNaN(num) ? 0 : num;
}

function onPaypalBlur() {
  const num = parseFloat(paypalDisplay.value);
  if (isNaN(num) || num < 0) {
    paypalAmount.value = 0;
    paypalDisplay.value = '0.00';
  } else {
    paypalAmount.value = Math.round(num * 100) / 100;
    paypalDisplay.value = paypalAmount.value.toFixed(2);
  }
}

const currentBalance = computed(() => {
  const b = scribeStore.walletBalance;
  return b !== null && b !== undefined ? b.toFixed(2) : '—';
});

async function handleAdminSetBalance() {
  if (adminBalance.value === null || adminBalance.value < 0) return;
  try {
    const result = await scribeStore.adminSetWalletBalance(adminBalance.value);
    showResultModal('success', `Balance set to $${result.balance.toFixed(2)} USD (was $${result.previousBalance.toFixed(2)} USD)`);
  } catch (err) {
    showResultModal('error', err.response?.data?.message || err.message || 'Failed to set balance.');
  }
}

function renderPayPalButton() {
  const sdk = window._scribePaypal || window.scribePaypal;
  if (!sdk || !document.getElementById('scribe-paypal-button-container')) {
    nextTick(renderPayPalButton);
    return;
  }

  const container = document.getElementById('scribe-paypal-button-container');
  container.innerHTML = '';

  sdk.Buttons({
    createOrder: function(data, actions) {
      return actions.order.create({
        purchase_units: [{
          description: `Scribe Wallet - $${paypalAmount.value.toFixed(2)} USD`,
          amount: {
            currency_code: 'USD',
            value: paypalAmount.value.toFixed(2),
          },
        }],
      });
    },
    onApprove: async function(data, actions) {
      return actions.order.capture().then(async function() {
        const amount = paypalAmount.value;
        try {
          const result = await scribeStore.verifyScribePayment(data.orderID, amount);
          if (result.success) {
            showResultModal('success', `$${result.creditsAdded.toFixed(2)} USD added. Balance: $${result.balance.toFixed(2)} USD`);
          } else {
            showResultModal('error', 'Payment verification failed. Please try again.');
          }
        } catch (error) {
          showResultModal('error', 'Payment verification failed. Please contact an administrator.');
        }
      });
    },
    onError: function() {
      showResultModal('error', 'An error occurred with your PayPal transaction. Please try again.');
    },
    onCancel: function() {
      showResultModal('error', 'Purchase was cancelled. You can try again when ready.');
    },
  }).render('#scribe-paypal-button-container');
}

function confirmPaypalAmount() {
  if (!paypalAmount.value || paypalAmount.value < 3) return;
  paypalConfirmed.value = true;
  nextTick(renderPayPalButton);
}

function changePaypalAmount() {
  paypalConfirmed.value = false;
  const container = document.getElementById('scribe-paypal-button-container');
  if (container) container.innerHTML = '';
}
</script>

<style scoped>
.purchase-credits {
  padding: 24px;
  border: 2px solid #4a2020;
  border-radius: 8px;
  background: linear-gradient(180deg, #1a0a0a 0%, #2d1010 100%);
  max-width: 420px;
  margin: 0 auto;
  font-family: "Cinzel", serif;
  color: #e8e0d0;
  max-height: 80vh;
  overflow-y: auto;
}

.purchase-credits h3 {
  text-align: center;
  color: #d4af37;
  margin-bottom: 24px;
  font-family: "Cinzel Decorative", serif;
  font-size: 1.4em;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
}

.purchase-credits h4 {
  color: var(--theme-accent);
  margin: 0 0 12px 0;
  font-size: 1em;
  border-bottom: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent);
  padding-bottom: 6px;
}

.admin-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #4a2020;
}

.current-balance {
  color: #aaa;
  margin: 0 0 12px 0;
  font-size: 0.95em;
}

.current-balance strong {
  color: #d4af37;
}

.amount-input {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.amount-input label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e8e0d0;
}

.amount-input input {
  width: 100px;
  padding: 8px;
  background: var(--theme-bg-surface);
  border: 1px solid #4a2020;
  border-radius: 4px;
  color: #d4af37;
  font-size: 1em;
  font-family: monospace;
}

.btn-admin {
  padding: 8px 16px;
  background: #4c1f33;
  color: gold;
  border: 1px outset gold;
  border-radius: 4px;
  cursor: pointer;
  font-family: "Cinzel", serif;
}

.btn-admin:hover:not(:disabled) {
  background: #6a2d48;
}

.btn-admin:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.selected-summary {
  margin-top: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #2a1a1a 0%, #1f1212 100%);
  border: 1px solid #d4af37;
  border-radius: 8px;
}

.selected-summary p {
  margin: 8px 0;
  color: #e8e0d0;
}

.selected-summary p strong {
  color: #d4af37;
}

#scribe-paypal-button-container {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

.change-amount {
  display: block;
  margin: 12px auto 0;
  padding: 6px 16px;
  background: none;
  border: 1px solid #6b3030;
  border-radius: 4px;
  color: #aaa;
  font-family: "Cinzel", serif;
  font-size: 0.85em;
  cursor: pointer;
}

.change-amount:hover {
  color: #e8e0d0;
  border-color: #8b4040;
}

.hint {
  color: #888;
  font-style: italic;
  text-align: center;
  margin-top: 12px;
}

.cancel-button {
  display: block;
  width: 100%;
  padding: 12px;
  margin-top: 24px;
  background: rgba(100, 50, 50, 0.5);
  border: 1px solid #6b3030;
  border-radius: 4px;
  color: #ccc;
  font-family: "Cinzel", serif;
  font-size: 1em;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-button:hover {
  background: rgba(120, 60, 60, 0.7);
  border-color: #8b4040;
  color: #fff;
}

/* Scrollbar styling */
.purchase-credits::-webkit-scrollbar { width: 8px; }
.purchase-credits::-webkit-scrollbar-track { background: #1a0a0a; }
.purchase-credits::-webkit-scrollbar-thumb { background: #4a2020; border-radius: 4px; }
.purchase-credits::-webkit-scrollbar-thumb:hover { background: #6b3030; }

/* Modal Dialog */
.modal-dialog {
  background: linear-gradient(180deg, #1a0a0a 0%, #2d1010 100%);
  border: 2px solid #4a2020;
  border-radius: 12px;
  padding: 32px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  font-family: "Cinzel", serif;
  animation: modalSlideIn 0.3s ease-out;
}

.modal-dialog::backdrop { background: rgba(0, 0, 0, 0.8); }

@keyframes modalSlideIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

.modal-dialog.success { border-color: #d4af37; }
.modal-dialog.error { border-color: #8b4040; }

.modal-icon { margin-bottom: 16px; }
.modal-icon .material-symbols-outlined { font-size: 56px; }
.modal-dialog.success .modal-icon .material-symbols-outlined { color: #d4af37; }
.modal-dialog.error .modal-icon .material-symbols-outlined { color: #c44; }

.modal-dialog h4 {
  margin: 0 0 16px 0;
  font-family: "Cinzel Decorative", serif;
  font-size: 1.4em;
  border-bottom: none;
  padding-bottom: 0;
}

.modal-dialog.success h4 { color: #d4af37; }
.modal-dialog.error h4 { color: #c44; }

.modal-dialog p {
  color: #e8e0d0;
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.modal-button {
  display: inline-block;
  padding: 12px 32px;
  margin-top: 20px;
  border-radius: 4px;
  font-family: "Cinzel", serif;
  font-size: 1em;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-dialog.success .modal-button {
  background: linear-gradient(135deg, #d4af37 0%, #a08028 100%);
  border: none;
  color: #1a0a0a;
}

.modal-dialog.success .modal-button:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 12px rgba(212, 175, 55, 0.4);
}

.modal-dialog.error .modal-button {
  background: rgba(100, 50, 50, 0.5);
  border: 1px solid #6b3030;
  color: #ccc;
}

.modal-dialog.error .modal-button:hover {
  background: rgba(120, 60, 60, 0.7);
  color: #fff;
}
</style>
