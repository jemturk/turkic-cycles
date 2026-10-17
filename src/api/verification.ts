import { supabase } from "@/api/client";

export async function getMyVerificationStatus(userId: string) {
  const { data, error } = await supabase
    .from("verification_status")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Deliberately selects only `status` -- circle-mates can read this row (so
// VerifiedBadge works on other profiles) but stripe_identity_session_id shouldn't be
// broadcast beyond what's needed for the badge, even though RLS permits the whole row.
export async function getOtherUserVerificationStatus(targetUserId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("verification_status")
    .select("status")
    .eq("user_id", targetUserId)
    .maybeSingle();
  if (error) throw error;
  return data?.status ?? null;
}

// Starts a Stripe Identity check (ID document + live selfie) and returns the one-time
// URL of Stripe's verification page. The server function records the attempt as
// 'pending'; Stripe's result arrives through stripe-identity-webhook. The app never
// writes the status itself (migration 0043).
export async function startVerification(platform: "web" | "app"): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ url: string }>("create-verification-session", {
    method: "POST",
    body: { platform },
  });
  if (error) throw error;
  if (!data?.url) throw new Error("Couldn't start verification.");
  return data.url;
}
