import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countIncomingLikes,
  debugSetMyTier,
  debugSetMyVerified,
  getIsTestAccount,
  getMySubscription,
  hasPlus,
  isOnPlusWaitlist,
  joinPlusWaitlist,
  leavePlusWaitlist,
  listIncomingLikes,
  syncMySubscription,
} from "@/api/plus";
import { getPlusPackages, purchasePlusPackage, purchasesAvailable, restorePurchases } from "@/lib/purchases";

export function useMySubscription(userId: string | undefined) {
  return useQuery({
    queryKey: ["subscription", userId],
    queryFn: () => getMySubscription(userId as string),
    enabled: !!userId,
  });
}

// undefined while loading, so callers don't flash the free state at a subscriber.
export function useHasPlus(userId: string | undefined): boolean | undefined {
  const { data } = useMySubscription(userId);
  return data ? hasPlus(data) : undefined;
}

// TEMPORARY: see debugSetMyTier / debugSetMyVerified.
export function useDebugSetTier(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: debugSetMyTier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription", userId] });
      queryClient.invalidateQueries({ queryKey: ["incomingLikes", userId] });
    },
  });
}

export function useDebugSetVerified(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: debugSetMyVerified,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["verificationStatus", userId] }),
  });
}

export function usePlusWaitlist(userId: string | undefined) {
  return useQuery({
    queryKey: ["plusWaitlist", userId],
    queryFn: () => isOnPlusWaitlist(userId as string),
    enabled: !!userId,
  });
}

export function useSetPlusWaitlist(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (join: boolean) => (join ? joinPlusWaitlist(userId as string) : leavePlusWaitlist(userId as string)),
    onSuccess: (_, join) => queryClient.setQueryData(["plusWaitlist", userId], join),
  });
}

export function usePlusPackages(userId: string | undefined) {
  return useQuery({
    queryKey: ["plusPackages", userId],
    queryFn: () => getPlusPackages(userId as string),
    enabled: !!userId && purchasesAvailable,
    staleTime: 5 * 60 * 1000,
  });
}

// Returns whether the user has Plus once the server has caught up.
function useAfterStoreChange(userId: string | undefined) {
  const queryClient = useQueryClient();
  return async () => {
    await syncMySubscription();
    const subscription = await queryClient.fetchQuery({
      queryKey: ["subscription", userId],
      queryFn: () => getMySubscription(userId as string),
      staleTime: 0,
    });
    queryClient.invalidateQueries({ queryKey: ["incomingLikes", userId] });
    return hasPlus(subscription);
  };
}

export function usePurchasePlus(userId: string | undefined) {
  const afterStoreChange = useAfterStoreChange(userId);
  return useMutation({
    mutationFn: async (packageId: string) => {
      const outcome = await purchasePlusPackage(userId as string, packageId);
      if (outcome === "purchased") await afterStoreChange();
      return outcome;
    },
  });
}

export function useRestorePurchases(userId: string | undefined) {
  const afterStoreChange = useAfterStoreChange(userId);
  return useMutation({
    mutationFn: async () => {
      await restorePurchases(userId as string);
      return afterStoreChange();
    },
  });
}

export function useIncomingLikesCount(userId: string | undefined) {
  return useQuery({
    queryKey: ["incomingLikesCount", userId],
    queryFn: countIncomingLikes,
    enabled: !!userId,
  });
}

// Only runs for subscribers -- the server would refuse anyone else.
export function useIncomingLikes(userId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["incomingLikes", userId],
    queryFn: listIncomingLikes,
    enabled: !!userId && enabled,
  });
}

// Test accounts (migration 0042) see the Settings test controls.
export function useIsTestAccount(userId: string | undefined) {
  return useQuery({
    queryKey: ["isTestAccount", userId],
    queryFn: getIsTestAccount,
    enabled: !!userId,
  });
}
