# Backlog

Everything deliberately skipped or left for later, with enough context to pick each
item up cold. Tick items off (or delete them) as they're done.

Legend: **[you]** needs an account, payment, dashboard or decision on your side ·
**[code]** can be done entirely in the repo · **[both]** a bit of each.

---

## 1. Launch blockers

The stores would reject the app, or it would break for real users, without these.

- [x] **Email sender (SMTP)** — Resend, domain joinhalka.com verified; Supabase SMTP
  `smtp.resend.com` port `587`, user `resend`, sender `Halka <hello@joinhalka.com>`.
  The six templates from `supabase/templates/` are pasted in; after changing them, run
  `python scripts/build_email_templates.py`, deploy the website (`build.py -w`), then
  paste them again. Their links go to joinhalka.com/confirm and /reset-password.
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
  - Supabase → Authentication → Sign In / Providers → Apple → Client IDs: Apple sign-in
    works in Expo Go, so the list likely includes Expo Go's `host.exp.Exponent` as well as
    `com.turek.app`. Remove anything not intended before the App Store launch.
  - Store screenshots for Apple: done, `store-assets/appstore-6.9-*.png` (1320 x 2868).
- [x] **Google Play closed test** — done; the app is in production on Google Play.
- [ ] **Store listings and forms** [you, with help from code] — Apple privacy labels,
  Google Data safety form, age ratings (18+), real screenshots, descriptions.
  Google Play's URLs and support email are set to joinhalka.com. Left: App Store
  Connect, once it's set up — privacy policy URL (App Privacy), support and marketing
  URL, description footer and review notes; values in `store-submission.md`.
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
- [ ] **4 mock photos still carry the camera's GPS location** [code, on your go] — new
  uploads are cleaned (on the phone, and in `moderate-photo` via
  `_shared/photoLocation.ts`), but 4 existing files in the `avatars` bucket were uploaded
  before. Re-upload them through `removePhotoLocation` (same paths, so nothing else
  changes). Held until there are real users.
- [ ] **CSAM hash matching** [you, then code] — apply for Microsoft PhotoDNA (free for
  qualifying services; approval takes a while) and add it to `moderate-photo`. Backs
  the promises on the child safety page.

## 2. Setup to finish on your side

- [x] **Own domain** — joinhalka.com (Cloudflare): website on Cloudflare Pages (`build.py -w`),
  www redirects to it, support@ forwards to Gmail (Email Routing, catch-all on).
  turek.expo.app stays deployed for installed builds and the mock users' photo links.
- [x] **Supabase URL configuration** — Site URL `https://joinhalka.com`; Redirect URLs
  include `https://joinhalka.com/**`, `https://turek.expo.app/**`, `turek://**`.
- [ ] **DMARC: from watching to enforcing** — `_dmarc` TXT is `p=none` (reports go to
  support@) since 30 Oct 2026. After a few weeks of reports with only Resend passing,
  change it to `p=quarantine`.
- [ ] **Cloudflare Turnstile** — needs a site key (`EXPO_PUBLIC_TURNSTILE_SITE_KEY`).
  List both `joinhalka.com` and `turek.expo.app` as hostnames, ship a build with the
  key, and only then turn CAPTCHA on in Supabase (the other order locks out every
  installed copy).
