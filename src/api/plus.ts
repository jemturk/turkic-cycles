import { supabase } from "@/api/client";
import { loadPeople, type SavedPerson } from "@/api/discover";

export type Tier = "free" | "plus" | "premium";

export type MySubscription = {
  tier: Tier;
  status: "active" | "past_due" | "canceled";
  currentPeriodEnd: string | null;
};

// Written only by the server (RevenueCat webhook / sync-subscription); the app reads it.
export async function getMySubscription(userId: string): Promise<MySubscription> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("tier, status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return {
    tier: (data?.tier ?? "free") as Tier,
    status: (data?.status ?? "active") as MySubscription["status"],
    currentPeriodEnd: data?.current_period_end ?? null,
  };
}

// Mirrors public.has_plus() (migration 0033), which is what actually gates the server.
export function hasPlus(subscription: MySubscription | undefined): boolean {
  if (!subscription || subscription.tier === "free" || subscription.status === "canceled") return false;
  return !subscription.currentPeriodEnd || new Date(subscription.currentPeriodEnd).getTime() > Date.now();
}

// TEMPORARY (migration 0036): admin-only test controls for the signed-in user's own
// tier and verification status.
export async function debugSetMyTier(tier: Tier) {
  const { error } = await supabase.rpc("debug_set_my_tier", { p_tier: tier });
  if (error) throw error;
}

export async function debugSetMyVerified(verified: boolean) {
  const { error } = await supabase.rpc("debug_set_my_verified", { p_verified: verified });
  if (error) throw error;
}

// After a purchase or restore: pull the new state from RevenueCat now rather than
// waiting for the webhook.
export async function syncMySubscription() {
  const { error } = await supabase.functions.invoke("sync-subscription", { method: "POST" });
  if (error) throw error;
}

export async function isOnPlusWaitlist(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from("plus_waitlist").select("user_id").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function joinPlusWaitlist(userId: string) {
  // ignoreDuplicates: joining twice (two taps, two devices) is still just "joined".
  const { error } = await supabase
    .from("plus_waitlist")
    .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  if (error) throw error;
}

export async function leavePlusWaitlist(userId: string) {
  const { error } = await supabase.from("plus_waitlist").delete().eq("user_id", userId);
  if (error) throw error;
}

// Free for everyone: how many people liked you and are waiting on an answer.
export async function countIncomingLikes(): Promise<number> {
  const { data, error } = await supabase.rpc("count_incoming_likes");
  if (error) throw error;
  return data ?? 0;
}

// Plus only -- the server refuses otherwise. Newest first; each person's circleId is
// the deck they liked you in, so liking them back from their profile makes the match.
export async function listIncomingLikes(): Promise<SavedPerson[]> {
  const { data, error } = await supabase.rpc("list_incoming_likes");
  if (error) throw error;
  return loadPeople(new Map((data ?? []).map((row) => [row.user_id, row.circle_id])));
}
