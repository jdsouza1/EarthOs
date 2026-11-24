"""
EarthOS projections, method p3: bands sized by past misses (empirical prediction intervals).
Steps and pass marks were fixed in the B5 design doc on 22 Nov 2026 before this was run.

  python scripts/project_p3.py --backtest   -> data/backtest_p3.csv + summary
  python scripts/project_p3.py              -> data/projections.csv (only meaningful if the backtest passed)
"""
import csv, sys, math, collections, functools
from pathlib import Path
import numpy as np
from project import load, scale_for, fwd, back, DATA

METHOD = 'p3'
CANDS = ('nochange', 'pace10', 'pace30')
MIN_YEARS = 15       # consecutive yearly values needed to project
MIN_PAST = 5         # past misses needed to judge a candidate / size a band
SELECT_H = 5         # candidates are judged on 5-year-ahead misses
LOOKBACK = 40        # start years of past misses used
MIN_POOL = 30        # pooled misses needed for the band shape
QS = (5, 25, 75, 95)
NORMAL = (-1.645, -0.674, 0.674, 1.645)

series = load()
Z = {}       # id -> {year: transformed value}, final run of consecutive years only
SCALE = {}
for k, (yearly, unit) in series.items():
    s = scale_for(unit, list(yearly.values()))
    ys = sorted(yearly)
    run = [ys[-1]]
    for y in reversed(ys[:-1]):
        if run[-1] - y == 1:
            run.append(y)
        else:
            break
    Z[k] = {y: fwd(yearly[y], s) for y in run}
    SCALE[k] = s


def cand_point(k, o, h, c):
    z = Z[k]
    if o not in z:
        return None
    if c == 'nochange':
        return z[o]
    n = 10 if c == 'pace10' else 30
    if (o - n) not in z:
        return None
    return z[o] + h * (z[o] - z[o - n]) / n


def cand_errors(k, o, h, c):
    """Past misses of candidate c at horizon h, for start years whose outcome was known by year o."""
    z = Z[k]
    out = []
    for o2 in range(o - h - LOOKBACK + 1, o - h + 1):
        if (o2 + h) in z:
            p = cand_point(k, o2, h, c)
            if p is not None:
                out.append(z[o2 + h] - p)
    return out


@functools.lru_cache(maxsize=None)
def select(k, o):
    best, best_mae = None, None
    for c in CANDS:
        e = cand_errors(k, o, SELECT_H, c)
        if len(e) >= MIN_PAST:
            mae = sum(abs(x) for x in e) / len(e)
            if best_mae is None or mae < best_mae:
                best, best_mae = c, mae
    if best is None:
        best = 'pace10' if cand_point(k, o, 1, 'pace10') is not None else 'nochange'
    return best


@functools.lru_cache(maxsize=None)
def core(k, o, h):
    """(point, own width unit or None, bumpiness unit or None) using only data up to year o."""
    z = Z[k]
    if o not in z or sum(1 for y in z if y <= o) < MIN_YEARS:
        return None
    c = select(k, o)
    p = cand_point(k, o, h, c)
    if p is None:
        c = 'nochange'; p = z[o]
    e = cand_errors(k, o, h, c)
    own = math.sqrt(sum(x * x for x in e) / len(e)) if len(e) >= MIN_PAST else None
    ch = [z[y] - z[y - 1] for y in range(o - 29, o + 1) if y in z and (y - 1) in z]
    bump = float(np.std(ch)) * math.sqrt(h) if len(ch) >= 8 else None
    return p, own, bump, c


@functools.lru_cache(maxsize=None)
def pooled(o, h):
    """Band shape and young-indicator multiplier from every indicator's resolved past projections."""
    zs, ratios = [], []
    for k in Z:
        for o2 in range(o - h - LOOKBACK + 1, o - h + 1):
            if (o2 + h) not in Z[k]:
                continue
            r = core(k, o2, h)
            if r is None:
                continue
            p, own, bump, _ = r
            if own and own > 0:
                zs.append((Z[k][o2 + h] - p) / own)
                if bump and bump > 0:
                    ratios.append(own / bump)
    q = tuple(np.percentile(zs, QS)) if len(zs) >= MIN_POOL else NORMAL
    kmult = float(np.median(ratios)) if ratios else 1.0
    return q, kmult, len(zs)


