# Backlog

Everything deliberately skipped or left for later, with enough context to pick each
item up cold. Tick items off (or delete them) as they're done.

Legend: **[you]** needs an account, payment, dashboard or decision on your side ·
**[code]** can be done entirely in the repo · **[both]** a bit of each.

---

## 1. Launch blockers

The stores would reject the app, or it would break for real users, without these.

- [ ] **Email sender (SMTP)** [you, then code] — Supabase's built-in sender only
  allows a few emails an hour and adds a "powered by Supabase" footer, so on launch day
  most sign-up confirmations wouldn't arrive. Needs your own domain (see §2).
  - Sign up at Resend (or similar), verify the domain, create an API key.
  - Supabase → Authentication → Emails → SMTP Settings: host `smtp.resend.com`,
    port `465`, user `resend`, password = API key, sender e.g. `hello@yourdomain.com`,
    name `Turkic Circles`.
  - Raise the email rate limit (Authentication → Rate Limits).
  - Then paste the six branded templates from `supabase/templates/` into
    Authentication → Emails → Templates (subjects are in `supabase/config.toml`).
    Deploy the website first so `email/logo.png` is live.
- [ ] **Identity verification: finish Stripe setup** [you] — the code is done (Stripe
  Identity: ID photo + live selfie; functions `create-verification-session` and
  `stripe-identity-webhook`; migration 0043). Left:
  - Stripe account, business verified, and the Identity application approved
    (dashboard.stripe.com/identity/application); branding under Settings → Branding.
  - `supabase db push` (0043), then
    `supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_IDENTITY_WEBHOOK_SECRET=whsec_...`
  - Deploy: `supabase functions deploy create-verification-session` and
    `supabase functions deploy stripe-identity-webhook --no-verify-jwt`.
  - Stripe → Workbench → Webhooks: endpoint
    `https://<project-ref>.supabase.co/functions/v1/stripe-identity-webhook`, events
    `identity.verification_session.verified`, `.requires_input`, `.processing`, `.canceled`;
    its signing secret is `STRIPE_IDENTITY_WEBHOOK_SECRET`.
  - Test in Stripe test mode first (test keys), then switch to live keys.
  - Costs about $1.50 per verification; consider limiting retries.
- [ ] **iPhone has never been built for real** [you, then code] — only Expo Go so far.
  - Apple Developer Program ($99/year).
  - `eas build -p ios` (registers `com.turek.app`, Sign in with Apple capability).
  - iOS push credentials: `eas credentials` → iOS → push (APNs key).
  - TestFlight testing, including push notifications, Sign in with Apple, purchases.
- [ ] **Google Play closed test** [you] — new personal developer accounts must run a
  closed test with at least 12 testers for 14 days before going public.
- [ ] **Store listings and forms** [you, with help from code] — Apple privacy labels,
  Google Data safety form, age ratings (18+), real screenshots, descriptions,
  support/privacy URLs (`turek.expo.app/privacy`, `/terms`).
- [x] **App Review test account** — "Nurlan H." (`mock003@turek-mock.invalid`, a test
  account); password in `~/.turek/review-account.txt`. Enter it in Play Console → App
  access and App Store Connect → App Review Information.
- [ ] **Plus purchases end to end** [you] — create the subscription products in App
  Store Connect and Play Console, set up RevenueCat for `com.turek.app` (both
  platforms), then test a sandbox purchase and Restore.

