import { ok, queueSupabaseResponses, type SupabaseResponse } from "@/test-utils/supabaseMock";
import { listDiscoverCandidates, listGlobalDiscoverCandidates, listSavedPeople, checkForMatch } from "./discover";

const mockFrom = jest.fn();
const mockRpc = jest.fn();
const mockInvoke = jest.fn();
jest.mock("@/api/client", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: (...args: unknown[]) => mockRpc(...args),
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}));

function queueResponses(queues: Record<string, SupabaseResponse[]>) {
  queueSupabaseResponses(mockFrom, queues);
}

describe("listDiscoverCandidates", () => {
  function profile(id: string, name: string) {
    return { id, display_name: name, avatar_url: null, birthdate: null, city: null, state: null, occupation: null };
  }

  function serverPicks(rows: { user_id: string }[], origins: { user_id: string; origin_countries: string[] }[] = []) {
    mockRpc.mockImplementation((fn: string) =>
      Promise.resolve(fn === "list_circle_discover_candidates" ? ok(rows) : ok(origins))
    );
  }

  it("asks the server for the circle's candidates", async () => {
    serverPicks([{ user_id: "alice" }]);
    queueResponses({
      profiles: [ok([profile("alice", "Alice")])],
      user_connection_types: [ok([{ user_id: "alice", connection_type: "friend" }])],
      profile_photos: [ok([])],
    });

    const result = await listDiscoverCandidates("circle-1");

    expect(mockRpc).toHaveBeenCalledWith("list_circle_discover_candidates", { target_circle: "circle-1" });
    expect(result.map((c) => c.userId)).toEqual(["alice"]);
    expect(result[0].connectionTypes).toEqual(["friend"]);
  });

  it("returns an empty array without further queries when no one is left", async () => {
    serverPicks([]);
    queueResponses({});

    expect(await listDiscoverCandidates("circle-1")).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });

  it("merges multiple connection-type rows per candidate", async () => {
    serverPicks([{ user_id: "alice" }]);
    queueResponses({
      profiles: [ok([profile("alice", "Alice")])],
      user_connection_types: [
        ok([
          { user_id: "alice", connection_type: "friend" },
          { user_id: "alice", connection_type: "business" },
        ]),
      ],
      profile_photos: [ok([])],
    });

    const result = await listDiscoverCandidates("circle-1");
    expect(result[0].connectionTypes).toEqual(["friend", "business"]);
  });

  it("attaches origin countries only for candidates with consent rows returned", async () => {
    serverPicks([{ user_id: "alice" }, { user_id: "bob" }], [{ user_id: "alice", origin_countries: ["Kazakhstan"] }]);
    queueResponses({
      profiles: [ok([profile("alice", "Alice"), profile("bob", "Bob")])],
      user_connection_types: [ok([])],
      profile_photos: [ok([])],
    });

    const result = await listDiscoverCandidates("circle-1");
    expect(result.find((c) => c.userId === "alice")!.originCountries).toEqual(["Kazakhstan"]);
    expect(result.find((c) => c.userId === "bob")!.originCountries).toEqual([]);
  });
});

describe("checkForMatch", () => {
  it("canonicalizes user_a/user_b ordering regardless of who's the actor", async () => {
    queueResponses({ matches: [ok({ id: "m1" })] });
    await checkForMatch("zoe", "alice", "circle-1");

    const chain = mockFrom.mock.results[0].value;
    // Whichever id sorts first alphabetically must be queried as user_a, so a
    // lookup finds the same row no matter which side swiped last.
    expect(chain.eq).toHaveBeenCalledWith("user_a", "alice");
    expect(chain.eq).toHaveBeenCalledWith("user_b", "zoe");
  });

  it("canonicalizes the same way when the actor already sorts first", async () => {
    queueResponses({ matches: [ok({ id: "m1" })] });
    await checkForMatch("alice", "zoe", "circle-1");

    const chain = mockFrom.mock.results[0].value;
    expect(chain.eq).toHaveBeenCalledWith("user_a", "alice");
    expect(chain.eq).toHaveBeenCalledWith("user_b", "zoe");
  });

  it("returns true when a match row exists", async () => {
    queueResponses({ matches: [ok({ id: "m1" })] });
    expect(await checkForMatch("alice", "bob", "circle-1")).toBe(true);
  });

  it("returns false when no match row exists", async () => {
    queueResponses({ matches: [ok(null)] });
    expect(await checkForMatch("alice", "bob", "circle-1")).toBe(false);
  });

  it("looks only at global matches (circle_id is null) for the Discover tab's scope", async () => {
    queueResponses({ matches: [ok({ id: "m1" })] });
    expect(await checkForMatch("alice", "bob", null)).toBe(true);

    const chain = mockFrom.mock.results[0].value;
    expect(chain.is).toHaveBeenCalledWith("circle_id", null);
    expect(chain.eq).not.toHaveBeenCalledWith("circle_id", expect.anything());
  });
});

