"""Precompute the driving route between every pair of organizations.

The exchanges in this system are physical, so the distance between two
organizations is part of whether an exchange makes sense. This asks OSRM for the
real route over OpenStreetMap data and caches the geometry, the distance and the
drive time to seed/routes.json.

Cached rather than fetched live for two reasons: a judging room may have no
network, and a route between two fixed addresses does not change between runs.

    python seed/build_routes.py
"""
import itertools
import json
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from agents.org_profile import OrgProfile  # noqa: E402

OSRM = "https://router.project-osrm.org/route/v1/driving"


def fetch(a: OrgProfile, b: OrgProfile) -> dict | None:
    url = (f"{OSRM}/{a.ubicacion.lon},{a.ubicacion.lat};{b.ubicacion.lon},{b.ubicacion.lat}"
           "?overview=full&geometries=geojson")
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            data = json.load(r)
    except Exception as exc:
        print(f"  ! {a.org_id} -> {b.org_id}: {type(exc).__name__}: {exc}")
        return None
    if data.get("code") != "Ok" or not data.get("routes"):
        print(f"  ! {a.org_id} -> {b.org_id}: {data.get('code')}")
        return None
    route = data["routes"][0]
    return {
        "a": a.org_id,
        "b": b.org_id,
        "metros": round(route["distance"]),
        "segundos": round(route["duration"]),
        # Rounded to five decimals: about a metre, far finer than the map draws.
        "linea": [[round(x, 5), round(y, 5)] for x, y in route["geometry"]["coordinates"]],
    }


def main() -> int:
    perfiles = [OrgProfile.from_json(p) for p in sorted((ROOT / "seed" / "orgs").glob("*.json"))]
    situadas = [p for p in perfiles if p.ubicacion]
    if len(situadas) < len(perfiles):
        faltan = [p.org_id for p in perfiles if not p.ubicacion]
        print(f"Organizations with no location, skipped: {faltan}")

    rutas = []
    for a, b in itertools.combinations(situadas, 2):
        r = fetch(a, b)
        if r:
            rutas.append(r)
            print(f"  {a.org_id:24} -> {b.org_id:24} {r['metros']:>5} m  {r['segundos']:>4} s"
                  f"  ({len(r['linea'])} points)")
        time.sleep(1.1)          # the public demo server asks for one request a second

    if not rutas:
        print("\nNo routes fetched. The cache was left untouched.")
        return 1

    out = ROOT / "seed" / "routes.json"
    out.write_text(json.dumps({"rutas": rutas}, indent=1) + "\n", encoding="utf-8")
    kb = out.stat().st_size / 1024
    print(f"\n{len(rutas)} routes cached to {out.relative_to(ROOT)} ({kb:.0f} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