- [ ] **Google sign-in shows "Halka"** — the consent screen (name, joinhalka.com links
  and authorized domain) is done; Google still says "continue to …supabase.co". Needs
  a Supabase custom domain (§4) and then brand verification (upload the logo; takes
  days, and "unverified app" shows until it's approved, so do both together).
- [ ] **Sign in with Apple** — Supabase → Providers → Apple, Client IDs
  `com.turek.app,host.exp.Exponent` (no secret needed for native iPhone sign-in).
- [ ] **Sentry** — project `turek` in org `turek` exists, DSN is in `.env` and EAS,
  plugin configured in `app.json`. Left: set `SENTRY_AUTH_TOKEN` (shell environment +
  EAS secret) so release builds upload source maps for readable stack traces, and
  confirm a first report arrives from a release build.
- [x] **Final app name** — Halka.
- [ ] **Legal review** — the Privacy Policy and Terms are written to match the app but
  aren't legal advice; worth a lawyer's look given sensitive data (religion,
  citizenship). Confirm Florida as governing law (or North Carolina).
- [ ] **Old app** — uninstall `com.turanci.app` from your phone; remove `turanci://**`
  from Supabase redirects once nobody uses it.
- [ ] **Android SDK command-line tools** — update in Android Studio's SDK Manager
  (clears the "SDK XML version 4" build warning).

## 2b. Business and security

- [ ] **LLC** [you, then code] — then move the domain registrant (Cloudflare), the
  developer accounts and Stripe to it, and change `LEGAL_OWNER` in
  `src/constants/legal.ts`.
- [ ] **Data processing agreements** [you] — accept/sign the DPAs of Supabase, Resend,
  Sentry, RevenueCat, Stripe, Google Cloud, Cloudflare and Expo.
- [ ] **Two-factor sign-in on every service account** [you] — Supabase, Cloudflare,
  GitHub, Google, Apple, Expo, Stripe, Resend, RevenueCat, Sentry.
- [ ] **Delete old data automatically** [code] — one migration with a daily pg_cron
  job, like 0063 (matching logs, 24 months), plus the privacy policy's "How long we
  keep it" section (`src/constants/legal.ts`) updated to match. Proposed periods, not
  yet confirmed:
  - `safety_plans`: 30 days after `meeting_at` when checked in or cancelled; 90 days
    when overdue (in case something happened). They hold trusted contacts' names and
    phone numbers -- people who never signed up.
  - `photo_moderation`: approved rows after 90 days; flagged/rejected after 12 months.
  - `reports`: reviewed or dismissed after 24 months; open ones never automatically.
  - Kept on purpose: `consent_records` (proof of consent, until account deletion);
    messages already go with the connection or account. Push tokens and
    `plus_waitlist`: later, low value.
- [ ] **Breach checklist** [code] — a short page: who to notify and when, how to rotate
  keys, what to tell members.

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
- [ ] Forgot password: email carried over; reset link opens the right place. From the
  phone app, the email link shows "Open the Halka app" and lands on the reset screen
  in the app (needs a real build; Expo Go can't open `turek://`).
- [ ] Settings/Help shows support@joinhalka.com (needs a new build).

## 4. Nice-to-haves

- [ ] **Automatic trusted-contact alerts** — the server texts contacts when a plan is
  overdue, even if the phone is off (Twilio: ~$1/month number + ~1¢/text, US carrier
  registration takes days to weeks). Today the member sends texts from their own phone.
- [ ] **Push delivery receipts** — `send-message-push` now logs every failed ticket
  (and reads the message from the database, so forged calls can't push made-up text).
  Left: Expo's delivery receipts, which arrive ~15 minutes later -- store the ticket
  ids and check them on a schedule (pg_cron + a small function).
- [ ] **Emails in each member's language** — the templates are English; a Send Email
  hook could pick the language from the profile.
- [ ] **Native Google sign-in** — Google's account sheet instead of the browser page
  (needs Android SHA-1 + iOS client IDs and `@react-native-google-signin`).
- [ ] **Supabase custom domain** — e.g. `auth.joinhalka.com` (paid add-on, needs a paid
  plan), so Google's sign-in screen can say Halka instead of `…supabase.co` (see §2).
- [ ] **App links for joinhalka.com** [code] — iOS universal links + Android app links
  (`app.json` associated domains / intent filters, plus `apple-app-site-association`
  and `assetlinks.json` on the website), so email links open the app directly instead
  of the "Open the Halka app" step (`src/components/AppHandoff.tsx`).
- [ ] **Reply as support@joinhalka.com from Gmail** [you] — Gmail → Settings → Accounts
  → "Send mail as": SMTP `smtp.resend.com`, port 587, user `resend`, a separate Resend
  API key.
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

## 4b. Design decisions to revisit

- [ ] **Chat bubble sheen** — your own bubbles have a faint top-to-bottom gradient
  (`#C9E6E8` → `#B2D8DB`, `LinearGradient` in `src/app/(app)/chat/[matchId].tsx`);
  theirs are flat coral. With the soft shadow under a run's last bubble it gives your
  side a slight 3D feel. Options: keep as is (a quiet "this is you" cue), make both
  sides flat, or give theirs an equally faint coral sheen. If the sheen goes, the
  tail's color (`BUBBLE_COLORS.own.tail`) becomes the flat bubble color.
- [ ] **Delivered vs read differ by color alone** — under your messages, delivered is
  a solid teal circle and read a solid coral one, same size (`src/components/
  MessageStatus.tsx`). Teal `#127A87` and coral `#C1440E` have nearly the same
  lightness, so members with red-green color blindness may see the same circle for
  both. Cheap fixes that keep the look: make read slightly larger (radius 4 instead of
  3.4), or add a thin white ring or a white center dot to one of them. The screen
  reader labels ("Delivered" / "Read") are already distinct.

## 5. Tech debt

- [x] The Settings test card's leftovers are removed: the debug functions (migration
  0047) and their hooks. Change a test account's tier or badge with SQL
  (`subscriptions`, `verification_status`).

- [ ] Note, not a task: `app.json` `"slug"` must stay `turanci`. It's the Expo project's
  permanent slug (project ID `45279546-…`, can't be renamed); expo.dev shows the display
  name `turek`. Changing it breaks every EAS build and deploy with a slug mismatch.

- [ ] Gradle "incompatible with Gradle 10" warnings come from Expo's generated
  `android/app/build.gradle` template — wait for Expo to update it.
- [ ] One C++ deprecation warning (`RawPropsParser`) in Expo's core module.
- [ ] `expo-doctor` patch-version drift recurs; run `npx expo install --fix` now and then.
- [ ] Formatting is inconsistent with Prettier's defaults (trailing commas); decide on a
  Prettier config and format once, or leave as is.
- [x] `useIsAppAdmin` removed (nothing used it).
- [x] `supabase/config.toml` redirect URLs now use `/**`, matching the dashboard.
- [ ] The `global-discover` branch has many unpushed commits; push and open a PR to
  `main` when ready.
