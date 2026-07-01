/**
 * Determine whether a realm's SubscriptionPlan represents a paid tier.
 *
 * Subscriptions are realm-scoped. Free = no plan or the string 'free'.
 * Every other plan value (including $0 Patreon/benefit tiers) is paid.
 * Accepts either a plain string plan or an object carrying Tier/Plan/Status.
 *
 * @param {string|object|null|undefined} plan - The realm's SubscriptionPlan.
 * @returns {boolean} true when the plan is a paid tier.
 */
export function isPaidPlan(plan) {
  if (!plan) return false;
  if (typeof plan === 'string') {
    return plan.toLowerCase() !== 'free';
  }
  const tier = (plan.Tier || plan.Plan || plan.Status || '').toString().toLowerCase();
  return !!tier && tier !== 'free' && tier !== 'inactive' && tier !== 'cancelled';
}
