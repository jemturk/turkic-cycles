import { supabase } from "@/api/client";
import type { ConnectionType } from "@/constants/connectionTypes";
import { getCoverPhotoUrls } from "@/api/chat";

export type DiscoverCandidate = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  birthdate: string | null;
  city: string | null;
  state: string | null;
  occupation: string | null;
  connectionTypes: ConnectionType[];
  originCountries: string[];
  // The cover photo -- the card's background. Required at onboarding (migrations
  // 0026/0027), but null when an older account has none or the slot is empty.
  coverPhotoUrl: string | null;
};

export async function getOriginCountriesWithConsent(userIds: string[]): Promise<Map<string, string[]>> {
  if (userIds.length === 0) return new Map();
  const { data, error } = await supabase.rpc("get_origin_countries_with_consent", { target_ids: userIds });
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.user_id, row.origin_countries ?? []]));
}

// Profiles, connection types and consented origin countries for the given users,
// returned in the same order as userIds.
async function hydrateCandidates(userIds: string[]): Promise<DiscoverCandidate[]> {
  const [
    { data: profileRows, error: profileError },
    { data: typeRows, error: typeError },
    coverById,
    originCountriesById,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, birthdate, city, state, occupation")
      .in("id", userIds),
    supabase.from("user_connection_types").select("user_id, connection_type").in("user_id", userIds),
    getCoverPhotoUrls(userIds),
    getOriginCountriesWithConsent(userIds),
  ]);
  if (profileError) throw profileError;
  if (typeError) throw typeError;

  const connectionTypesById = new Map<string, ConnectionType[]>();
  for (const row of typeRows ?? []) {
    const existing = connectionTypesById.get(row.user_id) ?? [];
    existing.push(row.connection_type as ConnectionType);
    connectionTypesById.set(row.user_id, existing);
  }

  const profileById = new Map((profileRows ?? []).map((profile) => [profile.id, profile]));
  return userIds.flatMap((id) => {
    const profile = profileById.get(id);
    if (!profile) return [];
    return [
      {
        userId: profile.id,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        birthdate: profile.birthdate,
        city: profile.city,
        state: profile.state,
        occupation: profile.occupation,
        connectionTypes: connectionTypesById.get(profile.id) ?? [],
        originCountries: originCountriesById.get(profile.id) ?? [],
        coverPhotoUrl: coverById.get(profile.id) ?? null,
      },
    ];
  });
}

// A circle's deck: its other members you haven't swiped on there, picked server-side
// by list_circle_discover_candidates so the Discover filters (0052) apply -- they
// read other people's matching preferences, which the client can't.
export async function listDiscoverCandidates(circleId: string): Promise<DiscoverCandidate[]> {
  const { data, error } = await supabase.rpc("list_circle_discover_candidates", { target_circle: circleId });
  if (error) throw error;
  const candidateIds = (data ?? []).map((row) => row.user_id);
  if (candidateIds.length === 0) return [];

  return hydrateCandidates(candidateIds);
}

// The Discover tab: anyone discoverable, picked (and ordered) server-side by
// list_global_discover_candidates -- random for now, a matching algorithm later.
export async function listGlobalDiscoverCandidates(): Promise<DiscoverCandidate[]> {
  const { data, error } = await supabase.rpc("list_global_discover_candidates", { max_count: 20 });
  if (error) throw error;
  const candidateIds = (data ?? []).map((row) => row.user_id);
  if (candidateIds.length === 0) return [];

  return hydrateCandidates(candidateIds);
}

