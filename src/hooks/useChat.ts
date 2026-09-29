import { useCallback, useEffect } from "react";
import { useFocusEffect } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/api/client";
import {
  getOtherParticipant,
  listMessageThreads,
  listMessages,
  listNewConnections,
  markThreadRead,
  sendMessage,
} from "@/api/chat";
import type { Tables } from "@/types/database";

export function useNewConnections(userId: string | undefined) {
  const query = useQuery({
    queryKey: ["newConnections", userId],
    queryFn: () => listNewConnections(userId as string),
    enabled: !!userId,
  });

  // The callback MUST be memoized: useFocusEffect re-runs it whenever its identity
  // changes, and refetch() itself changes this query's isFetching/data, which
  // changes `query`'s identity on the next render -- an inline (non-memoized)
  // callback here closes over that new `query` every render, so useFocusEffect
  // sees a "new" callback and refetches again, forever. This is why the pull
  // indicator/spinner could spin indefinitely instead of settling once refetched.
  useFocusEffect(
    useCallback(() => {
      if (userId) query.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId])
  );

  return query;
}

export function useMessageThreads(userId: string | undefined) {
  const query = useQuery({
    queryKey: ["messageThreads", userId],
    queryFn: () => listMessageThreads(userId as string),
    enabled: !!userId,
  });

  // See useNewConnections above for why this must be memoized.
  useFocusEffect(
    useCallback(() => {
      if (userId) query.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId])
  );

  return query;
}

export function useMatchParticipant(matchId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["matchParticipant", matchId, userId],
    queryFn: () => getOtherParticipant(matchId as string, userId as string),
    enabled: !!matchId && !!userId,
  });
}

export function useMessages(matchId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ["messages", matchId];

  const query = useQuery({
    queryKey,
    queryFn: () => listMessages(matchId as string),
    enabled: !!matchId,
  });

  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          queryClient.setQueryData<Tables<"messages">[]>(queryKey, (current) => {
            const next = payload.new as Tables<"messages">;
            if (current?.some((m) => m.id === next.id)) return current;
            return [...(current ?? []), next];
          });
        }
      )
      // The other participant's markThreadRead sets read_at on rows I sent -- this
      // is what flips a message's own tick from "sent" to "read" live, without
      // waiting for this screen to be revisited/refetched.
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const updated = payload.new as Tables<"messages">;
          queryClient.setQueryData<Tables<"messages">[]>(queryKey, (current) =>
            current?.map((m) => (m.id === updated.id ? updated : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  return query;
}

export function useSendMessage(matchId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => sendMessage(matchId as string, userId as string, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", matchId] });
      queryClient.invalidateQueries({ queryKey: ["messageThreads", userId] });
      queryClient.invalidateQueries({ queryKey: ["newConnections", userId] });
    },
  });
}

export function useMarkThreadRead(matchId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markThreadRead(matchId as string, userId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messageThreads", userId] });
    },
  });
}
