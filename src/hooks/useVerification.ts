import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getMyVerificationStatus, getOtherUserVerificationStatus, submitVerificationStub } from "@/api/verification";

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

export function useSubmitVerificationStub(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => submitVerificationStub(userId as string),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["verificationStatus", userId] }),
  });
}
