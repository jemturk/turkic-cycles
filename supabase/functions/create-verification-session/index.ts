// Starts identity verification for the signed-in member with Stripe Identity: a photo
// of a government ID plus a live selfie matched against it. Returns the one-time URL
// of Stripe's hosted verification page; the app opens it, and Stripe reports the
// result to stripe-identity-webhook, which is what sets verified / failed.
//
// The ID images and selfie go to Stripe, never to us -- we only keep the session id
// and the status (public.verification_status).
//
//   supabase secrets set STRIPE_SECRET_KEY=sk_...
//   supabase functions deploy create-verification-session
// (JWT verification stays ON: only a signed-in member can start their own check.)
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

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

// Where Stripe sends the member when they finish: back into the website's
// Verification screen, or (from the phone app's in-app browser) a page that says
// they can close it and return to the app.
const SITE = Deno.env.get("SITE_URL") ?? "https://joinhalka.com";
const RETURN_URLS: Record<string, string> = {
  web: `${SITE}/settings/verification`,
  app: `${SITE}/verification-done`,
};

Deno.serve(async (req) => {
  // The web build calls this cross-origin, so the browser sends a preflight first.
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "not signed in" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: userData, error: userError } = await admin.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));
  if (userError || !userData.user) return json({ error: "not signed in" }, 401);
  const user = userData.user;

  const { data: current } = await admin.from("verification_status").select("status").eq("user_id", user.id).maybeSingle();
  if (current?.status === "verified") return json({ error: "already verified" }, 409);

  const body = await req.json().catch(() => ({}));
  const returnUrl = RETURN_URLS[body?.platform === "web" ? "web" : "app"];

  const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secretKey) return json({ error: "verification isn't set up yet" }, 503);
  const stripe = new Stripe(secretKey, { httpClient: Stripe.createFetchHttpClient() });

  try {
    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      options: {
        document: {
          require_live_capture: true,
          require_matching_selfie: true,
        },
      },
      provided_details: user.email ? { email: user.email } : undefined,
      metadata: { user_id: user.id },
      return_url: returnUrl,
    });

    await admin
      .from("verification_status")
      .upsert({ user_id: user.id, status: "pending", stripe_identity_session_id: session.id });

    // Only the URL goes back: it's single-use and expires in 48 hours.
    return json({ url: session.url }, 200);
  } catch (error) {
    console.error("create-verification-session failed", error);
    return json({ error: "couldn't start verification" }, 500);
  }
});
