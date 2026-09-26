import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { checkForMatch, getOriginCountriesWithConsent, listDiscoverCandidates, recordSwipe } from "@/api/discover";

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

export function useDiscoverCandidates(circleId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["discoverCandidates", circleId, userId],
    queryFn: () => listDiscoverCandidates(circleId as string, userId as string),
    enabled: !!circleId && !!userId,
  });
}

type SwipeInput = {
  targetId: string;
  action: "like" | "pass" | "save";
};

export function useRecordSwipe(circleId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetId, action }: SwipeInput) => {
      await recordSwipe(userId as string, targetId, circleId as string, action);
      if (action === "like") {
        return checkForMatch(userId as string, targetId, circleId as string);
      }
      return false;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discoverCandidates", circleId, userId] });
    },
  });
}
