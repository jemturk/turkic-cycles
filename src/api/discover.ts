import { supabase } from "@/api/client";
import type { ConnectionType } from "@/constants/connectionTypes";

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
  const [{ data: profileRows, error: profileError }, { data: typeRows, error: typeError }, originCountriesById] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, avatar_url, birthdate, city, state, occupation")
        .in("id", userIds),
      supabase.from("user_connection_types").select("user_id, connection_type").in("user_id", userIds),
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
      },
    ];
  });
}

export async function listDiscoverCandidates(circleId: string, userId: string): Promise<DiscoverCandidate[]> {
  const { data: memberRows, error: memberError } = await supabase
    .from("circle_members")
    .select("user_id")
    .eq("circle_id", circleId)
    .neq("user_id", userId);
  if (memberError) throw memberError;

  const { data: swipedRows, error: swipedError } = await supabase
    .from("swipes")
    .select("target_id")
    .eq("actor_id", userId)
    .eq("circle_id", circleId);
  if (swipedError) throw swipedError;

  const alreadySwiped = new Set((swipedRows ?? []).map((row) => row.target_id));
  const candidateIds = (memberRows ?? []).map((row) => row.user_id).filter((id) => !alreadySwiped.has(id));
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
