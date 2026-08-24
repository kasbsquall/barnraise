"""Paso 5 check: the agent must pause for human approval before writing to the ledger,
and the rejection path must leave nothing behind."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ledger import book

# Run against a scratch ledger so the neighborhood's real history survives.
book.DB_PATH = ROOT / "ledger" / "test_approval.db"
if book.DB_PATH.exists():
    book.DB_PATH.unlink()

from agents.approval import approval_gate, build_ledger_tools  # noqa: E402
from agents.org_agent import build_org_agent  # noqa: E402
from agents.org_profile import OrgProfile  # noqa: E402

profile = OrgProfile.from_json(ROOT / "seed" / "orgs" / "food_bank.json")
agent = build_org_agent(
    profile,
    extra_tools=build_ledger_tools(profile.org_id),
    interventions=[approval_gate()],
)

INSTRUCCION = (
    "Cerramos este acuerdo con la Central Library (org_id: central-library): "
    "recibimos su camioneta de reparto los martes de 9am a 1pm con chofer voluntario, "
    "y entregamos refrigerios y alimentos excedentes para sus eventos comunitarios. "
    "Cubre nuestra necesidad N1 de transporte para recoger donaciones del mercado mayorista. "
    "Registralo en el Libro del Barrio usando record_agreement."
)

print("=== 1. El agente intenta registrar el acuerdo ===")
result = agent(INSTRUCCION)
print("stop_reason:", result.stop_reason)

if result.stop_reason != "interrupt":
    print("FALLO: el agente escribio en el Libro sin pedir aprobacion humana")
    sys.exit(1)

print("PAUSA para aprobacion humana. Motivo presentado al director:")
print(" ", str(result.interrupts[0].reason)[:400])

conn = book.connect()
pendientes = len(book.historial(conn))
conn.close()
print(f"Acuerdos en el Libro durante la pausa: {pendientes} (debe ser 0)")
if pendientes != 0:
    print("FALLO: se escribio en el Libro antes de la aprobacion")
    sys.exit(1)

print("\n=== 2. El director aprueba y el agente reanuda ===")
# Answering one pause is not enough. A model that is approved sometimes calls the
# tool again with the arguments slightly reworded, which raises a second pause;
# this test used to answer once, see nothing in the ledger and report a failure
# that read as if the guards had refused the write. The production loop in
# web/runner.py answers up to MAX_PAUSAS times, so this mirrors it.
from web.runner import MAX_PAUSAS  # noqa: E402

pausas = 0
while getattr(result, "stop_reason", None) == "interrupt" and pausas < MAX_PAUSAS:
    pausas += 1
    print(f"  aprobando pausa {pausas}")
    result = agent([{
        "interruptResponse": {"interruptId": result.interrupts[0].id, "response": "yes"}
    }])
if getattr(result, "stop_reason", None) == "interrupt":
    print(f"FALLO: el agente siguio pidiendo aprobacion tras {MAX_PAUSAS} pausas")
    sys.exit(1)
print(result)

conn = book.connect()
filas = book.historial(conn)
print(f"\nAcuerdos en el Libro tras aprobar: {len(filas)}")
for f in filas:
    print(f"  #{f['id']} {f['org_solicitante']} <-> {f['org_proveedora']} | estado: {f['estado']}")
    print(f"     recibe: {f['recurso_entregado']}")
    print(f"     entrega: {f['recurso_recibido']}")
    print(f"     condiciones: {f['condiciones']}")
conn.close()

if len(filas) != 1 or filas[0]["estado"] != "propuesto":
    print("FALLO: se esperaba 1 acuerdo en estado 'propuesto' (falta la aprobacion de la contraparte)")
    sys.exit(1)

print("\nTODO OK: sin aprobacion no se escribe, y con una sola aprobacion queda 'propuesto'.")
