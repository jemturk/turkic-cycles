import { ok, queueSupabaseResponses, type SupabaseResponse } from "@/test-utils/supabaseMock";
import { listBlockedUsers } from "./settings";

const mockFrom = jest.fn();
jest.mock("@/api/client", () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

function queueResponses(queues: Record<string, SupabaseResponse[]>) {
  queueSupabaseResponses(mockFrom, queues);
}

describe("listBlockedUsers", () => {
  it("joins blocked ids with their display name", async () => {
    queueResponses({
      blocked_users: [ok([{ blocked_id: "alice", created_at: "2026-01-01" }])],
      profiles: [ok([{ id: "alice", display_name: "Alice" }])],
    });
    expect(await listBlockedUsers("me")).toEqual([{ userId: "alice", displayName: "Alice" }]);
  });

  it("falls back to 'Member' when the blocked user's profile is missing", async () => {
    queueResponses({
      blocked_users: [ok([{ blocked_id: "alice", created_at: "2026-01-01" }])],
      profiles: [ok([])],
    });
    expect(await listBlockedUsers("me")).toEqual([{ userId: "alice", displayName: "Member" }]);
  });

  it("short-circuits with an empty array and skips the profiles query when nobody is blocked", async () => {
    queueResponses({ blocked_users: [ok([])] });
    expect(await listBlockedUsers("me")).toEqual([]);
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});
