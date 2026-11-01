import { supabase } from "@/api/client";

// The oldest build this platform may still run (migration 0068); 0 = none blocked.
export async function getMinBuild(platform: "ios" | "android"): Promise<number> {
  const { data, error } = await supabase.from("app_min_builds").select("min_build").eq("platform", platform).maybeSingle();
  if (error) throw error;
  return Number(data?.min_build ?? 0);
}
