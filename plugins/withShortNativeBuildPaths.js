// Gets native C++ builds past Windows' 260-character path limit.
//
// Each module with C++ code (Reanimated, Worklets, react-native-screens, the app's own
// codegen for gesture-handler, ...) builds it under <module>/android/.cxx, and CMake nests
// a copy of every source file's full path inside that. From SDK 58 some of those paths
// are over 260 characters on their own (gesture-handler 3's generated shadow nodes reach
// ~280 before the build folder is added), so no shorter folder can fix it; ninja has to
// handle long paths. Two parts:
//
//   * CMake 3.31.6 (TUREK_CMAKE_VERSION), whose ninja (1.12) supports long paths; the
//     Android SDK's default 3.22.1 ships ninja 1.10, which doesn't. Install it once with
//     sdkmanager "cmake;3.31.6".
//   * Windows long paths turned on (LongPathsEnabled = 1, a one-off admin setting);
//     without it even ninja 1.12 stops at 260.
//
// Each module's C++ build also goes under a short folder, C:\cxx\<module> (TUREK_CXX_DIR),
// to stay well clear of the limit. Windows only: other platforms and EAS keep the
// defaults. android/ is generated (Continuous Native Generation), so this is applied here
// rather than by editing android/build.gradle by hand.
const { withProjectBuildGradle } = require("expo/config-plugins");

const MARKER = "// withShortNativeBuildPaths";

const SNIPPET = `
${MARKER}: native C++ builds that work past Windows' 260-character path limit.
if (System.getProperty("os.name").toLowerCase().contains("windows")) {
  def cxxRoot = System.getenv("TUREK_CXX_DIR") ?: "C:/cxx"
  def cmakeVersion = System.getenv("TUREK_CMAKE_VERSION") ?: "3.31.6"
  subprojects { sub ->
    ["com.android.library", "com.android.application"].each { pluginId ->
      sub.plugins.withId(pluginId) {
        sub.android.externalNativeBuild.cmake.version = cmakeVersion
        sub.android.externalNativeBuild.cmake.buildStagingDirectory = new File(cxxRoot, sub.name)
      }
    }
  }
}
`;

module.exports = function withShortNativeBuildPaths(config) {
  return withProjectBuildGradle(config, (mod) => {
    if (mod.modResults.language === "groovy" && !mod.modResults.contents.includes(MARKER)) {
      mod.modResults.contents += SNIPPET;
    }
    return mod;
  });
};