def forecast(k, o, h):
    r = core(k, o, h)
    if r is None:
        return None
    p, own, bump, c = r
    q, kmult, _ = pooled(o, h)
    unit = own if own and own > 0 else (bump * kmult if bump else None)
    if unit is None:
        return None
    s = SCALE[k]
    lo5, lo25, hi75, hi95 = (float(back(p + qq * unit, s)) for qq in q)
    return dict(p05=lo5, p25=lo25, p50=float(back(p, s)), p75=hi75, p95=hi95, cand=c, own=bool(own))


def backtest():
    rows = []
    for h, origins in ((10, range(2000, 2016)), (5, range(2000, 2021))):
        for o in origins:
            for k in Z:
                if (o + h) not in Z[k]:
                    continue
                f = forecast(k, o, h)
                if f is None:
                    continue
                s = SCALE[k]
                actual = float(back(Z[k][o + h], s))
                lo, hi = sorted((f['p05'], f['p95'])); l2, h2 = sorted((f['p25'], f['p75']))
                rows.append(dict(h=h, origin=o, id=k, actual=actual, **f, in90=lo <= actual <= hi, in50=l2 <= actual <= h2,
                                 model_err=abs(fwd(f['p50'], s) - Z[k][o + h]), naive_err=abs(Z[k][o] - Z[k][o + h])))
    with open(DATA / 'backtest_p3.csv', 'w', newline='', encoding='utf-8') as fcsv:
        w = csv.writer(fcsv, lineterminator='\n')
        w.writerow(['method_version', 'horizon', 'origin_year', 'indicator_id', 'target_year', 'line_used', 'own_history', 'p05', 'p25', 'p50', 'p75', 'p95', 'actual', 'in_90', 'in_50', 'model_error', 'naive_error'])
        for r in rows:
            w.writerow([METHOD, r['h'], r['origin'], r['id'], r['origin'] + r['h'], r['cand'], r['own']] + [f"{r[x]:.6g}" for x in ('p05', 'p25', 'p50', 'p75', 'p95', 'actual')] + [r['in90'], r['in50'], f"{r['model_err']:.5f}", f"{r['naive_err']:.5f}"])
    ok_all = True
    for h in (10, 5):
        rs = [r for r in rows if r['h'] == h]
        c90 = sum(r['in90'] for r in rs) / len(rs); c50 = sum(r['in50'] for r in rs) / len(rs)
        p90 = 0.85 <= c90 <= 0.95; p50 = 0.40 <= c50 <= 0.60; ok_all &= p90 and p50
        print(f'{h}-year horizon: {len(rs)} projections, {len({r["id"] for r in rs})} indicators')
        print(f'  inside 90% band: {c90:.0%} (pass 85-95%) -> {"PASS" if p90 else "FAIL"}')
        print(f'  inside 50% band: {c50:.0%} (pass 40-60%) -> {"PASS" if p50 else "FAIL"}')
        by = collections.defaultdict(list)
        for r in rs:
            by[r['id']].append(r)
        for k, x in sorted(by.items()):
            n = len(x); a = sum(r['in90'] for r in x) / n; b = sum(r['in50'] for r in x) / n
            me = float(np.median([r['model_err'] for r in x])); ne = float(np.median([r['naive_err'] for r in x]))
            flag = ' <-- below 60%: no band' if n >= 8 and a < 0.60 else ''
            lines = collections.Counter(r['cand'] for r in x).most_common(1)[0][0]
            print(f'    {k:42s} n={n:2d} in90={a:4.0%} in50={b:4.0%} own={sum(r["own"] for r in x):2d} line={lines:8s} err {me:.4f} vs nochange {ne:.4f}{flag}')
    print('OVERALL:', 'PASS' if ok_all else 'FAIL')


if __name__ == '__main__':
    if '--backtest' in sys.argv:
        backtest()
    else:
        print('Run with --backtest. Publishing projections is a separate step after a pass.')
