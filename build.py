#!/usr/bin/env python3
"""Build, publish, and install Turkic Circles.

  -w  export the web build and deploy it to EAS Hosting (production)
  -a  build a release APK locally with Gradle
  -i  install the release APK on the connected device

Flags combine (-wa, -ai, -wai, ...). Each step runs at most once, in the order
web -> APK -> install. -i on its own installs the APK from the last build.

Before -w or -a, scripts/check_anon_access.py checks the live database for data or
functions reachable with the public anon key, and stops the build if it finds any
(--skip-anon-check to bypass, e.g. offline).
"""

import argparse
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ANDROID_DIR = ROOT / "android"
APK_PATH = ANDROID_DIR / "app" / "build" / "outputs" / "apk" / "release" / "app-release.apk"
APP_ID = "com.turanci.app"
IS_WINDOWS = os.name == "nt"

# Where the local toolchain was installed. The SDK must live on a path without
# spaces -- the NDK's linker breaks on "C:\Users\Jem Unturk\..." -- which is why
# it's at C:\Android\Sdk rather than the default %LOCALAPPDATA%\Android\Sdk.
DEFAULT_ANDROID_HOME = Path("C:/Android/Sdk") if IS_WINDOWS else Path.home() / "Android" / "Sdk"
DEFAULT_JAVA_HOME = next(iter(sorted((Path.home() / ".jdks").glob("jdk-17*"))), None)


class BuildError(Exception):
    pass


def step(message: str) -> None:
    print(f"\n==> {message}", flush=True)


def run(cmd: list[str], cwd: Path = ROOT, env: dict[str, str] | None = None) -> None:
    print("$ " + " ".join(cmd), flush=True)
    result = subprocess.run(cmd, cwd=cwd, env=env)
    if result.returncode != 0:
        raise BuildError(f"command failed with exit code {result.returncode}: {' '.join(cmd)}")


def find_executable(name: str) -> str:
    # On Windows npx is npx.cmd; shutil.which resolves that via PATHEXT, while
    # subprocess.run(["npx", ...]) without shell=True would not.
    path = shutil.which(name)
    if not path:
        raise BuildError(f"'{name}' not found on PATH")
    return path


def npx(*args: str) -> list[str]:
    return [find_executable("npx"), *args]


def android_env() -> dict[str, str]:
    env = os.environ.copy()
    if not env.get("ANDROID_HOME") and DEFAULT_ANDROID_HOME.is_dir():
        env["ANDROID_HOME"] = str(DEFAULT_ANDROID_HOME)
    if not env.get("ANDROID_HOME"):
        raise BuildError("ANDROID_HOME is not set and no Android SDK was found at " + str(DEFAULT_ANDROID_HOME))
    if not env.get("JAVA_HOME") and DEFAULT_JAVA_HOME:
        env["JAVA_HOME"] = str(DEFAULT_JAVA_HOME)
    if not env.get("JAVA_HOME"):
        raise BuildError("JAVA_HOME is not set and no JDK 17 was found in ~/.jdks")
    if " " in env["ANDROID_HOME"]:
        raise BuildError(f"ANDROID_HOME contains a space ({env['ANDROID_HOME']}); the NDK linker fails on such paths")
    return env


def adb_path(env: dict[str, str]) -> str:
    adb = Path(env["ANDROID_HOME"]) / "platform-tools" / ("adb.exe" if IS_WINDOWS else "adb")
    return str(adb) if adb.is_file() else find_executable("adb")


def require_env_file() -> None:
    # EXPO_PUBLIC_* values are inlined at bundle time; without them the app throws
    # on launch (src/api/client.ts), so fail here rather than ship a broken build.
    if not (ROOT / ".env").is_file():
        raise BuildError(".env is missing -- copy .env.example and fill in the Supabase values")


