"""Seed the ledger with the months of exchanges the daily layer produced.

The coalition layer needs a real collaboration history to stand on. These are
past rounds: negotiated by the agents, approved by both directors, and fulfilled.
Run with --reset to rebuild the ledger from scratch.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ledger import book

HISTORIAL = [
    {
        "org_solicitante": "north-food-bank",
        "org_proveedora": "central-library",
        "recurso_entregado": "delivery van with volunteer driver",
        "recurso_recibido": "refreshments and surplus food for community events",
        "condiciones": "Tuesdays 9am-1pm, wholesale market route",
        "necesidad_cubierta": "[N1] van transport to collect donations from the wholesale market",
        "aprobadores": {"north-food-bank": "Luis Mendoza", "central-library": "Ana Torres"},
        "resultado": "340kg of donations collected. No incidents.",
    },
    {
        "org_solicitante": "san-martin-school",
        "org_proveedora": "north-food-bank",
        "recurso_entregado": "refreshments for extended school days",
        "recurso_recibido": "large classroom for volunteer training",
        "condiciones": "extended-day Fridays, delivered 8am; classroom first Saturday of the month",
        "necesidad_cubierta": "[N2] refreshments for pupils on extended school days",
        "aprobadores": {"san-martin-school": "Rosa Diaz", "north-food-bank": "Luis Mendoza"},
        "resultado": "180 snacks handed out across 4 days. Training ran with 22 volunteers.",
    },
    {
        "org_solicitante": "san-martin-school",
        "org_proveedora": "central-library",
        "recurso_entregado": "digital literacy workshop for parents",
        "recurso_recibido": "student volunteers for the children's reading workshop",
        "condiciones": "one Saturday a month at the school; volunteers on Friday afternoons",
        "necesidad_cubierta": "[N1] digital literacy workshops for parents",
        "aprobadores": {"san-martin-school": "Rosa Diaz", "central-library": "Ana Torres"},
        "resultado": "3 workshops, 45 parents attended. 8 students joined the reading workshop.",
    },
    {
        "org_solicitante": "central-library",
        "org_proveedora": "north-food-bank",
        "recurso_entregado": "refreshments for the community book fair",
        "recurso_recibido": "community room for the volunteer coordination meeting",
        "condiciones": "book fair on 12 July; room the second Thursday of each month",
        "necesidad_cubierta": "[N2] refreshments for community events",
        "aprobadores": {"central-library": "Ana Torres", "north-food-bank": "Luis Mendoza"},
        "resultado": "Fair drew 260 attendees. Refreshments were enough.",
    },
]


def main() -> None:
    if "--reset" in sys.argv and book.DB_PATH.exists():
        book.DB_PATH.unlink()
        print("Ledger reset.")

    conn = book.connect()
    try:
        for entrada in HISTORIAL:
            acuerdo_id = book.registrar_propuesta(
                conn,
                org_solicitante=entrada["org_solicitante"],
                org_proveedora=entrada["org_proveedora"],
                recurso_entregado=entrada["recurso_entregado"],
                recurso_recibido=entrada["recurso_recibido"],
                condiciones=entrada["condiciones"],
                necesidad_cubierta=entrada["necesidad_cubierta"],
            )
            for org_id, aprobador in entrada["aprobadores"].items():
                book.registrar_aprobacion(conn, acuerdo_id, org_id, "aprobado", aprobador)
            book.registrar_resultado(conn, acuerdo_id, entrada["resultado"])
            print(f"  #{acuerdo_id} {entrada['org_solicitante']} <-> {entrada['org_proveedora']} | fulfilled")

        total = len(book.historial(conn))
    finally:
        conn.close()
    print(f"\nNeighborhood Ledger: {total} agreement(s) on record.")


if __name__ == "__main__":
    main()
