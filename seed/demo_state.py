"""Builds the ledger the public demo runs on, and puts it back afterwards.

The demo is stateless in the way that matters: any visitor can sign the pending
agreement, and a few minutes later the next visitor finds it pending again. That
is what this script is for. It is idempotent, it rebuilds from declared data
rather than from a database snapshot, and it is safe to run on a schedule.

The state it produces is deliberately the one the demo video is paused on:

    four rows delivered      the seeded history the coalition layer stands on
    four rows signed         negotiated by the agents, not yet delivered
    one row awaiting         signed by one side, waiting for the other

Nine rows, of which eight count as collaboration evidence, because a row with one
signature is not evidence of anything yet. A visitor who signs the ninth watches
the funding call's collaboration requirement go from eight to nine, which is the
whole product in one click and costs nothing to run.

    python seed/demo_state.py            report what would change
    python seed/demo_state.py --apply    rebuild the demo ledger
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ledger import book
from seed.seed_history import HISTORIAL

# Negotiated by the agents in rounds like the one the video films, and signed by
# both directors. Delivery has not happened yet, so they carry no result.
NEGOCIADOS = [
    {
        "org_solicitante": "riverside-health-post",
        "org_proveedora": "central-library",
        "recurso_entregado": "Delivery van (800kg capacity, including volunteer driver)",
        "recurso_recibido": "Community room for the vaccination campaign",
        "condiciones": "Van on Tuesdays 9am-5pm; room on Thursday afternoons",
        "necesidad_cubierta": "[N1] transport for the mobile vaccination campaign",
        "aprobadores": {"riverside-health-post": "Elena Fuentes", "central-library": "Ana Torres"},
    },
    {
        "org_solicitante": "casa-vecinal-kitchen",
        "org_proveedora": "north-food-bank",
        "recurso_entregado": "Refreshments and surplus food (fruit, bread, and drinks)",
        "recurso_recibido": "Hot meals for the volunteer shifts",
        "condiciones": "Weekly, with 48 hours notice",
        "necesidad_cubierta": "[N1] surplus produce for the neighbourhood kitchen",
        "aprobadores": {"casa-vecinal-kitchen": "Marta Ochoa", "north-food-bank": "Luis Mendoza"},
    },
    {
        "org_solicitante": "eastside-youth-club",
        "org_proveedora": "north-food-bank",
        "recurso_entregado": "Refreshments and surplus food (fruit, bread, and drinks)",
        "recurso_recibido": "Twelve-seat minibus",
        "condiciones": "Food with 48 hours notice for match days; minibus on weekends",
        "necesidad_cubierta": "[N2] refreshments for match days",
        "aprobadores": {"eastside-youth-club": "Diego Salas", "north-food-bank": "Luis Mendoza"},
    },
    {
        "org_solicitante": "north-food-bank",
        "org_proveedora": "central-library",
        "recurso_entregado": "Delivery Van (800kg capacity) with a volunteer driver",
        "recurso_recibido": "Refreshments and surplus food (fruit, bread, and drinks)",
        "condiciones": ("Every Tuesday from 9:00 am to 5:00 pm. Central Library refreshments "
                        "and surplus food available upon request with 48 hours notice."),
        "necesidad_cubierta": "[N1] van transport on Tuesdays to collect donations from the wholesale market",
        "aprobadores": {"north-food-bank": "Luis Mendoza", "central-library": "Ana Torres"},
    },
]

# The one a visitor completes. One signature is already on it; the other is the
# reason the demo exists.
PENDIENTE = {
    "org_solicitante": "san-martin-school",
    "org_proveedora": "casa-vecinal-kitchen",
    "recurso_entregado": "Six burners and prep space, weekdays before 4pm",
    "recurso_recibido": "Large classroom for the cooking workshop, Saturday mornings",
    "condiciones": "Kitchen weekday mornings; classroom on the first Saturday of the month",
    "necesidad_cubierta": "[N3] a kitchen the after-school programme can cook in",
    "ya_firmo": ("casa-vecinal-kitchen", "Marta Ochoa"),
    "falta": ("san-martin-school", "Rosa Diaz"),
}


def construir(aplicar: bool) -> int:
    if not aplicar:
        if book.DB_PATH.exists():
            conn = book.connect()
            try:
                filas = book.historial(conn)
            finally:
                conn.close()
            print(f"ledger currently holds {len(filas)} row(s)")
        else:
            print("no ledger yet")
        print(f"\n--apply would rebuild it as {len(HISTORIAL)} delivered + "
              f"{len(NEGOCIADOS)} signed + 1 awaiting a signature")
        return 0

    if book.DB_PATH.exists():
        book.DB_PATH.unlink()

    conn = book.connect()
    try:
        for e in HISTORIAL:
            i = book.registrar_propuesta(
                conn, org_solicitante=e["org_solicitante"], org_proveedora=e["org_proveedora"],
                recurso_entregado=e["recurso_entregado"], recurso_recibido=e["recurso_recibido"],
                condiciones=e["condiciones"], necesidad_cubierta=e["necesidad_cubierta"])
            for org, quien in e["aprobadores"].items():
                book.registrar_aprobacion(conn, i, org, "aprobado", quien)
            book.registrar_resultado(conn, i, e["resultado"])

        for e in NEGOCIADOS:
            i = book.registrar_propuesta(
                conn, org_solicitante=e["org_solicitante"], org_proveedora=e["org_proveedora"],
                recurso_entregado=e["recurso_entregado"], recurso_recibido=e["recurso_recibido"],
                condiciones=e["condiciones"], necesidad_cubierta=e["necesidad_cubierta"])
            for org, quien in e["aprobadores"].items():
                book.registrar_aprobacion(conn, i, org, "aprobado", quien)

        e = PENDIENTE
        pendiente_id = book.registrar_propuesta(
            conn, org_solicitante=e["org_solicitante"], org_proveedora=e["org_proveedora"],
            recurso_entregado=e["recurso_entregado"], recurso_recibido=e["recurso_recibido"],
            condiciones=e["condiciones"], necesidad_cubierta=e["necesidad_cubierta"])
        org, quien = e["ya_firmo"]
        book.registrar_aprobacion(conn, pendiente_id, org, "aprobado", quien)

        filas = book.historial(conn)
        estados = {}
        for f in filas:
            estados[f["estado"]] = estados.get(f["estado"], 0) + 1
    finally:
        conn.close()

    resumen = " · ".join(f"{n} {k}" for k, n in sorted(estados.items()))
    print(f"demo ledger rebuilt: {len(filas)} rows ({resumen})")
    print(f"  #{pendiente_id} awaits {e['falta'][1]} at {e['falta'][0]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(construir("--apply" in sys.argv))
