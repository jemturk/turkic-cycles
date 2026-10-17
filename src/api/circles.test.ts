import { ok, queueSupabaseResponses, type SupabaseResponse } from "@/test-utils/supabaseMock";
import {
  listMyCircleMemberships,
  listCircleMembers,
  listUpcomingEventCounts,
  listUpcomingEventsInCircles,
  listCircleEvents,
  getCircleEvent,
  listEventAttendees,
} from "./circles";

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
      profiles: [ok([{ id: "alice", display_name: "Alice", avatar_url: "a.png", city: "Tampa" }])],
    });

    const result = await listCircleMembers("circle-1");

    expect(result).toEqual([
      { userId: "alice", joinedAt: "2026-01-01", displayName: "Alice", avatarUrl: "a.png", city: "Tampa" },
      { userId: "bob", joinedAt: "2026-01-02", displayName: "", avatarUrl: null, city: null },
    ]);
  });

  it("short-circuits with an empty array and skips the profiles query when there are no members", async () => {
    queueResponses({ circle_members: [ok([])] });
    expect(await listCircleMembers("circle-1")).toEqual([]);
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});

describe("listUpcomingEventCounts", () => {
  it("tallies upcoming events per circle", async () => {
    queueResponses({ circle_events: [ok([{ circle_id: "c1" }, { circle_id: "c2" }, { circle_id: "c1" }])] });
    expect(await listUpcomingEventCounts()).toEqual({ c1: 2, c2: 1 });
  });

  it("returns an empty map when nothing is upcoming", async () => {
    queueResponses({ circle_events: [ok([])] });
    expect(await listUpcomingEventCounts()).toEqual({});
  });
});

describe("listUpcomingEventsInCircles", () => {
  it("skips the query entirely when you're in no circles", async () => {
    mockFrom.mockClear();
    expect(await listUpcomingEventsInCircles([], 5)).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("asks for upcoming events in just those circles, soonest first, capped at the limit", async () => {
    const rows = [{ id: "e1", circle_id: "c1", title: "Picnic", starts_at: "2099-01-01T12:00:00Z" }];
    queueResponses({ circle_events: [ok(rows)] });

    expect(await listUpcomingEventsInCircles(["c1", "c2"], 5)).toEqual(rows);

    const chain = mockFrom.mock.results[mockFrom.mock.results.length - 1].value;
    expect(chain.in).toHaveBeenCalledWith("circle_id", ["c1", "c2"]);
    expect(chain.order).toHaveBeenCalledWith("starts_at");
    expect(chain.limit).toHaveBeenCalledWith(5);
  });
});

describe("listCircleEvents", () => {
  it("splits events into upcoming (soonest first) and past (most recent first)", async () => {
    // Rows arrive ordered by starts_at ascending, as the real query requests.
    queueResponses({
      circle_events: [
        ok([
          { id: "past-old", starts_at: "2020-01-01" },
          { id: "past-recent", starts_at: "2021-06-01" },
          { id: "next", starts_at: "2099-01-01" },
          { id: "later", starts_at: "2099-06-01" },
        ]),
      ],
    });

    const { upcoming, past } = await listCircleEvents("circle-1");

    expect(upcoming.map((e) => e.id)).toEqual(["next", "later"]);
    expect(past.map((e) => e.id)).toEqual(["past-recent", "past-old"]);
  });

  it("returns two empty lists when the circle has no events", async () => {
    queueResponses({ circle_events: [ok([])] });
    expect(await listCircleEvents("circle-1")).toEqual({ upcoming: [], past: [] });
  });
});

describe("getCircleEvent", () => {
  it("returns the event row", async () => {
    queueResponses({ circle_events: [ok({ id: "e1", title: "Meetup" })] });
    expect(await getCircleEvent("e1")).toEqual({ id: "e1", title: "Meetup" });
  });
});

describe("listEventAttendees", () => {
  it("splits RSVPs into going and interested, joined with each person's profile", async () => {
    queueResponses({
      event_rsvps: [
        ok([
          { user_id: "alice", status: "going" },
          { user_id: "bob", status: "interested" },
          { user_id: "cem", status: "going" },
        ]),
      ],
      profiles: [ok([{ id: "alice", display_name: "Alice", avatar_url: "a.png", city: "Tampa" }])],
    });

    expect(await listEventAttendees("event-1")).toEqual({
      going: [
        { userId: "alice", displayName: "Alice", avatarUrl: "a.png", city: "Tampa" },
        { userId: "cem", displayName: "", avatarUrl: null, city: null },
      ],
      interested: [{ userId: "bob", displayName: "", avatarUrl: null, city: null }],
    });
  });

  it("skips the profiles query when no one has replied", async () => {
    queueResponses({ event_rsvps: [ok([])] });
    expect(await listEventAttendees("event-1")).toEqual({ going: [], interested: [] });
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});