def build_apk() -> None:
    step("Building release APK")
    require_env_file()
    env = android_env()
    env["NODE_ENV"] = "production"

    gradlew = ANDROID_DIR / ("gradlew.bat" if IS_WINDOWS else "gradlew")

    # The Gradle daemon outlives each build (idle for up to 3h) and keeps files
    # under android/ open; on Windows that makes prebuild's regenerate fail with
    # "EBUSY: resource busy or locked, rmdir android". Stop it first.
    if gradlew.is_file():
        run([str(gradlew), "--stop"], cwd=ANDROID_DIR, env=env)

    # Re-run every time so app.json / config plugin changes reach android/. Cheap
    # when nothing changed, and android/ is generated (gitignored) anyway.
    #
    # Retried because `gradlew --stop` returns before the daemon process has fully
    # exited and released its file handles, so the first attempt can still hit EBUSY.
    attempts = 4
    for attempt in range(1, attempts + 1):
        try:
            run(npx("expo", "prebuild", "-p", "android", "--no-install"), env=env)
            break
        except BuildError as error:
            if attempt == attempts:
                raise BuildError(
                    f"{error}\nIf it says EBUSY: some process still has android/ open -- a terminal "
                    "whose current directory is inside android/, or an editor/explorer window on it. "
                    "Close or cd out of it and retry."
                ) from error
            print(f"prebuild failed (attempt {attempt}/{attempts}); retrying in 5s...", flush=True)
            time.sleep(5)

    run([str(gradlew), "assembleRelease", "--console=plain"], cwd=ANDROID_DIR, env=env)

    if not APK_PATH.is_file():
        raise BuildError(f"Gradle reported success but no APK at {APK_PATH}")
    print(f"APK: {APK_PATH} ({APK_PATH.stat().st_size / 1_000_000:.1f} MB)")


def install_apk() -> None:
    step("Installing APK on device")
    if not APK_PATH.is_file():
        raise BuildError(f"no APK at {APK_PATH} -- build one with -a")
    env = android_env()
    adb = adb_path(env)

    output = subprocess.run([adb, "devices"], capture_output=True, text=True, env=env).stdout
    devices = [line.split()[0] for line in output.splitlines()[1:] if line.strip().endswith("\tdevice")]
    unauthorized = [line.split()[0] for line in output.splitlines()[1:] if line.strip().endswith("unauthorized")]
    if unauthorized and not devices:
        raise BuildError("device is unauthorized -- accept the USB debugging prompt on the phone")
    if not devices:
        raise BuildError("no device connected -- plug in a phone with USB debugging enabled")
    if len(devices) > 1:
        raise BuildError(f"multiple devices connected ({', '.join(devices)}); set ANDROID_SERIAL to pick one")

    run([adb, "install", "-r", str(APK_PATH)], env=env)
    run([adb, "shell", "monkey", "-p", APP_ID, "-c", "android.intent.category.LAUNCHER", "1"], env=env)


def check_anon_access() -> None:
    step("Checking anonymous database access")
    # Same interpreter as this script, so it works however `python` resolves.
    run([sys.executable, str(ROOT / "scripts" / "check_anon_access.py")])


def publish_web() -> None:
    step("Exporting and deploying web build")
    require_env_file()
    run(npx("expo", "export", "-p", "web"))
    run(npx("eas-cli@latest", "deploy", "--prod", "--non-interactive"))


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter, add_help=False
    )
    # -help registered explicitly: argparse would otherwise read it as -h plus the
    # bundled flags "elp" and fail.
    parser.add_argument("-h", "-help", "--help", action="help", help="show this help message and exit")
    parser.add_argument("-w", "--web", action="store_true", help="build and publish to web")
    parser.add_argument("-a", "--apk", action="store_true", help="build a release APK")
    parser.add_argument("-i", "--install", action="store_true", help="install the APK on the connected device")
    parser.add_argument(
        "--skip-anon-check", action="store_true", help="don't check the database for anonymous access first"
    )
    args = parser.parse_args()

    if not (args.web or args.apk or args.install):
        parser.print_help()
        return 2

    try:
        if (args.web or args.apk) and not args.skip_anon_check:
            check_anon_access()
        if args.web:
            publish_web()
        if args.apk:
            build_apk()
        if args.install:
            install_apk()
    except BuildError as error:
        print(f"\nerror: {error}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        return 130

    step("Done")
    return 0


if __name__ == "__main__":
    sys.exit(main())
