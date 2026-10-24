import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  blockUser,
  getMatchingPreferences,
  listBlockedUsers,
  deleteAccount,
  unblockUser,
  updateAppLocale,
  updateNotificationPreferences,
  updateProfileVisibility,
  updateDiscoverable,
  updateTextSize,
  updateThemePreference,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matchingPreferences", userId] });
      // Both Discover decks filter on these server-side (0052), so refetch them.
      queryClient.invalidateQueries({ queryKey: ["discoverCandidates"] });
    },
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
    mutationFn: (locale: "en" | "tr" | "ru" | "de") => updateAppLocale(userId as string, locale),
    onSuccess: invalidate,
  });
}

export function useUpdateThemePreference(userId: string | undefined) {
  const invalidate = useInvalidateProfile(userId);
  return useMutation({
    mutationFn: (theme: "light" | "dark") => updateThemePreference(userId as string, theme),
    onSuccess: invalidate,
  });
}

export function useUpdateTextSize(userId: string | undefined) {
  const invalidate = useInvalidateProfile(userId);
  return useMutation({
    mutationFn: (textSize: "small" | "default" | "large") => updateTextSize(userId as string, textSize),
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

export function useUpdateDiscoverable(userId: string | undefined) {
  const invalidate = useInvalidateProfile(userId);
  return useMutation({
    mutationFn: (discoverable: boolean) => updateDiscoverable(userId as string, discoverable),
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

export function useDeleteAccount() {
  return useMutation({ mutationFn: deleteAccount });
}
