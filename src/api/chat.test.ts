import { ok, queueSupabaseResponses, type SupabaseResponse } from "@/test-utils/supabaseMock";
import {
  listNewConnections,
  listMessageThreads,
  listReactions,
  markMessageDelivered,
  sendMessage,
  toggleReaction,
} from "./chat";

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
      profile_photos: [ok([])],
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
        otherBirthdate: null,
        otherCity: null,
        otherState: null,
        otherCountry: null,
        otherCoverPhotoUrl: null,
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
      profile_photos: [ok([])],
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
      profile_photos: [ok([])],
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
      profile_photos: [ok([])],
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
      profile_photos: [ok([])],
    });
    const result = await listMessageThreads("me");
    expect(result[0].unreadCount).toBe(0);
  });
});

describe("markMessageDelivered", () => {
  it("only updates the target message, and only if not already delivered", async () => {
    queueResponses({ messages: [ok(null)] });

    await markMessageDelivered("msg-1");

    const chain = mockFrom.mock.results[0].value;
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ delivered_at: expect.any(String) }));
    expect(chain.eq).toHaveBeenCalledWith("id", "msg-1");
    expect(chain.is).toHaveBeenCalledWith("delivered_at", null);
  });
});

describe("sendMessage", () => {
  it("sends the message it replies to, or null when it isn't a reply", async () => {
    queueResponses({ messages: [ok(null), ok(null)] });

    await sendMessage("match-a", "me", "Sounds good", "msg-1");
    await sendMessage("match-a", "me", "Hi");

    expect(mockFrom.mock.results[0].value.insert).toHaveBeenCalledWith({
      match_id: "match-a",
      sender_id: "me",
      body: "Sounds good",
      reply_to_id: "msg-1",
    });
    expect(mockFrom.mock.results[1].value.insert).toHaveBeenCalledWith(
      expect.objectContaining({ body: "Hi", reply_to_id: null })
    );
  });
});

describe("listReactions", () => {
  it("returns the conversation's reactions as plain objects", async () => {
    queueResponses({
      message_reactions: [ok([{ message_id: "msg-1", user_id: "alice", emoji: "❤️", messages: { match_id: "match-a" } }])],
    });

    expect(await listReactions("match-a")).toEqual([{ messageId: "msg-1", userId: "alice", emoji: "❤️" }]);
    expect(mockFrom.mock.results[0].value.eq).toHaveBeenCalledWith("messages.match_id", "match-a");
  });
});

describe("toggleReaction", () => {
  it("takes the reaction off when the same emoji is picked again", async () => {
    queueResponses({ message_reactions: [ok(null)] });
    await toggleReaction("msg-1", "me", "👍", "👍");
    const chain = mockFrom.mock.results[0].value;
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.upsert).not.toHaveBeenCalled();
  });

  it("adds or replaces it otherwise, one per person per message", async () => {
    queueResponses({ message_reactions: [ok(null)] });
    await toggleReaction("msg-1", "me", "😂", "👍");
    expect(mockFrom.mock.results[0].value.upsert).toHaveBeenCalledWith(
      { message_id: "msg-1", user_id: "me", emoji: "😂" },
      { onConflict: "message_id,user_id" }
    );
  });
});
