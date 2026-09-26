import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  blockUser,
  getMatchingPreferences,
  listBlockedUsers,
  requestAccountDeletion,
  unblockUser,
  updateAppLocale,
  updateNotificationPreferences,
  updateProfileVisibility,
  upsertMatchingPreferences,
} from "@/api/settings";

export function useMatchingPreferences(userId: string | undefined) {
  return useQuery({
    queryKey: ["matchingPreferences", userId],
    queryFn: () => getMatchingPreferences(userId as string),
    enabled: !!userId,
  });
}

export function useUpsertMatchingPreferences(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Parameters<typeof upsertMatchingPreferences>[1]) =>
      upsertMatchingPreferences(userId as string, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["matchingPreferences", userId] }),
  });
}

function useInvalidateProfile(userId: string | undefined) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["profile", userId] });
}

export function useUpdateNotificationPreferences(userId: string | undefined) {
  const invalidate = useInvalidateProfile(userId);
  return useMutation({
    mutationFn: (values: Parameters<typeof updateNotificationPreferences>[1]) =>
      updateNotificationPreferences(userId as string, values),
    onSuccess: invalidate,
  });
}

export function useUpdateAppLocale(userId: string | undefined) {
  const invalidate = useInvalidateProfile(userId);
  return useMutation({
    mutationFn: (locale: "en" | "tr") => updateAppLocale(userId as string, locale),
    onSuccess: invalidate,
  });
}

export function useUpdateProfileVisibility(userId: string | undefined) {
  const invalidate = useInvalidateProfile(userId);
  return useMutation({
    mutationFn: (visibility: "visible" | "hidden") => updateProfileVisibility(userId as string, visibility),
    onSuccess: invalidate,
  });
}

export function useBlockedUsers(userId: string | undefined) {
  return useQuery({
    queryKey: ["blockedUsers", userId],
    queryFn: () => listBlockedUsers(userId as string),
    enabled: !!userId,
  });
}

export function useBlockUser(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (blockedId: string) => blockUser(userId as string, blockedId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blockedUsers", userId] }),
  });
}

export function useUnblockUser(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (blockedId: string) => unblockUser(userId as string, blockedId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blockedUsers", userId] }),
  });
}

export function useRequestAccountDeletion(userId: string | undefined) {
  return useMutation({
    mutationFn: () => requestAccountDeletion(userId as string),
  });
}
