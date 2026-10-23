import * as Sentry from "@sentry/react-native";

// Crash and error reporting (Sentry). Off until EXPO_PUBLIC_SENTRY_DSN is set in .env
// (and the build environment), and always off in development, so local work never
// reports. The DSN is public by design -- it only allows sending reports.
//
// Privacy: no personal data is sent -- sendDefaultPii is off (no IP addresses or
// request bodies), only the member's account id identifies who hit an error, and
// breadcrumbs from the console are dropped, since logs can include message text.
// The Privacy Policy lists Sentry among the service providers.
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const sentryEnabled = !!dsn && !__DEV__;

Sentry.init({
  dsn,
  enabled: sentryEnabled,
  sendDefaultPii: false,
  // Errors only for now; no performance tracing or session replay.
  tracesSampleRate: 0,
  beforeBreadcrumb: (breadcrumb) => (breadcrumb.category === "console" ? null : breadcrumb),
});

// Ties reports to the signed-in account (its id only), or clears it on sign-out.
export function identifySentryUser(userId: string | undefined) {
  Sentry.setUser(userId ? { id: userId } : null);
}

export { Sentry };
