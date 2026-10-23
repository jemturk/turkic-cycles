# Turkic Circles

A connections app (friendship, romance, business, mentorship) for the Turkic and Turkic-adjacent diaspora. Expo (React Native) app targeting iOS, Android, and web from one codebase, backed by Supabase.

Names: the display name is **Turkic Circles**, the bundle ID / package is `com.turek.app`, the URL scheme is `turek`, and the web build is hosted at `turek.expo.app`. The Expo slug in `app.json` stays `turanci` — slugs are permanent on expo.dev, and changing it breaks EAS.

## Setup

1. Install dependencies: `npm install`
2. Create a Supabase project at [supabase.com](https://supabase.com/dashboard).
3. Copy `.env.example` to `.env` and fill in your project's URL and publishable key (Project Settings → API; the legacy anon key also works). The other entries — Turnstile CAPTCHA, RevenueCat, Sentry — are optional and off when unset; `.env.example` explains each.
4. Apply the database migrations to your project:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
5. Deploy the Edge Functions you need (`npx supabase functions deploy <name>`) and set their secrets (`npx supabase secrets set ...`). Which secrets each one needs, and which deploy with `--no-verify-jwt`, is in `backlog.md` §2 and at the top of each function's `index.ts`.
6. Start the app:
   ```bash
   npx expo start        # then press i / a / w
   npx expo start --web  # web only
   ```
   The app uses native modules that Expo Go doesn't ship (Sentry, RevenueCat, keyboard controller, ...), so on a device use a development build (below) rather than Expo Go.

## Local install (native build on a connected device)

Requires the Android SDK (`ANDROID_HOME`/`ANDROID_SDK_ROOT` set) and a device connected via
`adb` (USB debugging enabled) or a running emulator:

```bash
npx expo run:android   # builds a debug APK locally and installs it on the device
npx expo run:ios       # macOS + Xcode only
```

`android/` is generated (Continuous Native Generation) — configure native behaviour in `app.json` and `plugins/`, never by hand.

## How it works

**No app server.** Screens call TanStack Query hooks (`src/hooks/`), the hooks call plain functions in `src/api/`, and those talk to Supabase directly — Postgres through PostgREST, plus Auth, Storage, and Realtime. Business rules that must hold (match on a reciprocal like, 18+, who can see whom) live in the database as triggers, constraints, and RLS, not in the client.

**RLS is the security boundary.** The publishable key ships inside the app, so anyone can call the API with it. Every table has row-level security; new policies are `to authenticated`, and function execute is revoked from `anon`. Fields that need a condition RLS can't express cleanly (e.g. origin countries, shown only with live matching consent) go through `security definer` functions instead of a table grant. Columns only the server may set — verification status, subscription tier — are written by Edge Functions with the service role, never by the client. `scripts/check_anon_access.py` probes all of this from outside with the public key.

**Routing gate.** `src/app/index.tsx` reads the session and the user's profile: no session → `(auth)/welcome`; onboarding unfinished → the saved `onboarding_step` (so it resumes where they left off); otherwise → `(app)/circles`. Each tab is a stack whose home stays underneath, so back always goes up within the tab.

**Realtime.** Chat (`src/hooks/useChat.ts`) subscribes to `postgres_changes` on `messages` and `message_reactions`; the recipient's app marks messages delivered when they arrive (`useMarkDelivered`). Typing indicators use Realtime broadcast channels (`src/lib/typingChannels.ts`), which never touch the database.

**Server-side work.**
- Database triggers call Edge Functions over `pg_net`: `send-message-push` on a new message, `notify-report` on a new report (pushes an alert to admins).
- The app invokes functions for things that need a secret: `moderate-photo` (Google Cloud Vision, before a photo goes public), `create-verification-session` (Stripe Identity), `delete-account`, `sync-subscription`.
- Webhooks from Stripe (`stripe-identity-webhook`) and RevenueCat (`revenuecat-webhook`) write verification and subscription status.
- `pg_cron` runs `process_overdue_safety_checkins()` every 5 minutes to mark missed safety check-ins overdue.

**One codebase, two layouts.** Native is always the phone layout. On the web, `useWideLayout()` switches to the desktop layout from 1024px: a sidebar instead of the bottom tab bar and wider screens (`*Desktop` components), on the same routes.

## Building and releasing

`build.py` wraps the release builds. Flags combine (e.g. `-wa`, `-bs`, `-aig`):

```bash
python build.py -w    # export the web build and deploy it to EAS Hosting (production)
python build.py -a    # release APK, built locally with Gradle
python build.py -b    # release app bundle (.aab) for Google Play, signed with the upload key
python build.py -s    # share the bundle through Play's internal app sharing, print the install link
python build.py -i    # install the release APK on the connected device
python build.py -g    # copy the APK to C:\DEV\Cloud\Apk (keeps the newest 3)
python build.py -d    # stream full command output instead of progress lines
```

Release signing reads `~/.turek/upload-keystore.properties`; `-s` needs `~/.turek/play-service-account.json`. See the docstring at the top of `build.py` for details. Every run also runs `scripts/check_declarations.py` (see Store declarations below).

## Project structure

- `src/app/` — Expo Router screens (file-based routing). `(auth)`, `(onboarding)`, and `(app)` are route groups for the three main navigation states. `(auth)` also holds the public pages: `/privacy`, `/terms`, `/delete-account`, `/child-safety`.
- `src/api/` — Supabase query/mutation functions, one file per domain.
- `src/hooks/` — TanStack Query hooks wrapping `src/api/`.
- `src/schemas/` — Zod schemas; source of truth for the branching connection-type questionnaire and form validation.
- `src/components/` — shared UI components (including `DialogHost`, the app's own alerts and confirms).
- `src/lib/` — plain helpers (age, distance, Discover deck logic, emoji, Sentry, purchases, ...).
- `src/stores/` — Zustand stores for client-side state.
- `src/constants/` — shared enums/option lists (connection types, origin countries, interests, etc.).
- `src/i18n/` — i18next setup and locales (English, Turkish, Russian, German).
- `src/theme/` — global CSS (NativeWind) and icon map.
- `src/types/database.ts` — generated Supabase types.
- `supabase/migrations/` — SQL migrations, source of truth for the database schema.
- `supabase/functions/` — Edge Functions: push for new messages, report alerts, photo moderation (Google Cloud Vision), account deletion, Stripe Identity (session + webhook), RevenueCat webhook and subscription sync.
- `supabase/templates/` — branded auth emails (built by `scripts/build_email_templates.py`).
- `plugins/` — Expo config plugins (release signing, quiet Gradle warnings).
- `scripts/` — checks and build helpers (see below).

## Commands

```bash
npx expo start              # dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npm test                    # Jest unit tests (npm run test:coverage for coverage)
npx expo-doctor             # diagnose dependency/config issues
npx expo install <package>  # add a dependency (resolves SDK-compatible versions)
npx supabase gen types typescript --project-id <ref> > src/types/database.ts   # regenerate DB types after a migration
python scripts/check_anon_access.py      # confirm the public key can't read tables or call functions without a login
python scripts/check_declarations.py     # confirm permissions/SDKs/data still match the store declarations
```

## Store declarations and submission

- `store-declarations.md` — what the stores were told the app collects and which permissions it uses. `store-declarations.json` is the baseline `scripts/check_declarations.py` checks; update both (`--update`) when a change adds a permission, dependency, table/column, or anything sent to a third party.
- `store-submission.md` — privacy labels, Data safety, age ratings, store copy, review notes, screenshots, internal app sharing.
- `store-assets/` — icons, feature graphic, and screenshots.

## Current state

All the planned screens are built and working:

- **Auth** — email sign-up with confirmation, forgot/reset password, Sign in with Apple (iPhone) and Google, optional Turnstile CAPTCHA, 18+ enforced in the database.
- **Onboarding** — welcome slides, then a 5-step wizard (connection types and basics, languages/interests, residency/origin/travel with consent, branching per-type questions, photos).
- **Circles** — community circles with join/leave, search and Near me, events with RSVP, and circle/event creation for verified Plus members.
- **Discover** — a swipe deck (like/pass/save, with Undo) across circles, reciprocal likes become matches.
- **Connections and Chat** — realtime messaging with typing indicator, delivered/read status, replies, reactions, push notifications, and Remove connection.
- **Profile and Settings** — profile with photo gallery and cover, matching preferences, privacy, notifications, theme (light/dark), text size, language (English, Turkish, Russian, German).
- **Safety** — ID verification (Stripe Identity), report (admins get a push alert) and block, safety plans with trusted-contact check-ins, contact-detail nudges, and photo moderation before photos go public.
- **Turkic Circles Plus** — premium tier through RevenueCat (shows a waitlist when RevenueCat keys aren't set).
- **Web** — a desktop layout with a sidebar, alongside the phone layout.
- **Crash reporting** — Sentry (account ID only).

What's left before launch, setup still to finish, and device checks are tracked in `backlog.md`.
