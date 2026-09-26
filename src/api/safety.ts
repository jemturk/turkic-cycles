import { supabase } from "@/api/client";
import type { TablesInsert } from "@/types/database";

export async function createReport(
  reporterId: string,
  reportedUserId: string,
  reason: string,
  details?: string
) {
  const { error } = await supabase
    .from("reports")
    .insert({ reporter_id: reporterId, reported_user_id: reportedUserId, reason, details });
  if (error) throw error;
}

export async function listMySafetyPlans(userId: string) {
  const { data, error } = await supabase
    .from("safety_plans")
    .select("*")
    .eq("user_id", userId)
    .order("meeting_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export type TrustedContact = { name: string; phone: string };

export async function createSafetyPlan(
  userId: string,
  values: {
    meetingWith: string;
    location: string;
    meetingAt: string;
    trustedContacts: TrustedContact[];
    autoCheckinMinutes: number;
  }
) {
  const payload: TablesInsert<"safety_plans"> = {
    user_id: userId,
    meeting_with: values.meetingWith,
    location: values.location,
    meeting_at: values.meetingAt,
    trusted_contacts: values.trustedContacts,
    auto_checkin_minutes: values.autoCheckinMinutes,
  };
  const { error } = await supabase.from("safety_plans").insert(payload);
  if (error) throw error;
}

export async function checkInSafetyPlan(planId: string) {
  const { error } = await supabase
    .from("safety_plans")
    .update({ checked_in_at: new Date().toISOString(), status: "checked_in" })
    .eq("id", planId);
  if (error) throw error;
}

export async function cancelSafetyPlan(planId: string) {
  const { error } = await supabase.from("safety_plans").update({ status: "cancelled" }).eq("id", planId);
  if (error) throw error;
}
