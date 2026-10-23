// Sentry's version of Expo's Metro config: the same, plus the debug IDs that tie
// crash reports to source maps, so stack traces show real file names and lines.
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withNativeWind } = require("nativewind/metro");

const config = getSentryExpoConfig(__dirname);

module.exports = withNativeWind(config, { input: "./src/theme/global.css" });
