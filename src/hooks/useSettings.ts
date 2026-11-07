import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Tables } from "@/types/database";

import {
  blockUser,
  getMatchingPreferences,
  listBlockedUsers,
  deleteAccount,
  unblockUser,
  updateAppLocale,
  updateNotificationPreferences,
  updateProfileVisibility,
  updateLocationVisibility,
  type LocationVisibility,
  updateDiscoverable,
  updateTextSize,
  updateThemePreference,
  upsertMatchingPreferences,
  saveBoosts,
  type Boosts,
} from "@/api/settings";

export function useMatchingPreferences(userId: string | undefined) {
  return useQuery({
    queryKey: ["matchingPreferences", userId],
    queryFn: () => getMatchingPreferences(userId as string),
    enabled: !!userId,
  });
}

// Whether any matching preference narrows Discover (age, distance or languages), for
// the filter icon's dot and the empty deck's "Change filters".
export function useHasDiscoverFilters(userId: string | undefined) {
  const { data: preferences } = useMatchingPreferences(userId);
  return !!(
    preferences &&
    (preferences.age_min !== null ||
      preferences.age_max !== null ||
      preferences.max_distance_miles !== null ||
      preferences.languages.length > 0)
  );
}

export function useUpsertMatchingPreferences(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Parameters<typeof upsertMatchingPreferences>[1]) =>
      upsertMatchingPreferences(userId as string, values),
    onSuccess: (_data, values) => {
      // Put what was saved in the cache straight away: reopening the screen before the
      // refetch lands otherwise showed the old preferences (the form reads them once).
      queryClient.setQueryData(
        ["matchingPreferences", userId],
        (old: Tables<"matching_preferences"> | null | undefined) =>
          old
            ? {
                ...old,
                age_min: values.ageMin ?? null,
                age_max: values.ageMax ?? null,
                max_distance_miles: values.maxDistanceMiles ?? null,
                languages: values.languages,
              }
            : old
      );
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

export function useSaveBoosts(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (boosts: Boosts) => saveBoosts(userId as string, boosts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matchingPreferences", userId] });
      queryClient.invalidateQueries({ queryKey: ["discoverCandidates"] });
    },
  });
}

export function useUpdateLocationVisibility(userId: string | undefined) {
  const invalidate = useInvalidateProfile(userId);
  return useMutation({
    mutationFn: (visibility: LocationVisibility) => updateLocationVisibility(userId as string, visibility),
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
