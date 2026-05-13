<template>
  <div class="billing-location-picker">
    <div class="bl-field">
      <label :for="countryId" class="bl-label">{{ countryLabel }}</label>
      <select
        :id="countryId"
        class="bl-select"
        :value="country"
        :disabled="disabled"
        :required="required"
        @change="onCountryChange($event.target.value)"
      >
        <option value="" disabled>Select country</option>
        <option v-for="c in COUNTRIES" :key="c.code" :value="c.code">{{ c.name }}</option>
      </select>
    </div>

    <div v-if="showSubdivision" class="bl-field">
      <label :for="stateId" class="bl-label">{{ subdivisionLabel }}</label>
      <select
        :id="stateId"
        class="bl-select"
        :value="state"
        :disabled="disabled"
        :required="required"
        @change="onStateChange($event.target.value)"
      >
        <option value="" disabled>{{ country === 'CA' ? 'Select province' : 'Select state' }}</option>
        <option v-for="s in subdivisionOptions" :key="s.code" :value="s.code">{{ s.name }}</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { COUNTRIES, US_STATES, CA_PROVINCES, hasSubdivisions } from '@shared/constants/jurisdictions';

const props = defineProps({
  country: { type: String, default: '' },
  state: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  countryLabel: { type: String, default: 'Country' },
  idPrefix: { type: String, default: 'billing-location' }
});

const emit = defineEmits(['update:country', 'update:state']);

const countryId = computed(() => `${props.idPrefix}-country`);
const stateId = computed(() => `${props.idPrefix}-state`);
const showSubdivision = computed(() => hasSubdivisions(props.country));
const subdivisionLabel = computed(() => (props.country === 'CA' ? 'Province' : 'State'));
const subdivisionOptions = computed(() => (props.country === 'CA' ? CA_PROVINCES : US_STATES));

const onCountryChange = (value) => {
  emit('update:country', value);
  // Reset subdivision whenever country changes so we never carry a stale state code.
  if (props.state) emit('update:state', '');
};
const onStateChange = (value) => emit('update:state', value);
</script>

<style scoped>
.billing-location-picker {
  display: grid;
  gap: 0.75rem;
}

.bl-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.bl-label {
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--theme-text-secondary, rgba(255, 255, 255, 0.7));
  font-weight: 600;
}

.bl-select {
  appearance: none;
  -webkit-appearance: none;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 0.5rem;
  color: var(--theme-text-primary, #f5f5f5);
  font-family: inherit;
  font-size: 0.95rem;
  padding: 0.6rem 2.25rem 0.6rem 0.85rem;
  cursor: pointer;
  background-image:
    linear-gradient(45deg, transparent 50%, currentColor 50%),
    linear-gradient(135deg, currentColor 50%, transparent 50%);
  background-position:
    calc(100% - 18px) 50%,
    calc(100% - 12px) 50%;
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
  transition: border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
}

.bl-select:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.28);
  background-color: rgba(255, 255, 255, 0.06);
}

.bl-select:focus-visible {
  outline: none;
  border-color: var(--theme-accent, #d4af37);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme-accent, #d4af37) 35%, transparent);
}

.bl-select:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.bl-select option {
  background: #1a1a1a;
  color: #f5f5f5;
}

@media (min-width: 520px) {
  .billing-location-picker {
    grid-template-columns: 1fr 1fr;
    gap: 0.85rem;
  }
}
</style>
