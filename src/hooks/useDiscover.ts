import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  checkForMatch,
  getOriginCountriesWithConsent,
  listDiscoverCandidates,
  listGlobalDiscoverCandidates,
  recordSwipe,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discoverCandidates", circleId ?? null, userId] });
    },
  });
}
