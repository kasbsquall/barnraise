"""A full neighborhood round: discovery, negotiation, and human-approved ledger entry.

Phases:
1. Discovery (deterministic): ask every neighbor over A2A what they have idle,
   then keyword-match their answers against our needs.
2. Negotiation (LLM over A2A): agree concrete terms with the best candidate.
3. Registration (LLM tool call + human approval): the agent calls
   record_agreement; HumanInTheLoop pauses until a director decides. Structured
   data comes from the tool arguments, never from prose, so the ledger cannot
   record an inverted exchange.

Usage: python a2a/round.py north-food-bank [--auto-approve]
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from strands.agent.a2a_agent import A2AAgent

from agents.approval import approval_gate, build_ledger_tools
from agents.org_agent import build_org_agent
from agents.org_profile import OrgProfile
from agents.tools.a2a_tools import build_neighbor_tools
from agents.prompts import NEGOTIATION_PROMPT, REGISTRATION_PROMPT
from agents.tools.negotiation import _keywords
from ledger import book

DISCOVERY_MESSAGE = (
    "Hello, I am the agent for {yo}. We are looking to cover this week's needs. "
    "Which idle resources does your organization have available to share with neighbors?"
)

URGENCIA_PESO = {"alta": 3, "media": 2, "baja": 1}

def discover(me: OrgProfile, neighbors: dict) -> tuple | None:
    """Ask each neighbor what they have; return the best (score, need, name, answer)."""
    best = None
    for nombre, datos in neighbors.items():
        print(f"[descubrimiento] preguntando a {nombre}...", flush=True)
        respuesta = ""
        for intento in range(3):
            respuesta = str(A2AAgent(endpoint=datos["endpoint"])(DISCOVERY_MESSAGE.format(yo=me.nombre)))
            if "Agent execution failed" not in respuesta:
                break
            print(f"[descubrimiento] {nombre} fallo (intento {intento + 1}/3), reintentando...", flush=True)
        if "Agent execution failed" in respuesta:
            print(f"[descubrimiento] {nombre} no respondio, se omite esta ronda.", flush=True)
            continue
        print(f"[descubrimiento] {nombre}: {respuesta[:160].strip()}...", flush=True)
        oferta_kw = _keywords(respuesta)
        for need in me.necesidades:
            comunes = _keywords(need.descripcion) & oferta_kw
            if not comunes:
                continue
            score = URGENCIA_PESO.get(need.urgencia, 1) * 10 + len(comunes)
            if best is None or score > best[0]:
                best = (score, need, nombre, respuesta)
    return best


def main() -> None:
    org_id = sys.argv[1]
    auto = "--auto-approve" in sys.argv
    network = json.loads((ROOT / "seed" / "network.json").read_text(encoding="utf-8"))

    me = None
    neighbors: dict = {}
    for org in network["organizaciones"]:
        profile = OrgProfile.from_json(ROOT / org["perfil"])
        if profile.org_id == org_id:
            me = profile
        else:
            neighbors[org["nombre"]] = {"endpoint": org["endpoint"], "org_id": profile.org_id}

    if me is None:
        sys.exit(f"org_id desconocido: {org_id}")

    print(f"=== Ronda del barrio iniciada por {me.nombre} ===\n")
    match = discover(me, neighbors)
    if match is None:
        print("\nNingun vecino tiene recursos que cubran nuestras necesidades esta semana.")
        return

    _, need, vecino, oferta = match
    print(f"\n[match] necesidad [{need.id}] '{need.descripcion}' <- {vecino}\n")

    # Phase 2: negotiate. No ledger tools here, so the agent can focus on terms.
    negociador = build_org_agent(
        me,
        extra_tools=build_neighbor_tools({vecino: neighbors[vecino]["endpoint"]}),
    )
    transcripcion = str(negociador(NEGOTIATION_PROMPT.format(
        need_id=need.id, need_desc=need.descripcion, need_urg=need.urgencia,
        vecino=vecino, oferta_vecino=oferta,
    )))
    print("--- Terminos negociados ---")
    print(transcripcion)

    # Phase 3: register. A separate agent whose only job is filling the tool,
    # so structured data comes from tool arguments and never from prose.
    registrador = build_org_agent(
        me,
        extra_tools=build_ledger_tools(
            me.org_id,
            contexto_esperado=f"{need.descripcion}. The neighbor offered: {oferta}",
            recursos_propios=[f"{r.nombre} {r.disponibilidad} {r.notas}" for r in me.recursos],
            necesidad=f"[{need.id}] {need.descripcion}",
            vecinos_validos=[p.org_id for p in perfiles],
        ),
        interventions=[approval_gate()],
    )
    result = registrador(REGISTRATION_PROMPT.format(
        vecino=vecino, vecino_id=neighbors[vecino]["org_id"],
        transcripcion=transcripcion, need_id=need.id, need_desc=need.descripcion,
    ))

    while result.stop_reason == "interrupt":
        interrupt = result.interrupts[0]
        print("\n" + "=" * 70)
        print(f"APROBACION HUMANA REQUERIDA · {me.nombre}")
        print("=" * 70)
        print(interrupt.reason)
        if auto:
            decision = "yes"
            print("\n[--auto-approve] aprobado automaticamente")
        else:
            decision = input("\nAprobar? (yes/no): ").strip() or "no"
        result = registrador([{"interruptResponse": {"interruptId": interrupt.id, "response": decision}}])

    print("\n" + str(result))

    conn = book.connect()
    try:
        filas = book.historial(conn, me.org_id)
    finally:
        conn.close()
    print(f"\n--- Libro del Barrio: {len(filas)} acuerdo(s) de {me.nombre} ---")
    for f in filas:
        print(f"  #{f['id']} [{f['estado']}] {f['org_solicitante']} <-> {f['org_proveedora']}")
        print(f"      recibe: {f['recurso_entregado']}")
        print(f"      entrega: {f['recurso_recibido']}")
        print(f"      condiciones: {f['condiciones']}")


if __name__ == "__main__":
    main()