describe("ranked Discover (rank-discover)", () => {
  function profile(id: string, name: string) {
    return { id, display_name: name, avatar_url: null, birthdate: null, city: null, state: null, occupation: null };
  }

  it("keeps the ranking's order and attaches each match", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        candidates: [
          { userId: "bob", connectionType: "friend", score: 0.81, strong: true, reasons: [{ criterion: "interests", count: 3 }] },
          { userId: "alice", connectionType: "friend", score: null, strong: false, reasons: [] },
        ],
      },
      error: null,
    });
    mockRpc.mockResolvedValue(ok([]));
    queueResponses({
      profiles: [ok([profile("alice", "Alice"), profile("bob", "Bob")])],
      user_connection_types: [ok([])],
      profile_photos: [ok([])],
    });

    const result = await listGlobalDiscoverCandidates();
    expect(mockInvoke).toHaveBeenCalledWith("rank-discover", { body: { circleId: null, maxCount: 20 } });
    expect(result.map((c) => c.userId)).toEqual(["bob", "alice"]);
    expect(result[0].match).toEqual({ connectionType: "friend", score: 0.81, strong: true, reasons: [{ criterion: "interests", count: 3 }] });
  });

  it("falls back to the unranked list when ranking fails", async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error("down") });
    mockRpc.mockImplementation((fn: string) =>
      Promise.resolve(fn === "list_global_discover_candidates" ? ok([{ user_id: "alice" }]) : ok([]))
    );
    queueResponses({
      profiles: [ok([profile("alice", "Alice")])],
      user_connection_types: [ok([])],
      profile_photos: [ok([])],
    });

    const result = await listGlobalDiscoverCandidates();
    expect(result.map((c) => c.userId)).toEqual(["alice"]);
    expect(result[0].match).toBeUndefined();
  });
});

describe("listGlobalDiscoverCandidates", () => {
  function profile(id: string, name: string) {
    return { id, display_name: name, avatar_url: null, birthdate: null, city: null, state: null, occupation: null };
  }

  it("keeps the server's order, not the order profiles come back in", async () => {
    mockRpc.mockImplementation((fn: string) =>
      Promise.resolve(
        fn === "list_global_discover_candidates"
          ? ok([{ user_id: "carol" }, { user_id: "alice" }, { user_id: "bob" }])
          : ok([])
      )
    );
    queueResponses({
      profiles: [ok([profile("alice", "Alice"), profile("bob", "Bob"), profile("carol", "Carol")])],
      user_connection_types: [ok([])],
      profile_photos: [ok([])],
    });

    const result = await listGlobalDiscoverCandidates();
    expect(result.map((c) => c.userId)).toEqual(["carol", "alice", "bob"]);
  });

  it("drops candidates whose profile couldn't be read", async () => {
    mockRpc.mockImplementation((fn: string) =>
      Promise.resolve(fn === "list_global_discover_candidates" ? ok([{ user_id: "alice" }, { user_id: "ghost" }]) : ok([]))
    );
    queueResponses({
      profiles: [ok([profile("alice", "Alice")])],
      user_connection_types: [ok([])],
      profile_photos: [ok([])],
    });

    expect((await listGlobalDiscoverCandidates()).map((c) => c.userId)).toEqual(["alice"]);
  });

  it("returns an empty array without further queries when no one is left", async () => {
    mockRpc.mockResolvedValue(ok([]));
    queueResponses({});

    expect(await listGlobalDiscoverCandidates()).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });
});

