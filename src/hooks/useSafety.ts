import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  cancelSafetyPlan,
  checkInSafetyPlan,
  createReport,
  createSafetyPlan,
  listMySafetyPlans,
} from "@/api/safety";

export function useMySafetyPlans(userId: string | undefined) {
  return useQuery({
    queryKey: ["safetyPlans", userId],
    queryFn: () => listMySafetyPlans(userId as string),
    enabled: !!userId,
  });
}

export function useCreateSafetyPlan(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Parameters<typeof createSafetyPlan>[1]) => createSafetyPlan(userId as string, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["safetyPlans", userId] }),
  });
}

export function useCheckInSafetyPlan(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => checkInSafetyPlan(planId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["safetyPlans", userId] }),
  });
}

export function useCancelSafetyPlan(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => cancelSafetyPlan(planId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["safetyPlans", userId] }),
  });
}

export function useCreateReport(userId: string | undefined) {
  return useMutation({
    mutationFn: ({ reportedUserId, reason, details }: { reportedUserId: string; reason: string; details?: string }) =>
      createReport(userId as string, reportedUserId, reason, details),
  });
}
