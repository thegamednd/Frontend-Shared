// Lorekeeper LLM tiers — must stay in sync with API-AI model-pricing.ts.
export const MODEL_TIERS = [
  { value: 'standard', label: 'Standard', mult: '1×' },
  { value: 'enhanced', label: 'Enhanced', mult: '2×' },
];

export const DEFAULT_TIER = 'standard';

// 'premium' is the retired slug for the old Best tier; saved account prefs map to
// Enhanced, which uses the same model.
export function normalizeTier(value) {
  return value === 'premium' ? 'enhanced' : value || DEFAULT_TIER;
}

export function isValidTier(value) {
  return MODEL_TIERS.some((t) => t.value === value);
}

export function tierMultiplierLabel(value) {
  return MODEL_TIERS.find((t) => t.value === normalizeTier(value))?.mult || '1×';
}
