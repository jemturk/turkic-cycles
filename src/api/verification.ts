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

// Submitting the stub flow only ever moves status to 'pending' -- RLS itself also
// enforces this (the client can never write 'verified'/'failed'), this is just the
// one write path the UI uses.
export async function submitVerificationStub(userId: string) {
  const { error } = await supabase
    .from("verification_status")
    .upsert({ user_id: userId, status: "pending" }, { onConflict: "user_id" });
  if (error) throw error;
}
