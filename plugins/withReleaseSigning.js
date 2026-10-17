// Android release signing and version code, set up on every prebuild (android/ is
// generated, so this can't be a hand edit of android/app/build.gradle).
//
// Signing: Expo's template signs release builds with the public debug key, which
// Google Play rejects. This adds a `release` signing config that reads the upload
// key from a properties file kept OUTSIDE the repo:
//
//   ~/.turek/upload-keystore.properties   (or the path in TUREK_UPLOAD_PROPERTIES)
//     storeFile=C:/Users/<you>/.turek/upload-keystore.jks
//     storePassword=...
//     keyAlias=upload
//     keyPassword=...
//
// When the file exists, release builds (APK and AAB) are signed with that key; when
// it doesn't (a fresh machine), they fall back to the debug key as before, and
// build.py's -b refuses to build a bundle for Play. Google's Play App Signing
// re-signs the app for users, so this is only the *upload* key -- but back the
// keystore and its passwords up: a lost upload key has to be reset through Google.
//
// Version code: Play needs a higher versionCode for every upload. build.py passes
// ANDROID_VERSION_CODE for bundles; without it the version code stays as configured.
const { withAppBuildGradle } = require("expo/config-plugins");

const MARKER = "// withReleaseSigning";

const SIGNING_CONFIG = `
        ${MARKER}: the upload key, from a properties file outside the repo.
        release {
            def uploadProps = new Properties()
            def uploadPropsFile = file(System.getenv("TUREK_UPLOAD_PROPERTIES") ?: "\${System.getProperty('user.home')}/.turek/upload-keystore.properties")
            if (uploadPropsFile.exists()) {
                uploadPropsFile.withInputStream { uploadProps.load(it) }
                storeFile file(uploadProps['storeFile'])
                storePassword uploadProps['storePassword']
                keyAlias uploadProps['keyAlias']
                keyPassword uploadProps['keyPassword']
            }
        }`;

function withReleaseSigning(config) {
  const versionCode = Number(process.env.ANDROID_VERSION_CODE);
  if (Number.isInteger(versionCode) && versionCode > 0) {
    config.android = { ...config.android, versionCode };
  }

  return withAppBuildGradle(config, (mod) => {
    let gradle = mod.modResults.contents;
    if (gradle.includes(MARKER)) return mod;

    // Point the release build type (inside buildTypes, after debug's) at the upload
    // key, falling back to debug when there's no key. Done first, so the release
    // block added to signingConfigs below can't be mistaken for it.
    const releaseAnchor = /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/;
    if (!releaseAnchor.test(gradle)) throw new Error("withReleaseSigning: release build type's signingConfig not found");
    gradle = gradle.replace(
      releaseAnchor,
      "$1signingConfig signingConfigs.release.storeFile ? signingConfigs.release : signingConfigs.debug"
    );

    // Add the release config inside signingConfigs, next to debug.
    const signingAnchor = /signingConfigs \{\n(\s*)debug \{/;
    if (!signingAnchor.test(gradle)) throw new Error("withReleaseSigning: signingConfigs block not found");
    gradle = gradle.replace(signingAnchor, (match) => match.replace("signingConfigs {", `signingConfigs {${SIGNING_CONFIG}`));

    mod.modResults.contents = gradle;
    return mod;
  });
}

module.exports = withReleaseSigning;
