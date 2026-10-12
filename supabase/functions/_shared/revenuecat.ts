// Shared by revenuecat-webhook and sync-subscription: asks RevenueCat what a user is
// entitled to right now and writes that into public.subscriptions.
//
// Both callers re-fetch from RevenueCat instead of trusting what triggered them (a
// webhook body or the app saying "I just bought it"), so out-of-order, duplicate or
// forged events can't put a row into the wrong state -- the worst a bad trigger can
// do is cause a correct re-sync.
//
// The app logs into RevenueCat with the Supabase user id (src/lib/purchases.native.ts),
// so a RevenueCat app_user_id that is a uuid is one of our users.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

// Entitlement identifiers configured in the RevenueCat dashboard, highest tier first.
const TIER_BY_ENTITLEMENT: [entitlement: string, tier: "premium" | "plus"][] = [
  ["premium", "premium"],
  ["plus", "plus"],
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUserId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

type RcEntitlement = {
  expires_date: string | null;
  grace_period_expires_date?: string | null;
  product_identifier: string;
};

type RcSubscription = {
  billing_issues_detected_at?: string | null;
};

type RcSubscriber = {
  entitlements: Record<string, RcEntitlement>;
  subscriptions: Record<string, RcSubscription>;
};

async function fetchSubscriber(appUserId: string): Promise<RcSubscriber> {
  const secret = Deno.env.get("REVENUECAT_SECRET_API_KEY");
  if (!secret) throw new Error("REVENUECAT_SECRET_API_KEY is not set");

  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`RevenueCat subscriber lookup failed: ${res.status} ${await res.text()}`);
  const body = await res.json();
  return body.subscriber as RcSubscriber;
}

// When access actually ends: the later of the paid period and any billing grace period.
// null = never expires (a lifetime product).
function accessEndsAt(entitlement: RcEntitlement): Date | null {
  if (entitlement.expires_date === null) return null;
  const times = [entitlement.expires_date, entitlement.grace_period_expires_date]
    .filter((d): d is string => !!d)
    .map((d) => new Date(d).getTime());
  return new Date(Math.max(...times));
}

export async function syncSubscription(admin: SupabaseClient, userId: string) {
  const subscriber = await fetchSubscriber(userId);
  const now = Date.now();

  let row: { tier: string; status: string; current_period_end: string | null; product_id: string | null } = {
    tier: "free",
    status: "active",
    current_period_end: null,
    product_id: null,
  };

  for (const [entitlementId, tier] of TIER_BY_ENTITLEMENT) {
    const entitlement = subscriber.entitlements?.[entitlementId];
    if (!entitlement) continue;
    const endsAt = accessEndsAt(entitlement);
    if (endsAt !== null && endsAt.getTime() <= now) continue;

    const billingIssue = !!subscriber.subscriptions?.[entitlement.product_identifier]?.billing_issues_detected_at;
    row = {
      tier,
      status: billingIssue ? "past_due" : "active",
      current_period_end: endsAt ? endsAt.toISOString() : null,
      product_id: entitlement.product_identifier,
    };
    break;
  }

  // update, not upsert: every user already has a row (0001's handle_new_user), and a
  // RevenueCat id for an account that's since been deleted shouldn't recreate one.
  const { error } = await admin.from("subscriptions").update(row).eq("user_id", userId);
  if (error) throw error;
  return row;
}
