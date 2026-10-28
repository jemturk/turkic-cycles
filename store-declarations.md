# Store declarations

Every answer given to the app stores about what the app does and doesn't do, why it's
true, and what would make it untrue. **This file is the record**: when an answer
changes in a store console, change it here in the same commit as the code.

## Keeping it true

- `scripts/check_declarations.py` compares the app with `store-declarations.json` (the
  reviewed baseline): Android permissions in the built bundle, `package.json`
  dependencies, and every table and column from the migrations. `build.py` runs it
  before `-w`/`-a`/`-b` and again after `-b` on the bundle's merged manifest, and stops
  on anything new or removed.
- When it stops: find the affected rows below (the **Re-check if** column), update
  the store console and this file if an answer changed, then run
  `python scripts/check_declarations.py --update` (add `--manifest <path>` for
  permissions; build.py prints it) and fill in the reasons it leaves empty.
- A permission no feature needs goes in `app.json` → `android.blockedPermissions`
  instead of the baseline (that's how `RECORD_AUDIO` and `SYSTEM_ALERT_WINDOW` are kept
  out). Libraries add permissions silently, which is what this check is for.
- What it can't see: new data sent through an existing table or SDK (e.g. a new field
  in a JSON column, a new Sentry option). Those need a human look; the rule in
  `AGENTS.md` covers AI-made changes.

