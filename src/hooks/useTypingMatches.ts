import { useEffect, useMemo, useState } from "react";

import { listenForTyping } from "@/lib/typingChannels";
import { TYPING_TIMEOUT_MS } from "@/hooks/useTypingIndicator";

// Which of these conversations the other person is typing in right now -- for the
// conversation list, where "typing…" replaces the last message while it lasts. Same
// signals and timeout as the open conversation's indicator.
export function useTypingMatches(matchIds: string[], userId: string | undefined): Set<string> {
  const [typing, setTyping] = useState<Set<string>>(() => new Set());
  // A stable key, so a refetched list with the same conversations doesn't resubscribe.
  const key = useMemo(() => [...matchIds].sort().join(","), [matchIds]);

  useEffect(() => {
    if (!userId || !key) return;
    const ids = key.split(",");
    const timers = new Map<string, ReturnType<typeof setTimeout>>();

    const set = (matchId: string, on: boolean) =>
      setTyping((current) => {
        if (current.has(matchId) === on) return current;
        const next = new Set(current);
        if (on) next.add(matchId);
        else next.delete(matchId);
        return next;
      });

    const stops = ids.map((matchId) =>
      listenForTyping(matchId, ({ event, userId: from }) => {
        if (from === userId) return;
        const timer = timers.get(matchId);
        if (timer) clearTimeout(timer);
        if (event === "typing") {
          set(matchId, true);
          timers.set(matchId, setTimeout(() => set(matchId, false), TYPING_TIMEOUT_MS));
        } else {
          set(matchId, false);
        }
      })
    );

    return () => {
      stops.forEach((stop) => stop());
      timers.forEach((timer) => clearTimeout(timer));
      setTyping(new Set());
    };
  }, [key, userId]);

  return typing;
}
