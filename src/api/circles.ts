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

// Upcoming-event count per circle, for the circles list -- one query for all
// circles rather than one per card.
export async function listUpcomingEventCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("circle_events")
    .select("circle_id")
    .gte("starts_at", new Date().toISOString());
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[row.circle_id] = (counts[row.circle_id] ?? 0) + 1;
  return counts;
}

// Upcoming events soonest first; past events most recent first.
export async function listCircleEvents(circleId: string) {
  const { data, error } = await supabase
    .from("circle_events")
    .select("*")
    .eq("circle_id", circleId)
    .order("starts_at");
  if (error) throw error;
  const now = Date.now();
  const events = data ?? [];
  return {
    upcoming: events.filter((e) => new Date(e.starts_at).getTime() >= now),
    past: events.filter((e) => new Date(e.starts_at).getTime() < now).reverse(),
  };
}

export async function getCircleEvent(eventId: string) {
  const { data, error } = await supabase.from("circle_events").select("*").eq("id", eventId).single();
  if (error) throw error;
  return data;
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

// Whether the user is an app admin (migration 0031's app_admins). Each user can only
// read their own row, so this answers for the signed-in user only.
export async function getIsAppAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from("app_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return !!data;
}

// The user's role in a circle -- "member", "moderator" or "owner" -- or null if they
// haven't joined it.
export async function getMyCircleRole(circleId: string, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("circle_members")
    .select("role")
    .eq("circle_id", circleId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.role ?? null;
}

export type NewCircle = {
  name: string;
  description: string;
  topic: string;
  city: string;
  state: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
};

// Plus with a verified ID, admins included -- create_circle checks (0035), and
// makes the creator owner.
export async function createCircle(circle: NewCircle): Promise<string> {
  const { data, error } = await supabase.rpc("create_circle", {
    p_name: circle.name,
    p_description: circle.description,
    p_topic: circle.topic,
    p_city: circle.city,
    p_state: circle.state,
    p_country: circle.country,
    p_latitude: circle.latitude,
    p_longitude: circle.longitude,
  });
  if (error) throw error;
  return data;
}

export type NewCircleEvent = {
  circleId: string;
  title: string;
  description: string;
  location: string;
  startsAt: string; // ISO timestamp
};

// Allowed for the circle's owners and moderators with Plus and a verified ID
// (RLS, 0035).
export async function createCircleEvent(event: NewCircleEvent): Promise<string> {
  const { data, error } = await supabase
    .from("circle_events")
    .insert({
      circle_id: event.circleId,
      title: event.title.trim(),
      description: event.description.trim() || null,
      location: event.location.trim(),
      starts_at: event.startsAt,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