// Takes back a like / pass / save just made (Discover's Undo). The database only allows
// it for your own swipe, within 10 minutes, and not once it has made a match (0048);
// otherwise nothing is deleted and this throws.
export async function undoSwipe(actorId: string, targetId: string, circleId: string | null) {
  let query = supabase.from("swipes").delete().eq("actor_id", actorId).eq("target_id", targetId);
  query = circleId === null ? query.is("circle_id", null) : query.eq("circle_id", circleId);
  const { data, error } = await query.select("target_id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("This can't be undone any more.");
}

// circleId null = the global (Discover tab) scope, here and in checkForMatch.
export async function recordSwipe(
  actorId: string,
  targetId: string,
  circleId: string | null,
  action: "like" | "pass" | "save"
) {
  const { error } = await supabase
    .from("swipes")
    .upsert({ actor_id: actorId, target_id: targetId, circle_id: circleId, action }, { onConflict: "actor_id,target_id,circle_id" });
  if (error) throw error;
}

export async function checkForMatch(userId: string, targetId: string, circleId: string | null): Promise<boolean> {
  const userA = userId < targetId ? userId : targetId;
  const userB = userId < targetId ? targetId : userId;
  const query = supabase.from("matches").select("*").eq("user_a", userA).eq("user_b", userB);
  const { data, error } = await (circleId ? query.eq("circle_id", circleId) : query.is("circle_id", null)).maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function listMyMatches(userId: string) {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);
  if (error) throw error;
  return data ?? [];
}

// Someone the user starred ("save") in any Discover deck, for Connections' Saved
// tab. Same field names as MatchWithParticipant so the same card renders both.
export type SavedPerson = {
  otherUserId: string;
  otherDisplayName: string;
  otherAvatarUrl: string | null;
  otherBirthdate: string | null;
  otherCity: string | null;
  otherState: string | null;
  otherCountry: string | null;
  otherCoverPhotoUrl: string | null;
  // The deck it was saved from (null = the global Discover tab) -- liking or
  // passing from the profile updates that same swipe, so a match lands in the
  // right scope.
  circleId: string | null;
};

export async function listSavedPeople(userId: string): Promise<SavedPerson[]> {
  const [{ data: saveRows, error: saveError }, { data: matchRows, error: matchError }, { data: blockRows, error: blockError }] =
    await Promise.all([
      supabase
        .from("swipes")
        .select("target_id, circle_id, updated_at")
        .eq("actor_id", userId)
        .eq("action", "save")
        .order("updated_at", { ascending: false }),
      supabase.from("matches").select("user_a, user_b").or(`user_a.eq.${userId},user_b.eq.${userId}`),
      supabase.from("blocked_users").select("blocked_id").eq("blocker_id", userId),
    ]);
  if (saveError) throw saveError;
  if (matchError) throw matchError;
  if (blockError) throw blockError;

  // Already matched (they show under Matched/Connected) or blocked: not "saved".
  const exclude = new Set([
    ...(matchRows ?? []).map((m) => (m.user_a === userId ? m.user_b : m.user_a)),
    ...(blockRows ?? []).map((b) => b.blocked_id),
  ]);
  // Saved in several decks: keep the most recent save (rows are newest first).
  const latestByTarget = new Map<string, string | null>();
  for (const row of saveRows ?? []) {
    if (!exclude.has(row.target_id) && !latestByTarget.has(row.target_id)) {
      latestByTarget.set(row.target_id, row.circle_id);
    }
  }
  return loadPeople(latestByTarget);
}

// Person cards for a list of user ids, in the map's order; each value is the deck
// (circle id, null = global) that liking or passing from the profile acts in.
export async function loadPeople(circleByUserId: Map<string, string | null>): Promise<SavedPerson[]> {
  const targetIds = [...circleByUserId.keys()];
  if (targetIds.length === 0) return [];

  const [{ data: profiles, error: profileError }, coverById] = await Promise.all([
    supabase.from("profiles").select("id, display_name, avatar_url, birthdate, city, state, country").in("id", targetIds),
    getCoverPhotoUrls(targetIds),
  ]);
  if (profileError) throw profileError;

  // Profiles RLS hides anyone who has since gone hidden or left every shared
  // circle without being discoverable -- they drop out of the list here.
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  return targetIds.flatMap((id) => {
    const profile = profileById.get(id);
    if (!profile) return [];
    return [
      {
        otherUserId: id,
        otherDisplayName: profile.display_name || "Member",
        otherAvatarUrl: profile.avatar_url,
        otherBirthdate: profile.birthdate,
        otherCity: profile.city,
        otherState: profile.state,
        otherCountry: profile.country,
        otherCoverPhotoUrl: coverById.get(id) ?? null,
        circleId: circleByUserId.get(id) ?? null,
      },
    ];
  });
}
