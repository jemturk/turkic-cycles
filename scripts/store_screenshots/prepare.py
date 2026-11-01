"""Prepares and serves the signed-in web build that the store screenshots are taken from.

    python scripts/store_screenshots/prepare.py           # build, sign in, serve (Ctrl+C to stop)
    powershell scripts/store_screenshots/shoot.ps1        # in a second terminal

Steps: exports the web build, signs in as the App Review account (a magic link made
with the service-role key, fetched through the linked Supabase CLI and never written
to disk; only the resulting session is, in the temp folder), and makes two copies:
port 4801 with Inter in place of the system font (close to the iPhone's San Francisco),
port 4802 with Roboto (Android's). Both get compose.html and feature.html, which draw
the caption, device frame and status bar around the live app.
"""

import http.server
import json
import os
import shutil
import subprocess
import sys
import threading
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
WORK = Path(os.environ["TEMP"]) / "halka-shots"
PROJECT_REF = "mpcfakrdgqzcofscnwvu"
REVIEW_EMAIL = "mock003@turek-mock.invalid"

FONT_RANGES = {
    "latin": "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
    "latin-ext": "U+0100-02AF,U+0304,U+0308,U+0329,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
    "cyrillic": "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116",
}
COPIES = {"ios": ("inter", 4801), "play": ("roboto", 4802)}


def npx(*args: str) -> str:
    return subprocess.run(["npx", *args], cwd=ROOT, check=True, capture_output=True, text=True, shell=os.name == "nt").stdout


def download_fonts(fonts: Path) -> None:
    fonts.mkdir(parents=True, exist_ok=True)
    wanted = [(fam, sub, w) for fam in ("inter", "roboto") for sub in FONT_RANGES for w in (400, 500, 600, 700)]
    wanted += [("fraunces", sub, 600) for sub in ("latin", "latin-ext")]
    for fam, sub, w in wanted:
        target = fonts / f"{fam}-{sub}-{w}.woff2"
        if target.exists():
            continue
        url = f"https://cdn.jsdelivr.net/npm/@fontsource/{fam}@5.0.8/files/{fam}-{sub}-{w}-normal.woff2"
        try:
            target.write_bytes(urllib.request.urlopen(url, timeout=30).read())
        except OSError:
            pass  # Roboto has no 600; the browser uses 700 for it.


def review_session() -> dict:
    keys = json.loads(npx("supabase", "projects", "api-keys", "--project-ref", PROJECT_REF, "-o", "json"))
    service = next(k["api_key"] for k in keys if k.get("name") == "service_role")
    auth = f"https://{PROJECT_REF}.supabase.co/auth/v1"

    def post(path: str, body: dict, admin: bool) -> dict:
        headers = {"apikey": service, "Content-Type": "application/json"}
        if admin:
            headers["Authorization"] = f"Bearer {service}"
        req = urllib.request.Request(f"{auth}/{path}", data=json.dumps(body).encode(), headers=headers, method="POST")
        return json.loads(urllib.request.urlopen(req, timeout=30).read())

    link = post("admin/generate_link", {"type": "magiclink", "email": REVIEW_EMAIL}, admin=True)
    token = link.get("hashed_token") or link.get("properties", {}).get("hashed_token")
    session = post("verify", {"type": "magiclink", "token_hash": token}, admin=False)
    if not session.get("access_token"):
        raise SystemExit("couldn't sign in as the review account")
    return session


def prepare() -> None:
    fonts = WORK / "fonts"
    download_fonts(fonts)
    session = review_session()
    web = WORK / "web"
    shutil.rmtree(web, ignore_errors=True)
    npx("expo", "export", "-p", "web", "--output-dir", str(web))
    for name, (family, _) in COPIES.items():
        dst = WORK / name
        shutil.rmtree(dst, ignore_errors=True)
        shutil.copytree(web, dst)
        shutil.copytree(fonts, dst / "shotfonts")
        faces = []
        for w in (400, 500, 600, 700):
            for sub, rng in FONT_RANGES.items():
                f = f"{family}-{sub}-{w}.woff2"
                if (fonts / f).exists():
                    faces.append(f'@font-face{{font-family:"Segoe UI";font-weight:{w};src:url(/shotfonts/{f}) format("woff2");unicode-range:{rng};}}')
        (dst / "shotfonts" / "fonts.css").write_text("\n".join(faces), encoding="utf-8")
        link = '<link rel="stylesheet" href="/shotfonts/fonts.css">'
        # Signed in as the review account, with Discover's first-visit hint already seen.
        script = (
            "<script>localStorage.setItem('discover.gestureHintSeen','1');"
            f"localStorage.setItem('sb-{PROJECT_REF}-auth-token',{json.dumps(json.dumps(session))});</script>"
        )
        index = dst / "index.html"
        index.write_text(index.read_text(encoding="utf-8").replace("<head>", "<head>" + script + link, 1), encoding="utf-8", newline="\n")
        for page in ("compose.html", "feature.html"):
            text = (HERE / page).read_text(encoding="utf-8")
            if page == "compose.html":
                text = text.replace("<style>", link + "<style>", 1)
            (dst / page).write_text(text, encoding="utf-8", newline="\n")
        shutil.copy(ROOT / "store-assets" / "play-icon-512.png", dst / "shot-icon.png")
    shutil.rmtree(web)


def serve() -> None:
    def handler_for(root: Path):
        class Handler(http.server.SimpleHTTPRequestHandler):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, directory=str(root), **kwargs)

            def send_head(self):
                # Single-page app: unknown paths get index.html.
                if not os.path.exists(self.translate_path(self.path)):
                    self.path = "/index.html"
                return super().send_head()

            def log_message(self, *args):
                pass

        return Handler

    servers = [http.server.ThreadingHTTPServer(("127.0.0.1", port), handler_for(WORK / name)) for name, (_, port) in COPIES.items()]
    for s in servers[1:]:
        threading.Thread(target=s.serve_forever, daemon=True).start()
    print("Serving on 4801 (iPhone) and 4802 (Android). Run shoot.ps1 now; Ctrl+C when done.", flush=True)
    try:
        servers[0].serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        # The session file only lives in the copies; remove them with the sign-in.
        for name in COPIES:
            shutil.rmtree(WORK / name, ignore_errors=True)


if __name__ == "__main__":
    if "--serve-only" not in sys.argv:
        prepare()
    serve()
