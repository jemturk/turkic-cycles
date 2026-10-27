// Gets native C++ builds past Windows' 260-character path limit.
//
// Each module with C++ code (Reanimated, Worklets, react-native-screens, the app's own
// codegen for gesture-handler, ...) builds it under <module>/android/.cxx, and CMake nests
// a copy of every source file's full path inside that. From SDK 58 some of those paths
// are over 260 characters on their own (gesture-handler 3's generated shadow nodes reach
// ~280 before the build folder is added), so no shorter folder can fix it; ninja has to
// handle long paths. Three parts, Windows only (other platforms and EAS keep defaults):
//
//   * CMake 3.31.6, whose ninja (1.12) supports long paths -- the Android SDK's default
//     3.22.1 ships ninja 1.10, which doesn't. Install it once with
//     sdkmanager "cmake;3.31.6". It's picked through cmake.dir in android/local.properties,
//     since Android Gradle Plugin 9 doesn't let a root script set each module's
//     cmake.version ("too late to set version"); no module pins its own version.
//   * Windows long paths turned on (LongPathsEnabled = 1, a one-off admin setting);
//     without it even ninja 1.12 stops at 260.
//   * Each library's C++ build under a short folder, C:\cxx\<module> (TUREK_CXX_DIR), to
//     stay well clear of the limit.
//
// android/ is generated (Continuous Native Generation), so this is applied here rather
// than by editing android/ by hand.
const fs = require("fs");
const path = require("path");
const { withDangerousMod, withProjectBuildGradle } = require("expo/config-plugins");

const MARKER = "// withShortNativeBuildPaths";
const CMAKE_VERSION = "3.31.6";

const SNIPPET = `
${MARKER}: library C++ builds in a short folder on Windows (260-character path limit).
if (System.getProperty("os.name").toLowerCase().contains("windows")) {
  def cxxRoot = System.getenv("TUREK_CXX_DIR") ?: "C:/cxx"
  subprojects { sub ->
    sub.plugins.withId("com.android.library") {
      sub.android.externalNativeBuild.cmake.buildStagingDirectory = new File(cxxRoot, sub.name)
    }
  }
}
`;

function cmakeDir() {
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || "C:\\Android\\Sdk";
  return path.join(sdk, "cmake", process.env.TUREK_CMAKE_VERSION || CMAKE_VERSION);
}

module.exports = function withShortNativeBuildPaths(config) {
  config = withProjectBuildGradle(config, (mod) => {
    if (mod.modResults.language === "groovy" && !mod.modResults.contents.includes(MARKER)) {
      mod.modResults.contents += SNIPPET;
    }
    return mod;
  });
  return withDangerousMod(config, [
    "android",
    (mod) => {
      const dir = cmakeDir();
      if (process.platform !== "win32" || !fs.existsSync(dir)) return mod;
      const file = path.join(mod.modRequest.platformProjectRoot, "local.properties");
      const lines = (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "")
        .split(/\r?\n/)
        .filter((line) => line && !line.startsWith("cmake.dir="));
      // Properties files escape ':' and '\'.
      lines.push(`cmake.dir=${dir.replace(/\\/g, "\\\\").replace(/:/g, "\\:")}`);
      fs.writeFileSync(file, lines.join("\n") + "\n");
      return mod;
    },
  ]);
};