- [ ] **Photo check (Google Cloud Vision): finish setup** [you] — code done (migration
  0044, function `moderate-photo`). In this order, so uploads never break:
  1. Google Cloud console (the project used for Google sign-in): enable **Cloud Vision
     API**, then Credentials → Create API key → restrict it to Cloud Vision API.
  2. `npx supabase secrets set GOOGLE_VISION_API_KEY=...`
  3. `npx supabase functions deploy moderate-photo` and
     `npx supabase functions deploy delete-account`
  4. `npx supabase db push` (0044 — from here, apps without the change can't upload photos)
  5. `python build.py -w`, then `-b` for Play.
  - Then test: upload a normal photo (works) and a swimsuit photo (works, may be logged
    as `review`); review borderline ones with
    `select * from photo_moderation where verdict <> 'approved' order by created_at desc;`
- [ ] **Photos uploaded before 0044 were never checked** [code] — a one-off script
  running every existing `avatars` file through `moderate-photo`'s check.
- [ ] **CSAM hash matching** [you, then code] — apply for Microsoft PhotoDNA (free for
  qualifying services; approval takes a while) and add it to `moderate-photo`. Backs
  the promises on the child safety page.

## 2. Setup to finish on your side

- [ ] **Own domain** — for the website (instead of `turek.expo.app`), the email sender,
  and the privacy/terms links. Then: EAS Hosting custom domain, update
  `TURNSTILE_HOSTNAME`, Supabase Site URL / Redirect URLs, `LOGO_URL` in
  `scripts/build_email_templates.py`, and a migration for the mock photo links.
- [ ] **Supabase URL configuration** — Site URL `https://turek.expo.app`; Redirect URLs
  `https://turek.expo.app/**`, `turek://**`, `exp://**` (Expo Go), and `turanci://**`
  until no one uses the old app.
- [ ] **Cloudflare Turnstile** — add `turek.expo.app` to the site's hostnames, or
  website sign-ups fail the captcha.
- [ ] **Google sign-in** — Google Cloud *Web application* OAuth client with the
  Supabase callback URL as redirect URI; paste Client ID/secret into Supabase →
  Providers → Google. OAuth consent screen (name, logo, support email).
- [ ] **Sign in with Apple** — Supabase → Providers → Apple, Client IDs
  `com.turek.app,host.exp.Exponent` (no secret needed for native iPhone sign-in).
- [ ] **Sentry** — project `turek` in org `turek` exists, DSN is in `.env` and EAS,
  plugin configured in `app.json`. Left: set `SENTRY_AUTH_TOKEN` (shell environment +
  EAS secret) so release builds upload source maps for readable stack traces, and
  confirm a first report arrives from a release build.
- [ ] **Final app name** — pick it before the first store release while renaming is
  free (store listing, `app.json` `name`, welcome slides, emails, legal pages).
- [ ] **Legal review** — the Privacy Policy and Terms are written to match the app but
  aren't legal advice; worth a lawyer's look given sensitive data (religion,
  citizenship). Confirm Florida as governing law (or North Carolina).
- [ ] **Old app** — uninstall `com.turanci.app` from your phone; remove `turanci://**`
  from Supabase redirects once nobody uses it.
- [ ] **Android SDK command-line tools** — update in Android Studio's SDK Manager
  (clears the "SDK XML version 4" build warning).

## 3. Verify on real devices

Built and committed but only checked in a browser preview or not at all.

- [ ] Chat: opens at the latest message without scrolling; keyboard keeps the newest
  bubble in view; tapping outside closes the reaction bar.
- [ ] Chat bubbles (grouped runs, speech corner, sheen) and the new typing dots.
- [ ] iPhone: text boxes no longer clip the tail of g/y/p.
- [ ] iPhone: message box shadow matches Android.
- [ ] Event page: Going / Interested lists with real RSVPs.
- [ ] Circle members page (grid with cities) on phone and desktop.
- [ ] Desktop sidebar log-out button.
- [ ] Web text sizes (Small/Default/Large) — if desktop feels too small, limit the
  smaller sizes to phone-width browsers.
- [ ] Safety plans: Messages opens with the plan text; check-in reminders fire;
  Check in / Alert my contacts / Cancel.
- [ ] Apple and Google sign-in, including new accounts going through onboarding and an
  existing email account being linked.
- [ ] Forgot password: email carried over; reset link opens the right place.

## 4. Nice-to-haves

- [ ] **Automatic trusted-contact alerts** — the server texts contacts when a plan is
  overdue, even if the phone is off (Twilio: ~$1/month number + ~1¢/text, US carrier
  registration takes days to weeks). Today the member sends texts from their own phone.
- [ ] **Push function logging** — `send-message-push` only logs unregistered devices;
  log every delivery error and check receipts, so failures like the missing FCM key
  show up.
- [ ] **Emails in each member's language** — the templates are English; a Send Email
  hook could pick the language from the profile.
- [ ] **Native Google sign-in** — Google's account sheet instead of the browser page
  (needs Android SHA-1 + iOS client IDs and `@react-native-google-signin`).
- [ ] **Supabase custom domain** — so Google's sign-in screen says your domain instead
  of `…supabase.co`.
- [ ] **Sign in with Apple on Android and web** — needs an Apple Services ID and key.
- [ ] **"Meet people going"** link on an event, opening Discover with its attendees.
- [ ] **Circle members page at scale** — search and "People you know" grouping once
  circles get big (the list-style option A from the mockups).
- [ ] **Desktop polish** — check the newer screens (legal pages, safety plans) in the
  desktop layout and dark mode.
- [ ] **Sentry extras** — performance tracing, release health, Expo Router navigation
  tracking (all off for now).
- [ ] **Delete the mock profiles** eventually — today they're hidden from everyone but
  testers (migration 0042); delete once real activity is enough to test with.

## 5. Tech debt

- [ ] The Settings test card is gone (tier / Verified switches, Send test error). Its
  pieces remain unused: the `debug_set_my_tier` / `debug_set_my_verified` functions
  (test accounts only, 0042) and the `useDebugSetTier` / `useDebugSetVerified` /
  `useIsTestAccount` hooks. Remove them, or reuse them for an admin screen. Until then,
  change a test account's tier or badge with SQL (`subscriptions`, `verification_status`).

- [ ] Note, not a task: `app.json` `"slug"` must stay `turanci`. It's the Expo project's
  permanent slug (project ID `45279546-…`, can't be renamed); expo.dev shows the display
  name `turek`. Changing it breaks every EAS build and deploy with a slug mismatch.

- [ ] Gradle "incompatible with Gradle 10" warnings come from Expo's generated
  `android/app/build.gradle` template — wait for Expo to update it.
- [ ] One C++ deprecation warning (`RawPropsParser`) in Expo's core module.
- [ ] `expo-doctor` patch-version drift recurs; run `npx expo install --fix` now and then.
- [ ] Formatting is inconsistent with Prettier's defaults (trailing commas); decide on a
  Prettier config and format once, or leave as is.
- [ ] `useIsAppAdmin` is no longer used by Settings; remove it if nothing else needs it.
- [ ] `supabase/config.toml` redirect URLs use `/*`; change to `/**` to match the
  dashboard (local-only file).
- [ ] The `global-discover` branch has many unpushed commits; push and open a PR to
  `main` when ready.