Service providers (Supabase, Sentry, RevenueCat, Expo/Firebase push, Stripe Identity,
Google Cloud Vision for the photo check, Google Geocoding for the typed city's centre point)
process data for us, so in Google's terms that's **collected, not shared**. A third
party that uses data for its own purposes (ads, analytics networks) would be
**shared** — none today.

---

## Google Play → App content

### Data safety

Overview: collects data **Yes** · encrypted in transit **Yes** (everything is HTTPS) ·
account creation **Username and password** + **OAuth** (Google, Apple) · deletion URL
**https://turek.expo.app/delete-account**.

For every row: Collected ✅, Shared ❌, Processed ephemerally **No**.

| Category → type | Req. | Purposes | What it is | Re-check if |
| --- | --- | --- | --- | --- |
| Location → Approximate | Req. | Functionality, Personalization | City/state/country typed on the profile (`profiles.city` …; the real city/state in self-only `profile_locations`, others see what `location_visibility` allows). The city's centre point from Google Geocoding (rounded to ~100 m, self-only `profile_locations.latitude/longitude`, used server-side for the distance filter) | City becomes optional; coordinates come from the device's GPS or are shown to other members |
| Location → Precise | — not collected | | GPS used on the phone only (`src/stores/localFilter.ts`) | Device coordinates are sent or saved anywhere |
| Personal → Name | Req. | Functionality, Account mgmt | `profiles.display_name` | |
| Personal → Email | Req. | Functionality, Account mgmt | Account email (Supabase Auth) | |
| Personal → User IDs | Req. | Functionality, Account mgmt, Analytics | Account ID; Sentry `setUser({ id })` | |
| Personal → Address | — not collected | | Only city | A street address field |
| Personal → Phone number | — not collected | | The member's own number is never asked | A phone sign-in or phone field |
| Personal → Race and ethnicity | Req. | Functionality, Personalization | Countries of origin, min 1 (`profile_sensitive.origin_countries`) | Origin becomes optional |
| Personal → Political or religious beliefs | Opt. | Functionality, Personalization | How important faith and religious tradition are (a 1-5 values question, never which faith; `questionnaire_responses.answers.values`) | Religion gets a profile field |
| Personal → Sexual orientation | Opt. | Functionality, Personalization | Romantic only: gender (woman / man / self-describe, optional description), who they're interested in, and for self-describers who sees them (`questionnaire_responses.answers.romantic`, self-only; used server-side for the Romantic filter, never shown) | Shown to other members, or asked outside Romantic |
| Personal → Other info | Req. | Functionality, Personalization | Date of birth (18+ check); citizenship/residency, occupation, bio, languages, interests; how and when they like to meet; goals per connection type; Business industry and expertise | |
| Financial → Purchase history | Opt. | Functionality, Account mgmt | Plus subscription (RevenueCat, `subscriptions`) | |
| Financial → Payment info | — not collected | | Google Play / App Store handle payment | Direct card payments (e.g. Stripe checkout) |
| Messages → Other in-app messages | Opt. | Functionality, Fraud prevention/security | Chat, reactions (`messages`, `message_reactions`) | |
| Messages → Emails, SMS | — not collected | | Safety texts are sent by the member from Messages (`expo-sms`) | The app reads or sends SMS itself |
| Photos and videos → Photos | Req. | Functionality, Fraud prevention/security | Profile + cover photos (cover required), checked by Google Cloud Vision before publishing (`moderate-photo`, `photo_moderation`); ID photo + selfie via Stripe Identity | Video uploads (→ Videos); photos in chat |
| Audio | — not collected | | No microphone (`RECORD_AUDIO` blocked) | Voice messages, video recording |
| Contacts → Contacts | Opt. | Functionality | Trusted contacts' names and phone numbers in safety plans (`safety_plans.trusted_contacts`) | Reading the phone's address book |
| App activity → App interactions | Req. | Functionality, Analytics | Circles joined, RSVPs; Sentry breadcrumbs | |
| App activity → Search history | — not collected | | Searches and filters aren't saved | Saved or recent searches |
| App activity → Installed apps | — not collected | | | |
| App activity → Other UGC | Opt. | Functionality, Fraud prevention/security | Bio, circles/events created, questionnaire answers, reports | |
| App activity → Other actions | Opt. | Functionality, Personalization | Likes, passes, blocks (`swipes`, `blocked_users`) | |
| Web browsing | — not collected | | Google sign-in / Stripe open in a browser; nothing recorded | |
| App info → Crash logs | Req. | Analytics | Sentry | |
| App info → Diagnostics | Req. | Analytics | Sentry device/OS/app version | |
| App info → Other performance | — not collected | | Sentry tracing is off | Sentry tracing / release health turned on |
| Device or other IDs | Req. | Functionality, Analytics | Push token (`push_tokens`), Sentry install ID, RevenueCat app user ID | |
| Files and docs, Calendar, Health, Fitness | — not collected | | | |

### Other App content answers

| Question | Answer | True because | Re-check if |
| --- | --- | --- | --- |
| Advertising ID | **No** | No `AD_ID` permission in the merged manifest; no ads/attribution SDK | Any ads, analytics or attribution SDK (AdMob, AppsFlyer, Facebook…) |
| Ads | **No ads** | | Ads |
| App access | Login required → review account (store-submission.md §6) | | The review account changes |
| Target audience | **18+ only** | Database rejects birthdates under 18 (migration 0028) | |
| Content rating (IARC) | Users interact: Yes · Share location: No · Digital purchases: Yes · UGC: Yes | store-submission.md §4 | Location sharing between users |
| Child safety standards | URL **https://turek.expo.app/child-safety** · contact unturkk@gmail.com · in-app reporting ✅ · complies with laws ✅ | `CHILD_SAFETY` in `src/constants/legal.ts`; Report → "Child safety" | The report form or the page's promises |
| Government / financial features / health / news / COVID | **No** | | |
| Countries | United States (closed test) | Policy written for US law | Before adding the EU/UK, Türkiye, Central Asia (legal review) |

## Apple

App Privacy labels: see store-submission.md §2 (Tracking: **No**). Keep it in step
with the Data safety table above; Apple's categories differ but the facts are the same.

## Permissions behind these answers

The full reviewed list, with a reason each, is `store-declarations.json` →
`permissions`. Notable: `CAMERA` (profile photo), `ACCESS_FINE/COARSE_LOCATION`
(distance filter, on device), `POST_NOTIFICATIONS`, `BILLING`, install referrer
(RevenueCat; not the ad ID). Blocked in `app.json`: `RECORD_AUDIO`,
`SYSTEM_ALERT_WINDOW`.
