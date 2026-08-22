"""Paso 3 check: every seeded need must match a resource of a DIFFERENT org,
using the same keyword logic as evaluar_propuesta."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from agents.org_profile import OrgProfile
from agents.tools.negotiation import _keywords

profiles = [
    OrgProfile.from_json(p) for p in sorted((ROOT / "seed" / "orgs").glob("*.json"))
]

sin_match = 0
for org in profiles:
    print(f"\n{org.nombre}")
    for need in org.necesidades:
        matches = []
        for otra in profiles:
            if otra.org_id == org.org_id:
                continue
            for r in otra.recursos:
                comunes = _keywords(need.descripcion) & _keywords(f"{r.nombre} {r.disponibilidad} {r.notas}")
                if comunes:
                    matches.append(f"{otra.nombre} [{r.id}] {r.nombre} (via: {', '.join(sorted(comunes))})")
        estado = "OK" if matches else "SIN MATCH"
        if not matches:
            sin_match += 1
        print(f"  [{need.id}] {need.descripcion} -> {estado}")
        for m in matches:
            print(f"      <- {m}")

print(f"\nNecesidades sin contraparte: {sin_match}")
sys.exit(1 if sin_match else 0)
