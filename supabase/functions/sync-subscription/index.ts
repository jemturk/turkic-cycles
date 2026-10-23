// Re-syncs the calling user's public.subscriptions row from RevenueCat. The app calls
// this right after a purchase or restore, so Plus unlocks immediately instead of
// whenever the webhook (revenuecat-webhook) arrives. The caller is identified from
// their own JWT; there is no user id parameter, so it only ever touches your own row,
// and it can only write what RevenueCat says you've paid for.
//
//   supabase functions deploy sync-subscription
// (JWT verification stays ON -- the default.)
import { createClient } from "npm:@supabase/supabase-js@2";

import { syncSubscription } from "../_shared/revenuecat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "not signed in" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = authorization.replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "not signed in" }, 401);

  try {
    const subscription = await syncSubscription(admin, userData.user.id);
    return json(subscription, 200);
  } catch (error) {
    console.error("sync-subscription failed", userData.user.id, error);
    return json({ error: "could not sync subscription" }, 500);
  }
});
