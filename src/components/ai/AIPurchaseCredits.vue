<template>
  <div class="purchase-credits">
    <h3>Purchase Questions</h3>
    <div class="credit-options">
      <label v-for="option in questionOptions" :key="option.value">
        <input type="radio" :value="option.value" v-model="selectedQuestions" name="questionAmount" />
        {{ option.label }} ({{ option.value }} questions)
      </label>
    </div>
    <div v-if="selectedQuestions > 0" class="selected-summary">
      <p>You have selected to purchase: <strong>{{ selectedQuestions }} questions</strong></p>
      <p>Price: <strong>${{ price }} USD</strong></p>
      <div id="paypal-button-container"></div>
    </div>
    <div v-else>
      <p>Please select a question pack to purchase.</p>
    </div>
    <button @click="$emit('close')" class="cancel-button">Cancel</button>

    <!-- Result Modal -->
    <dialog ref="modalDialog" :class="['modal-dialog', modal.type]" @close="onDialogClose">
      <div class="modal-icon">
        <span class="material-symbols-outlined">{{ modal.type === 'success' ? 'check_circle' : 'error' }}</span>
      </div>
      <h4>{{ modal.type === 'success' ? 'Purchase Complete!' : 'Purchase Failed' }}</h4>
      <p>{{ modal.message }}</p>
      <p v-if="modal.orderId" class="order-id">Order ID: {{ modal.orderId }}</p>
      <button @click="closeModal" class="modal-button">
        {{ modal.type === 'success' ? 'Continue' : 'Try Again' }}
      </button>
    </dialog>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue';
import { useAIStore } from '@shared/stores/ai';

const aiStore = useAIStore();

const emit = defineEmits(['close']);

const questionOptions = ref([
  { label: 'Small Keg', value: 60 },
  { label: 'Standard Keg', value: 150 },
  { label: 'Large Keg', value: 300 },
]);

const selectedQuestions = ref(0);
const price = ref('0.00');
const modalDialog = ref(null);

const modal = ref({
  type: 'success',
  message: '',
  orderId: null,
});

function showResultModal(type, message, orderId = null) {
  modal.value = { type, message, orderId };
  nextTick(() => {
    modalDialog.value?.showModal();
  });
}

function closeModal() {
  modalDialog.value?.close();
}

function onDialogClose() {
  if (modal.value.type === 'success') {
    emit('close');
  }
}

function calculatePrice(questions) {
  // Must match API-AI payment.service.ts, which verifies the PayPal charge.
  if (questions === 60) return '8.00';
  if (questions === 150) return '19.00';
  if (questions === 300) return '37.00';
  return '0.00';
}

watch(selectedQuestions, (newVal) => {
  if (newVal > 0) {
    price.value = calculatePrice(newVal);
    renderPayPalButton();
  } else {
    price.value = '0.00';
    const container = document.getElementById('paypal-button-container');
    if (container) container.innerHTML = '';
  }
});

function renderPayPalButton() {
  if (typeof window.paypal === 'undefined' || !document.getElementById('paypal-button-container')) {
    nextTick(renderPayPalButton);
    return;
  }

  const container = document.getElementById('paypal-button-container');
  container.innerHTML = '';

  window.paypal.Buttons({
    createOrder: function (data, actions) {
      return actions.order.create({
        purchase_units: [
          {
            description: `Purchase of ${selectedQuestions.value} questions for RealmForge AI`,
            amount: {
              currency_code: 'USD',
              value: price.value,
            },
          },
        ],
      });
    },
    onApprove: async function (data, actions) {
      return actions.order.capture().then(async function () {
        const questionsPurchased = selectedQuestions.value;

        try {
          const result = await aiStore.verifyPayment(data.orderID, questionsPurchased);

          if (result.success) {
            showResultModal(
              'success',
              `${result.creditsAdded} questions have been added to your account. You now have ${result.newTotal} questions available.`
            );
          } else {
            showResultModal(
              'error',
              result.error || 'Payment verification failed. Please try again.',
              data.orderID
            );
          }
        } catch (error) {
          console.error('Error verifying payment:', error);
          showResultModal(
            'error',
            'Payment verification failed. Please contact support if this persists.',
            data.orderID
          );
        }
        selectedQuestions.value = 0;
      });
    },
    onError: function (err) {
      console.error('PayPal Button onError:', err);
      showResultModal(
        'error',
        'An error occurred with your PayPal transaction. Please try again or contact support.'
      );
    },
    onCancel: function () {
      showResultModal('error', 'Purchase was cancelled. You can try again when ready.');
    },
  }).render('#paypal-button-container');
}

onMounted(() => {
  // Load PayPal SDK for one-time purchases if not already loaded
  if (!window.paypal) {
    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
    if (clientId) {
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
      script.onload = () => {
        if (selectedQuestions.value > 0) {
          renderPayPalButton();
        }
      };
      document.head.appendChild(script);
    }
  }
});
</script>

