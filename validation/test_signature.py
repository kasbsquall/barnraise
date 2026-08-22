"""Regression test: a rejection must never sign anything, and a signature must
land on the agreement that round created, never on an older pending one."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ledger import book

book.DB_PATH = ROOT / "ledger" / "test_signature.db"
book.DB_PATH.unlink(missing_ok=True)

from web import runner  # noqa: E402

fallos = []


def check(nombre, actual, esperado):
    ok = actual == esperado
    print(f"  [{'OK' if ok else 'FALLO'}] {nombre}: {actual!r}")
    if not ok:
        fallos.append(nombre)


conn = book.connect()
viejo = book.registrar_propuesta(
    conn, "north-food-bank", "central-library",
    "camioneta prestada la semana pasada", "refrigerios",
    "martes 9am", "[N1] transporte",
)
conn.close()

print("Caso 1: un acuerdo viejo sin firmar no debe firmarse solo")
runner._firmar_lo_asentado("north-food-bank", desde_id=viejo)
conn = book.connect()
check("acuerdo viejo sigue propuesto",
      conn.execute("SELECT estado FROM acuerdos WHERE id=?", (viejo,)).fetchone()["estado"],
      "propuesto")
check("sin firmas sobre el viejo",
      conn.execute("SELECT COUNT(*) c FROM aprobaciones WHERE acuerdo_id=?", (viejo,)).fetchone()["c"],
      0)

print("\nCaso 2: solo se firma el acuerdo creado en esta ronda")
nuevo = book.registrar_propuesta(
    conn, "north-food-bank", "central-library",
    "camioneta de esta ronda", "espacio en camara frigorifica",
    "martes 9am-1pm", "[N1] transporte",
)
conn.close()
runner._firmar_lo_asentado("north-food-bank", desde_id=viejo)
conn = book.connect()
check("el nuevo quedo firmado por su organizacion",
      conn.execute("SELECT COUNT(*) c FROM aprobaciones WHERE acuerdo_id=?", (nuevo,)).fetchone()["c"],
      1)
check("el viejo sigue sin firma",
      conn.execute("SELECT COUNT(*) c FROM aprobaciones WHERE acuerdo_id=?", (viejo,)).fetchone()["c"],
      0)
check("el nuevo sigue propuesto, falta la contraparte",
      conn.execute("SELECT estado FROM acuerdos WHERE id=?", (nuevo,)).fetchone()["estado"],
      "propuesto")
conn.close()

book.DB_PATH.unlink(missing_ok=True)
print(f"\n{'TODO OK' if not fallos else 'FALLOS: ' + ', '.join(fallos)}")
sys.exit(1 if fallos else 0)
