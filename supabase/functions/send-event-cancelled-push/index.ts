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
// Pushes to everyone with push on and a registered phone. Anyone that leaves out --
// push turned off, no phone registered (the website alone, a reinstall) -- gets the
// same news by email instead, as a service message like a booking change (email.ts,
// sent through Resend; needs the RESEND_API_KEY secret, and without it only pushes go
// out). Never both. Writes in each recipient's app language (profiles.app_locale),
// with dates as they read where the circle is (every circle so far is in US Eastern;
// events don't store a time zone).
//
// Deploy with: supabase functions deploy send-event-cancelled-push --no-verify-jwt
import { createClient } from "npm:@supabase/supabase-js@2";
import { cancellationEmail } from "./email.ts";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const FRESH_MS = 10 * 60 * 1000;
const EXPO_BATCH = 100;
const RESEND_URL = "https://api.resend.com/emails/batch";
const RESEND_BATCH = 100;
const EMAIL_FROM = "Halka <hello@joinhalka.com>";
const EVENT_TIME_ZONE = "America/New_York";

type Kind = "event" | "circle"; // as in email.ts
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
    const pushed = new Set(sendable.map((row) => row.user_id));
    const localeOf = (userId: string) => profileById.get(userId)?.app_locale ?? "en";
    const dateIn = (locale: string, withTime: boolean) =>
      new Intl.DateTimeFormat(DATE_LOCALE[locale] ?? "en-US", {
        month: "short",
        day: "numeric",
        ...(withTime ? { weekday: "long", hour: "numeric", minute: "2-digit" } : {}),
        timeZone: EVENT_TIME_ZONE,
      }).format(new Date(notice.starts_at));
    const titleFor = (locale: string) =>
      fill((TEXT[locale] ?? TEXT.en).title, { event: notice.event_title, circle: notice.circle_name, date: dateIn(locale, false) });

    const notifications = sendable.map((row) => {
      const locale = localeOf(row.user_id);
      const text = TEXT[locale] ?? TEXT.en;
      const values = { event: notice.event_title, circle: notice.circle_name, date: dateIn(locale, false) };
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

    // Everyone the push left out gets an email instead.
    const unreached = recipients.filter((id) => !pushed.has(id));
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (unreached.length > 0 && !resendKey) {
      console.error("send-event-cancelled-push: RESEND_API_KEY isn't set; skipped emails", { count: unreached.length });
    } else if (unreached.length > 0) {
      const users = await Promise.all(unreached.map((id) => supabase.auth.admin.getUserById(id)));
      const emails = users
        .map(({ data }, i) => ({ id: unreached[i], email: data?.user?.email ?? null }))
        // Sample members' addresses (…@turek-mock.invalid) can't receive mail.
        .filter((u): u is { id: string; email: string } => !!u.email && !u.email.endsWith(".invalid"))
        .map(({ id, email }) => {
          const locale = localeOf(id);
          const subject = titleFor(locale);
          const { html, text } = cancellationEmail({
            locale,
            kind,
            subject,
            eventTitle: notice.event_title,
            circleName: notice.circle_name,
            circleId: notice.circle_id,
            when: dateIn(locale, true),
          });
          return { from: EMAIL_FROM, to: [email], subject, html, text };
        });
      for (let start = 0; start < emails.length; start += RESEND_BATCH) {
        const response = await fetch(RESEND_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(emails.slice(start, start + RESEND_BATCH)),
        });
        if (!response.ok) {
          console.error("send-event-cancelled-push: Resend rejected the batch", response.status, await response.text());
        }
      }
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("send-event-cancelled-push error", error);
    // Always 200: pg_net doesn't retry or read the response.
    return new Response("error", { status: 200 });
  }
});
