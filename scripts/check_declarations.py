#!/usr/bin/env python3
"""Check that the app still matches what we declared to the app stores.

Google Play's Data safety form, the Advertising ID question, Apple's privacy labels
and so on are answered once, by hand, in the store consoles; nothing there notices
when the app changes. This compares the app against store-declarations.json, the
reviewed baseline, and fails on anything new:

  * permissions  -- every <uses-permission> in the merged release AndroidManifest
                    (pass --manifest; build.py -b does, after building the bundle)
  * dependencies -- every package in package.json "dependencies" (SDKs are where
                    permissions, IDs and data collection usually sneak in)
  * data         -- every table and column in public, from supabase/migrations

Every permission and dependency in the baseline carries a short reason; an empty
reason counts as not reviewed and fails too.

When it fails: work out whether the change affects a declaration (see
store-declarations.md), update the store console and store-declarations.md if so,
then run with --update to add the new items to the baseline, and fill in the
reasons it leaves empty.

  python scripts/check_declarations.py [--manifest PATH] [--update]

Exit code 0 = matches the baseline, 1 = something changed, 2 = couldn't run.
"""

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASELINE = ROOT / "store-declarations.json"
PACKAGE_JSON = ROOT / "package.json"
MIGRATIONS = ROOT / "supabase" / "migrations"
ANDROID_NS = "{http://schemas.android.com/apk/res/android}"
TOOLS_NS = "{http://schemas.android.com/tools}"

# Words that start a table constraint rather than a column in CREATE TABLE.
CONSTRAINT_WORDS = {"constraint", "primary", "unique", "check", "foreign", "exclude", "like"}


# --- what the app has now ----------------------------------------------------

def manifest_permissions(path: Path) -> set[str]:
    root = ET.parse(path).getroot()
    found = set()
    for tag in ("uses-permission", "uses-permission-sdk-23"):
        for el in root.iter(tag):
            if el.get(f"{TOOLS_NS}node") == "remove":
                continue
            name = el.get(f"{ANDROID_NS}name")
            if name:
                found.add(name)
    return found


def dependencies() -> set[str]:
    return set(json.loads(PACKAGE_JSON.read_text(encoding="utf-8")).get("dependencies", {}))


def strip_sql(sql: str) -> str:
    # Function bodies ($$ ... $$ or $tag$ ... $tag$) can contain anything, comments
    # can mention anything; neither changes the schema.
    sql = re.sub(r"(\$[A-Za-z_]*\$).*?\1", " ", sql, flags=re.S)
    sql = re.sub(r"--[^\n]*", " ", sql)
    sql = re.sub(r"/\*.*?\*/", " ", sql, flags=re.S)
    return sql.lower()


def table_name(raw: str) -> str | None:
    # "public.profiles" / "profiles" -> "profiles"; other schemas (storage, cron) -> None.
    raw = raw.replace('"', "")
    schema, _, name = raw.rpartition(".")
    return name if schema in ("", "public") else None


def split_top_level(body: str) -> list[str]:
    parts, depth, current = [], 0, []
    for ch in body:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append("".join(current))
            current = []
        else:
            current.append(ch)
    parts.append("".join(current))
    return parts


def schema_columns() -> dict[str, set[str]]:
    """Replays the migrations in order: tables and columns in public as they are now."""
    tables: dict[str, set[str]] = {}
    ident = r'("?[\w.]+"?)'
    for path in sorted(MIGRATIONS.glob("*.sql")):
        for stmt in strip_sql(path.read_text(encoding="utf-8")).split(";"):
            stmt = " ".join(stmt.split())

            m = re.match(rf"create table (?:if not exists )?{ident} ?\((.*)\)", stmt)
            if m:
                name = table_name(m.group(1))
                if name:
                    cols = tables.setdefault(name, set())
                    for part in split_top_level(m.group(2)):
                        word = part.strip().split(" ", 1)[0].replace('"', "")
                        if word and word not in CONSTRAINT_WORDS:
                            cols.add(word)
                continue

            m = re.match(rf"drop table (?:if exists )?{ident}", stmt)
            if m:
                tables.pop(table_name(m.group(1)) or "", None)
                continue

            m = re.match(rf"alter table (?:if exists )?(?:only )?{ident} (.*)", stmt)
            if not m:
                continue
            name, rest = table_name(m.group(1)), m.group(2)
            if not name:
                continue
            renamed = re.match(rf"rename to {ident}", rest)
            if renamed:
                tables[table_name(renamed.group(1)) or name] = tables.pop(name, set())
                continue
            cols = tables.setdefault(name, set())
            for col in re.findall(r"add column (?:if not exists )?\"?(\w+)", rest):
                cols.add(col)
            for col in re.findall(r"drop column (?:if exists )?\"?(\w+)", rest):
                cols.discard(col)
            for old, new in re.findall(r"rename (?:column )?\"?(\w+)\"? to \"?(\w+)", rest):
                if old in cols:
                    cols.discard(old)
                    cols.add(new)
    return {t: c for t, c in tables.items()}


