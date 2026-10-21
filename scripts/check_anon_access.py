#!/usr/bin/env python3
"""Check that the public anon key can't read data or call functions without a login.

The anon key ships inside the app, so anyone can make requests with it. Row-level
security is the only boundary; this probes it from the outside, the way an attacker
with the extracted key would:

  * every table: SELECT one row -> must come back empty or be refused
  * every function: call it -> must fail with "permission denied" (42501)

Functions are called with GET, which PostgREST runs in a READ ONLY transaction, so
even a function that wrongly allows anon can't change data during the probe.

Tables and functions come from src/types/database.ts (regenerate it after a
migration, or add the new names by hand). Run from anywhere:

  python scripts/check_anon_access.py

Exit code 0 = nothing exposed, 1 = something is, 2 = couldn't run the check.
"""

import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TYPES_PATH = ROOT / "src" / "types" / "database.ts"

# Tables anyone may read without logging in, on purpose. Keep this list short and
# explain each entry.
PUBLIC_TABLES: dict[str, str] = {}

DUMMY_UUID = "00000000-0000-0000-0000-000000000000"


def load_env() -> tuple[str, str]:
    env: dict[str, str] = {}
    env_path = ROOT / ".env"
    if not env_path.is_file():
        raise SystemExit(".env not found -- can't check without the Supabase URL and anon key")
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip().strip('"').strip("'")
    url = env.get("EXPO_PUBLIC_SUPABASE_URL")
    key = env.get("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY") or env.get("EXPO_PUBLIC_SUPABASE_ANON_KEY")
    if not url or not key:
        raise SystemExit(".env is missing EXPO_PUBLIC_SUPABASE_URL or the publishable/anon key")
    return url.rstrip("/"), key


def public_schema_block(source: str, name: str) -> str:
    """The body of `public: { ... <name>: { ... } }` in the generated types."""
    public_start = source.index("\n  public: {")
    start = source.index(f"\n    {name}: {{", public_start)
    end = source.index("\n    }", start + 1)
    return source[start:end]


def parse_types() -> tuple[list[str], dict[str, dict[str, str]]]:
    source = TYPES_PATH.read_text(encoding="utf-8")
    tables = re.findall(r"^      (\w+): \{$", public_schema_block(source, "Tables"), re.MULTILINE)

    functions: dict[str, dict[str, str]] = {}
    block = public_schema_block(source, "Functions")
    # Each function starts at 6-space indent: `      name: {` (args may span lines).
    for match in re.finditer(r"^      (\w+): \{(.*?)(?=^      \w+: \{|\Z)", block, re.MULTILINE | re.DOTALL):
        name, body = match.group(1), match.group(2)
        args_match = re.search(r"Args:\s*(never|\{(.*?)\})", body, re.DOTALL)
        args: dict[str, str] = {}
        if args_match and args_match.group(1) != "never":
            for arg_name, arg_type in re.findall(r"(\w+)\??:\s*([^;\n}]+)", args_match.group(2)):
                args[arg_name] = arg_type.strip()
        functions[name] = args
    return tables, functions


def dummy_value(ts_type: str) -> str:
    # "number | null" -> "number": a placeholder of the wrong type makes Postgres
    # reject the call while parsing the arguments -- before it ever checks EXECUTE
    # permission -- which would look like an exposed function when it isn't.
    ts_type = next((part.strip() for part in ts_type.split("|") if part.strip() not in ("null", "undefined")), "string")
    if ts_type.endswith("[]"):
        inner = ts_type[:-2]
        return "{" + dummy_value(inner) + "}"
    if ts_type == "number":
        return "1"
    if ts_type == "boolean":
        return "false"
    if ts_type == "Json":
        return "{}"
    return DUMMY_UUID  # string: most args here are user/circle ids


def request(url: str, key: str) -> tuple[int, object]:
    req = urllib.request.Request(url, headers={"apikey": key, "Authorization": f"Bearer {key}"})
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            return response.status, json.loads(response.read() or b"null")
    except urllib.error.HTTPError as error:
        body = error.read()
        try:
            return error.code, json.loads(body or b"null")
        except json.JSONDecodeError:
            return error.code, body.decode(errors="replace")


def main() -> int:
    try:
        base, key = load_env()
        tables, functions = parse_types()
    except (OSError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 2

    exposed: list[str] = []

    print(f"Tables ({len(tables)}):")
    for table in tables:
        status, body = request(f"{base}/rest/v1/{table}?select=*&limit=1", key)
        if status == 200 and body == []:
            verdict = "ok    (no rows)"
        elif status in (401, 403) or (isinstance(body, dict) and body.get("code") == "42501"):
            verdict = "ok    (refused)"
        elif status == 200 and table in PUBLIC_TABLES:
            verdict = f"public (allowed: {PUBLIC_TABLES[table]})"
        elif status == 200:
            verdict = "EXPOSED (anon can read rows)"
            exposed.append(f"table {table}")
        else:
            verdict = f"?     (HTTP {status}: {str(body)[:120]})"
            exposed.append(f"table {table} (unexpected response)")
        print(f"  {table:<32} {verdict}")

    print(f"\nFunctions ({len(functions)}):")
    for name, args in functions.items():
        query = urllib.parse.urlencode({arg: dummy_value(ts_type) for arg, ts_type in args.items()})
        status, body = request(f"{base}/rest/v1/rpc/{name}" + (f"?{query}" if query else ""), key)
        code = body.get("code") if isinstance(body, dict) else None
        if code == "42501":
            verdict = "ok    (permission denied)"
        elif code == "PGRST202" and not body.get("hint"):
            # No such function at all (dropped by a migration, types not regenerated):
            # nothing to call. With a hint ("Perhaps you meant ...") it exists under other
            # parameters and stays a failure below.
            verdict = "gone  (not in the database -- regenerate src/types/database.ts)"
        else:
            detail = f"HTTP {status}" + (f", {code}: {body.get('message')}" if code else "")
            verdict = f"EXPOSED (anon can execute -- {detail})"
            exposed.append(f"function {name}")
        print(f"  {name:<32} {verdict}")

    if exposed:
        print(f"\nFAIL: {len(exposed)} exposed to anonymous requests: {', '.join(exposed)}", file=sys.stderr)
        return 1
    print("\nOK: nothing readable or callable without a login.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
