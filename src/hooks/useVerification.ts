import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getMyVerificationStatus, getOtherUserVerificationStatus, startVerification } from "@/api/verification";

export function useMyVerificationStatus(userId: string | undefined) {
  return useQuery({
    queryKey: ["verificationStatus", userId],
    queryFn: () => getMyVerificationStatus(userId as string),
    enabled: !!userId,
  });
}

export function useOtherUserVerificationStatus(targetUserId: string | undefined) {
  return useQuery({
    queryKey: ["otherVerificationStatus", targetUserId],
    queryFn: () => getOtherUserVerificationStatus(targetUserId as string),
    enabled: !!targetUserId,
  });
}

// Starts verification and returns Stripe's page URL to open; the status is now
// 'pending', so the screen refreshes it.
export function useStartVerification(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (platform: "web" | "app") => startVerification(platform),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["verificationStatus", userId] }),
  });
}
