import { useEffect, useRef, useState } from "react";

import { listenForTyping, sendTyping } from "@/lib/typingChannels";

// How long the indicator stays visible after the last "typing" broadcast received --
// there's no separate "stopped typing" event to wait for (one more message that could
// get lost/arrive late), so it just expires on its own if typing goes quiet.
export const TYPING_TIMEOUT_MS = 3000;
// Caps how often this client itself broadcasts while the user is actively typing --
// once per keystroke would be a lot of realtime traffic for no benefit, since the
// receiving end only needs to know "still typing", not the exact keystroke cadence.
const SEND_THROTTLE_MS = 2000;

// Realtime Broadcast, not a database table -- this is ephemeral, in-memory pub/sub
// scoped to the channel, so there's nothing to migrate or persist for it.
export function useTypingIndicator(matchId: string | undefined, userId: string | undefined) {
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentAtRef = useRef(0);

  useEffect(() => {
    if (!matchId || !userId) return;

    const stopListening = listenForTyping(matchId, ({ event, userId: from }) => {
      if (from === userId) return;
      if (event === "typing") {
        setIsOtherTyping(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => setIsOtherTyping(false), TYPING_TIMEOUT_MS);
      } else {
        // Sent when they send the message or clear the box, so the dots go at once
        // rather than waiting out the timeout. If it's lost, the timeout still hides them.
        clearOtherTyping();
      }
    });

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      stopListening();
      setIsOtherTyping(false);
    };
  }, [matchId, userId]);

  function notifyTyping() {
    if (!matchId || !userId) return;
    const now = Date.now();
    if (now - lastSentAtRef.current < SEND_THROTTLE_MS) return;
    lastSentAtRef.current = now;
    sendTyping(matchId, { event: "typing", userId });
  }

  // Tells the other side this user stopped typing (sent the message, cleared the
  // box). Only when a "typing" went out since the last one, to keep traffic down.
  function notifyStopped() {
    if (!matchId || !userId || lastSentAtRef.current === 0) return;
    lastSentAtRef.current = 0;
    sendTyping(matchId, { event: "stopped", userId });
  }

  // Hides the dots now -- when their message arrives, which ends the typing.
  function clearOtherTyping() {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setIsOtherTyping(false);
  }

  return { isOtherTyping, notifyTyping, notifyStopped, clearOtherTyping };
}
