import { ok, queueSupabaseResponses, type SupabaseResponse } from "@/test-utils/supabaseMock";
import { listDiscoverCandidates, listGlobalDiscoverCandidates, checkForMatch } from "./discover";

const mockFrom = jest.fn();
const mockRpc = jest.fn();
jest.mock("@/api/client", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

function queueResponses(queues: Record<string, SupabaseResponse[]>) {
  queueSupabaseResponses(mockFrom, queues);
}

describe("listDiscoverCandidates", () => {
  it("excludes circle members the user has already swiped on", async () => {
    queueResponses({
      circle_members: [ok([{ user_id: "alice" }, { user_id: "bob" }])],
      swipes: [ok([{ target_id: "bob" }])],
      profiles: [ok([{ id: "alice", display_name: "Alice", avatar_url: null, birthdate: null, city: null, state: null, occupation: null }])],
      user_connection_types: [ok([{ user_id: "alice", connection_type: "friend" }])],
    });
    mockRpc.mockResolvedValue(ok([]));

    const result = await listDiscoverCandidates("circle-1", "me");

    expect(result.map((c) => c.userId)).toEqual(["alice"]);
    expect(result[0].connectionTypes).toEqual(["friend"]);
  });

  it("returns an empty array when every member has already been swiped on, without further queries", async () => {
    queueResponses({
      circle_members: [ok([{ user_id: "alice" }])],
      swipes: [ok([{ target_id: "alice" }])],
    });

    expect(await listDiscoverCandidates("circle-1", "me")).toEqual([]);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("merges multiple connection-type rows per candidate", async () => {
    queueResponses({
      circle_members: [ok([{ user_id: "alice" }])],
      swipes: [ok([])],
      profiles: [ok([{ id: "alice", display_name: "Alice", avatar_url: null, birthdate: null, city: null, state: null, occupation: null }])],
      user_connection_types: [
        ok([
          { user_id: "alice", connection_type: "friend" },
          { user_id: "alice", connection_type: "business" },
        ]),
      ],
    });
    mockRpc.mockResolvedValue(ok([]));

    const result = await listDiscoverCandidates("circle-1", "me");
    expect(result[0].connectionTypes).toEqual(["friend", "business"]);
  });

  it("attaches origin countries only for candidates with consent rows returned", async () => {
    queueResponses({
      circle_members: [ok([{ user_id: "alice" }, { user_id: "bob" }])],
      swipes: [ok([])],
      profiles: [
        ok([
          { id: "alice", display_name: "Alice", avatar_url: null, birthdate: null, city: null, state: null, occupation: null },
          { id: "bob", display_name: "Bob", avatar_url: null, birthdate: null, city: null, state: null, occupation: null },
        ]),
      ],
      user_connection_types: [ok([])],
    });
    mockRpc.mockResolvedValue(ok([{ user_id: "alice", origin_countries: ["Kazakhstan"] }]));

    const result = await listDiscoverCandidates("circle-1", "me");
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
    });

    const result = await listGlobalDiscoverCandidates();
    expect(result.map((c) => c.userId)).toEqual(["carol", "alice", "bob"]);
  });

  it("drops candidates whose profile couldn't be read", async () => {
    mockRpc.mockImplementation((fn: string) =>
      Promise.resolve(fn === "list_global_discover_candidates" ? ok([{ user_id: "alice" }, { user_id: "ghost" }]) : ok([]))
    );
    queueResponses({ profiles: [ok([profile("alice", "Alice")])], user_connection_types: [ok([])] });

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
