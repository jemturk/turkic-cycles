import { supabase } from "@/api/client";
import type { Tables } from "@/types/database";
import { COVER_POSITION, publicUrl } from "@/api/gallery";

export type MatchWithParticipant = {
  matchId: string;
  circleId: string | null; // null = matched on the global Discover tab
  createdAt: string;
  otherUserId: string;
  otherDisplayName: string;
  otherAvatarUrl: string | null;
  otherBirthdate: string | null;
  otherCity: string | null;
  otherState: string | null;
  otherCountry: string | null;
  // Their first gallery photo -- the Connections card's background.
  otherCoverPhotoUrl: string | null;
};

// Each user's cover photo (the one in the cover slot, see COVER_POSITION) as a
// public URL -- the background of their Discover and Connections cards. Users
// with an empty cover slot are simply missing from the map.
export async function getCoverPhotoUrls(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("profile_photos")
    .select("user_id, storage_path, position")
    .in("user_id", userIds)
    .eq("position", COVER_POSITION);
  if (error) throw error;
  const covers = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.position === COVER_POSITION) covers.set(row.user_id, publicUrl(row.storage_path));
  }
  return covers;
}

async function attachOtherParticipant(
  matches: Tables<"matches">[],
  userId: string
): Promise<MatchWithParticipant[]> {
  if (matches.length === 0) return [];

  const otherUserIds = matches.map((m) => (m.user_a === userId ? m.user_b : m.user_a));
  const [{ data: profiles, error }, coverById] = await Promise.all([
    supabase.from("profiles").select("id, display_name, avatar_url, birthdate, city, state, country").in("id", otherUserIds),
    getCoverPhotoUrls(otherUserIds),
  ]);
  if (error) throw error;

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return matches.map((m) => {
    const otherUserId = m.user_a === userId ? m.user_b : m.user_a;
    const otherProfile = profileById.get(otherUserId);
    return {
      matchId: m.id,
      circleId: m.circle_id,
      createdAt: m.created_at,
      otherUserId,
      otherDisplayName: otherProfile?.display_name || "Member",
      otherAvatarUrl: otherProfile?.avatar_url ?? null,
      otherBirthdate: otherProfile?.birthdate ?? null,
      otherCity: otherProfile?.city ?? null,
      otherState: otherProfile?.state ?? null,
      otherCountry: otherProfile?.country ?? null,
      otherCoverPhotoUrl: coverById.get(otherUserId) ?? null,
    };
  });
}

async function listMyMatches(userId: string): Promise<Tables<"matches">[]> {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);
  if (error) throw error;
  return data ?? [];
}

export async function listNewConnections(userId: string): Promise<MatchWithParticipant[]> {
  const matches = await listMyMatches(userId);
  if (matches.length === 0) return [];

  const { data: messageRows, error } = await supabase
    .from("messages")
    .select("match_id")
    .in(
      "match_id",
      matches.map((m) => m.id)
    );
  if (error) throw error;

  const matchIdsWithMessages = new Set((messageRows ?? []).map((row) => row.match_id));
  const withoutMessages = matches.filter((m) => !matchIdsWithMessages.has(m.id));
  return attachOtherParticipant(withoutMessages, userId);
}

export type MessageThread = MatchWithParticipant & {
  lastMessageBody: string;
  lastMessageAt: string;
  unreadCount: number;
};

export async function listMessageThreads(userId: string): Promise<MessageThread[]> {
  const matches = await listMyMatches(userId);
  if (matches.length === 0) return [];

  const { data: messageRows, error } = await supabase
    .from("messages")
    .select("match_id, sender_id, body, read_at, created_at")
    .in(
      "match_id",
      matches.map((m) => m.id)
    )
    .order("created_at", { ascending: true });
  if (error) throw error;

  const lastByMatch = new Map<string, (typeof messageRows)[number]>();
  const unreadByMatch = new Map<string, number>();
  for (const row of messageRows ?? []) {
    lastByMatch.set(row.match_id, row);
    if (row.sender_id !== userId && !row.read_at) {
      unreadByMatch.set(row.match_id, (unreadByMatch.get(row.match_id) ?? 0) + 1);
    }
  }

  const matchesWithMessages = matches.filter((m) => lastByMatch.has(m.id));
  const withParticipants = await attachOtherParticipant(matchesWithMessages, userId);

  return withParticipants
    .map((m) => {
      const last = lastByMatch.get(m.matchId)!;
      return {
        ...m,
        lastMessageBody: last.body,
        lastMessageAt: last.created_at,
        unreadCount: unreadByMatch.get(m.matchId) ?? 0,
      };
    })
    .sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));
}

export async function getOtherParticipant(matchId: string, userId: string) {
  const { data: match, error } = await supabase.from("matches").select("*").eq("id", matchId).single();
  if (error) throw error;

  const otherUserId = match.user_a === userId ? match.user_b : match.user_a;
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", otherUserId)
    .single();
  if (profileError) throw profileError;

  return { match, profile };
}

export async function listMessages(matchId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(matchId: string, senderId: string, body: string) {
  const { error } = await supabase.from("messages").insert({ match_id: matchId, sender_id: senderId, body });
  if (error) throw error;
}

export async function markThreadRead(matchId: string, userId: string) {
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("match_id", matchId)
    .neq("sender_id", userId)
    .is("read_at", null);
  if (error) throw error;
}

// Called by the recipient's own device the moment it receives the push for this
// message -- distinct from markThreadRead (which fires only once they open that
// specific thread): this can fire while the app is merely open somewhere, giving
// "delivered" its own meaning separate from "read".
export async function markMessageDelivered(messageId: string) {
  const { error } = await supabase
    .from("messages")
    .update({ delivered_at: new Date().toISOString() })
    .eq("id", messageId)
    .is("delivered_at", null);
  if (error) throw error;
}
