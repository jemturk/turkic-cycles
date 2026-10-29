import type { QueryClient } from "@tanstack/react-query";

import { sendMessage } from "@/api/chat";
import type { Tables } from "@/types/database";

// A message on its way out. Everything the send needs is in here (not in a closure),
// because a send waiting for the network is saved to the device with these as its
// variables and picked up again after a restart (lib/queryClient.ts).
export type OutgoingMessage = {
  id: string;
  matchId: string;
  senderId: string;
  body: string;
  replyToId: string | null;
  createdAt: string;
};

export const SEND_MESSAGE_KEY = "sendMessage";

// The send itself lives in the client's defaults rather than in useSendMessage, so a
// send restored from the device (no component holding it) still knows what to run.
// Retries pause while offline and carry on once back online.
export function registerSendMessageDefaults(queryClient: QueryClient) {
  queryClient.setMutationDefaults([SEND_MESSAGE_KEY], {
    mutationFn: (message: OutgoingMessage) =>
      sendMessage(message.id, message.matchId, message.senderId, message.body, message.replyToId),
    retry: 3,
    onSuccess: (row: Tables<"messages">, message: OutgoingMessage) => {
      // Straight into the conversation, so the bubble doesn't blink out between
      // leaving the outbox and the refetch bringing it back.
      queryClient.setQueryData<Tables<"messages">[]>(["messages", message.matchId], (current) =>
        current?.some((m) => m.id === row.id) ? current : [...(current ?? []), row]
      );
      queryClient.invalidateQueries({ queryKey: ["messages", message.matchId] });
      queryClient.invalidateQueries({ queryKey: ["messageThreads", message.senderId] });
      queryClient.invalidateQueries({ queryKey: ["newConnections", message.senderId] });
    },
  });
}

// A message as the conversation shows it while it's still in the outbox.
export function outgoingAsRow(message: OutgoingMessage): Tables<"messages"> {
  return {
    id: message.id,
    match_id: message.matchId,
    sender_id: message.senderId,
    body: message.body,
    reply_to_id: message.replyToId,
    created_at: message.createdAt,
    read_at: null,
    delivered_at: null,
  };
}
