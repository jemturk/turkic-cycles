import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "@/api/client";

// How long the indicator stays visible after the last "typing" broadcast received --
// there's no separate "stopped typing" event to wait for (one more message that could
// get lost/arrive late), so it just expires on its own if typing goes quiet.
const TYPING_TIMEOUT_MS = 3000;
// Caps how often this client itself broadcasts while the user is actively typing --
// once per keystroke would be a lot of realtime traffic for no benefit, since the
// receiving end only needs to know "still typing", not the exact keystroke cadence.
const SEND_THROTTLE_MS = 2000;

// Realtime Broadcast, not a database table -- this is ephemeral, in-memory pub/sub
// scoped to the channel, so there's nothing to migrate or persist for it.
export function useTypingIndicator(matchId: string | undefined, userId: string | undefined) {
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentAtRef = useRef(0);

  useEffect(() => {
    if (!matchId || !userId) return;

    const channel = supabase.channel(`typing:${matchId}`).on("broadcast", { event: "typing" }, ({ payload }) => {
      if (payload?.userId === userId) return;
      setIsOtherTyping(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setIsOtherTyping(false), TYPING_TIMEOUT_MS);
    });
    // Sent when they send the message or clear the box, so the dots go at once rather
    // than waiting out the timeout. If it's lost, the timeout still hides them.
    channel.on("broadcast", { event: "stopped" }, ({ payload }) => {
      if (payload?.userId === userId) return;
      clearOtherTyping();
    });
    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsOtherTyping(false);
    };
  }, [matchId, userId]);

  function notifyTyping() {
    const now = Date.now();
    if (now - lastSentAtRef.current < SEND_THROTTLE_MS) return;
    lastSentAtRef.current = now;
    channelRef.current?.send({ type: "broadcast", event: "typing", payload: { userId } });
  }

  // Tells the other side this user stopped typing (sent the message, cleared the
  // box). Only when a "typing" went out since the last one, to keep traffic down.
  function notifyStopped() {
    if (lastSentAtRef.current === 0) return;
    lastSentAtRef.current = 0;
    channelRef.current?.send({ type: "broadcast", event: "stopped", payload: { userId } });
  }

  // Hides the dots now -- when their message arrives, which ends the typing.
  function clearOtherTyping() {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setIsOtherTyping(false);
  }

  return { isOtherTyping, notifyTyping, notifyStopped, clearOtherTyping };
}
