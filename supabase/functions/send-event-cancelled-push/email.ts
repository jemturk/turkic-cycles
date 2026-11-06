// The cancellation email, for people the push couldn't reach (send-event-cancelled-push).
// Same look as the account emails (scripts/build_email_templates.py): cream page, white
// card, logo and wordmark, a teal button, a quiet footer. Email-safe on purpose: table
// layout, inline styles, Georgia standing in for Fraunces.

const LOGO_URL = "https://joinhalka.com/email/logo.png";
const SITE_URL = "https://joinhalka.com";
const INK = "#2B2320";
const BODY = "#4A3F3A";
const MUTED = "#8A7C76";
const PAGE = "#FEF6EC";
const TEAL = "#127A87";
const DIVIDER = "#F3E3D2";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

export type Kind = "event" | "circle";

type Copy = {
  intro: Record<Kind, string>;
  why: string;
  button: Record<Kind, string>;
  note: string;
  tagline: string;
};

// {event}, {circle} and {when} are filled in (and HTML-escaped) per email.
const COPY: Record<string, Copy> = {
  en: {
    intro: {
      event: "{circle} has cancelled {event}, which was planned for {when}.",
      circle: "{circle} has closed, so {event}, planned for {when}, won't go ahead.",
    },
    why: "You're getting this because you replied Going or Interested. Nothing else changes for you.",
    button: { event: "Open the circle", circle: "See other circles" },
    note: "We emailed you because a notification couldn't reach you.",
    tagline: "Find your people, near you",
  },
  tr: {
    intro: {
      event: "{circle}, {when} için planlanan {event} etkinliğini iptal etti.",
      circle: "{circle} kapandı, bu yüzden {when} için planlanan {event} yapılmayacak.",
    },
    why: "Bu e-postayı, Katılıyorum veya İlgileniyorum yanıtını verdiğin için alıyorsun. Senin için başka bir şey değişmiyor.",
    button: { event: "Çembere git", circle: "Diğer çemberleri gör" },
    note: "Bildirim sana ulaşamadığı için e-posta gönderdik.",
    tagline: "İnsanlarını bul, yakınında",
  },
  de: {
    intro: {
      event: "{circle} hat {event} abgesagt, geplant für {when}.",
      circle: "{circle} wurde geschlossen, daher findet {event} am {when} nicht statt.",
    },
    why: "Du bekommst diese E-Mail, weil du mit „Ich komme“ oder „Interessiert“ geantwortet hast. Sonst ändert sich für dich nichts.",
    button: { event: "Zum Kreis", circle: "Andere Kreise ansehen" },
    note: "Wir schreiben dir per E-Mail, weil dich keine Benachrichtigung erreicht hat.",
    tagline: "Finde deine Leute, in deiner Nähe",
  },
  ru: {
    intro: {
      event: "Круг «{circle}» отменил событие «{event}», запланированное на {when}.",
      circle: "Круг «{circle}» закрыт, поэтому «{event}» ({when}) не состоится.",
    },
    why: "Вы получили это письмо, потому что ответили «Пойду» или «Интересно». Больше для вас ничего не меняется.",
    button: { event: "Открыть круг", circle: "Другие круги" },
    note: "Мы написали по почте, потому что уведомление до вас не дошло.",
    tagline: "Найдите своих людей рядом",
  },
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");

export function cancellationEmail({
  locale,
  kind,
  subject,
  eventTitle,
  circleName,
  circleId,
  when,
}: {
  locale: string;
  kind: Kind;
  subject: string;
  eventTitle: string;
  circleName: string;
  circleId: string | null;
  when: string;
}): { html: string; text: string } {
  const copy = COPY[locale] ?? COPY.en;
  const url = kind === "event" && circleId ? `${SITE_URL}/circles/${circleId}` : `${SITE_URL}/circles`;
  const plain = { event: eventTitle, circle: circleName, when };
  const safe = { event: `<strong>${escapeHtml(eventTitle)}</strong>`, circle: escapeHtml(circleName), when: escapeHtml(when) };
  const intro = fill(copy.intro[kind], safe);
  const paragraph = (p: string) =>
    `<p style="margin:0 0 14px;font-family:${SANS};font-size:16px;line-height:25px;color:${BODY};">${p}</p>`;

  const html = `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${PAGE};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(fill(copy.intro[kind], plain))}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAGE}" style="background:${PAGE};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
          <tr>
            <td align="center" style="padding:0 0 24px;">
              <img src="${LOGO_URL}" width="48" height="48" alt="" style="display:block;border:0;">
              <div style="margin-top:10px;font-family:${SERIF};font-size:22px;font-weight:bold;color:${INK};">Halka</div>
            </td>
          </tr>
          <tr>
            <td bgcolor="#FFFFFF" style="background:#FFFFFF;border-radius:22px;padding:36px 36px 32px;">
              <h1 style="margin:0 0 16px;font-family:${SERIF};font-size:26px;line-height:32px;font-weight:bold;color:${INK};">${escapeHtml(subject)}</h1>
              ${paragraph(intro)}
              ${paragraph(escapeHtml(copy.why))}
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
                <tr>
                  <td bgcolor="${TEAL}" style="border-radius:14px;">
                    <a href="${url}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${SANS};font-size:16px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:14px;">${escapeHtml(copy.button[kind])}</a>
                  </td>
                </tr>
              </table>
              <div style="height:1px;background:${DIVIDER};margin:28px 0 18px;line-height:1px;font-size:1px;">&nbsp;</div>
              <p style="margin:0;font-family:${SANS};font-size:13px;line-height:20px;color:${MUTED};">${escapeHtml(copy.note)}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 16px 0;font-family:${SANS};font-size:12px;line-height:18px;color:${MUTED};">
              Halka &middot; ${escapeHtml(copy.tagline)}<br>
              <a href="${SITE_URL}" style="color:${MUTED};">joinhalka.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const text = [subject, "", fill(copy.intro[kind], plain), "", copy.why, "", `${copy.button[kind]}: ${url}`, "", copy.note, "", "Halka · joinhalka.com"].join("\n");
  return { html, text };
}