describe("Discover cover photos", () => {
  it("uses the photo in the cover slot (position 0) only, and null when it's empty", async () => {
    mockRpc.mockImplementation((fn: string) =>
      Promise.resolve(fn === "list_global_discover_candidates" ? ok([{ user_id: "alice" }, { user_id: "bob" }]) : ok([]))
    );
    queueResponses({
      profiles: [
        ok([
          { id: "alice", display_name: "Alice", avatar_url: null, birthdate: null, city: null, state: null, occupation: null },
          { id: "bob", display_name: "Bob", avatar_url: null, birthdate: null, city: null, state: null, occupation: null },
        ]),
      ],
      user_connection_types: [ok([])],
      // bob has photos, but none in the cover slot -- his card has no cover.
      profile_photos: [
        ok([
          { user_id: "alice", storage_path: "https://picsum.photos/seed/b/600/800", position: 1 },
          { user_id: "alice", storage_path: "https://picsum.photos/seed/a/600/800", position: 0 },
          { user_id: "bob", storage_path: "https://picsum.photos/seed/c/600/800", position: 1 },
        ]),
      ],
    });

    const result = await listGlobalDiscoverCandidates();
    expect(result.find((c) => c.userId === "alice")!.coverPhotoUrl).toBe("https://picsum.photos/seed/a/600/800");
    expect(result.find((c) => c.userId === "bob")!.coverPhotoUrl).toBeNull();
  });
});

describe("listSavedPeople", () => {
  function profile(id: string, name: string) {
    return { id, display_name: name, avatar_url: null, birthdate: null, city: null, state: null, country: null };
  }

  it("lists each saved person once, from their most recent save, newest first", async () => {
    queueResponses({
      swipes: [
        ok([
          { target_id: "bob", circle_id: null, updated_at: "2026-10-03" },
          { target_id: "alice", circle_id: "circle-2", updated_at: "2026-10-02" },
          { target_id: "bob", circle_id: "circle-1", updated_at: "2026-10-01" },
        ]),
      ],
      matches: [ok([])],
      blocked_users: [ok([])],
      profiles: [ok([profile("alice", "Alice"), profile("bob", "Bob")])],
      profile_photos: [ok([])],
    });

    const result = await listSavedPeople("me");
    expect(result.map((p) => [p.otherUserId, p.circleId])).toEqual([
      ["bob", null],
      ["alice", "circle-2"],
    ]);
  });

  it("leaves out people already matched with or blocked", async () => {
    queueResponses({
      swipes: [
        ok([
          { target_id: "matched", circle_id: null, updated_at: "2026-10-03" },
          { target_id: "blocked", circle_id: null, updated_at: "2026-10-02" },
          { target_id: "alice", circle_id: null, updated_at: "2026-10-01" },
        ]),
      ],
      matches: [ok([{ user_a: "matched", user_b: "me" }])],
      blocked_users: [ok([{ blocked_id: "blocked" }])],
      profiles: [ok([profile("alice", "Alice")])],
      profile_photos: [ok([])],
    });

    expect((await listSavedPeople("me")).map((p) => p.otherUserId)).toEqual(["alice"]);
  });

  it("drops saved people whose profile is no longer visible, and skips the profile query when none are left", async () => {
    queueResponses({
      swipes: [ok([{ target_id: "gone", circle_id: null, updated_at: "2026-10-03" }])],
      matches: [ok([])],
      blocked_users: [ok([])],
      profiles: [ok([])],
      profile_photos: [ok([])],
    });
    expect(await listSavedPeople("me")).toEqual([]);

    queueResponses({ swipes: [ok([])], matches: [ok([])], blocked_users: [ok([])] });
    expect(await listSavedPeople("me")).toEqual([]);
  });
});
