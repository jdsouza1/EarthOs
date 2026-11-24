"""
EarthOS projections, method p2 (p1 = 3-year runs, failed its backtest) (B5 Forecasting design, approved 22 Nov 2026).

For each scored indicator: where it is heading over the next 10 years if the last 30 years'
pace and bumpiness continue, as a band. Joint block bootstrap of year-to-year changes:
  1. Yearly values (monthly series: calendar-year means of complete years).
  2. Changes on a scale that respects limits: logit for shares (0-100% and 0-1 indices),
     log for positive counts/prices/concentrations, plain difference otherwise (temperature).
  3. 10,000 simulated futures, each replaying one whole run of 10 consecutive past years drawn at random
     from the last 30 years before the projection origin.
  4. The same calendar years are drawn for every indicator, so real-world links are kept.
     An indicator with no change for a drawn year uses one of its own years instead.
  5. Report the 5th, 25th, 50th, 75th and 95th percentiles of the simulated values.
Needs at least 15 yearly changes. Fixed seed, so the same data always gives the same output.

Modes:
  python scripts/project.py            -> data/projections.csv (target year = latest year + 10)
  python scripts/project.py --backtest -> data/backtest.csv + summary (origins 2000..2015)
Choices are fixed here before the backtest is run; see the design doc.
"""
import csv, math, sys, collections
from pathlib import Path
import numpy as np

METHOD = 'p2'
WINDOW = 30          # yearly changes used
BLOCK = 10           # years per bootstrap run (p1 used 3; revised once after the p1 backtest, see design doc)
SIMS = 10_000
MIN_CHANGES = 15
HORIZON = 10
SEED = 20261122
QS = [5, 25, 50, 75, 95]
ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data'


def load():
    rows = collections.defaultdict(list)
    unit = {}
    for r in csv.DictReader(open(DATA / 'indicators.csv', encoding='utf-8')):
        rows[r['indicator_id']].append((r['observed_at'], float(r['value'])))
        unit[r['indicator_id']] = r['unit']
    better = {r['indicator_id']: r['better'] for r in csv.DictReader(open(DATA / 'targets.csv', encoding='utf-8'))}
    series = {}
    for k, pts in rows.items():
        if better.get(k, 'none') == 'none':
            continue  # not scored, so not projected
        pts.sort()
        months = collections.defaultdict(list)
        for d, v in pts:
            months[int(d[:4])].append(v)
        monthly = len(pts) > 1.5 * len(months)
        yearly = {}
        for y, vs in months.items():
            if monthly and len(vs) < 12:
                continue  # incomplete calendar year
            yearly[y] = sum(vs) / len(vs)
        series[k] = (dict(sorted(yearly.items())), unit[k])
    return series


def scale_for(unit, values):
    u = unit.lower()
    if u.startswith('%'):
        return 'logit100'
    if 'index (0-1)' in u:
        return 'logit1'
    if min(values) > 0:
        return 'log'
    return 'diff'


def fwd(x, s):
    if s == 'logit100':
        p = min(max(x / 100, 1e-4), 1 - 1e-4); return math.log(p / (1 - p))
    if s == 'logit1':
        p = min(max(x, 1e-4), 1 - 1e-4); return math.log(p / (1 - p))
    if s == 'log':
        return math.log(x)
    return x


def back(z, s):
    if s == 'logit100':
        return 100 / (1 + np.exp(-z))
    if s == 'logit1':
        return 1 / (1 + np.exp(-z))
    if s == 'log':
        return np.exp(z)
    return z


def changes_upto(yearly, s, origin):
    """Year-to-year changes (keyed by the later year), consecutive years only, last WINDOW up to origin."""
    ys = [y for y in yearly if y <= origin]
    ch = {}
    for a, b in zip(ys, ys[1:]):
        if b - a == 1:
            ch[b] = fwd(yearly[b], s) - fwd(yearly[a], s)
    keep = [y for y in sorted(ch) if y > origin - WINDOW]
    return {y: ch[y] for y in keep}


