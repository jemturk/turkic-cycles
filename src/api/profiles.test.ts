import { fail, ok, queueSupabaseResponses, type SupabaseResponse } from "@/test-utils/supabaseMock";
import { getMyProfile } from "./profiles";

const mockFrom = jest.fn();
jest.mock("@/api/client", () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

function queueResponses(queues: Record<string, SupabaseResponse[]>) {
  queueSupabaseResponses(mockFrom, queues);
}

// What others see: location_visibility 'state' has masked the city.
const maskedProfile = { id: "me", city: null, state: "ID", location_visibility: "state" };

describe("getMyProfile", () => {
  it("keeps the public city/state and adds your real ones from profile_locations", async () => {
    queueResponses({
      profiles: [ok(maskedProfile)],
      profile_locations: [ok({ city: "Boise", state: "ID" })],
    });

    const profile = await getMyProfile("me");
    expect(profile.city).toBeNull();
    expect(profile.realCity).toBe("Boise");
    expect(profile.realState).toBe("ID");
  });

  it("falls back to the public values for someone else's profile", async () => {
    queueResponses({
      profiles: [ok({ id: "them", city: "Tampa", state: "FL", location_visibility: "city" })],
      profile_locations: [ok(null)],
    });

    const profile = await getMyProfile("them");
    expect(profile.realCity).toBe("Tampa");
    expect(profile.realState).toBe("FL");
  });

  it("still loads the profile when profile_locations can't be read", async () => {
    queueResponses({
      profiles: [ok(maskedProfile)],
      profile_locations: [fail("relation does not exist")],
    });

    const profile = await getMyProfile("me");
    expect(profile.id).toBe("me");
    expect(profile.realState).toBe("ID");
  });

  it("throws when the profile itself can't be read", async () => {
    queueResponses({
      profiles: [fail("boom")],
      profile_locations: [ok(null)],
    });

    await expect(getMyProfile("me")).rejects.toEqual({ message: "boom" });
  });
});
