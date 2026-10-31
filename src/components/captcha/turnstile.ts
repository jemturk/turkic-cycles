// Cloudflare Turnstile, the CAPTCHA Supabase checks on sign-up, login and password
// reset once it's enabled in the dashboard (Authentication -> Attack Protection).
//
// Off until EXPO_PUBLIC_TURNSTILE_SITE_KEY is set. Order matters when turning it on:
// ship a build with the site key FIRST, then enable CAPTCHA in Supabase -- the other
// way round, every installed copy without it can no longer sign in or sign up.
export const TURNSTILE_SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY || null;

// Turnstile only issues tokens on hostnames listed for the site key in Cloudflare.
// The web build runs on this host; the native WebView loads its HTML with this as
// the base URL so it counts as the same host. List turek.expo.app too while builds
// from before the move to joinhalka.com are still installed.
export const TURNSTILE_HOSTNAME = "https://joinhalka.com";

export const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js";

export type CaptchaWidgetProps = {
  siteKey: string;
  theme: "light" | "dark";
  // null when the token expires or the challenge errors -- submit is disabled again.
  onToken: (token: string | null) => void;
};
