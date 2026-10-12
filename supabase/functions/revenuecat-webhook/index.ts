// RevenueCat -> public.subscriptions. RevenueCat calls this on every purchase,
// renewal, cancellation, expiration, billing issue and transfer; each one just
// re-syncs the users involved from RevenueCat's API (see _shared/revenuecat.ts), so
// the event type itself doesn't matter.
//
// Called by RevenueCat, not a signed-in user, so JWT verification is OFF. Instead the
// request must carry the Authorization header value set in the RevenueCat dashboard
// (Project settings -> Integrations -> Webhooks), stored here as a secret:
//
//   supabase secrets set REVENUECAT_WEBHOOK_AUTH=<long random string> REVENUECAT_SECRET_API_KEY=<sk_...>
//   supabase functions deploy revenuecat-webhook --no-verify-jwt
//
// Webhook URL: https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook
import { createClient } from "npm:@supabase/supabase-js@2";

import { isUserId, syncSubscription } from "../_shared/revenuecat.ts";

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function timingSafeEqual(a: string, b: string) {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const expected = Deno.env.get("REVENUECAT_WEBHOOK_AUTH");
  const given = req.headers.get("Authorization") ?? "";
  if (!expected || (!timingSafeEqual(given, expected) && !timingSafeEqual(given, `Bearer ${expected}`))) {
    return json({ error: "unauthorized" }, 401);
  }

  const body = await req.json().catch(() => null);
  const event = body?.event;
  if (!event) return json({ error: "no event" }, 400);
  if (event.type === "TEST") return json({ ok: true }, 200);

  // A transfer moves a purchase between two of our users (e.g. restoring on a phone
  // signed into a different account), so both sides need re-syncing.
  const candidates: unknown[] = [
    event.app_user_id,
    event.original_app_user_id,
    ...(event.aliases ?? []),
    ...(event.transferred_from ?? []),
    ...(event.transferred_to ?? []),
  ];
  const userIds = [...new Set(candidates.filter(isUserId).map((id) => id.toLowerCase()))];

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    for (const userId of userIds) await syncSubscription(admin, userId);
    return json({ synced: userIds.length }, 200);
  } catch (error) {
    // Non-2xx makes RevenueCat retry later.
    console.error("revenuecat-webhook sync failed", event.type, userIds, error);
    return json({ error: "sync failed" }, 500);
  }
});
