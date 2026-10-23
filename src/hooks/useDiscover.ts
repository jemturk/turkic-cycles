import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  checkForMatch,
  getOriginCountriesWithConsent,
  listDiscoverCandidates,
  listGlobalDiscoverCandidates,
  listSavedPeople,
  recordSwipe,
  undoSwipe,
} from "@/api/discover";

export function useOriginCountriesWithConsent(targetUserId: string | undefined) {
  return useQuery({
    queryKey: ["originCountriesWithConsent", targetUserId],
    queryFn: async () => {
      const map = await getOriginCountriesWithConsent([targetUserId as string]);
      return map.get(targetUserId as string) ?? [];
    },
    enabled: !!targetUserId,
  });
}

// circleId: a circle's "Meet members" deck, or null for the global Discover tab.
// undefined (e.g. a route param that hasn't resolved) keeps the query idle.
export function useDiscoverCandidates(circleId: string | null | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["discoverCandidates", circleId, userId],
    queryFn: () =>
      circleId === null ? listGlobalDiscoverCandidates() : listDiscoverCandidates(circleId as string, userId as string),
    enabled: circleId !== undefined && !!userId,
  });
}

// Connections' Saved tab: people starred in any Discover deck.
export function useSavedPeople(userId: string | undefined) {
  return useQuery({
    queryKey: ["savedPeople", userId],
    queryFn: () => listSavedPeople(userId as string),
    enabled: !!userId,
  });
}

type SwipeInput = {
  targetId: string;
  action: "like" | "pass" | "save";
};

export function useRecordSwipe(circleId: string | null | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetId, action }: SwipeInput) => {
      const scope = circleId ?? null;
      await recordSwipe(userId as string, targetId, scope, action);
      if (action === "like") {
        return checkForMatch(userId as string, targetId, scope);
      }
      return false;
    },
    onSuccess: (isMatch) => {
      queryClient.invalidateQueries({ queryKey: ["discoverCandidates", circleId ?? null, userId] });
      // A save adds to the Saved tab; a like or pass from a saved profile takes
      // the person off it.
      queryClient.invalidateQueries({ queryKey: ["savedPeople", userId] });
      // Answering someone who liked you takes them off Likes you.
      queryClient.invalidateQueries({ queryKey: ["incomingLikes", userId] });
      queryClient.invalidateQueries({ queryKey: ["incomingLikesCount", userId] });
      if (isMatch) queryClient.invalidateQueries({ queryKey: ["newConnections", userId] });
    },
  });
}

// Discover's Undo: takes back the last answer; the lists it touched refresh.
export function useUndoSwipe(circleId: string | null | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetId: string) => undoSwipe(userId as string, targetId, circleId ?? null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedPeople", userId] });
      queryClient.invalidateQueries({ queryKey: ["incomingLikes", userId] });
      queryClient.invalidateQueries({ queryKey: ["incomingLikesCount", userId] });
    },
  });
}
