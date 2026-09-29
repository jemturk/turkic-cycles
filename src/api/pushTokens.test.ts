import { ok, queueSupabaseResponses, type SupabaseResponse } from "@/test-utils/supabaseMock";
import { registerPushToken } from "./pushTokens";

const mockFrom = jest.fn();
jest.mock("@/api/client", () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

function queueResponses(queues: Record<string, SupabaseResponse[]>) {
  queueSupabaseResponses(mockFrom, queues);
}

describe("registerPushToken", () => {
  it("upserts keyed on the token itself, not (user_id, token)", async () => {
    queueResponses({ push_tokens: [ok(null)] });

    await registerPushToken("user-1", "ExponentPushToken[abc]", "ios");

    const chain = mockFrom.mock.results[0].value;
    // Keying on the bare token lets a device get reassigned to whoever is
    // currently signed in on it, rather than accumulating a stale duplicate row
    // for a previous account on the same physical device.
    expect(chain.upsert).toHaveBeenCalledWith(
      { user_id: "user-1", token: "ExponentPushToken[abc]", platform: "ios" },
      { onConflict: "token" }
    );
  });
});
