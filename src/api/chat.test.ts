import { ok, queueSupabaseResponses, type SupabaseResponse } from "@/test-utils/supabaseMock";
import { listNewConnections, listMessageThreads } from "./chat";

const mockFrom = jest.fn();
jest.mock("@/api/client", () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

function queueResponses(queues: Record<string, SupabaseResponse[]>) {
  queueSupabaseResponses(mockFrom, queues);
}

const matchA = { id: "match-a", circle_id: "circle-1", created_at: "2026-01-01", user_a: "me", user_b: "alice" };
const matchB = { id: "match-b", circle_id: "circle-1", created_at: "2026-01-02", user_a: "bob", user_b: "me" };
const profiles = [
  { id: "alice", display_name: "Alice", avatar_url: "alice.png" },
  { id: "bob", display_name: "Bob", avatar_url: null },
];

describe("listNewConnections", () => {
  it("returns matches that have no messages yet, with the other participant attached", async () => {
    queueResponses({
      matches: [ok([matchA, matchB])],
      messages: [ok([{ match_id: "match-a" }])],
      profiles: [ok(profiles)],
    });

    const result = await listNewConnections("me");

    expect(result).toEqual([
      {
        matchId: "match-b",
        circleId: "circle-1",
        createdAt: "2026-01-02",
        otherUserId: "bob",
        otherDisplayName: "Bob",
        otherAvatarUrl: null,
      },
    ]);
  });

  it("returns an empty array with no matches, without querying messages/profiles", async () => {
    queueResponses({ matches: [ok([])] });
    expect(await listNewConnections("me")).toEqual([]);
  });

  it("falls back to 'Member' for a participant with no profile row", async () => {
    queueResponses({
      matches: [ok([matchA])],
      messages: [ok([])],
      profiles: [ok([])],
    });
    const result = await listNewConnections("me");
    expect(result[0].otherDisplayName).toBe("Member");
    expect(result[0].otherAvatarUrl).toBeNull();
  });
});

describe("listMessageThreads", () => {
  it("attaches the last message, unread count, and sorts newest-first", async () => {
    queueResponses({
      matches: [ok([matchA, matchB])],
      messages: [
        ok([
          { match_id: "match-a", sender_id: "alice", body: "hi", read_at: null, created_at: "2026-01-01T10:00:00Z" },
          {
            match_id: "match-a",
            sender_id: "alice",
            body: "hi again",
            read_at: null,
            created_at: "2026-01-01T11:00:00Z",
          },
          {
            match_id: "match-b",
            sender_id: "me",
            body: "hey bob",
            read_at: null,
            created_at: "2026-01-02T09:00:00Z",
          },
        ]),
      ],
      profiles: [ok(profiles)],
    });

    const result = await listMessageThreads("me");

    expect(result.map((t) => t.matchId)).toEqual(["match-b", "match-a"]);
    const threadA = result.find((t) => t.matchId === "match-a")!;
    expect(threadA.lastMessageBody).toBe("hi again");
    expect(threadA.unreadCount).toBe(2);

    const threadB = result.find((t) => t.matchId === "match-b")!;
    expect(threadB.unreadCount).toBe(0);
  });

  it("excludes matches that have no messages at all", async () => {
    queueResponses({
      matches: [ok([matchA, matchB])],
      messages: [ok([{ match_id: "match-a", sender_id: "alice", body: "hi", read_at: null, created_at: "t" }])],
      profiles: [ok(profiles)],
    });
    const result = await listMessageThreads("me");
    expect(result.map((t) => t.matchId)).toEqual(["match-a"]);
  });

  it("does not count a read message as unread", async () => {
    queueResponses({
      matches: [ok([matchA])],
      messages: [
        ok([
          {
            match_id: "match-a",
            sender_id: "alice",
            body: "hi",
            read_at: "2026-01-01T12:00:00Z",
            created_at: "2026-01-01T10:00:00Z",
          },
        ]),
      ],
      profiles: [ok(profiles)],
    });
    const result = await listMessageThreads("me");
    expect(result[0].unreadCount).toBe(0);
  });
});
