import { renderHook, act } from "@testing-library/react-native";
import { createTestQueryClient, createQueryWrapper } from "@/test-utils/queryClient";
import { useMessages } from "./useChat";

const mockChannel = { on: jest.fn(), subscribe: jest.fn() };
mockChannel.on.mockReturnValue(mockChannel);
mockChannel.subscribe.mockReturnValue(mockChannel);

jest.mock("@/api/client", () => ({
  supabase: {
    channel: jest.fn(() => mockChannel),
    removeChannel: jest.fn(),
  },
}));

jest.mock("@/api/chat", () => ({
  listMessages: jest.fn().mockResolvedValue([]),
  getOtherParticipant: jest.fn(),
  listMessageThreads: jest.fn(),
  listNewConnections: jest.fn(),
  markThreadRead: jest.fn(),
  sendMessage: jest.fn(),
}));

jest.mock("expo-router", () => ({
  useFocusEffect: jest.fn(),
}));

describe("useMessages realtime insert handler", () => {
  it("appends a new realtime message", async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createQueryWrapper(queryClient);

    await renderHook(() => useMessages("match-1"), { wrapper });

    const onInsertHandler = mockChannel.on.mock.calls[0][2];
    queryClient.setQueryData(["messages", "match-1"], [{ id: "m1", body: "hi" }]);

    await act(() => {
      onInsertHandler({ new: { id: "m2", body: "hello" } });
    });

    expect(queryClient.getQueryData(["messages", "match-1"])).toEqual([
      { id: "m1", body: "hi" },
      { id: "m2", body: "hello" },
    ]);
  });

  it("does not append a duplicate of a message already in the cache", async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createQueryWrapper(queryClient);

    await renderHook(() => useMessages("match-1"), { wrapper });

    const onInsertHandler = mockChannel.on.mock.calls[0][2];
    const existing = [{ id: "m1", body: "hi" }];
    queryClient.setQueryData(["messages", "match-1"], existing);

    await act(() => {
      onInsertHandler({ new: { id: "m1", body: "hi" } });
    });

    expect(queryClient.getQueryData(["messages", "match-1"])).toEqual(existing);
  });
});
