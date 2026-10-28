import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getMyConnectionTypes,
  getMyProfileSensitive,
  getMyQuestionnaireResponses,
  saveProfileEdit,
  submitOnboardingStep1,
  submitOnboardingStep2,
  submitOnboardingStep3,
  submitOnboardingStep4,
  submitOnboardingPhotosAndComplete,
} from "@/api/onboarding";

export function useMyConnectionTypes(userId: string | undefined) {
  return useQuery({
    queryKey: ["connectionTypes", userId],
    queryFn: () => getMyConnectionTypes(userId as string),
    enabled: !!userId,
  });
}

export function useMyQuestionnaireResponses(userId: string | undefined) {
  return useQuery({
    queryKey: ["questionnaireResponses", userId],
    queryFn: () => getMyQuestionnaireResponses(userId as string),
    enabled: !!userId,
  });
}

export function useMyProfileSensitive(userId: string | undefined) {
  return useQuery({
    queryKey: ["profileSensitive", userId],
    queryFn: () => getMyProfileSensitive(userId as string),
    enabled: !!userId,
  });
}

function useInvalidateOnboarding(userId: string | undefined) {
  const queryClient = useQueryClient();
  return (extraKeys: string[] = []) => {
    queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    queryClient.invalidateQueries({ queryKey: ["connectionTypes", userId] });
    for (const key of extraKeys) {
      queryClient.invalidateQueries({ queryKey: [key, userId] });
    }
  };
}

export function useSubmitOnboardingStep1(userId: string | undefined) {
  const invalidate = useInvalidateOnboarding(userId);
  return useMutation({
    mutationFn: (values: Parameters<typeof submitOnboardingStep1>[1]) =>
      submitOnboardingStep1(userId as string, values),
    onSuccess: () => invalidate(),
  });
}

export function useSubmitOnboardingStep2(userId: string | undefined) {
  const invalidate = useInvalidateOnboarding(userId);
  return useMutation({
    mutationFn: ({
      values,
      corePayload,
    }: {
      values: Parameters<typeof submitOnboardingStep2>[1];
      corePayload: Parameters<typeof submitOnboardingStep2>[2];
    }) => submitOnboardingStep2(userId as string, values, corePayload),
    onSuccess: () => invalidate(["questionnaireResponses"]),
  });
}

export function useSubmitOnboardingStep3(userId: string | undefined) {
  const invalidate = useInvalidateOnboarding(userId);
  return useMutation({
    mutationFn: ({
      values,
      corePayload,
    }: {
      values: Parameters<typeof submitOnboardingStep3>[1];
      corePayload: Parameters<typeof submitOnboardingStep3>[2];
    }) => submitOnboardingStep3(userId as string, values, corePayload),
    onSuccess: () => invalidate(["questionnaireResponses", "profileSensitive"]),
  });
}

export function useSubmitOnboardingStep4(userId: string | undefined) {
  const invalidate = useInvalidateOnboarding(userId);
  return useMutation({
    mutationFn: ({
      answers,
      connectionTypes,
    }: {
      answers: Parameters<typeof submitOnboardingStep4>[1];
      connectionTypes: Parameters<typeof submitOnboardingStep4>[2];
    }) => submitOnboardingStep4(userId as string, answers, connectionTypes),
    onSuccess: () => invalidate(["questionnaireResponses"]),
  });
}

export function useSubmitOnboardingPhotosAndComplete(userId: string | undefined) {
  const invalidate = useInvalidateOnboarding(userId);
  return useMutation({
    mutationFn: () => submitOnboardingPhotosAndComplete(userId as string),
    onSuccess: () => invalidate(),
  });
}

export function useSaveProfileEdit(userId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateOnboarding(userId);
  return useMutation({
    mutationFn: (values: Parameters<typeof saveProfileEdit>[1]) => saveProfileEdit(userId as string, values),
    onSuccess: () => {
      invalidate(["questionnaireResponses", "profileSensitive"]);
      // Connection types and languages feed Discover's filters (0052).
      queryClient.invalidateQueries({ queryKey: ["discoverCandidates"] });
    },
  });
}
