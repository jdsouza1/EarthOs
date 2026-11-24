#!/usr/bin/env python3
"""
Monthly source-link check for EarthOS. Finds every https link in data/*.csv and lib/*.ts, opens each one,
and reports the ones that fail. Never changes a file and never fails the refresh: a broken link needs a
person to find the new address.

    python scripts/check_links.py            # prints a report; in GitHub Actions also writes the run summary

Some sites refuse automated visitors (403, 429). Those are listed separately as "blocked", because the
link may still work in a browser. Standard library only.
"""
from __future__ import annotations

import concurrent.futures as cf
import os
import re
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
URL = re.compile(r"https://[^\s\"'<>,)\]]+")
UA = "Mozilla/5.0 (compatible; EarthOS link check; +https://github.com/jdsouza1/EarthOs)"
BLOCKED = {401, 403, 405, 406, 418, 429, 451, 503, 999}


def collect() -> dict[str, set[str]]:
    found: dict[str, set[str]] = {}
    files = sorted((ROOT / "data").glob("*.csv")) + sorted((ROOT / "lib").glob("*.ts"))
    for f in files:
        if f.name in {"indicators.csv", "refresh.csv"}:
            continue  # download addresses, checked by the refresh itself
        for u in URL.findall(f.read_text(encoding="utf-8")):
            u = u.rstrip(".;:")
            found.setdefault(u, set()).add(f.relative_to(ROOT).as_posix())
    return found


def check(url: str) -> tuple[str, str]:
    for method in ("HEAD", "GET"):
        req = urllib.request.Request(url, method=method, headers={"User-Agent": UA, "Accept": "*/*"})
        try:
            with urllib.request.urlopen(req, timeout=25) as r:
                return "ok", str(r.status)
        except urllib.error.HTTPError as e:
            if method == "HEAD" and e.code in (400, 403, 404, 405, 501):
                continue  # some servers only answer GET
            return ("blocked" if e.code in BLOCKED else "broken"), str(e.code)
        except Exception as e:  # noqa: BLE001
            if method == "HEAD":
                continue
            return "broken", type(e).__name__
    return "broken", "no answer"


def main() -> None:
    links = collect()
    with cf.ThreadPoolExecutor(max_workers=16) as pool:
        results = dict(zip(links, pool.map(check, links)))
    broken = sorted(u for u, (s, _) in results.items() if s == "broken")
    blocked = sorted(u for u, (s, _) in results.items() if s == "blocked")
    lines = [f"### Source links: {len(links)} checked, {len(broken)} broken, {len(blocked)} blocked by the site", ""]
    if broken:
        lines += ["**Broken** (fix these):", "", "| Link | Answer | Used in |", "| --- | --- | --- |"]
        lines += [f"| {u} | {results[u][1]} | {', '.join(sorted(links[u]))} |" for u in broken]
        lines.append("")
    if blocked:
        lines += ["<details><summary>Blocked by the site (may still work in a browser)</summary>", ""]
        lines += [f"- {u} ({results[u][1]})" for u in blocked]
        lines += ["", "</details>"]
    report = "\n".join(lines)
    print(report)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as f:
            f.write(report + "\n")
    for u in broken:
        print(f"::warning title=Broken source link::{u} ({results[u][1]}) in {', '.join(sorted(links[u]))}")


if __name__ == "__main__":
    main()
