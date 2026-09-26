import { useEffect } from "react";
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

  useFocusEffect(() => {
    if (userId) query.refetch();
  });

  return query;
}

export function useMessageThreads(userId: string | undefined) {
  const query = useQuery({
    queryKey: ["messageThreads", userId],
    queryFn: () => listMessageThreads(userId as string),
    enabled: !!userId,
  });

  useFocusEffect(() => {
    if (userId) query.refetch();
  });

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
