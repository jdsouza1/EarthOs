#!/usr/bin/env python3
"""
Earth OS data ingest: downloads raw indicators into data/indicators.csv.

Raw values only (with units and sources), never scores. Every source gets the same checks:
the download must have enough rows, every value must be in a plausible range, the history
may not shrink, and NOAA/NASA format changes stop the run. A failure never touches the file.
Each change is logged in data/changelog.csv so the site can explain why a number moved.

Usage (from the project folder):
    python scripts/ingest.py                      # all sources
    python scripts/ingest.py --only co2 ch4       # some sources
    python scripts/ingest.py --dry-run            # download and check, write nothing
    python scripts/ingest.py --only co2 --from-file co2=co2_mm_mlo.csv   # use a downloaded file
    python scripts/ingest.py --list               # show the sources

Standard library only; no pip install needed.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import io
import os
import sys
import tempfile
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "indicators.csv"
CHANGELOG = ROOT / "data" / "changelog.csv"
FIELDS = ["indicator_id", "tier_id", "name", "observed_at", "value", "unit",
          "source", "source_url", "retrieved_at", "is_illustrative"]
CHANGELOG_FIELDS = ["date", "type", "title", "detail", "affects"]
MAX_SHRINK = 0.02  # refuse if a pull has >2% fewer rows than what's on disk

Rows = list[tuple[str, float]]  # (YYYY-MM-DD, value), oldest first


class IngestError(Exception):
    pass


# ── Parsers: one per file format ─────────────────────────────────────────

def _data_lines(text: str) -> list[str]:
    return [ln for ln in text.splitlines() if ln.strip() and not ln.lstrip().startswith("#")]


def parse_noaa_gml(text: str) -> Rows:
    """NOAA GML trends CSV: '#' comments, header year,month,decimal…,average,… ; -99.99 = missing."""
    reader = csv.DictReader(_data_lines(text))
    reader.fieldnames = [f.strip().lower() for f in reader.fieldnames or []]
    for col in ("year", "month", "average"):
        if col not in reader.fieldnames:
            raise IngestError(f"missing column '{col}' (got {reader.fieldnames}); NOAA may have changed the format")
    rows: Rows = []
    for n, rec in enumerate(reader, start=2):
        try:
            y, m, v = int(rec["year"]), int(rec["month"]), float(rec["average"])
        except (TypeError, ValueError) as e:
            raise IngestError(f"data line {n}: can't read {rec}: {e}") from e
        if v < 0:
            continue
        rows.append((f"{y:04d}-{m:02d}-01", v))
    return rows


MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]


def parse_gistemp(text: str) -> Rows:
    """NASA GISTEMP table: a title line, then Year,Jan…Dec,J-D,… ; '***' = not yet available."""
    lines = text.splitlines()
    start = next((i for i, ln in enumerate(lines) if ln.lower().startswith("year,")), None)
    if start is None:
        raise IngestError("no 'Year,' header row found; NASA may have changed the format")
    reader = csv.DictReader(lines[start:])
    reader.fieldnames = [f.strip().lower() for f in reader.fieldnames or []]
    missing = [m for m in MONTHS if m not in reader.fieldnames]
    if missing:
        raise IngestError(f"missing month columns {missing}")
    rows: Rows = []
    for rec in reader:
        try:
            y = int(rec["year"])
        except (TypeError, ValueError):
            continue  # footer or repeated header
        for i, m in enumerate(MONTHS, start=1):
            raw = (rec.get(m) or "").strip()
            if not raw or "*" in raw:
                continue
            try:
                rows.append((f"{y:04d}-{i:02d}-01", float(raw)))
            except ValueError as e:
                raise IngestError(f"year {y} {m}: can't read '{raw}'") from e
    return rows


OWID_HELPER_COLS = {"Population", "World region according to OWID"}


def parse_owid_world(text: str) -> Rows:
    """Our World in Data grapher CSV: Entity,Code,Year,<value>. Keeps the World row per year."""
    reader = csv.DictReader(io.StringIO(text))
    fields = reader.fieldnames or []
    for col in ("Entity", "Year"):
        if col not in fields:
            raise IngestError(f"missing column '{col}' (got {fields}); OWID may have changed the format")
    # OWID adds helper columns to some charts (population for sizing, region for colour).
    value_cols = [f for f in fields if f not in ("Entity", "Code", "Year") and f not in OWID_HELPER_COLS]
    if len(value_cols) != 1:
        raise IngestError(f"expected exactly one value column, got {value_cols}")
    col = value_cols[0]
    rows: Rows = []
    for rec in reader:
        if rec["Entity"] != "World" or not (rec.get(col) or "").strip():
            continue
        try:
            rows.append((f"{int(rec['Year']):04d}-01-01", float(rec[col])))
        except ValueError as e:
            raise IngestError(f"World {rec.get('Year')}: can't read '{rec.get(col)}'") from e
    return rows


def owid_world_columns(*groups: tuple[str, ...], exclude: tuple[str, ...] = ()) -> Callable[[str], Rows]:
    """For OWID charts with several value columns: pick the columns whose name contains every word in
    one of `groups` (case-insensitive) and none in `exclude`, and add them up per year. Each group must
    match exactly one column, so a renamed or extra column fails loudly instead of being guessed."""
    def parse(text: str) -> Rows:
        reader = csv.DictReader(io.StringIO(text))
        fields = reader.fieldnames or []
        for col in ("Entity", "Year"):
            if col not in fields:
                raise IngestError(f"missing column '{col}' (got {fields}); OWID may have changed the format")
        candidates = [f for f in fields if f not in ("Entity", "Code", "Year") and f not in OWID_HELPER_COLS]
        cols: list[str] = []
        for words in groups:
            hits = [f for f in candidates
                    if all(w.lower() in f.lower() for w in words) and not any(x.lower() in f.lower() for x in exclude)]
            if len(hits) != 1:
                raise IngestError(f"expected one column matching {list(words)}, got {hits} (columns: {candidates})")
            cols.append(hits[0])
        rows: Rows = []
        for rec in reader:
            if rec["Entity"] != "World":
                continue
            vals = [(rec.get(c) or "").strip() for c in cols]
            if any(v == "" for v in vals):
                continue
            try:
                rows.append((f"{int(rec['Year']):04d}-01-01", sum(float(v) for v in vals)))
            except ValueError as e:
                raise IngestError(f"World {rec.get('Year')}: can't read {vals}") from e
        return rows
    return parse


# ── Sources ──────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class Source:
    key: str            # short name for --only
    indicator_id: str
    tier_id: str
    name: str           # shown on the site
    short: str          # used in change log titles
    unit: str
    decimals: int
    plausible: tuple[float, float]
    min_rows: int
    annual: bool
    source: str
    urls: tuple[str, ...]
    parse: Callable[[str], Rows]


SOURCES: list[Source] = [
    Source("co2", "co2_ppm_mlo", "existential", "Carbon dioxide in the air", "CO2",
           "ppm", 2, (300, 500), 600, False, "NOAA GML Mauna Loa monthly mean CO2",
           ("https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_mm_mlo.csv",
            "https://gml.noaa.gov/aftp/products/trends/co2/co2_mm_mlo.csv"), parse_noaa_gml),
    Source("ch4", "ch4_ppb_global", "existential", "Methane in the air", "Methane",
           "ppb", 2, (1500, 2200), 400, False, "NOAA GML global monthly mean CH4",
           ("https://gml.noaa.gov/webdata/ccgg/trends/ch4/ch4_mm_gl.csv",), parse_noaa_gml),
    Source("n2o", "n2o_ppb_global", "existential", "Nitrous oxide in the air", "Nitrous oxide",
           "ppb", 2, (290, 360), 250, False, "NOAA GML global monthly mean N2O",
           ("https://gml.noaa.gov/webdata/ccgg/trends/n2o/n2o_mm_gl.csv",), parse_noaa_gml),
    Source("temp", "temp_anomaly_c_global", "existential",
           "Global temperature rise", "Global temperature",
           "°C", 2, (-1.5, 3.0), 1500, False, "NASA GISTEMP v4 global land-ocean index",
           ("https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv",), parse_gistemp),
    Source("warheads", "nuclear_warheads_world", "existential", "Nuclear warheads",
           "Nuclear warheads", "warheads", 0, (0, 80000), 70, True,
           "Federation of American Scientists via Our World in Data",
           ("https://ourworldindata.org/grapher/nuclear-warhead-stockpiles-lines.csv?v=1&csvType=full&useColumnShortNames=false",),
           parse_owid_world),

    # ── Systemic: economy, geopolitics, inequality, resources ──
    Source("poverty", "extreme_poverty_share_pct_world", "systemic",
           "Extreme poverty", "Extreme poverty",
           "% of population", 1, (0, 80), 30, True,
           "World Bank Poverty and Inequality Platform via Our World in Data",
           ("https://ourworldindata.org/grapher/share-of-population-in-extreme-poverty.csv?v=1&csvType=full&useColumnShortNames=false",),
           parse_owid_world),
    Source("hunger", "undernourishment_share_pct_world", "systemic",
           "Hunger", "Undernourishment",
           "% of population", 1, (0, 30), 20, True,
           "FAO (SDG indicator 2.1.1) via Our World in Data",
           ("https://ourworldindata.org/grapher/prevalence-of-undernourishment.csv?v=1&csvType=full&useColumnShortNames=false",),
           parse_owid_world),
    Source("conflict", "conflict_deaths_state_based_world", "systemic",
           "Deaths in armed conflicts", "Conflict deaths",
           "deaths", 0, (0, 3000000), 64, True,
           "Uppsala Conflict Data Program and PRIO via Our World in Data",
           ("https://ourworldindata.org/grapher/deaths-in-state-based-conflicts-by-world-region.csv?v=1&csvType=full&useColumnShortNames=false",),
           parse_owid_world),

    # ── Tech governance: AI, biotech, clean energy ──
    Source("internet", "internet_users_share_pct_world", "tech",
           "Internet users", "Internet use",
           "% of population", 2, (0, 100), 20, True,
           "International Telecommunication Union via World Bank and Our World in Data",
           ("https://ourworldindata.org/grapher/share-of-individuals-using-the-internet.csv?v=1&csvType=full&useColumnShortNames=false",),
           parse_owid_world),
    Source("lowcarbon", "low_carbon_electricity_share_pct_world", "tech",
           "Low-carbon electricity", "Low-carbon electricity",
           "% of electricity", 2, (0, 100), 32, True,
           "Ember and Energy Institute via Our World in Data",
           ("https://ourworldindata.org/grapher/share-electricity-low-carbon.csv?v=1&csvType=full&useColumnShortNames=false",),
           parse_owid_world),
    Source("solarpv", "solar_pv_module_price_usd_per_w_world", "tech",
           "Solar panel price", "Solar PV price",
           "US$ per watt (constant dollars)", 3, (0.01, 500), 40, True,
           "IRENA, Nemet (2009) and Farmer & Lafond (2016) via Our World in Data",
           ("https://ourworldindata.org/grapher/solar-pv-prices.csv?v=1&csvType=full&useColumnShortNames=false",),
           parse_owid_world),
    Source("genai", "genai_private_investment_usd_world", "tech",
           "Investment in generative AI", "Generative AI investment",
           "US$ (constant 2021 dollars)", 0, (0, 1_000_000_000_000), 5, True,
           "Quid via Stanford AI Index via Our World in Data",
           ("https://ourworldindata.org/grapher/global-investment-in-generative-ai.csv?v=1&csvType=full&useColumnShortNames=false",),
           parse_owid_world),

    # ── Flourishing: wellbeing, freedom, health, education ──
    Source("lifeexp", "life_expectancy_years_world", "flourishing",
           "Life expectancy", "Life expectancy",
           "years", 1, (15, 90), 60, True,
           "UN World Population Prospects and Human Mortality Database via Our World in Data",
           ("https://ourworldindata.org/grapher/life-expectancy.csv?v=1&csvType=full&useColumnShortNames=false",),
           parse_owid_world),
    Source("childmort", "child_mortality_under5_pct_world", "flourishing",
           "Child deaths before age 5", "Child mortality",
           "% of live births", 2, (0, 70), 30, True,
           "UN Inter-agency Group for Child Mortality Estimation and Gapminder via Our World in Data",
           ("https://ourworldindata.org/grapher/child-mortality.csv?v=1&csvType=full&useColumnShortNames=false",),
           parse_owid_world),
    Source("hdi", "human_development_index_world", "flourishing",
           "Human Development Index", "Human Development Index",
           "index (0-1)", 3, (0.3, 1.0), 27, True,
           "UNDP Human Development Report via Our World in Data",
           ("https://ourworldindata.org/grapher/human-development-index.csv?v=1&csvType=full&useColumnShortNames=false",),
           parse_owid_world),
    Source("asteroids", "near_earth_asteroids_140m_plus_world", "existential",
           "Large asteroids found", "Asteroid detection",
           "asteroids", 0, (0, 40000), 30, True,
           "NASA Center for Near-Earth Object Studies via Our World in Data",
           ("https://ourworldindata.org/grapher/near-earth-asteroids-discovered-over-time.csv?v=1&csvType=full&useColumnShortNames=false",),
           owid_world_columns(("140", "kilomet"), ("larger", "1 kilomet"), exclude=("smaller",))),
    Source("lpi", "living_planet_index_world", "systemic",
           "Wildlife populations", "Living Planet Index",
           "index (1970 = 1)", 3, (0.05, 1.5), 40, True,
           "WWF and Zoological Society of London via Our World in Data",
           ("https://ourworldindata.org/grapher/global-living-planet-index.csv?v=1&csvType=full&useColumnShortNames=false",),
           owid_world_columns(("central estimate",))),
    Source("electricity", "electricity_access_share_pct_world", "tech",
           "Access to electricity", "Electricity access",
           "% of population", 2, (50, 100), 25, True,
           "World Bank (SDG 7.1.1) via Our World in Data",
           ("https://ourworldindata.org/grapher/share-of-the-population-with-access-to-electricity.csv?v=1&csvType=full&useColumnShortNames=false",),
           parse_owid_world),
    Source("cooking", "clean_cooking_access_share_pct_world", "flourishing",
           "Smoke-free cooking at home", "Clean cooking access",
           "% of population", 2, (20, 100), 15, True,
           "WHO (SDG 7.1.2) via World Bank and Our World in Data",
           ("https://ourworldindata.org/grapher/access-to-clean-fuels-and-technologies-for-cooking.csv?v=1&csvType=full&useColumnShortNames=false",),
           parse_owid_world),
    Source("dtp3", "dtp3_vaccination_share_pct_world", "flourishing",
           "Childhood vaccination (DTP3)", "DTP3 vaccination",
           "% of one-year-olds", 1, (10, 100), 30, True,
           "WHO and UNICEF via Our World in Data",
           ("https://ourworldindata.org/grapher/global-vaccination-coverage.csv?v=1&csvType=full&useColumnShortNames=false",),
           owid_world_columns(("dtp3",))),
]
BY_KEY = {s.key: s for s in SOURCES}


# ── Pipeline ─────────────────────────────────────────────────────────────

def fetch(src: Source) -> tuple[str, str]:
    errors = []
    for url in src.urls:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "EarthOS-ingest/0.2 (data fetch)"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read().decode("utf-8-sig"), url
        except Exception as e:  # noqa: BLE001 - try the next mirror, report all at the end
            errors.append(f"{url}: {e}")
    raise IngestError("download failed:\n    " + "\n    ".join(errors))


def validate(src: Source, rows: Rows) -> Rows:
    lo, hi = src.plausible
    for d, v in rows:
        if not lo <= v <= hi:
            raise IngestError(f"{d}: {v} {src.unit} is outside the plausible range {lo}–{hi}")
    if len(rows) < src.min_rows:
        raise IngestError(f"only {len(rows)} rows parsed (expected {src.min_rows}+); download looks truncated")
    dates = [d for d, _ in rows]
    if dates != sorted(dates) or len(set(dates)) != len(dates):
        raise IngestError("dates are out of order or duplicated")
    return rows


def read_existing() -> list[dict]:
    if not OUT.exists():
        return []
    with OUT.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def fmt(src: Source, v: float) -> str:
    return f"{v:.{src.decimals}f}"


def compare(src: Source, rows: Rows, existing: list[dict]) -> tuple[int, int]:
    """Counts of added and revised values versus what is on disk."""
    old = {r["observed_at"]: r["value"] for r in existing if r["indicator_id"] == src.indicator_id}
    if old and len(rows) < len(old) * (1 - MAX_SHRINK):
        raise IngestError(f"new pull has {len(rows)} rows vs {len(old)} on disk; refusing to shrink the history")
    added = sum(1 for d, _ in rows if d not in old)
    revised = sum(1 for d, v in rows if d in old and old[d] != fmt(src, v))
    return added, revised


def to_records(src: Source, rows: Rows, url: str) -> list[dict]:
    today = dt.date.today().isoformat()
    return [{"indicator_id": src.indicator_id, "tier_id": src.tier_id, "name": src.name, "observed_at": d,
             "value": fmt(src, v), "unit": src.unit, "source": src.source, "source_url": url,
             "retrieved_at": today, "is_illustrative": "false"} for d, v in rows]


def write_indicators(records: list[dict]) -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=OUT.parent, suffix=".tmp")
    with os.fdopen(fd, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(sorted(records, key=lambda r: (r["indicator_id"], r["observed_at"])))
    os.replace(tmp, OUT)  # swap in only once fully written


def log_changes(entries: list[dict]) -> None:
    if not entries:
        return
    new_file = not CHANGELOG.exists()
    with CHANGELOG.open("a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CHANGELOG_FIELDS)
        if new_file:
            w.writeheader()
        w.writerows(entries)


def change_entry(src: Source, added: int, revised: int, rows: Rows) -> dict:
    unit_word = "year" if src.annual else "month"
    parts = []
    if added:
        parts.append(f"{added} new {unit_word}{'s' if added != 1 else ''}")
    if revised:
        parts.append(f"{revised} revised by the source")
    last_d, last_v = rows[-1]
    period = last_d[:4] if src.annual else last_d[:7]
    return {"date": dt.date.today().isoformat(), "type": "data",
            "title": f"{src.short} updated: {', '.join(parts)}",
            "detail": f"Latest reading {period}: {fmt(src, last_v)} {src.unit} ({src.source}). "
                      f"History now {len(rows)} {unit_word}s.",
            "affects": "indicators.csv"}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--only", nargs="+", metavar="KEY", help=f"sources to run: {', '.join(BY_KEY)}")
    ap.add_argument("--dry-run", action="store_true", help="download and check, write nothing")
    ap.add_argument("--from-file", nargs="+", default=[], metavar="KEY=PATH", help="read a downloaded file instead")
    ap.add_argument("--list", action="store_true", help="list sources and exit")
    args = ap.parse_args()

    if args.list:
        for s in SOURCES:
            print(f"{s.key:9} {s.indicator_id:24} {s.unit:9} {s.source}")
        return 0

    unknown = [k for k in (args.only or []) if k not in BY_KEY]
    if unknown:
        print(f"ERROR: unknown source(s) {unknown}; choose from {list(BY_KEY)}", file=sys.stderr)
        return 1
    files = dict(item.split("=", 1) for item in args.from_file)
    selected = [BY_KEY[k] for k in args.only] if args.only else SOURCES

    existing = read_existing()
    records = list(existing)
    entries, failures = [], []

    for src in selected:
        try:
            if src.key in files:
                text, url = Path(files[src.key]).read_text(encoding="utf-8-sig"), src.urls[0]
            else:
                text, url = fetch(src)
            rows = validate(src, src.parse(text))
            added, revised = compare(src, rows, existing)
        except (IngestError, OSError) as e:
            failures.append(src.key)
            print(f"FAIL  {src.key}: {e}", file=sys.stderr)
            continue

        first, last = rows[0], rows[-1]
        status = f"+{added} new, {revised} revised" if (added or revised) else "no change"
        print(f"OK    {src.key}: {len(rows)} rows, {first[0][:7]} {fmt(src, first[1])} -> "
              f"{last[0][:7]} {fmt(src, last[1])} {src.unit} ({status})")
        if added or revised:
            records = [r for r in records if r["indicator_id"] != src.indicator_id] + to_records(src, rows, url)
            entries.append(change_entry(src, added, revised, rows))

    if args.dry_run:
        print("Dry run: nothing written.")
    elif entries:
        write_indicators(records)
        log_changes(entries)
        print(f"Wrote {OUT.relative_to(ROOT)} and logged {len(entries)} change(s) in {CHANGELOG.relative_to(ROOT)}")
    else:
        print("Nothing changed; files left as they were.")

    if failures:
        print(f"{len(failures)} source(s) failed: {', '.join(failures)}. Other sources were still saved.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
