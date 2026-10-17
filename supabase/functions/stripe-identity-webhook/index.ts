// Stripe Identity -> public.verification_status. Stripe calls this when a member's
// verification session changes; it's the only thing that can mark someone verified
// (or failed) -- the app itself can't write that table (migration 0043).
//
//   verified        -> verified    every check passed
//   requires_input  -> failed      a check failed (e.g. selfie didn't match the ID);
//                                  the member can try again
//   processing      -> pending     submitted, Stripe is still checking
//   canceled        -> unverified  the session was abandoned
//
// Only the member's latest session counts, so a stale one can't overwrite a newer
// attempt. Results are recorded as a status only; the ID images and selfie stay
// with Stripe.
//
// Called by Stripe, not a signed-in user, so JWT verification is OFF; instead each
// request's Stripe-Signature header is checked against the endpoint's signing secret:
//
//   supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_IDENTITY_WEBHOOK_SECRET=whsec_...
//   supabase functions deploy stripe-identity-webhook --no-verify-jwt
//
// Webhook URL: https://<project-ref>.supabase.co/functions/v1/stripe-identity-webhook
// Events: identity.verification_session.verified, .requires_input, .processing, .canceled
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const STATUS_FOR_EVENT: Record<string, string> = {
  "identity.verification_session.verified": "verified",
  "identity.verification_session.requires_input": "failed",
  "identity.verification_session.processing": "pending",
  "identity.verification_session.canceled": "unverified",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const signingSecret = Deno.env.get("STRIPE_IDENTITY_WEBHOOK_SECRET");
  const signature = req.headers.get("Stripe-Signature");
  if (!secretKey || !signingSecret || !signature) return json({ error: "unauthorized" }, 401);

  const stripe = new Stripe(secretKey, { httpClient: Stripe.createFetchHttpClient() });
  let event: Stripe.Event;
  try {
    // The raw body, exactly as sent: the signature is over these bytes.
    event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      signature,
      signingSecret,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );
  } catch {
    return json({ error: "invalid signature" }, 400);
  }

  const status = STATUS_FOR_EVENT[event.type];
  if (!status) return json({ ignored: event.type }, 200);

  const session = event.data.object as Stripe.Identity.VerificationSession;
  const userId = session.metadata?.user_id;
  if (!userId) return json({ ignored: "no user" }, 200);

  if (status === "failed") console.log("verification failed", session.id, session.last_error?.code);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await admin
    .from("verification_status")
    .update({ status })
    .eq("user_id", userId)
    .eq("stripe_identity_session_id", session.id);
  if (error) {
    console.error("stripe-identity-webhook update failed", error);
    return json({ error: "update failed" }, 500);
  }
  return json({ ok: true }, 200);
});
