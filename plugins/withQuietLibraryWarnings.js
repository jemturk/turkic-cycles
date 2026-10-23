// Silences compiler warnings from third-party native modules in Android builds.
//
// Every library under node_modules (react-native-webview, react-native-screens,
// keyboard-controller, Reanimated, ...) compiles its own Kotlin/Java on each build and
// prints ~190 deprecation warnings that only its authors can fix. This turns those off
// for every Gradle subproject except the app itself, so our own warnings still show.
// Also hides Gradle's "deprecated features ... incompatible with Gradle 10" summary,
// which comes from Expo's generated build.gradle template (regenerated on prebuild).
//
// android/ is generated (Continuous Native Generation), so this is applied here
// rather than by editing android/build.gradle by hand.
const { withGradleProperties, withProjectBuildGradle } = require("expo/config-plugins");

const MARKER = "// withQuietLibraryWarnings";

const SNIPPET = `
${MARKER}: compiler warnings off for library modules, kept for :app.
subprojects { sub ->
  if (sub.name != "app") {
    sub.tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
      compilerOptions.suppressWarnings = true
    }
    sub.tasks.withType(JavaCompile).configureEach {
      options.warnings = false
      options.deprecation = false
      options.compilerArgs += ["-nowarn", "-Xlint:none", "-XDsuppressNotes"]
    }
  }
}
`;

function withQuietLibraryWarnings(config) {
  config = withProjectBuildGradle(config, (mod) => {
    if (mod.modResults.language === "groovy" && !mod.modResults.contents.includes(MARKER)) {
      mod.modResults.contents += SNIPPET;
    }
    return mod;
  });
  config = withGradleProperties(config, (mod) => {
    mod.modResults = mod.modResults.filter((item) => !(item.type === "property" && item.key === "org.gradle.warning.mode"));
    mod.modResults.push({ type: "property", key: "org.gradle.warning.mode", value: "none" });
    return mod;
  });
  return config;
}

module.exports = withQuietLibraryWarnings;
