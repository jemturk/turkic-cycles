// Sentry's version of Expo's Metro config: the same, plus the debug IDs that tie
// crash reports to source maps, so stack traces show real file names and lines.
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withNativeWind } = require("nativewind/metro");

const config = getSentryExpoConfig(__dirname);

// Sentry's Expo Router helper (still in @sentry/react-native 8.32) requires
// expo-router/build/global-state/router-store, which Expo Router 58 no longer has. The
// require sits in a try/catch and Sentry carries on without it, but Metro warns about
// the missing file ("invalid package.json configuration") on every bundle. Resolving it
// to an empty module keeps that exact behaviour without the warning. Remove once Sentry
// follows Expo Router's new layout.
const SENTRY_ROUTER_STORE = "expo-router/build/global-state/router-store";
const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === SENTRY_ROUTER_STORE) return { type: "empty" };
  return resolveRequest ? resolveRequest(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./src/theme/global.css" });
