import { supabase } from "@/api/client";
import type { TablesUpdate } from "@/types/database";

export async function updateProfileFields(userId: string, partial: TablesUpdate<"profiles">) {
  const { error } = await supabase.from("profiles").update(partial).eq("id", userId);
  if (error) throw error;
}

export async function getMyProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

export async function completeOnboarding(userId: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw error;
}
