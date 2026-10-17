# Store submission guide

Answers and copy for the App Store and Google Play, written from what the app
actually does (checked against the code on 2026-10-17). Paste from here into App
Store Connect and Play Console. If the app changes what it collects, update this file
and the Privacy Policy (`src/constants/legal.ts`) together — a mismatch between the
two, or with the app, is a common reason for rejection.

Placeholders: **[NAME]** = the final app name (currently "Turkic Circles").

---

## 1. Basics

| Field | App Store | Google Play |
| --- | --- | --- |
| App name (30 chars) | Turkic Circles | Turkic Circles |
| Bundle ID / package | `com.turek.app` | `com.turek.app` |
| Primary category | Social Networking | Social |
| Secondary category | Lifestyle | — (tags: Social, Community, Dating) |
| Privacy Policy URL | https://turek.expo.app/privacy | https://turek.expo.app/privacy |
| Terms (EULA) URL | https://turek.expo.app/terms | (in description / website) |
| Support URL | https://turek.expo.app (or your domain) | — |
| Support email | unturkk@gmail.com | unturkk@gmail.com |
| Price | Free (with in-app purchases) | Free (contains in-app purchases) |
| Contains ads | No | No |

**iPad:** not supported (`"supportsTablet": false` in `app.json`), so no iPad
screenshots are needed and Apple reviews on iPhone. iPads can still run the iPhone
version.

---

## 2. Apple: App Privacy ("nutrition labels")

App Store Connect → App Privacy. **Tracking: No** — the app doesn't track users across
other companies' apps or websites, has no ads and no advertising SDKs, so it does not
show the App Tracking Transparency prompt.

For every type below: **Linked to the user: Yes**, **Used for tracking: No**.

| Data type (Apple category) | What it is in the app | Purposes |
| --- | --- | --- |
| Contact Info → **Name** | Display name; name from Sign in with Apple / Google | App Functionality |
| Contact Info → **Email Address** | Account email | App Functionality |
| Location → **Coarse Location** | City, state and country the member enters on their profile | App Functionality |
| Sensitive Info → **Sensitive Info** | Optional religion, citizenship/residency status, countries of origin (with recorded consent); identity verification (ID photo + selfie, processed by Stripe) | App Functionality |
| Contacts → **Contacts** | Names and phone numbers of trusted contacts entered for safety plans | App Functionality |
| User Content → **Emails or Text Messages** | In-app chat messages, replies, reactions | App Functionality |
| User Content → **Photos or Videos** | Profile photos | App Functionality |
| User Content → **Other User Content** | Bio, interests, hobbies, occupation, questionnaire answers, reports | App Functionality |
| Identifiers → **User ID** | Account ID (also attached to crash reports) | App Functionality, Analytics |
| Identifiers → **Device ID** | Push notification token | App Functionality |
| Purchases → **Purchase History** | Plus subscription (via App Store / RevenueCat) | App Functionality |
| Usage Data → **Product Interaction** | Circles joined, RSVPs, likes/passes, matches | App Functionality |
| Diagnostics → **Crash Data** | Crash reports (Sentry) | App Functionality |
| Diagnostics → **Other Diagnostic Data** | Error reports (Sentry) | App Functionality |
| Other Data → **Other Data Types** | Date of birth (age check, shown as age) | App Functionality |

