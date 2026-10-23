import { useEffect } from "react";
import { AppState } from "react-native";

import { supabase } from "@/api/client";
import { markAllDelivered, markMessageDelivered } from "@/api/chat";
import type { Tables } from "@/types/database";

// Marks messages sent to this user as delivered once they reach the app -- phone or
// web, whatever screen is open: everything waiting when the app opens or returns to
// the foreground, then each new one as it arrives over realtime. The sender's chat
// sees the update live (useMessages listens for UPDATEs). Messages sent while the
// app is closed stay "sent" until it's opened -- a push alone doesn't count, since
// the app can't act on it in the background.
export function useMarkDelivered(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    const markWaiting = () => markAllDelivered(userId).catch(() => {});
    markWaiting();
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") markWaiting();
    });

    // Realtime only delivers rows RLS lets this user read: their own conversations.
    const channel = supabase
      .channel(`delivered:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const message = payload.new as Tables<"messages">;
        if (message.sender_id !== userId && !message.delivered_at) {
          markMessageDelivered(message.id).catch(() => {});
        }
      })
      .subscribe();

    return () => {
      appState.remove();
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