def project(series, origin, target_of, rng):
    """origin: last year of data allowed. target_of(last_year) -> target year. Returns {id: (last, target, scale, quantiles)}."""
    prepared = {}
    for k, (yearly, unit) in series.items():
        s = scale_for(unit, list(yearly.values()))
        ch = changes_upto(yearly, s, origin)
        last = max([y for y in yearly if y <= origin], default=None)
        if last is None or len(ch) < MIN_CHANGES:
            continue
        prepared[k] = (s, ch, last)
    if not prepared:
        return {}
    pool = sorted({y for _, ch, _ in prepared.values() for y in ch})
    steps_max = max(target_of(last) - last for _, _, last in prepared.values())
    n_blocks = -(-steps_max // BLOCK)
    starts = np.array([y for y in pool if all((y + j) in pool for j in range(BLOCK))])
    draws = rng.choice(starts, size=(SIMS, n_blocks))
    years = (draws[:, :, None] + np.arange(BLOCK)[None, None, :]).reshape(SIMS, -1)[:, :steps_max]
    out = {}
    for k, (s, ch, last) in prepared.items():
        own = np.array(sorted(ch))
        lookup = np.array([ch.get(int(y), np.nan) for y in range(pool[0], pool[-1] + 1)])
        steps = target_of(last) - last
        idx = years[:, :steps] - pool[0]
        d = lookup[idx]
        miss = np.isnan(d)
        if miss.any():  # this indicator has no change for that calendar year: use one of its own years
            d[miss] = np.array([ch[int(y)] for y in rng.choice(own, size=int(miss.sum()))])
        z = fwd(series[k][0][last], s) + d.sum(axis=1)
        vals = back(z, s)
        out[k] = (last, last + steps, s, np.percentile(vals, QS))
    return out


def main_project():
    series = load()
    rng = np.random.default_rng(SEED)
    latest = max(max(y) for y, _ in series.values())
    target = latest + HORIZON
    res = project(series, latest, lambda last: target, rng)
    with open(DATA / 'projections.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['method_version', 'indicator_id', 'data_through', 'target_year', 'scale', 'p05', 'p25', 'p50', 'p75', 'p95'])
        for k, (last, ty, s, q) in sorted(res.items()):
            w.writerow([METHOD, k, last, ty, s] + [f'{v:.6g}' for v in q])
    skipped = sorted(set(series) - set(res))
    print(f'Projected {len(res)} indicators to {target}. Too little history: {", ".join(skipped) or "none"}')


def main_backtest():
    series = load()
    rng = np.random.default_rng(SEED)
    rows = []
    for origin in range(2000, 2016):
        res = project(series, origin, lambda last: last + HORIZON, rng)
        for k, (last, ty, s, q) in res.items():
            actual = series[k][0].get(ty)
            if actual is None:
                continue
            start = series[k][0][last]
            rows.append(dict(origin=origin, id=k, data_through=last, target_year=ty, scale=s, q=q, actual=actual, start=start,
                             in90=q[0] <= actual <= q[4], in50=q[1] <= actual <= q[3],
                             model_err=abs(fwd(float(q[2]), s) - fwd(actual, s)), naive_err=abs(fwd(start, s) - fwd(actual, s))))
    with open(DATA / 'backtest.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['method_version', 'origin_year', 'indicator_id', 'data_through', 'target_year', 'p05', 'p25', 'p50', 'p75', 'p95', 'actual', 'in_90', 'in_50', 'model_error', 'naive_error'])
        for r in rows:
            w.writerow([METHOD, r['origin'], r['id'], r['data_through'], r['target_year']] + [f'{v:.6g}' for v in r['q']] +
                       [f"{r['actual']:.6g}", r['in90'], r['in50'], f"{r['model_err']:.5f}", f"{r['naive_err']:.5f}"])
    n = len(rows)
    c90 = sum(r['in90'] for r in rows) / n
    c50 = sum(r['in50'] for r in rows) / n
    print(f'Backtest {METHOD}: {n} projections from origins 2000-2015, {len({r["id"] for r in rows})} indicators')
    print(f'  inside 90% band: {c90:.0%} (pass 85-95%) -> {"PASS" if 0.85 <= c90 <= 0.95 else "FAIL"}')
    print(f'  inside 50% band: {c50:.0%} (pass 40-60%) -> {"PASS" if 0.40 <= c50 <= 0.60 else "FAIL"}')
    print('  per indicator: n, in90, in50, median error model vs no-change')
    by = collections.defaultdict(list)
    for r in rows:
        by[r['id']].append(r)
    for k, rs in sorted(by.items()):
        me = float(np.median([r['model_err'] for r in rs])); ne = float(np.median([r['naive_err'] for r in rs]))
        print(f'    {k:42s} {len(rs):2d} {sum(r["in90"] for r in rs)/len(rs):4.0%} {sum(r["in50"] for r in rs)/len(rs):4.0%}  {me:.4f} vs {ne:.4f} {"better" if me < ne else "NOT better"}')


if __name__ == '__main__':
    main_backtest() if '--backtest' in sys.argv else main_project()