Not collected (answer "No"): Phone Number (the member's own), Physical Address,
Precise Location (device location is used on the device only for the Local filter and
never sent or stored), Health & Fitness, Financial Info (payments are handled by
Apple), Browsing / Search History, Audio, Gameplay, Customer Support (unless you count
support emails), Advertising Data, Performance Data.

---

## 3. Google Play: Data safety

Play Console → App content → Data safety.

**Overview questions**
- Does your app collect or share any of the required user data types? **Yes**
- Is all of the user data collected by your app encrypted in transit? **Yes**
- Do you provide a way for users to request that their data is deleted? **Yes** —
  in the app (Settings → Delete account) and on the web (see *Account deletion URL*).
- Account creation: **Username/email and password**, plus **OAuth** (Google, Apple).

**Account deletion URL (required by Google):** https://turek.expo.app/delete-account —
explains deleting in the app, on the website, or by email, what gets deleted, and that
Plus must be cancelled separately.

**Data types** — for each: Collected **Yes**, Shared **No** (Google doesn't count
service providers acting on your behalf as "sharing"), Processed ephemerally **No**,
Required or optional as noted, Purpose **App functionality** (plus *Analytics* for
crash logs).

| Google category | Data type | Required? | Notes |
| --- | --- | --- | --- |
| Location | Approximate location | Optional | City/state/country on the profile (not device GPS) |
| Personal info | Name | Required | Display name |
| Personal info | Email address | Required | Account email |
| Personal info | User IDs | Required | Account ID |
| Personal info | Race and ethnicity | Optional | Countries of origin (consent-based) |
| Personal info | Religious or philosophical beliefs | Optional | Religion (consent-based) |
| Personal info | Other info | Required | Date of birth; citizenship/residency status (optional) |
| Messages | Other in-app messages | Optional | Chat |
| Photos and videos | Photos | Required | Profile photos (a cover photo is required) |
| Contacts | Contacts | Optional | Trusted contacts for safety plans |
| App activity | App interactions | Required | Circles, RSVPs, likes, matches |
| App activity | Other user-generated content | Optional | Bio, interests, questionnaire, reports |
| App info and performance | Crash logs | Required | Sentry |
| App info and performance | Diagnostics | Required | Sentry error reports |
| Device or other IDs | Device or other IDs | Optional | Push notification token |
| Financial info | Purchase history | Optional | Plus subscription |
| Personal info | (Identity verification) | Optional | ID photo + selfie go to Stripe Identity; declare under *Photos* / *Other info* if Play asks |

Not collected: precise location, phone number (own), address, web browsing, audio,
files and docs, calendar, health and fitness, payment info (Google Play Billing handles
it).

---

## 4. Age ratings

The app is **for adults only (18+)**: it checks date of birth at sign-up, and members
can chat with and meet people they don't know.

**Apple (App Store Connect → Age Rating)**
- User-generated content / unrestricted messaging between users: **Yes**
- Dating / meeting strangers in person: **Yes**
- Mature or suggestive themes, profanity, violence, gambling, alcohol/drugs: **None**
  (none in the app's own content; user content is moderated through reporting)
- Result: choose / expect **18+**.
- Apple's content rules for apps with user content (Guideline 1.2), and where the app
  meets them: Terms with zero tolerance for objectionable content (sign-up links to
  them), reporting (profiles, Safety Center → Report), blocking, and a support contact.

**Google Play (IARC questionnaire)**
- Category: **Social / Communication** (with dating features).
- Users can interact or exchange information: **Yes**
- Users can share their location with others: **No** (only a city they type)
- Allows users to purchase digital goods: **Yes** (Plus)
- Unrestricted internet / user-generated content: **Yes**, moderated with reporting
  and blocking.
- **Target audience and content** (App content → Target audience): **18 and over only**.
  Not designed for children; no appeal to children.
- Expect: **Mature 17+ / 18+** depending on the region.

---

## 5. Store copy

**Subtitle (App Store, 30 chars):** `Your Turkic community, nearby` (29)

**Google short description (80 chars):**
`Join circles, go to meetups, and meet people from the Turkic world near you.` (76)

**Promotional text (App Store, 170 chars, editable any time):**
`Find your people: join circles for your city, culture and interests, see who's going to the next meetup, and connect for friendship, romance, business or mentorship.`

**Keywords (App Store, 100 chars, comma-separated, no spaces needed):**
`turkish,turkic,azerbaijani,kazakh,uzbek,diaspora,community,meetup,friends,dating,events,expat`
*(93 chars. Don't repeat words already in the name or subtitle.)*

**Full description (both stores, up to 4,000 chars):**

> Turkic Circles brings together people from the Turkic world — Turkish, Azerbaijani,
> Kazakh, Uzbek, Kyrgyz, Turkmen, Tatar, Uyghur and beyond — wherever they live now.
>
> **Join circles**
> Find groups for your city, culture and interests: everyday hangouts, family and
> weekend travel, business networks, creatives and musicians, and newcomers finding
> their feet. Every circle has real meetups on the calendar.
>
> **Go to events**
> See what's coming up, RSVP as going or interested, and see who else from your circle
> is going.
>
> **Meet people**
> Discover members of your circles for friendship, romance, business or mentorship.
> Like someone, and if they like you back, you're connected.
>
> **Chat and make plans**
> Message your connections, reply to messages and react with emoji.
>
> **Safe by design**
> - Get the Verified badge with a quick ID and selfie check.
> - Share your plans with someone you trust before you meet, with check-in reminders.
> - Block or report anyone in two taps. We review every report.
> - Turkic Circles is for adults 18 and over.
>
> **Turkic Circles Plus** (optional subscription)
> See everyone who likes you, so you can like them back and match right away (more Plus
> features are on the way). Plus renews automatically unless you cancel at least 24
> hours before the end of the period; manage or cancel it in your App Store or Google
> Play account settings.
>
> Available in English, Turkish, German and Russian.
>
> Terms: https://turek.expo.app/terms · Privacy: https://turek.expo.app/privacy

*(Today Plus's live feature is "See who likes you"; worldwide Discover, advanced filters and more daily likes show as "coming soon". Update this line as they ship.)*

**What's New (first release):** `Welcome to Turkic Circles! Join circles, go to meetups and meet your people.`

---

## 6. App Review notes (Apple) / App access (Google)

Both stores need a working login. Create a dedicated review account (not one of yours),
fully onboarded, and **add it as a test account** so the app isn't empty for the
reviewer (`insert into public.test_accounts …` — it then sees the sample members).

**Sign-in information:** email + password of the review account.

**Notes to paste (Apple → App Review Information → Notes; Google → App access):**

> Turkic Circles is a community app for adults (18+) of Turkic heritage: members join
> circles (local groups), RSVP to events, discover and connect with other members, and
> chat. Please sign in with the account above (email and password); it's already
> onboarded.
>
> - Circles tab: browse and join circles; open an event to RSVP and see who's going.
> - Discover tab: like or pass on members; a mutual like creates a connection.
> - Chat tab: message connections.
> - Safety: on any member's profile, Report and Block are at the bottom (under the ⋯
>   menu once you're connected). Settings → Safety Center has Report, Share your plans
>   (a safety plan with trusted contacts and check-in reminders) and Get verified.
> - Delete account: Settings → Delete account.
> - Plus (in-app subscription): Settings → Plus. Sandbox purchases work with a sandbox
>   tester.
> - Identity verification uses Stripe Identity (ID + selfie) and is optional.
> - Sign in with Apple and Google are offered on the Log in screen.
>
> Contact: unturkk@gmail.com


---

## 7. Screenshots

Take them on the review account (with the sample members visible), in light mode,
with real-looking content. Suggested order — the first two matter most:

1. **Circles** list (cards with topic tiles, member and event counts)
2. **A circle's page** with upcoming events
3. **An event** with Going / Interested faces
4. **Discover** card
5. **Chat** conversation (grouped bubbles, a reaction)
6. **Safety Center** (Your plans, Report/Block, Verified)
7. **Profile** with the Verified badge

**Sizes**
- **Apple:** 6.9" iPhone, 1320 × 2868 px (portrait) — required; Apple scales it for
  smaller iPhones. Up to 10; at least 1. (No iPad screenshots: iPad isn't supported.)
- **Google:** phone screenshots, 2–8, 16:9 or 9:16, each side 320–3840 px
  (e.g. 1080 × 1920). Plus a **feature graphic** 1024 × 500 px and an **app icon**
  512 × 512 px (PNG, 32-bit).

Optional: add a short caption over each screenshot ("Join circles near you", "See who's
going", "Chat and make plans", "Safe by design").

---

## 8. Other Play Console declarations

- **Ads:** No ads.
- **Government app / financial features / health:** No.
- **News app:** No.
- **COVID-19 contact tracing:** No.
- **Data safety:** see §3. **Target audience:** 18+ (§4).
- **App access:** login required — give the review account (§6).
- **Permissions:** the app uses the camera/photo library (profile photos), location
  (Local filter, while in use), notifications. No sensitive permissions like SMS or
  call log (Messages is opened for the user to send texts; the app doesn't send SMS
  itself).
