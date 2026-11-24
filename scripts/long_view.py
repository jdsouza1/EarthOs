#!/usr/bin/env python3
"""
Build data/long_view.csv: the reconstructed long-history series for the Deep time page.

These are fixed published records, so they sit outside the monthly refresh. Run once, by hand:
    python scripts/long_view.py                 # downloads the three files
    python scripts/long_view.py --from DIR      # uses files already downloaded into DIR
Measured stretches that EarthOS already keeps live (Mauna Loa CO2) are read from indicators.csv
by the site, not copied here. Standard library only.
"""
from __future__ import annotations

import argparse
import csv
import io
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "long_view.csv"
SOURCES = {
    "co2": ("co2_composite_noaa.txt", "https://www.ncei.noaa.gov/pub/data/paleo/icecore/antarctica/antarctica2015co2composite-noaa.txt"),
    "temp": ("pages2k_median.txt", "https://www.ncei.noaa.gov/pub/data/paleo/pages2k/neukom2019temp/recons/Full_ensemble_median_and_95pct_range.txt"),
    "pop": ("population.csv", "https://ourworldindata.org/grapher/population.csv?v=1&csvType=full&useColumnShortNames=false"),
}
FIELDS = ["series_id", "year", "value", "low", "high", "kind"]


def read(key: str, folder: pathlib.Path | None) -> str:
    name, url = SOURCES[key]
    if folder:
        return (folder / name).read_text(encoding="utf-8")
    req = urllib.request.Request(url, headers={"User-Agent": "EarthOS (github.com/jdsouza1/EarthOs)"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.read().decode("utf-8")


def num(s: str) -> float | None:
    s = s.strip()
    return None if s in ("", "NA", "NaN") else float(s)


def co2(text: str) -> list[dict]:
    """Antarctic composite (Bereiter et al. 2015). Age is years before 1950; converted to calendar year."""
    lines = [ln for ln in text.splitlines() if ln.strip() and not ln.startswith("#")]
    head = lines[0].split("\t")
    assert head[:2] == ["age_gas_calBP", "co2_ppm"], head
    rows = []
    for ln in lines[1:]:
        age, ppm = (float(x) for x in ln.split("\t")[:2])
        assert 150 < ppm < 400, ppm
        rows.append({"series_id": "co2", "year": round(1950 - age), "value": round(ppm, 2), "kind": "reconstructed"})
    rows.sort(key=lambda r: r["year"])
    assert len(rows) > 1500 and rows[0]["year"] < -800000, (len(rows), rows[0])
    return rows


def temp(text: str) -> list[dict]:
    """PAGES 2k Consortium (2019): 31-year filtered ensemble median and 95% range, every 5 years, plus
    the instrumental target series from the same file. Both are °C against 1961-1990."""
    lines = [ln for ln in text.splitlines() if ln.strip() and not ln.startswith("##")]
    head = lines[0].split("\t")
    assert head[0] == "Year" and "Full ensemble median" in head[2], head
    rows = []
    for ln in lines[1:]:
        c = ln.split("\t")
        year = int(c[0])
        inst, med, lo, hi = num(c[1]), num(c[6]), num(c[7]), num(c[8])
        if med is not None and year % 5 == 0:
            assert lo <= med <= hi and -2 < med < 2, (year, med)
            rows.append({"series_id": "temp", "year": year, "value": med, "low": lo, "high": hi, "kind": "reconstructed"})
        if inst is not None:
            rows.append({"series_id": "temp", "year": year, "value": inst, "kind": "measured"})
    assert sum(r["kind"] == "reconstructed" for r in rows) > 350, "too few reconstruction rows"
    return rows


def population(text: str) -> list[dict]:
    """Our World in Data long-run population, World: HYDE before 1800, Gapminder 1800-1949, UN from 1950."""
    rows = []
    for r in csv.DictReader(io.StringIO(text)):
        if r["Entity"] != "World":
            continue
        year, value = int(r["Year"]), float(r["Population"])
        if year > 2023:  # later years are projections
            continue
        rows.append({"series_id": "population", "year": year, "value": round(value / 1e9, 4),
                     "kind": "measured" if year >= 1950 else "reconstructed"})
    rows.sort(key=lambda r: r["year"])
    assert rows[0]["year"] == -10000 and 7.5 < rows[-1]["value"] < 9, (rows[0], rows[-1])
    return rows


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="folder", type=pathlib.Path)
    a = ap.parse_args()
    rows = co2(read("co2", a.folder)) + temp(read("temp", a.folder)) + population(read("pop", a.folder))
    with OUT.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS, lineterminator="\n")
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in FIELDS})
    by = {}
    for r in rows:
        by.setdefault((r["series_id"], r["kind"]), []).append(r["year"])
    for (s, k), ys in by.items():
        print(f"{s:11} {k:13} {len(ys):5} rows  {min(ys)} to {max(ys)}")


if __name__ == "__main__":
    main()
