// Fires from the on_like_send_push trigger (migration 0058) on every new like, and tells
// the person liked "Someone liked you" -- not who: seeing who is Plus's Likes you.
//
// Like send-message-push, it's deployed without JWT verification (Postgres calls it, not
// a signed-in user), so the payload is only trusted for the pair's ids: the like itself
// is read from the database, and only if it was made in the last FRESH_MS.
//
// Stays quiet when:
//   * the like made a match -- send-match-push tells them instead;
//   * either has blocked the other;
//   * the recipient turned push notifications off (profiles.push_notifications_enabled);
//   * they already got one recently: another like reached them within QUIET_MS before
//     this one, so ten likes in a row are one push, not ten.
// Writes in the recipient's app language (profiles.app_locale).
//
// Deploy with: supabase functions deploy send-like-push --no-verify-jwt
import { createClient } from "npm:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const FRESH_MS = 2 * 60 * 1000;
const QUIET_MS = 30 * 60 * 1000;

const TEXT: Record<string, { title: string; body: string }> = {
  en: { title: "Someone liked you", body: "Like them back in Discover to make it a match." },
  tr: { title: "Biri seni beğendi", body: "Keşfet'te sen de beğenirsen eşleşirsiniz." },
  de: { title: "Jemand mag dich", body: "Like zurück in Entdecken, dann ist es ein Match." },
  ru: { title: "Вы кому-то понравились", body: "Ответьте взаимностью в «Обзоре», чтобы получился мэтч." },
};

type ExpoPushTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const actorId = payload?.record?.actor_id;
    const targetId = payload?.record?.target_id;
    if (payload?.table !== "swipes" || payload?.type !== "INSERT" || !UUID.test(actorId) || !UUID.test(targetId)) {
      return new Response("ignored", { status: 200 });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: like } = await supabase
      .from("swipes")
      .select("updated_at")
      .eq("actor_id", actorId)
      .eq("target_id", targetId)
      .eq("action", "like")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!like) return new Response("no such like", { status: 200 });
    const likedAt = new Date(like.updated_at).getTime();
    if (Date.now() - likedAt > FRESH_MS) return new Response("not a new like", { status: 200 });

    const userA = actorId < targetId ? actorId : targetId;
    const userB = actorId < targetId ? targetId : actorId;
    const [{ data: match }, { data: blocks }, { data: earlierLikes }] = await Promise.all([
      supabase.from("matches").select("id").eq("user_a", userA).eq("user_b", userB).limit(1).maybeSingle(),
      supabase
        .from("blocked_users")
        .select("blocker_id")
        .or(`and(blocker_id.eq.${actorId},blocked_id.eq.${targetId}),and(blocker_id.eq.${targetId},blocked_id.eq.${actorId})`)
        .limit(1),
      supabase
        .from("swipes")
        .select("actor_id")
        .eq("target_id", targetId)
        .eq("action", "like")
        .neq("actor_id", actorId)
        .gte("updated_at", new Date(likedAt - QUIET_MS).toISOString())
        .lt("updated_at", like.updated_at)
        .limit(1),
    ]);
    if (match) return new Response("matched", { status: 200 });
    if (blocks && blocks.length > 0) return new Response("blocked", { status: 200 });
    if (earlierLikes && earlierLikes.length > 0) return new Response("recently told", { status: 200 });

    const [{ data: recipient }, { data: tokenRows }] = await Promise.all([
      supabase.from("profiles").select("app_locale, push_notifications_enabled").eq("id", targetId).single(),
      supabase.from("push_tokens").select("id, token").eq("user_id", targetId),
    ]);
    if (recipient?.push_notifications_enabled === false) return new Response("push off", { status: 200 });
    if (!tokenRows || tokenRows.length === 0) return new Response("no tokens", { status: 200 });

    const text = TEXT[recipient?.app_locale ?? "en"] ?? TEXT.en;
    const notifications = tokenRows.map((row) => ({
      to: row.token,
      title: text.title,
      body: text.body,
      sound: "default",
      data: { type: "like" },
    }));

    const pushResponse = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(notifications),
    });
    if (!pushResponse.ok) {
      console.error("send-like-push: Expo rejected the request", pushResponse.status, await pushResponse.text());
      return new Response("ok", { status: 200 });
    }

    const { data: tickets } = (await pushResponse.json()) as { data: ExpoPushTicket[] };
    const staleTokenIds: string[] = [];
    tokenRows.forEach((row, i) => {
      const ticket = tickets?.[i];
      if (ticket?.status !== "error") return;
      // The token's row id, never the token itself (it's what addresses the device).
      console.error("send-like-push: delivery failed", {
        tokenRowId: row.id,
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
    console.error("send-like-push error", error);
    // Always 200: the trigger doesn't retry or read the response.
    return new Response("error", { status: 200 });
  }
});
