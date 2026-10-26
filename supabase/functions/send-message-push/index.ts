// Fires from the "on_message_insert_send_push" Database Webhook (see migration
// 0015_push_notifications.sql) on every new row in public.messages. Looks up the
// *other* match participant, sends an Expo push to each of their registered
// devices, and prunes any token Expo reports as no longer valid.
//
// The webhook payload is only used for the message's id: it's deployed without JWT
// verification (the webhook can't send one), so anyone could call it. The message
// itself -- text, sender, match -- is read from the database, and only if it was
// sent in the last FRESH_MS, so a forged or replayed call can't push made-up text
// or re-push old messages.
//
// Skipped when the recipient has turned push notifications off in Settings
// (profiles.push_notifications_enabled), like send-match-push.
//
// Every failed delivery is logged (Expo's error code, the token's row id), not
// just unregistered devices, so problems like a missing FCM key show up in the
// function's logs. Expo's later delivery receipts aren't checked yet (that needs
// the tickets stored and a follow-up call ~15 minutes later).
//
// Deploy with: supabase functions deploy send-message-push --no-verify-jwt
// (see README.md in this directory for why --no-verify-jwt and the full setup).
import { createClient } from "npm:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
// How recent a message must be to be pushed: comfortably more than the webhook's delay.
const FRESH_MS = 2 * 60 * 1000;

type ExpoPushTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    if (payload?.table !== "messages" || payload?.type !== "INSERT" || typeof payload?.record?.id !== "string") {
      return new Response("ignored", { status: 200 });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: message } = await supabase
      .from("messages")
      .select("id, match_id, sender_id, body, created_at")
      .eq("id", payload.record.id)
      .maybeSingle();
    if (!message) return new Response("no such message", { status: 200 });
    if (Date.now() - new Date(message.created_at).getTime() > FRESH_MS) {
      return new Response("not a new message", { status: 200 });
    }

    const { data: match } = await supabase
      .from("matches")
      .select("user_a, user_b")
      .eq("id", message.match_id)
      .single();
    if (!match) return new Response("no match", { status: 200 });

    const recipientId = match.user_a === message.sender_id ? match.user_b : match.user_a;

    const [{ data: tokenRows }, { data: senderProfile }, { data: recipient }] = await Promise.all([
      supabase.from("push_tokens").select("id, token").eq("user_id", recipientId),
      supabase.from("profiles").select("display_name").eq("id", message.sender_id).single(),
      supabase.from("profiles").select("push_notifications_enabled").eq("id", recipientId).single(),
    ]);
    // Settings > Push notifications off: no push (the message still arrives in the app).
    if (recipient?.push_notifications_enabled === false) return new Response("push off", { status: 200 });
    if (!tokenRows || tokenRows.length === 0) return new Response("no tokens", { status: 200 });

    const senderName = senderProfile?.display_name || "Someone";
    const notifications = tokenRows.map((row) => ({
      to: row.token,
      title: senderName,
      body: message.body,
      sound: "default",
      data: { type: "message", matchId: message.match_id, messageId: message.id },
    }));

    const pushResponse = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(notifications),
    });

    if (!pushResponse.ok) {
      console.error("send-message-push: Expo rejected the request", pushResponse.status, await pushResponse.text());
      return new Response("ok", { status: 200 });
    }

    const { data: tickets } = (await pushResponse.json()) as { data: ExpoPushTicket[] };
    const staleTokenIds: string[] = [];
    tokenRows.forEach((row, i) => {
      const ticket = tickets?.[i];
      if (ticket?.status !== "error") return;
      // The token's row id, never the token itself (it's what addresses the device).
      console.error("send-message-push: delivery failed", {
        tokenRowId: row.id,
        messageId: message.id,
        error: ticket.details?.error ?? "unknown",
        message: ticket.message,
      });
      if (ticket.details?.error === "DeviceNotRegistered") staleTokenIds.push(row.id);
    });
    if (staleTokenIds.length > 0) {
      await supabase.from("push_tokens").delete().in("id", staleTokenIds);
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("send-message-push error", error);
    // Always 200 -- the Database Webhook trigger doesn't retry or inspect the
    // response, so a non-2xx here would only show up as a noisy log entry, never
    // as a retried delivery. Nothing is gained by signaling failure back to it.
    return new Response("error", { status: 200 });
  }
});
