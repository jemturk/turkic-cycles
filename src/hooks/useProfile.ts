import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { completeOnboarding, getMyProfile } from "@/api/profiles";

export function useMyProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getMyProfile(userId as string),
    enabled: !!userId,
  });
}

export function useCompleteOnboarding(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => completeOnboarding(userId as string),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile", userId] }),
  });
}
