"""Builds the branded Supabase Auth email templates in supabase/templates/.

All six share one layout -- cream page, white card, the logo and wordmark, a teal
button, a fallback link and a quiet footer -- so they're generated from this one
file rather than kept in sync by hand. Re-run after changing the copy or styles:

    python scripts/build_email_templates.py

Then paste each file into the Supabase dashboard (Authentication > Emails >
Templates); config.toml points the local stack at the same files.

Email-safe on purpose: table layout, inline styles, no web fonts (Georgia stands in
for the app's Fraunces), and the logo as a PNG served by the website.
"""

from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "supabase" / "templates"
LOGO_URL = "https://joinhalka.com/email/logo.png"

INK = "#2B2320"
BODY = "#4A3F3A"
MUTED = "#8A7C76"
PAGE = "#FEF6EC"
TEAL = "#127A87"
CORAL = "#C1440E"
DIVIDER = "#F3E3D2"
SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
SERIF = "Georgia, 'Times New Roman', serif"


def button(label: str, url: str) -> str:
    # A "bulletproof" button: the padding is on the link itself, inside a table cell
    # with the color, so it renders as a button in Outlook too.
    return f"""
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
            <tr>
              <td bgcolor="{TEAL}" style="border-radius:14px;">
                <a href="{url}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:{SANS};font-size:16px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:14px;">{label}</a>
              </td>
            </tr>
          </table>"""


def fallback_link(url: str) -> str:
    return f"""
          <p style="margin:20px 0 0;font-family:{SANS};font-size:13px;line-height:20px;color:{MUTED};">
            Button not working? Copy this link into your browser:<br>
            <a href="{url}" style="color:{TEAL};word-break:break-all;">{url}</a>
          </p>"""


def code_box(code: str) -> str:
    return f"""
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
            <tr>
              <td bgcolor="{PAGE}" style="border-radius:14px;padding:16px 28px;font-family:{SANS};font-size:28px;font-weight:700;letter-spacing:6px;color:{INK};">{code}</td>
            </tr>
          </table>"""


def page(*, preheader: str, title: str, paragraphs: list[str], action: str, note: str) -> str:
    body = "".join(
        f'\n          <p style="margin:0 0 14px;font-family:{SANS};font-size:16px;line-height:25px;color:{BODY};">{p}</p>'
        for p in paragraphs
    )
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:{PAGE};">
  <!-- Preview text shown next to the subject in the inbox. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">{preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{PAGE}" style="background:{PAGE};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
          <tr>
            <td align="center" style="padding:0 0 24px;">
              <img src="{LOGO_URL}" width="48" height="48" alt="" style="display:block;border:0;">
              <div style="margin-top:10px;font-family:{SERIF};font-size:22px;font-weight:bold;color:{INK};">
                Halka
              </div>
            </td>
          </tr>
          <tr>
            <td bgcolor="#FFFFFF" style="background:#FFFFFF;border-radius:22px;padding:36px 36px 32px;">
              <h1 style="margin:0 0 16px;font-family:{SERIF};font-size:26px;line-height:32px;font-weight:bold;color:{INK};">{title}</h1>{body}{action}
              <div style="height:1px;background:{DIVIDER};margin:28px 0 18px;line-height:1px;font-size:1px;">&nbsp;</div>
              <p style="margin:0;font-family:{SANS};font-size:13px;line-height:20px;color:{MUTED};">{note}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 16px 0;font-family:{SANS};font-size:12px;line-height:18px;color:{MUTED};">
              Halka &middot; Find your people, near you<br>
              <a href="{{{{ .SiteURL }}}}" style="color:{MUTED};">joinhalka.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def link(page_path: str, otp_type: str) -> str:
    # Straight to the website with the one-time code, not Supabase's
    # {{ .ConfirmationURL }}: that one is used up by any GET, so mail scanners that
    # open links to check them ("link expired" for the member), and it shows the
    # supabase.co address. The page uses the code with verifyOtp, or hands it to the
    # app when the email was asked for from there (redirect_to, src/components/AppHandoff.tsx).
    return (f"{{{{ .SiteURL }}}}/{page_path}?token_hash={{{{ .TokenHash }}}}&amp;type={otp_type}"
            "&amp;redirect_to={{ .RedirectTo }}")


IGNORE = "If you didn&rsquo;t ask for this, you can safely ignore this email. Nothing will change."

TEMPLATES = {
    # file name: (subject, html)
    "confirmation.html": (
        "Confirm your email for Halka",
        page(
            preheader="One tap to confirm your email and start meeting your people.",
            title="Welcome! Let&rsquo;s confirm your email",
            paragraphs=[
                "Thanks for joining Halka. Tap the button below to confirm your email "
                "and finish setting up your profile.",
            ],
            action=button("Confirm my email", link("confirm", "email")) + fallback_link(link("confirm", "email")),
            note="If you didn&rsquo;t create an account, you can safely ignore this email.",
        ),
    ),
    "recovery.html": (
        "Reset your Halka password",
        page(
            preheader="Choose a new password for your account.",
            title="Reset your password",
            paragraphs=[
                "We received a request to reset the password for <strong>{{ .Email }}</strong>. "
                "Tap the button below to choose a new one.",
                "The link works once and expires in an hour.",
            ],
            action=button("Choose a new password", link("reset-password", "recovery")) + fallback_link(link("reset-password", "recovery")),
            note=IGNORE,
        ),
    ),
    "magic_link.html": (
        "Your Halka sign-in link",
        page(
            preheader="Tap to sign in. No password needed.",
            title="Sign in to Halka",
            paragraphs=["Tap the button below to sign in. The link works once and expires in an hour."],
            action=button("Sign in", link("confirm", "magiclink")) + fallback_link(link("confirm", "magiclink")),
            note=IGNORE,
        ),
    ),
    "email_change.html": (
        "Confirm your new email for Halka",
        page(
            preheader="Confirm the change to your account's email address.",
            title="Confirm your new email",
            paragraphs=[
                "You asked to change your account&rsquo;s email from <strong>{{ .Email }}</strong> "
                "to <strong>{{ .NewEmail }}</strong>. Tap the button below to confirm.",
            ],
            action=button("Confirm new email", link("confirm", "email_change")) + fallback_link(link("confirm", "email_change")),
            note="If you didn&rsquo;t ask for this, please reset your password; someone else may "
            "have access to your account.",
        ),
    ),
    "invite.html": (
        "You're invited to Halka",
        page(
            preheader="Join circles, meet people and find where you belong.",
            title="You&rsquo;re invited!",
            paragraphs=[
                "You&rsquo;ve been invited to join Halka: circles for your city, culture "
                "and interests, with real meetups on the calendar.",
            ],
            action=button("Accept invitation", link("reset-password", "invite")) + fallback_link(link("reset-password", "invite")),
            note="Not expecting this? You can safely ignore this email.",
        ),
    ),
    "reauthentication.html": (
        "Your Halka security code",
        page(
            preheader="Enter this code to confirm it's you.",
            title="Confirm it&rsquo;s you",
            paragraphs=["Enter this code in the app to continue:"],
            action=code_box("{{ .Token }}"),
            note="The code expires in an hour. If you didn&rsquo;t ask for it, you can safely ignore this email.",
        ),
    ),
}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (subject, html) in TEMPLATES.items():
        (OUT / name).write_text(html, encoding="utf-8", newline="\n")
        print(f"{name:24} {subject}")


if __name__ == "__main__":
    main()
