"""Measure real token usage of one exchange round, to size the Bedrock bill.

Runs the same three phases the demo runs and reports accumulated input/output
tokens per phase, then prices them at a given rate.

Usage: python validation/measure_cost.py
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from strands.agent.a2a_agent import A2AAgent

from agents.approval import approval_gate, build_ledger_tools
from agents.org_agent import build_org_agent
from agents.org_profile import OrgProfile
from agents.prompts import NEGOTIATION_PROMPT, REGISTRATION_PROMPT
from agents.tools.a2a_tools import build_neighbor_tools
from agents.tools.negotiation import _keywords
from web.runner import DISCOVERY_MESSAGE, URGENCIA_PESO, _red, _vecinos_de

TOTALES = {"entrada": 0, "salida": 0}


def contar(etiqueta: str, result) -> None:
    """Read accumulated usage off a Strands result, whatever shape it takes."""
    uso = None
    metrics = getattr(result, "metrics", None)
    for atributo in ("accumulated_usage", "usage"):
        uso = getattr(metrics, atributo, None) if metrics else None
        if uso:
            break
    if uso is None and metrics is not None and hasattr(metrics, "get_summary"):
        uso = metrics.get_summary().get("accumulated_usage")
    if not uso:
        print(f"  {etiqueta}: sin metricas disponibles")
        return
    entrada = uso.get("inputTokens", 0)
    salida = uso.get("outputTokens", 0)
    TOTALES["entrada"] += entrada
    TOTALES["salida"] += salida
    print(f"  {etiqueta}: {entrada:,} entrada | {salida:,} salida")


def main() -> None:
    org_id = "north-food-bank"
    perfiles = {
        OrgProfile.from_json(p).org_id: OrgProfile.from_json(p)
        for p in sorted((ROOT / "seed" / "orgs").glob("*.json"))
    }
    me = perfiles[org_id]
    vecinos = _vecinos_de(org_id)

    print("=== Fase 1: descubrimiento (una llamada A2A por vecino) ===")
    mejor = None
    for nombre, datos in vecinos.items():
        cliente = A2AAgent(endpoint=datos["endpoint"])
        result = cliente(DISCOVERY_MESSAGE.format(yo=me.nombre))
        respuesta = str(result)
        contar(f"consulta a {nombre}", result)
        oferta_kw = _keywords(respuesta)
        for need in me.necesidades:
            comunes = _keywords(need.descripcion) & oferta_kw
            if not comunes:
                continue
            score = URGENCIA_PESO.get(need.urgencia, 1) * 10 + len(comunes)
            if mejor is None or score > mejor[0]:
                mejor = (score, need, nombre, respuesta)

    if mejor is None:
        print("Sin complementariedad; no se puede medir el resto.")
        return
    _, need, vecino, oferta = mejor

    print("\n=== Fase 2: negociacion ===")
    negociador = build_org_agent(
        me, extra_tools=build_neighbor_tools({vecino: vecinos[vecino]["endpoint"]})
    )
    result = negociador(NEGOTIATION_PROMPT.format(
        need_id=need.id, need_desc=need.descripcion, need_urg=need.urgencia,
        vecino=vecino, oferta_vecino=oferta,
    ))
    contar("negociador", result)
    transcripcion = str(result)

    print("\n=== Fase 3: registro (se detiene en la aprobacion) ===")
    registrador = build_org_agent(
        me,
        extra_tools=build_ledger_tools(
            me.org_id,
            contexto_esperado=f"{need.descripcion}. El vecino ofrecio: {oferta}",
            recursos_propios=[f"{r.nombre} {r.disponibilidad} {r.notas}" for r in me.recursos],
        ),
        interventions=[approval_gate()],
    )
    result = registrador(REGISTRATION_PROMPT.format(
        vecino=vecino, vecino_id=vecinos[vecino]["org_id"],
        transcripcion=transcripcion, need_id=need.id, need_desc=need.descripcion,
    ))
    contar("registrador (hasta la pausa)", result)
    if result.stop_reason == "interrupt":
        result = registrador([{
            "interruptResponse": {"interruptId": result.interrupts[0].id, "response": "no"}
        }])
        contar("registrador (tras rechazar)", result)

    entrada, salida = TOTALES["entrada"], TOTALES["salida"]
    print(f"\n=== TOTAL DE UNA RONDA ===")
    print(f"  entrada: {entrada:,} tokens")
    print(f"  salida:  {salida:,} tokens")

    # First-party Anthropic rates, USD per million tokens. Bedrock bills
    # separately; confirm in the console before trusting the total.
    tarifas = {
        "Haiku 4.5": (1.00, 5.00),
        "Sonnet 5": (3.00, 15.00),
        "Opus 5": (5.00, 25.00),
    }
    print("\n  costo por ronda (referencia, tarifas Anthropic):")
    for modelo, (t_in, t_out) in tarifas.items():
        costo = entrada / 1e6 * t_in + salida / 1e6 * t_out
        print(f"    {modelo:<10} ${costo:.4f}  ->  50 rondas = ${costo * 50:.2f}")


if __name__ == "__main__":
    main()
