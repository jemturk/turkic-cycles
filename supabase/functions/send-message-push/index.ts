// Fires from the "on_message_insert_send_push" Database Webhook (see migration
// 0015_push_notifications.sql) on every new row in public.messages. Looks up the
// *other* match participant, sends an Expo push to each of their registered
// devices, and prunes any token Expo reports as no longer valid.
//
// Deploy with: supabase functions deploy send-message-push --no-verify-jwt
// (see README.md in this directory for why --no-verify-jwt and the full setup).
import { createClient } from "npm:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type MessageRow = {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
};

type ExpoPushTicket = {
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
};

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    if (payload?.table !== "messages" || payload?.type !== "INSERT") {
      return new Response("ignored", { status: 200 });
    }
    const message = payload.record as MessageRow;

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: match } = await supabase
      .from("matches")
      .select("user_a, user_b")
      .eq("id", message.match_id)
      .single();
    if (!match) return new Response("no match", { status: 200 });

    const recipientId = match.user_a === message.sender_id ? match.user_b : match.user_a;

    const [{ data: tokenRows }, { data: senderProfile }] = await Promise.all([
      supabase.from("push_tokens").select("id, token").eq("user_id", recipientId),
      supabase.from("profiles").select("display_name").eq("id", message.sender_id).single(),
    ]);
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

    if (pushResponse.ok) {
      const { data: tickets } = (await pushResponse.json()) as { data: ExpoPushTicket[] };
      const staleTokenIds = tokenRows
        .filter((_, i) => tickets?.[i]?.details?.error === "DeviceNotRegistered")
        .map((row) => row.id);
      if (staleTokenIds.length > 0) {
        await supabase.from("push_tokens").delete().in("id", staleTokenIds);
      }
    } else {
      console.error("Expo push send failed", await pushResponse.text());
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