# --- comparison -------------------------------------------------------------------

def compare_named(kind: str, current: set[str], baseline: dict[str, str], problems: list[str]) -> None:
    for name in sorted(current - baseline.keys()):
        problems.append(f"new {kind}: {name}")
    for name in sorted(current & baseline.keys()):
        if not baseline[name].strip():
            problems.append(f"{kind} not reviewed (empty reason in store-declarations.json): {name}")
    for name in sorted(baseline.keys() - current):
        problems.append(f"{kind} gone (remove from the baseline, and check if a declaration can be dropped): {name}")


def compare_data(current: dict[str, set[str]], baseline: dict[str, list[str]], problems: list[str]) -> None:
    for table in sorted(current.keys() - baseline.keys()):
        problems.append(f"new table: {table} ({', '.join(sorted(current[table]))})")
    for table in sorted(baseline.keys() - current.keys()):
        problems.append(f"table gone: {table}")
    for table in sorted(current.keys() & baseline.keys()):
        for col in sorted(current[table] - set(baseline[table])):
            problems.append(f"new column: {table}.{col}")
        for col in sorted(set(baseline[table]) - current[table]):
            problems.append(f"column gone: {table}.{col}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--manifest", type=Path, help="merged release AndroidManifest.xml (checks permissions)")
    parser.add_argument("--update", action="store_true", help="add new items to the baseline after reviewing them")
    args = parser.parse_args()

    try:
        baseline = json.loads(BASELINE.read_text(encoding="utf-8"))
        current_deps = dependencies()
        current_data = schema_columns()
        current_perms = manifest_permissions(args.manifest) if args.manifest else None
    except (OSError, ValueError, ET.ParseError) as e:
        print(f"check_declarations: couldn't run: {e}", file=sys.stderr)
        return 2

    if args.update:
        def merge(old: dict[str, str], current: set[str]) -> dict[str, str]:
            return {name: old.get(name, "") for name in sorted(current)}

        baseline["dependencies"] = merge(baseline.get("dependencies", {}), current_deps)
        if current_perms is not None:
            baseline["permissions"] = merge(baseline.get("permissions", {}), current_perms)
        baseline["data"] = {t: sorted(c) for t, c in sorted(current_data.items())}
        BASELINE.write_text(json.dumps(baseline, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
        empty = [n for section in ("permissions", "dependencies") for n, r in baseline.get(section, {}).items() if not r]
        print(f"Updated {BASELINE.name}." + (f" Fill in the reasons for: {', '.join(empty)}" if empty else ""))
        return 0

    problems: list[str] = []
    if current_perms is not None:
        compare_named("permission", current_perms, baseline.get("permissions", {}), problems)
    compare_named("dependency", current_deps, baseline.get("dependencies", {}), problems)
    compare_data(current_data, baseline.get("data", {}), problems)

    if problems:
        print("The app no longer matches store-declarations.json:", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        print(
            "\nCheck each against store-declarations.md and update the store consoles if a declaration\n"
            "changed, then run: python scripts/check_declarations.py --update"
            + (f" --manifest {args.manifest}" if args.manifest else "")
            + "\nand fill in any empty reasons.",
            file=sys.stderr,
        )
        return 1
    checked = "permissions, dependencies and data" if current_perms is not None else "dependencies and data"
    print(f"Store declarations: {checked} match the baseline.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
