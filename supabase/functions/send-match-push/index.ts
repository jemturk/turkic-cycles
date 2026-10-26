// Fires from the on_match_insert_send_push trigger (migration 0055) on every new row
// in public.matches, and tells the person who liked first: "You and Ayc liked each
// other." The one who liked second already sees the match screen in the app, so
// they get nothing.
//
// Like send-message-push, it's deployed without JWT verification (Postgres calls
// it, not a signed-in user), so the payload is only trusted for the match's id:
// everything else is read from the database, and only for a match made in the last
// FRESH_MS, so a forged or replayed call can't push anything new.
//
// Respects the recipient's "Push notifications" switch (profiles.push_notifications_enabled)
// and writes in their app language (profiles.app_locale).
//
// Deploy with: supabase functions deploy send-match-push --no-verify-jwt
import { createClient } from "npm:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const FRESH_MS = 2 * 60 * 1000;

const TEXT: Record<string, { title: string; body: (name: string) => string; someone: string }> = {
  en: { title: "New match", body: (n) => `You and ${n} liked each other. Say hello!`, someone: "Someone" },
  tr: { title: "Yeni eşleşme", body: (n) => `Sen ve ${n} birbirinizi beğendiniz. Merhaba de!`, someone: "Biri" },
  de: { title: "Neues Match", body: (n) => `Du und ${n} mögt euch gegenseitig. Sag Hallo!`, someone: "Jemand" },
  ru: { title: "Новый мэтч", body: (n) => `Вы и ${n} понравились друг другу. Поздоровайтесь!`, someone: "Кто-то" },
};

type ExpoPushTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    if (payload?.table !== "matches" || payload?.type !== "INSERT" || typeof payload?.record?.id !== "string") {
      return new Response("ignored", { status: 200 });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: match } = await supabase
      .from("matches")
      .select("id, user_a, user_b, created_at")
      .eq("id", payload.record.id)
      .maybeSingle();
    if (!match) return new Response("no such match", { status: 200 });
    if (Date.now() - new Date(match.created_at).getTime() > FRESH_MS) {
      return new Response("not a new match", { status: 200 });
    }

    // Who liked first: the earlier of the pair's likes, in any scope.
    const { data: firstLike } = await supabase
      .from("swipes")
      .select("actor_id")
      .eq("action", "like")
      .or(
        `and(actor_id.eq.${match.user_a},target_id.eq.${match.user_b}),and(actor_id.eq.${match.user_b},target_id.eq.${match.user_a})`,
      )
      .order("updated_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!firstLike) return new Response("no likes found", { status: 200 });

    const recipientId = firstLike.actor_id;
    const otherId = recipientId === match.user_a ? match.user_b : match.user_a;

    const [{ data: recipient }, { data: other }, { data: tokenRows }] = await Promise.all([
      supabase.from("profiles").select("app_locale, push_notifications_enabled").eq("id", recipientId).single(),
      supabase.from("profiles").select("display_name").eq("id", otherId).single(),
      supabase.from("push_tokens").select("id, token").eq("user_id", recipientId),
    ]);
    if (recipient?.push_notifications_enabled === false) return new Response("push off", { status: 200 });
    if (!tokenRows || tokenRows.length === 0) return new Response("no tokens", { status: 200 });

    const text = TEXT[recipient?.app_locale ?? "en"] ?? TEXT.en;
    const name = other?.display_name || text.someone;
    const notifications = tokenRows.map((row) => ({
      to: row.token,
      title: text.title,
      body: text.body(name),
      sound: "default",
      data: { type: "match", matchId: match.id },
    }));

    const pushResponse = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(notifications),
    });
    if (!pushResponse.ok) {
      console.error("send-match-push: Expo rejected the request", pushResponse.status, await pushResponse.text());
      return new Response("ok", { status: 200 });
    }

    const { data: tickets } = (await pushResponse.json()) as { data: ExpoPushTicket[] };
    const staleTokenIds: string[] = [];
    tokenRows.forEach((row, i) => {
      const ticket = tickets?.[i];
      if (ticket?.status !== "error") return;
      // The token's row id, never the token itself (it's what addresses the device).
      console.error("send-match-push: delivery failed", {
        tokenRowId: row.id,
        matchId: match.id,
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
    console.error("send-match-push error", error);
    // Always 200: the trigger doesn't retry or read the response.
    return new Response("error", { status: 200 });
  }
});
