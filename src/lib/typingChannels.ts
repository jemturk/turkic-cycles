import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "@/api/client";

// One Realtime Broadcast channel per conversation ("typing:<matchId>"), shared by
// everything on screen that cares -- the open conversation (useTypingIndicator) and
// the conversation list (useTypingMatches) can both be up at once on desktop, and
// two channels with the same topic in one client would trip over each other. The
// channel opens with its first listener and closes with its last.
export type TypingEvent = { event: "typing" | "stopped"; userId: string };
type Listener = (event: TypingEvent) => void;

const channels = new Map<string, { channel: RealtimeChannel; listeners: Set<Listener> }>();

export function listenForTyping(matchId: string, listener: Listener): () => void {
  let entry = channels.get(matchId);
  if (!entry) {
    const listeners = new Set<Listener>();
    const forward = (event: TypingEvent["event"]) => ({ payload }: { payload?: { userId?: string } }) => {
      if (payload?.userId) listeners.forEach((l) => l({ event, userId: payload.userId as string }));
    };
    const channel = supabase
      .channel(`typing:${matchId}`)
      .on("broadcast", { event: "typing" }, forward("typing"))
      .on("broadcast", { event: "stopped" }, forward("stopped"));
    channel.subscribe();
    entry = { channel, listeners };
    channels.set(matchId, entry);
  }
  entry.listeners.add(listener);

  return () => {
    const current = channels.get(matchId);
    if (!current) return;
    current.listeners.delete(listener);
    if (current.listeners.size === 0) {
      supabase.removeChannel(current.channel);
      channels.delete(matchId);
    }
  };
}

// Only works while something is listening on that conversation (the open one is).
export function sendTyping(matchId: string, event: TypingEvent) {
  channels.get(matchId)?.channel.send({ type: "broadcast", event: event.event, payload: { userId: event.userId } });
}
