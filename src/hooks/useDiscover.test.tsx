import { renderHook, waitFor, act } from "@testing-library/react-native";
import { createTestQueryClient, createQueryWrapper } from "@/test-utils/queryClient";
import { recordSwipe, checkForMatch } from "@/api/discover";
import { useRecordSwipe } from "./useDiscover";

jest.mock("@/api/discover", () => ({
  recordSwipe: jest.fn(),
  checkForMatch: jest.fn(),
  listDiscoverCandidates: jest.fn(),
  getOriginCountriesWithConsent: jest.fn(),
}));

const mockRecordSwipe = recordSwipe as jest.Mock;
const mockCheckForMatch = checkForMatch as jest.Mock;

function setup() {
  const queryClient = createTestQueryClient();
  const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
  return { queryClient, invalidateSpy, wrapper: createQueryWrapper(queryClient) };
}

describe("useRecordSwipe", () => {
  it("checks for a match after a 'like' swipe", async () => {
    mockRecordSwipe.mockResolvedValue(undefined);
    mockCheckForMatch.mockResolvedValue(true);
    const { wrapper, invalidateSpy } = setup();

    const { result } = await renderHook(() => useRecordSwipe("circle-1", "me"), { wrapper });
    await act(async () => {
      result.current.mutate({ targetId: "alice", action: "like" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCheckForMatch).toHaveBeenCalledWith("me", "alice", "circle-1");
    expect(result.current.data).toBe(true);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["discoverCandidates", "circle-1", "me"] });
  });

  it("never checks for a match on a 'pass' swipe", async () => {
    mockRecordSwipe.mockResolvedValue(undefined);
    const { wrapper } = setup();

    const { result } = await renderHook(() => useRecordSwipe("circle-1", "me"), { wrapper });
    await act(async () => {
      result.current.mutate({ targetId: "alice", action: "pass" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCheckForMatch).not.toHaveBeenCalled();
    expect(result.current.data).toBe(false);
  });

  it("never checks for a match on a 'save' swipe", async () => {
    mockRecordSwipe.mockResolvedValue(undefined);
    const { wrapper } = setup();

    const { result } = await renderHook(() => useRecordSwipe("circle-1", "me"), { wrapper });
    await act(async () => {
      result.current.mutate({ targetId: "alice", action: "save" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCheckForMatch).not.toHaveBeenCalled();
    expect(result.current.data).toBe(false);
  });
});
