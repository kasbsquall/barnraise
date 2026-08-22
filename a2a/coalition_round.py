"""Detect a winnable funding call and take the joint application to every director.

Usage: python a2a/coalition_round.py [convocatoria.json] [--auto-approve]
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from agents.coalition_agent import PROPOSAL_PROMPT, build_coalition_agent, formatear_escaneo
from agents.org_profile import OrgProfile
from agents.tools.grants import Convocatoria
from ledger import book
from ledger.evidence import evidencia_de_colaboracion

DIRECTORES = {
    "central-library": "Ana Torres",
    "north-food-bank": "Luis Mendoza",
    "san-martin-school": "Rosa Diaz",
}


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    auto = "--auto-approve" in sys.argv
    conv_path = ROOT / (args[0] if args else "seed/grants/resilience_fund.json")

    convocatoria = Convocatoria.from_json(conv_path)
    profiles = [OrgProfile.from_json(p) for p in sorted((ROOT / "seed" / "orgs").glob("*.json"))]

    print(f"=== Convocatoria detectada: {convocatoria.nombre} ===")
    print(f"{convocatoria.financiador} | {convocatoria.monto} {convocatoria.moneda} | cierra {convocatoria.cierre}\n")

    escaneo, coaliciones = formatear_escaneo(convocatoria, profiles)
    print(escaneo)
    if not coaliciones:
        print("\nEl barrio no puede postular a esta convocatoria, ni junto ni por separado.")
        return

    mejor = coaliciones[0]
    conn = book.connect()
    try:
        evidencia = evidencia_de_colaboracion(conn, mejor.org_ids)
    finally:
        conn.close()

    print(f"\n--- Evidencia que sustenta la coalicion ---\n{evidencia.resumen()}\n")

    agente = build_coalition_agent(convocatoria, profiles)
    result = agente(PROPOSAL_PROMPT.format(
        nombre=convocatoria.nombre, conv_id=convocatoria.id,
        financiador=convocatoria.financiador, monto=convocatoria.monto,
        moneda=convocatoria.moneda, cierre=convocatoria.cierre,
        descripcion=convocatoria.descripcion, escaneo=escaneo,
        evidencia=evidencia.resumen(),
    ))

    while result.stop_reason == "interrupt":
        interrupt = result.interrupts[0]
        print("\n" + "=" * 70)
        print("APROBACION DE LOS DIRECTORES · postulacion conjunta")
        print("=" * 70)
        print(interrupt.reason)
        if auto:
            decision = "yes"
            print("\n[--auto-approve] el agente queda autorizado a asentar la propuesta")
        else:
            decision = input("\nAsentar la propuesta? (yes/no): ").strip() or "no"
        result = agente([{"interruptResponse": {"interruptId": interrupt.id, "response": decision}}])

    print("\n" + str(result))

    # Every director signs, one by one. The application only stands with all of them.
    conn = book.connect()
    try:
        filas = book.coaliciones(conn)
        if not filas:
            print("\nNo se asento ninguna coalicion.")
            return
        coalicion = filas[0]
        miembros = coalicion["org_ids"].split(",")
        print(f"\n--- Firmas requeridas: {len(miembros)} directores ---")
        estado = coalicion["estado"]
        for org_id in miembros:
            director = DIRECTORES.get(org_id, "Director")
            if auto:
                decision = "aprobado"
                print(f"  {director} ({org_id}): aprobado [--auto-approve]")
            else:
                respuesta = input(f"  {director} ({org_id}) aprueba? (yes/no): ").strip().lower()
                decision = "aprobado" if respuesta in ("y", "yes", "si", "s") else "rechazado"
            estado = book.aprobar_coalicion(conn, coalicion["id"], org_id, decision, director)
            print(f"     estado de la coalicion: {estado}")

        final = book.coaliciones(conn)[0]
    finally:
        conn.close()

    print(f"\n=== Coalicion #{final['id']} · {final['estado'].upper()} ===")
    print(f"Convocatoria: {final['convocatoria']} ({final['monto']} USD)")
    print(f"Organizaciones: {final['org_ids']}")
    print(f"\nRoles:\n{final['roles']}")
    print(f"\nPresupuesto:\n{final['presupuesto']}")


if __name__ == "__main__":
    main()
