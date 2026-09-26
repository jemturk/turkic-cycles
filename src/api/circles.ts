import { supabase } from "@/api/client";

export async function listCircles() {
  const { data, error } = await supabase.from("circles").select("*").order("created_at");
  if (error) throw error;
  return data;
}

export async function getCircle(circleId: string) {
  const { data, error } = await supabase.from("circles").select("*").eq("id", circleId).single();
  if (error) throw error;
  return data;
}

export async function listMyCircleMemberships(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from("circle_members").select("circle_id").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.circle_id);
}

export async function joinCircle(userId: string, circleId: string) {
  const { error } = await supabase.from("circle_members").insert({ user_id: userId, circle_id: circleId });
  if (error) throw error;
}

export async function leaveCircle(userId: string, circleId: string) {
  const { error } = await supabase
    .from("circle_members")
    .delete()
    .eq("user_id", userId)
    .eq("circle_id", circleId);
  if (error) throw error;
}

// Two queries rather than a PostgREST embed: circle_members.user_id and profiles.id
// both reference auth.users(id) independently, with no direct FK between the two
// tables, so there's no relationship for PostgREST to auto-detect for embedding.
export async function listCircleMembers(circleId: string, limit?: number) {
  let query = supabase
    .from("circle_members")
    .select("user_id, joined_at")
    .eq("circle_id", circleId)
    .order("joined_at");
  if (limit) query = query.limit(limit);

  const { data: memberRows, error: memberError } = await query;
  if (memberError) throw memberError;
  if (!memberRows || memberRows.length === 0) return [];

  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in(
      "id",
      memberRows.map((row) => row.user_id)
    );
  if (profileError) throw profileError;

  const profileById = new Map((profileRows ?? []).map((p) => [p.id, p]));
  return memberRows.map((row) => ({
    userId: row.user_id,
    joinedAt: row.joined_at,
    displayName: profileById.get(row.user_id)?.display_name ?? "",
    avatarUrl: profileById.get(row.user_id)?.avatar_url ?? null,
  }));
}

// Next upcoming event, or the most recent past one if none upcoming — so the detail
// screen never looks broken once a seeded event's date has passed.
export async function getNextCircleEvent(circleId: string) {
  const { data: upcoming, error: upcomingError } = await supabase
    .from("circle_events")
    .select("*")
    .eq("circle_id", circleId)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(1)
    .maybeSingle();
  if (upcomingError) throw upcomingError;
  if (upcoming) return upcoming;

  const { data: past, error: pastError } = await supabase
    .from("circle_events")
    .select("*")
    .eq("circle_id", circleId)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (pastError) throw pastError;
  return past;
}

export async function getMyRsvp(eventId: string, userId: string) {
  const { data, error } = await supabase
    .from("event_rsvps")
    .select("*")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertRsvp(eventId: string, userId: string, status: "going" | "interested" | "not_going") {
  const { error } = await supabase
    .from("event_rsvps")
    .upsert({ event_id: eventId, user_id: userId, status }, { onConflict: "event_id,user_id" });
  if (error) throw error;
}
