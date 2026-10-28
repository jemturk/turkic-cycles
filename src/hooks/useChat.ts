import { useCallback, useEffect } from "react";
import { useFocusEffect } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/api/client";
import {
  getOtherParticipant,
  listMessageThreads,
  listMessages,
  listNewConnections,
  listReactions,
  markThreadRead,
  sendMessage,
  toggleReaction,
  type MessageReaction,
  removeConnection,
  getMyConnectionFeedback,
  saveConnectionFeedback,
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

// Total unread messages across every conversation -- the desktop sidebar's Chat
// badge. Besides the thread list's own refetches, any new message that reaches
// this user (realtime only delivers rows RLS lets them read, so just their own
// conversations) refreshes it, so the badge moves while they're on another tab.
export function useUnreadMessageCount(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { data: threads } = useMessageThreads(userId);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`unread:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["messageThreads", userId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return (threads ?? []).reduce((sum, thread) => sum + thread.unreadCount, 0);
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
    mutationFn: ({ body, replyToId }: { body: string; replyToId?: string | null }) =>
      sendMessage(matchId as string, userId as string, body, replyToId),
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

// The conversation's reactions, kept live: any reaction added, changed or removed
// (realtime only delivers rows RLS lets this user read) refreshes the list.
export function useReactions(matchId: string | undefined) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["messageReactions", matchId],
    queryFn: () => listReactions(matchId as string),
    enabled: !!matchId,
  });

  useEffect(() => {
    if (!matchId) return;
    const channel = supabase
      .channel(`reactions:${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => {
        queryClient.invalidateQueries({ queryKey: ["messageReactions", matchId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, queryClient]);

  return query;
}

// Shows the change straight away and puts it back if saving fails.
export function useToggleReaction(matchId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ["messageReactions", matchId];
  return useMutation({
    mutationFn: ({ messageId, emoji, current }: { messageId: string; emoji: string; current?: string }) =>
      toggleReaction(messageId, userId as string, emoji, current),
    onMutate: async ({ messageId, emoji, current }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<MessageReaction[]>(queryKey);
      queryClient.setQueryData<MessageReaction[]>(queryKey, (list = []) => {
        const others = list.filter((r) => !(r.messageId === messageId && r.userId === userId));
        return current === emoji ? others : [...others, { messageId, userId: userId as string, emoji }];
      });
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

// Remove connection: the chat and the connection go from every list.
export function useRemoveConnection(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeConnection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messageThreads", userId] });
      queryClient.invalidateQueries({ queryKey: ["newConnections", userId] });
      queryClient.invalidateQueries({ queryKey: ["matchParticipant"] });
    },
  });
}

export function useMyConnectionFeedback(matchId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["connectionFeedback", matchId, userId],
    queryFn: () => getMyConnectionFeedback(matchId as string, userId as string),
    enabled: !!matchId && !!userId,
  });
}

export function useSaveConnectionFeedback(matchId: string | undefined, userId: string | undefined, otherUserId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (answer: Parameters<typeof saveConnectionFeedback>[3]) =>
      saveConnectionFeedback(matchId as string, userId as string, otherUserId as string, answer),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["connectionFeedback", matchId, userId] }),
  });
}
