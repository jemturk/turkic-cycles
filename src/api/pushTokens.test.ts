import { registerPushToken } from "./pushTokens";

const mockRpc = jest.fn();
jest.mock("@/api/client", () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

describe("registerPushToken", () => {
  beforeEach(() => mockRpc.mockReset());

  it("registers through the RPC, which claims the token for the signed-in user", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await registerPushToken("ExponentPushToken[abc]", "ios");

    // No user_id is sent: the function always uses auth.uid(), which is what lets a
    // device's token move to whoever is now signed in on it (and only to them).
    expect(mockRpc).toHaveBeenCalledWith("register_push_token", {
      p_token: "ExponentPushToken[abc]",
      p_platform: "ios",
    });
  });

  it("throws the RPC's error", async () => {
    const error = { message: "Not signed in." };
    mockRpc.mockResolvedValue({ data: null, error });

    await expect(registerPushToken("ExponentPushToken[abc]", "android")).rejects.toBe(error);
  });
});
