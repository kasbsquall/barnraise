"""Measure the pieces measure_cost.py cannot see: the A2A server side of
discovery (spent in the neighbour's process) and the coalition round."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from agents.coalition_agent import PROPOSAL_PROMPT, build_coalition_agent, formatear_escaneo
from agents.org_agent import build_org_agent
from agents.org_profile import OrgProfile
from agents.tools.grants import Convocatoria
from ledger import book
from ledger.evidence import evidencia_de_colaboracion
from web.runner import DISCOVERY_MESSAGE

TOTAL = {"entrada": 0, "salida": 0}


def contar(etiqueta, result, acumular=True):
    uso = getattr(getattr(result, "metrics", None), "accumulated_usage", None)
    if not uso:
        print(f"  {etiqueta}: sin metricas")
        return 0, 0
    e, s = uso.get("inputTokens", 0), uso.get("outputTokens", 0)
    if acumular:
        TOTAL["entrada"] += e
        TOTAL["salida"] += s
    print(f"  {etiqueta}: {e:,} entrada | {s:,} salida")
    return e, s


perfiles = [OrgProfile.from_json(p) for p in sorted((ROOT / "seed" / "orgs").glob("*.json"))]
por_id = {p.org_id: p for p in perfiles}

print("=== Lado servidor del descubrimiento (lo que gasta cada vecino) ===")
for oid in ("central-library", "san-martin-school"):
    agente = build_org_agent(por_id[oid])
    r = agente(DISCOVERY_MESSAGE.format(yo="North Food Bank"))
    contar(f"agente {oid}", r)

print(f"\nSubtotal descubrimiento: {TOTAL['entrada']:,} entrada | {TOTAL['salida']:,} salida")

print("\n=== Ronda de coalicion ===")
convocatoria = Convocatoria.from_json(ROOT / "seed" / "grants" / "resilience_fund.json")
escaneo, coaliciones = formatear_escaneo(convocatoria, perfiles)
conn = book.connect()
try:
    evidencia = evidencia_de_colaboracion(conn, coaliciones[0].org_ids)
finally:
    conn.close()

agente = build_coalition_agent(convocatoria, perfiles)
r = agente(PROPOSAL_PROMPT.format(
    nombre=convocatoria.nombre, conv_id=convocatoria.id,
    financiador=convocatoria.financiador, monto=convocatoria.monto,
    moneda=convocatoria.moneda, cierre=convocatoria.cierre,
    descripcion=convocatoria.descripcion, escaneo=escaneo,
    evidencia=evidencia.resumen(),
))
coal_e, coal_s = contar("agente de coalicion (hasta la pausa)", r, acumular=False)
if r.stop_reason == "interrupt":
    r = agente([{"interruptResponse": {"interruptId": r.interrupts[0].id, "response": "no"}}])
    e2, s2 = contar("agente de coalicion (tras rechazar)", r, acumular=False)
    coal_e += e2
    coal_s += s2

print(f"\n--- RESUMEN ---")
print(f"Descubrimiento (2 vecinos): {TOTAL['entrada']:,} entrada | {TOTAL['salida']:,} salida")
print(f"Coalicion completa:         {coal_e:,} entrada | {coal_s:,} salida")