<style scoped>
.purchase-credits {
  padding: 24px;
  border: 1px solid var(--theme-accent);
  border-radius: 8px;
  background: linear-gradient(180deg, var(--theme-bg-primary) 0%, #1a2240 100%);
  max-width: 420px;
  margin: 20px auto;
  color: var(--theme-text-primary);
  max-height: 80vh;
  overflow-y: auto;
}

.purchase-credits h3 {
  text-align: center;
  color: var(--theme-accent);
  margin-bottom: 24px;
  font-family: 'Pirata One', cursive;
  font-size: 1.4em;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.credit-options label {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  padding: 14px 16px;
  border: 1px solid #334;
  border-left: 3px solid #445;
  border-radius: 4px;
  cursor: pointer;
  background: color-mix(in srgb, var(--theme-bg-surface) 70%, transparent);
  color: var(--theme-text-primary);
  transition: all 0.2s;
}

.credit-options label:hover {
  background: color-mix(in srgb, var(--theme-bg-surface) 90%, transparent);
  border-color: #556;
  border-left-color: var(--theme-accent);
}

.credit-options input[type='radio'] {
  margin-right: 12px;
  accent-color: var(--theme-accent);
  width: 18px;
  height: 18px;
}

.credit-options label:has(input:checked) {
  border-left-color: var(--theme-accent);
  color: var(--theme-accent);
}

.selected-summary {
  margin-top: 24px;
  padding: 20px;
  background: color-mix(in srgb, var(--theme-bg-surface) 70%, transparent);
  border: 1px solid var(--theme-accent);
  border-radius: 8px;
  color: var(--theme-text-primary);
}

.selected-summary p {
  margin: 8px 0;
  color: var(--theme-text-primary);
  font-size: 1.05em;
}

.selected-summary p strong {
  color: var(--theme-accent);
}

#paypal-button-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.cancel-button {
  display: block;
  width: 100%;
  padding: 12px;
  margin-top: 24px;
  background: color-mix(in srgb, var(--theme-bg-surface) 70%, transparent);
  border: 1px solid #445;
  border-radius: 4px;
  color: #ccc;
  font-size: 1em;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-button:hover {
  background: color-mix(in srgb, var(--theme-bg-surface) 90%, transparent);
  border-color: #667;
  color: #fff;
}

.purchase-credits > div:last-of-type p {
  text-align: center;
  color: #888;
  font-style: italic;
}

/* Scrollbar */
.purchase-credits::-webkit-scrollbar {
  width: 8px;
}

.purchase-credits::-webkit-scrollbar-track {
  background: #111828;
}

.purchase-credits::-webkit-scrollbar-thumb {
  background: #334;
  border-radius: 4px;
}

.purchase-credits::-webkit-scrollbar-thumb:hover {
  background: #556;
}

/* Modal Dialog */
.modal-dialog {
  background: linear-gradient(180deg, var(--theme-bg-primary) 0%, #1a2240 100%);
  border: 2px solid #334;
  border-radius: 12px;
  padding: 32px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  animation: modalSlideIn 0.3s ease-out;
}

.modal-dialog::backdrop {
  background: var(--theme-bg-overlay);
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-dialog.success {
  border-color: var(--theme-accent);
}

.modal-dialog.error {
  border-color: #c44;
}

.modal-icon {
  margin-bottom: 16px;
}

.modal-icon .material-symbols-outlined {
  font-size: 56px;
}

.modal-dialog.success .modal-icon .material-symbols-outlined {
  color: var(--theme-accent);
}

.modal-dialog.error .modal-icon .material-symbols-outlined {
  color: #c44;
}

.modal-dialog h4 {
  margin: 0 0 16px 0;
  font-family: 'Pirata One', cursive;
  font-size: 1.4em;
}

.modal-dialog.success h4 {
  color: var(--theme-accent);
}

.modal-dialog.error h4 {
  color: #c44;
}

.modal-dialog p {
  color: var(--theme-text-primary);
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.modal-dialog .order-id {
  font-size: 0.85em;
  color: #888;
  font-family: monospace;
  background: rgba(0, 0, 0, 0.3);
  padding: 8px 12px;
  border-radius: 4px;
  margin-top: 16px;
}

.modal-button {
  display: inline-block;
  padding: 12px 32px;
  margin-top: 20px;
  border-radius: 4px;
  font-size: 1em;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-dialog.success .modal-button {
  background: linear-gradient(135deg, var(--theme-accent) 0%, #cc9a50 100%);
  border: none;
  color: var(--theme-bg-primary);
}

.modal-dialog.success .modal-button:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 12px color-mix(in srgb, var(--theme-accent) 40%, transparent);
}

.modal-dialog.error .modal-button {
  background: color-mix(in srgb, var(--theme-bg-surface) 70%, transparent);
  border: 1px solid #445;
  color: #ccc;
}

.modal-dialog.error .modal-button:hover {
  background: color-mix(in srgb, var(--theme-bg-surface) 90%, transparent);
  border-color: #667;
  color: #fff;
}
</style>
