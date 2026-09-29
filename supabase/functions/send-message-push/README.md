# send-message-push

Sends an Expo push notification to the other participant in a match whenever a new
row is inserted into `public.messages`. Triggered by the `on_message_insert_send_push`
Database Webhook (see `supabase/migrations/0015_push_notifications.sql`), not called
directly by the client.

## One-time setup (manual — none of this can be scripted from inside this repo)

### 1. Deploy the function

```bash
npx supabase functions deploy send-message-push --no-verify-jwt
```

`--no-verify-jwt` is required: the only caller is Postgres itself (via the Database
Webhook trigger), not an end user, so there's no user JWT to verify — and it means no
service-role or anon key ever needs to be embedded in the trigger's SQL, where it
would sit in source control.

### 2. Android push credentials (required — no shared/default option exists)

Google requires your own Firebase project for FCM (the old shared legacy key Expo
used to provide is gone):

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   and add an Android app with package name `com.turanci.app` (matches `app.json`'s
   `android.package`).
2. Firebase Console → Project Settings → Service Accounts → generate a new private
   key (downloads a JSON file). Keep this file out of git.
3. Run `eas credentials`, select **Android → production → Google Service Account →
   Set up a Google Service Account Key for Push Notifications (FCM V1)**, and upload
   that JSON file when prompted.

### 3. iOS push credentials

Requires an active Apple Developer Program membership. Run `eas credentials`, select
**iOS → push notifications**, and let EAS generate/manage the APNs key for you (it
handles this automatically once your Apple account is linked).

### 4. Rebuild the app

Push notifications don't work in Expo Go (Android has required a dev/production
build since SDK 53) and don't apply to the deployed web app at all — Expo's push
service targets native APNs/FCM, not the separate Web Push API. A fresh build that
actually bakes in the credentials from steps 2–3 is required:

```bash
eas build --profile development   # or a production profile, then install on-device
```

## Verifying it's wired up correctly

After the above, from a real device build:
1. Send a message from account A to account B.
2. Confirm account B's device receives a push (app backgrounded, not force-quit for
   the first test).
3. Check the function's logs (`npx supabase functions logs send-message-push`) for
   errors if nothing arrives — most first-time failures are a still-incomplete
   credentials step above, not a bug in this function.
