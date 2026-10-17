#!/usr/bin/env python3
r"""Build, publish, and install Turkic Circles.

  -w  export the web build and deploy it to EAS Hosting (production)
  -a  build a release APK locally with Gradle
  -i  install the release APK on the connected device
  -g  copy the release APK to C:\DEV\Cloud\Apk (keeps the newest 3 there)

  -d  debug: stream every command and its full output (otherwise each step
      shows one progress line, and the output goes to .expo/build.log)

Flags combine (-wa, -ai, -ag, -aig, -waid, ...). Each step runs at most once, in
the order web -> APK -> install -> copy. -i or -g on their own use the APK from
the last build.

Without -d, a step's percentage and time left are estimated from how long it took
the last few times (.expo/build-durations.json); the first run guesses. If a step
fails, the end of its output is printed along with the log's path.

Before -w or -a, scripts/check_anon_access.py checks the live database for data or
functions reachable with the public anon key, and stops the build if it finds any
(--skip-anon-check to bypass, e.g. offline).
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ANDROID_DIR = ROOT / "android"
APK_PATH = ANDROID_DIR / "app" / "build" / "outputs" / "apk" / "release" / "app-release.apk"
APP_ID = "com.turek.app"
APK_COPY_DIR = Path("C:/DEV/Cloud/Apk")
APK_COPIES_TO_KEEP = 3
IS_WINDOWS = os.name == "nt"

# Where the local toolchain was installed. The SDK must live on a path without
# spaces -- the NDK's linker breaks on "C:\Users\Jem Unturk\..." -- which is why
# it's at C:\Android\Sdk rather than the default %LOCALAPPDATA%\Android\Sdk.
DEFAULT_ANDROID_HOME = Path("C:/Android/Sdk") if IS_WINDOWS else Path.home() / "Android" / "Sdk"
DEFAULT_JAVA_HOME = next(iter(sorted((Path.home() / ".jdks").glob("jdk-17*"))), None)

# Quiet-mode state (no -d): command output goes to the log, and each step's
# duration is remembered so the next run's progress estimate is closer. .expo/ is
# gitignored.
STATE_DIR = ROOT / ".expo"
LOG_PATH = STATE_DIR / "build.log"
DURATIONS_PATH = STATE_DIR / "build-durations.json"
DURATIONS_KEPT = 3
# First-run guesses, in seconds.
DEFAULT_DURATIONS = {"anon-check": 15, "web": 120, "apk": 360, "install": 20, "copy": 5}
BAR_WIDTH = 24
FAILURE_TAIL_LINES = 30

DEBUG = False

# ANSI colors for the live progress lines -- only on a terminal, never in the log or
# when NO_COLOR is set. GREEN/RED for a finished/failed step's mark, BAR for the
# filled part of the bar (bright cyan, a light blue).
GREEN, RED, BAR, RESET = "\x1b[32m", "\x1b[31m", "\x1b[96m", "\x1b[0m"


def use_color() -> bool:
    return sys.stdout.isatty() and "NO_COLOR" not in os.environ


def paint(text: str, color: str) -> str:
    return f"{color}{text}{RESET}" if use_color() else text


def clear_to(line: str, visible_length: int, width: int = 100) -> str:
    # Pads by what's visible, not by len() -- color codes take no columns.
    return line + " " * max(0, width - visible_length)


class BuildError(Exception):
    pass


def step(message: str) -> None:
    # The step's header -- only in -d mode; otherwise its Stage line says it.
    if DEBUG:
        print(f"\n==> {message}", flush=True)


def note(message: str) -> None:
    """A result worth showing (the APK's path, a copy made): printed straight away
    with -d, otherwise under the step's line once it finishes."""
    if DEBUG:
        print(message, flush=True)
    else:
        Stage.pending_notes.append(message)
        log(message)


def log(message: str) -> None:
    if DEBUG:
        return
    with LOG_PATH.open("a", encoding="utf-8", errors="replace") as f:
        f.write(message + "\n")


def run(cmd: list[str], cwd: Path = ROOT, env: dict[str, str] | None = None) -> None:
    if DEBUG:
        print("$ " + " ".join(cmd), flush=True)
        result = subprocess.run(cmd, cwd=cwd, env=env)
    else:
        log("$ " + " ".join(cmd))
        with LOG_PATH.open("a", encoding="utf-8", errors="replace") as f:
            result = subprocess.run(cmd, cwd=cwd, env=env, stdout=f, stderr=subprocess.STDOUT)
    if result.returncode != 0:
        raise BuildError(f"command failed with exit code {result.returncode}: {' '.join(cmd)}")


def load_durations() -> dict[str, list[float]]:
    try:
        return json.loads(DURATIONS_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def save_duration(key: str, seconds: float) -> None:
    durations = load_durations()
    durations[key] = (durations.get(key, []) + [round(seconds, 1)])[-DURATIONS_KEPT:]
    try:
        STATE_DIR.mkdir(exist_ok=True)
        DURATIONS_PATH.write_text(json.dumps(durations, indent=2), encoding="utf-8")
    except OSError:
        pass  # Only the next run's estimate suffers.


def fmt_time(seconds: float) -> str:
    seconds = int(max(0, seconds))
    return f"{seconds // 60}:{seconds % 60:02d}"


class Stage:
    """One flag's step: in quiet mode a live progress line (percentage, time spent,
    estimated time left), redrawn in place on a terminal; with -d just the header."""

    pending_notes: list[str] = []

    def __init__(self, key: str, label: str):
        self.key = key
        self.label = label
        history = load_durations().get(key)
        self.estimate = sum(history) / len(history) if history else DEFAULT_DURATIONS.get(key, 60)
        self.live = not DEBUG and sys.stdout.isatty()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def _line(self, elapsed: float) -> str:
        fraction = min(elapsed / self.estimate, 0.99) if self.estimate > 0 else 0.99
        filled = int(fraction * BAR_WIDTH)
        bar = paint("\u2588" * filled, BAR) + "\u2591" * (BAR_WIDTH - filled)
        left = self.estimate - elapsed
        eta = f"~{fmt_time(left)} left" if left > 0 else "almost done"
        stats = f"{int(fraction * 100):3d}%  {fmt_time(elapsed)} elapsed  {eta}"
        line = f"{self.label:<26} [{bar}] {stats}"
        return clear_to(line, 26 + 2 + BAR_WIDTH + 2 + len(stats))

    def _render(self) -> None:
        while not self._stop.wait(0.5):
            sys.stdout.write("\r" + self._line(time.monotonic() - self.start))
            sys.stdout.flush()

    def __enter__(self) -> "Stage":
        self.start = time.monotonic()
        Stage.pending_notes = []
        if DEBUG:
            return self
        log(f"\n==> {self.label}")
        if self.live:
            sys.stdout.write(self._line(0))
            sys.stdout.flush()
            self._thread = threading.Thread(target=self._render, daemon=True)
            self._thread.start()
        else:
            print(f"... {self.label}", flush=True)
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:
        elapsed = time.monotonic() - self.start
        if self._thread:
            self._stop.set()
            self._thread.join()
        if exc_type is None:
            save_duration(self.key, elapsed)
        if DEBUG:
            return False
        mark = paint("\u2713", GREEN) if exc_type is None else paint("\u2717", RED)
        status = fmt_time(elapsed) if exc_type is None else f"failed after {fmt_time(elapsed)}"
        line = f"{mark} {self.label:<24} {status}"
        if self.live:
            sys.stdout.write("\r" + clear_to(line, 2 + 24 + 1 + len(status)) + "\n")
        else:
            print(line)
        for message in Stage.pending_notes:
            print(f"    {message}")
        sys.stdout.flush()
        return False


def print_log_tail() -> None:
    try:
        lines = LOG_PATH.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError:
        return
    print(f"\n--- last {FAILURE_TAIL_LINES} lines of {LOG_PATH} ---", file=sys.stderr)
    for line in lines[-FAILURE_TAIL_LINES:]:
        print(line, file=sys.stderr)
    print(f"--- full log: {LOG_PATH} (or rerun with -d) ---", file=sys.stderr)


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
            if DEBUG:
                print(f"prebuild failed (attempt {attempt}/{attempts}); retrying in 5s...", flush=True)
            else:
                log(f"prebuild failed (attempt {attempt}/{attempts}); retrying in 5s...")
            time.sleep(5)

    run([str(gradlew), "assembleRelease", "--console=plain"], cwd=ANDROID_DIR, env=env)

    if not APK_PATH.is_file():
        raise BuildError(f"Gradle reported success but no APK at {APK_PATH}")
    note(f"APK: {APK_PATH} ({APK_PATH.stat().st_size / 1_000_000:.1f} MB)")


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


def copy_apk() -> None:
    step(f"Copying APK to {APK_COPY_DIR}")
    if not APK_PATH.is_file():
        raise BuildError(f"no APK at {APK_PATH} -- build one with -a")
    # Version + the APK's own build time, so each build gets its own file and an
    # older copy is never overwritten (copying the same build twice reuses the name).
    version = json.loads((ROOT / "app.json").read_text(encoding="utf-8"))["expo"]["version"]
    built_at = time.strftime("%Y%m%d-%H%M", time.localtime(APK_PATH.stat().st_mtime))
    target = APK_COPY_DIR / f"turkic-circles-{version}-{built_at}.apk"
    APK_COPY_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(APK_PATH, target)
    note(f"Copied to {target}")

    # Each APK is ~110 MB and the folder syncs to the cloud, so keep only the newest
    # few. Sorted by modification time (copy2 keeps the APK's build time), not by
    # name -- a name sort would put version 1.10.0 before 1.9.0. Only our own
    # turkic-circles-*.apk files are ever deleted.
    copies = sorted(APK_COPY_DIR.glob("turkic-circles-*.apk"), key=lambda p: p.stat().st_mtime, reverse=True)
    for old in copies[APK_COPIES_TO_KEEP:]:
        old.unlink()
        note(f"Removed old copy {old.name}")


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
    parser.add_argument("-g", "--copy", action="store_true", help=f"copy the APK to {APK_COPY_DIR}")
    parser.add_argument("-d", "--debug", action="store_true", help="stream every command's full output")
    parser.add_argument(
        "--skip-anon-check", action="store_true", help="don't check the database for anonymous access first"
    )
    args = parser.parse_args()

    global DEBUG
    DEBUG = args.debug
    if not DEBUG:
        STATE_DIR.mkdir(exist_ok=True)
        LOG_PATH.write_text("", encoding="utf-8")
    # Box-drawing characters and checkmarks on a Windows console that isn't UTF-8.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    # Windows' classic console only honours the color codes once virtual-terminal
    # processing is on; an empty os.system call switches it on for this process.
    if IS_WINDOWS and use_color():
        os.system("")

    if not (args.web or args.apk or args.install or args.copy):
        parser.print_help()
        return 2

    total_start = time.monotonic()
    try:
        if (args.web or args.apk) and not args.skip_anon_check:
            with Stage("anon-check", "Checking database access"):
                check_anon_access()
        if args.web:
            with Stage("web", "Deploying web build"):
                publish_web()
        if args.apk:
            with Stage("apk", "Building release APK"):
                build_apk()
        if args.install:
            with Stage("install", "Installing on device"):
                install_apk()
        if args.copy:
            with Stage("copy", "Copying APK"):
                copy_apk()
    except BuildError as error:
        print(f"\nerror: {error}", file=sys.stderr)
        if not DEBUG:
            print_log_tail()
        return 1
    except KeyboardInterrupt:
        return 130

    if DEBUG:
        step("Done")
    else:
        print(f"Done in {fmt_time(time.monotonic() - total_start)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
