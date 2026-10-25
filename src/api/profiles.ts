import { supabase } from "@/api/client";
import type { TablesUpdate } from "@/types/database";

export async function updateProfileFields(userId: string, partial: TablesUpdate<"profiles">) {
  const { error } = await supabase.from("profiles").update(partial).eq("id", userId);
  if (error) throw error;
}

// profiles.city / state hold only what others may see (location_visibility, 0053).
// The real ones live in profile_locations, which only the member can read: realCity /
// realState are those for your own profile (Edit profile's form), and fall back to the
// public values for anyone else's, where profile_locations returns nothing.
export async function getMyProfile(userId: string) {
  const [{ data, error }, location] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("profile_locations").select("city, state").eq("user_id", userId).maybeSingle(),
  ]);

  if (error) throw error;
  const real = location.error ? null : location.data;
  return { ...data, realCity: real ? real.city : data.city, realState: real ? real.state : data.state };
}

export async function completeOnboarding(userId: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw error;
}
