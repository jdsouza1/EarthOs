#!/usr/bin/env python3
"""One-off: download candidate long-history sources into _longview_raw/ with a log, for review.
Standard library only. Each candidate is tried; failures are logged, never fatal."""
import pathlib, re, urllib.request

OUT = pathlib.Path(__file__).resolve().parent.parent / "_longview_raw"
OUT.mkdir(exist_ok=True)
CANDIDATES = {
    "co2_composite.txt": "https://www.ncei.noaa.gov/pub/data/paleo/icecore/antarctica/antarctica2015co2composite.txt",
    "co2_composite_noaa.txt": "https://www.ncei.noaa.gov/pub/data/paleo/icecore/antarctica/antarctica2015co2composite-noaa.txt",
    "pages2k_median.txt": "https://www.ncei.noaa.gov/pub/data/paleo/pages2k/neukom2019temp/recons/Full_ensemble_median_and_95pct_range.txt",
    "pages2k_dir.html": "https://www.ncei.noaa.gov/pub/data/paleo/pages2k/neukom2019temp/recons/",
    "pages2k_root.html": "https://www.ncei.noaa.gov/pub/data/paleo/pages2k/neukom2019temp/",
    "population.csv": "https://ourworldindata.org/grapher/population.csv?v=1&csvType=full&useColumnShortNames=false",
    "population.metadata.json": "https://ourworldindata.org/grapher/population.metadata.json?v=1&csvType=full&useColumnShortNames=false",
    "co2_study.html": "https://www.ncei.noaa.gov/access/paleo-search/study/17975",
    "pages2k_study.html": "https://www.ncei.noaa.gov/access/paleo-search/study/26872",
}
log = []
for name, url in CANDIDATES.items():
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "EarthOS long-view fetch (github.com/jdsouza1/EarthOs)"})
        with urllib.request.urlopen(req, timeout=90) as r:
            body = r.read()
        (OUT / name).write_bytes(body)
        title = re.search(rb"<title>(.*?)</title>", body[:20000], re.S | re.I)
        log.append(f"OK   {name}  {len(body):,} bytes  {url}" + (f"  title={title.group(1).decode('utf8','replace').strip()[:120]}" if title else ""))
    except Exception as e:  # noqa: BLE001
        log.append(f"FAIL {name}  {type(e).__name__}: {e}  {url}")
(OUT / "fetch.log").write_text("\n".join(log) + "\n")
print("\n".join(log))
