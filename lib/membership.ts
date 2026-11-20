export type MembershipPlan = "free" | "light" | "premium";
export type Membership = { plan: MembershipPlan; expiresAt: number | null; source: "membership" | "chat-king" | null };
type Subscription = { plan?: unknown; expiresAt?: unknown };

function expiration(value: unknown): number | null {
  if (value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    const millis = value.toMillis();
    return typeof millis === "number" && Number.isFinite(millis) ? millis : 0;
  }
  return 0;
}

export function resolveMembership(subscription: Subscription | undefined, reward: { trialEndsAt?: unknown } | undefined, now: number): Membership {
  const expiresAt = expiration(subscription?.expiresAt);
  const active = expiresAt === null || expiresAt > now;
  if (subscription?.plan === "premium" && active) return { plan: "premium", expiresAt, source: "membership" };
  const trialEndsAt = typeof reward?.trialEndsAt === "number" && Number.isFinite(reward.trialEndsAt) ? reward.trialEndsAt : 0;
  if (subscription?.plan === "light" && active && (expiresAt === null || expiresAt >= trialEndsAt)) return { plan: "light", expiresAt, source: "membership" };
  if (trialEndsAt > now) return { plan: "light", expiresAt: trialEndsAt, source: "chat-king" };
  if (subscription?.plan === "light" && active) return { plan: "light", expiresAt, source: "membership" };
  return { plan: "free", expiresAt: null, source: null };
}

export function canUseAI(membership: Membership, study = false) {
  return membership.plan === "premium" || (!study && membership.plan === "light");
}
