import { supabase } from "@/api/client";
import type { TablesUpdate } from "@/types/database";

export async function getMatchingPreferences(userId: string) {
  const { data, error } = await supabase
    .from("matching_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertMatchingPreferences(
  userId: string,
  values: { ageMin?: number; ageMax?: number; maxDistanceMiles?: number; languages: string[] }
) {
  const { error } = await supabase.from("matching_preferences").upsert(
    {
      user_id: userId,
      age_min: values.ageMin ?? null,
      age_max: values.ageMax ?? null,
      max_distance_miles: values.maxDistanceMiles ?? null,
      languages: values.languages,
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

async function updateProfile(userId: string, partial: TablesUpdate<"profiles">) {
  const { error } = await supabase.from("profiles").update(partial).eq("id", userId);
  if (error) throw error;
}

export function updateNotificationPreferences(
  userId: string,
  values: { pushEnabled?: boolean; emailEnabled?: boolean }
) {
  return updateProfile(userId, {
    push_notifications_enabled: values.pushEnabled,
    email_notifications_enabled: values.emailEnabled,
  });
}

export function updateAppLocale(userId: string, locale: "en" | "tr") {
  return updateProfile(userId, { app_locale: locale });
}

export function updateThemePreference(userId: string, theme: "light" | "dark") {
  return updateProfile(userId, { theme_preference: theme });
}

export function updateProfileVisibility(userId: string, visibility: "visible" | "hidden") {
  return updateProfile(userId, { profile_visibility: visibility });
}

export async function listBlockedUsers(userId: string) {
  const { data: blocks, error } = await supabase
    .from("blocked_users")
    .select("blocked_id, created_at")
    .eq("blocker_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!blocks || blocks.length === 0) return [];

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in(
      "id",
      blocks.map((b) => b.blocked_id)
    );
  if (profileError) throw profileError;

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
  return blocks.map((b) => ({ userId: b.blocked_id, displayName: nameById.get(b.blocked_id) || "Member" }));
}

export async function blockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase.from("blocked_users").insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) throw error;
}

export async function unblockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase
    .from("blocked_users")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  if (error) throw error;
}

// Stub: marks the account for deletion rather than deleting it. Real, irreversible
// deletion needs a service_role Edge Function -- a separate, deliberate piece of work.
export function requestAccountDeletion(userId: string) {
  return updateProfile(userId, { deletion_requested_at: new Date().toISOString() });
}
