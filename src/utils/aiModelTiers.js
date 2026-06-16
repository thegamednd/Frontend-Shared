// Lorekeeper LLM tiers — must stay in sync with API-AI model-pricing.ts.
export const MODEL_TIERS = [
  { value: 'standard', label: 'Standard', mult: '1×' },
  { value: 'enhanced', label: 'Enhanced', mult: '3×' },
  { value: 'premium', label: 'Best', mult: '5×' },
];

export const DEFAULT_TIER = 'standard';

export function isValidTier(value) {
  return MODEL_TIERS.some((t) => t.value === value);
}

export function tierMultiplierLabel(value) {
  return MODEL_TIERS.find((t) => t.value === value)?.mult || '1×';
}
