# Turkic Circles

A connections app (friendship, romance, business, mentorship) for the Turkic and Turkic-adjacent diaspora. Expo (React Native) app targeting iOS, Android, and web from one codebase, backed by Supabase.

See `/home/jem/.claude/plans/magical-dancing-yao.md` for the full architecture and phased build plan — this README covers day-to-day setup.

## Setup

1. Install dependencies (already done if you just cloned): `npm install`
2. Create a Supabase project at [supabase.com](https://supabase.com/dashboard).
3. Copy `.env.example` to `.env` and fill in your project's URL and anon key (Project Settings → API).
4. Apply the database migrations to your project:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
5. Start the app:
   ```bash
   npx expo start        # then press i / a / w, or scan the QR code with Expo Go
   npx expo start --web  # web only
   ```

## Local install (native build on a connected device)

Requires the Android SDK (`ANDROID_HOME`/`ANDROID_SDK_ROOT` set) and a device connected via
`adb` (USB debugging enabled) or a running emulator:

```bash
npx expo run:android   # builds a debug APK locally and installs it on the device
npx expo run:ios       # macOS + Xcode only
```

## Project structure

- `src/app/` — Expo Router screens (file-based routing). `(auth)`, `(onboarding)`, and `(app)` are route groups for the three main navigation states.
- `src/api/` — Supabase query/mutation functions, one file per domain.
- `src/schemas/` — Zod schemas; source of truth for the branching connection-type questionnaire and form validation.
- `src/hooks/` — TanStack Query hooks wrapping `src/api/`.
- `src/components/` — shared UI components.
- `src/constants/` — shared enums/option lists (connection types, origin countries, interests, etc.).
- `supabase/migrations/` — SQL migrations, source of truth for the database schema.

## Commands

```bash
npx expo start              # dev server
npx expo lint                # lint
npx tsc --noEmit             # typecheck
npx expo-doctor              # diagnose dependency/config issues
npx expo install <package>   # add a dependency (resolves SDK-compatible versions)
npx supabase gen types typescript --project-id <ref> > src/types/database.ts   # regenerate DB types after a migration
```

## Current status

Phase 0 (scaffold + auth) is done: sign up / log in against real Supabase auth, a redirect gate routing between auth → onboarding → the 5-tab app shell, and the `profiles`/`subscriptions` schema with RLS.

Phase 1 (onboarding + profile) is done: a 4-step onboarding wizard (connection types + basics, languages/interests, residency/origin/travel with consent, branching per-connection-type questions) writes to `profiles` plus `user_connection_types`/`questionnaire_responses`/`profile_sensitive`/`consent_records`, and the profile tab has a real view/edit screen.

Phase 2 (Circles) is done: a seeded list of 5 community circles (join/leave), a circle detail screen with an upcoming event + RSVP and a members preview, and a full members grid. Backed by `circles`/`circle_members`/`circle_events`/`event_rsvps`, with `profiles` read access widened (one phase earlier than originally planned) to circle-mates only.

Phase 3 (Discover + matches) is done: a circle-scoped swipe deck (pass/save/like) with a reciprocal-like → match trigger, a match celebration moment, and a full profile-detail screen for viewing another circle-mate. Backed by `swipes`/`matches`, `user_connection_types` widened to circle-mates, and a security-definer function gating `profile_sensitive.origin_countries` on live matching consent rather than a direct RLS grant. Connections and Chat are still stubbed pending Phase 4, Settings pending Phase 5 — see the plan doc for what's next.
