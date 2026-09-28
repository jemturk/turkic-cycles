import { ok, queueSupabaseResponses, type SupabaseResponse } from "@/test-utils/supabaseMock";
import { listMyCircleMemberships, listCircleMembers, getNextCircleEvent } from "./circles";

const mockFrom = jest.fn();
jest.mock("@/api/client", () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

function queueResponses(queues: Record<string, SupabaseResponse[]>) {
  queueSupabaseResponses(mockFrom, queues);
}

describe("listMyCircleMemberships", () => {
  it("flattens rows to a plain array of circle ids", async () => {
    queueResponses({ circle_members: [ok([{ circle_id: "c1" }, { circle_id: "c2" }])] });
    expect(await listMyCircleMemberships("me")).toEqual(["c1", "c2"]);
  });

  it("returns an empty array when there are no memberships", async () => {
    queueResponses({ circle_members: [ok([])] });
    expect(await listMyCircleMemberships("me")).toEqual([]);
  });
});

describe("listCircleMembers", () => {
  it("joins member rows with their profile, defaulting missing fields", async () => {
    queueResponses({
      circle_members: [ok([{ user_id: "alice", joined_at: "2026-01-01" }, { user_id: "bob", joined_at: "2026-01-02" }])],
      profiles: [ok([{ id: "alice", display_name: "Alice", avatar_url: "a.png" }])],
    });

    const result = await listCircleMembers("circle-1");

    expect(result).toEqual([
      { userId: "alice", joinedAt: "2026-01-01", displayName: "Alice", avatarUrl: "a.png" },
      { userId: "bob", joinedAt: "2026-01-02", displayName: "", avatarUrl: null },
    ]);
  });

  it("short-circuits with an empty array and skips the profiles query when there are no members", async () => {
    queueResponses({ circle_members: [ok([])] });
    expect(await listCircleMembers("circle-1")).toEqual([]);
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});

describe("getNextCircleEvent", () => {
  it("returns the next upcoming event when one exists", async () => {
    queueResponses({ circle_events: [ok({ id: "e1", starts_at: "2099-01-01" })] });
    const result = await getNextCircleEvent("circle-1");
    expect(result).toEqual({ id: "e1", starts_at: "2099-01-01" });
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("falls back to the most recent past event when there's no upcoming one", async () => {
    queueResponses({
      circle_events: [ok(null), ok({ id: "e0", starts_at: "2020-01-01" })],
    });
    const result = await getNextCircleEvent("circle-1");
    expect(result).toEqual({ id: "e0", starts_at: "2020-01-01" });
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it("returns null when there are no events at all", async () => {
    queueResponses({ circle_events: [ok(null), ok(null)] });
    expect(await getNextCircleEvent("circle-1")).toBeNull();
  });
});
