// Tells people an upcoming event they replied Going or Interested to is cancelled.
// delete_event and delete_circle (migrations 0069, 0070) queue an
// event_cancellation_notices row and call this with its id through pg_net.
//
// Like the other push functions it's deployed without JWT verification (Postgres calls
// it, not a signed-in user), so the payload is only trusted for the notice's id: the
// event, circle and recipients are read from the notice, which only those database
// functions can write. The notice is claimed by deleting it, so each is sent once and
// the recipient list isn't kept; a notice older than FRESH_MS is dropped unsent.
//
// Stays quiet for recipients who turned push notifications off
// (profiles.push_notifications_enabled). Writes in each recipient's app language
// (profiles.app_locale), with the date as it reads where the circle is (every circle
// so far is in US Eastern; events don't store a time zone).
//
// Deploy with: supabase functions deploy send-event-cancelled-push --no-verify-jwt
import { createClient } from "npm:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const FRESH_MS = 10 * 60 * 1000;
const EXPO_BATCH = 100;
const EVENT_TIME_ZONE = "America/New_York";

type Kind = "event" | "circle";
const TEXT: Record<string, { title: string; body: Record<Kind, string> }> = {
  en: {
    title: "{event} on {date} is cancelled",
    body: { event: "{circle} cancelled this event.", circle: "{circle} has closed, so this event won't go ahead." },
  },
  tr: {
    title: "{date} tarihli {event} iptal edildi",
    body: { event: "{circle} bu etkinliği iptal etti.", circle: "{circle} kapandı, bu etkinlik yapılmayacak." },
  },
  de: {
    title: "{event} am {date} fällt aus",
    body: { event: "{circle} hat dieses Event abgesagt.", circle: "{circle} wurde geschlossen, daher findet dieses Event nicht statt." },
  },
  ru: {
    title: "«{event}» {date} отменено",
    body: { event: "Круг «{circle}» отменил это событие.", circle: "Круг «{circle}» закрыт, поэтому это событие не состоится." },
  },
};
const DATE_LOCALE: Record<string, string> = { en: "en-US", tr: "tr-TR", de: "de-DE", ru: "ru-RU" };

type ExpoPushTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const noticeId = payload?.notice_id;
    if (!UUID.test(noticeId)) return new Response("ignored", { status: 200 });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Claim the notice: deleting it means no second call can send it again.
    const { data: notice } = await supabase
      .from("event_cancellation_notices")
      .delete()
      .eq("id", noticeId)
      .select("kind, event_title, starts_at, circle_id, circle_name, recipients, created_at")
      .maybeSingle();
    if (!notice) return new Response("no such notice", { status: 200 });
    if (Date.now() - new Date(notice.created_at).getTime() > FRESH_MS) {
      return new Response("stale notice", { status: 200 });
    }
    const recipients = (notice.recipients ?? []) as string[];
    if (recipients.length === 0) return new Response("nobody to tell", { status: 200 });

    const [{ data: profiles }, { data: tokenRows }] = await Promise.all([
      supabase.from("profiles").select("id, app_locale, push_notifications_enabled").in("id", recipients),
      supabase.from("push_tokens").select("id, user_id, token").in("user_id", recipients),
    ]);
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
    const kind = notice.kind as Kind;

    const sendable = (tokenRows ?? []).filter((row) => profileById.get(row.user_id)?.push_notifications_enabled !== false);
    if (sendable.length === 0) return new Response("no tokens", { status: 200 });

    const notifications = sendable.map((row) => {
      const locale = profileById.get(row.user_id)?.app_locale ?? "en";
      const text = TEXT[locale] ?? TEXT.en;
      const date = new Intl.DateTimeFormat(DATE_LOCALE[locale] ?? "en-US", {
        month: "short",
        day: "numeric",
        timeZone: EVENT_TIME_ZONE,
      }).format(new Date(notice.starts_at));
      const values = { event: notice.event_title, circle: notice.circle_name, date };
      return {
        to: row.token,
        title: fill(text.title, values),
        body: fill(text.body[kind], values),
        sound: "default",
        // A cancelled event opens its circle; a closed circle, the Circles list.
        data: { type: "event_cancelled", circleId: kind === "event" ? notice.circle_id : null },
      };
    });

    // Expo takes up to 100 notifications per request.
    const staleTokenIds: string[] = [];
    for (let start = 0; start < notifications.length; start += EXPO_BATCH) {
      const batch = notifications.slice(start, start + EXPO_BATCH);
      const pushResponse = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(batch),
      });
      if (!pushResponse.ok) {
        console.error("send-event-cancelled-push: Expo rejected the request", pushResponse.status, await pushResponse.text());
        continue;
      }
      const { data: tickets } = (await pushResponse.json()) as { data: ExpoPushTicket[] };
      batch.forEach((_, i) => {
        const ticket = tickets?.[i];
        const row = sendable[start + i];
        if (ticket?.status !== "error") return;
        // The token's row id, never the token itself (it's what addresses the device).
        console.error("send-event-cancelled-push: delivery failed", {
          tokenRowId: row.id,
          error: ticket.details?.error ?? "unknown",
          message: ticket.message,
        });
        if (ticket.details?.error === "DeviceNotRegistered") staleTokenIds.push(row.id);
      });
    }
    if (staleTokenIds.length > 0) {
      await supabase.from("push_tokens").delete().in("id", staleTokenIds);
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("send-event-cancelled-push error", error);
    // Always 200: pg_net doesn't retry or read the response.
    return new Response("error", { status: 200 });
  }
});
