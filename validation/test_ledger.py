"""Paso 5 check: the ledger requires BOTH approvals before an agreement is 'aprobado'."""
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ledger import book

fallos = []


def check(nombre: str, actual, esperado):
    ok = actual == esperado
    print(f"  [{'OK' if ok else 'FALLO'}] {nombre}: {actual!r}" + ("" if ok else f" (esperado {esperado!r})"))
    if not ok:
        fallos.append(nombre)


with tempfile.TemporaryDirectory() as tmp:
    conn = book.connect(Path(tmp) / "test.db")

    print("Caso 1: una sola aprobacion no basta")
    aid = book.registrar_propuesta(
        conn, "north-food-bank", "central-library",
        "camioneta de reparto los martes", "refrigerios para eventos comunitarios",
        "martes 9am-1pm, con chofer voluntario de la biblioteca",
        "N1 transporte para recoger donaciones del mercado mayorista",
    )
    check("estado inicial", conn.execute("SELECT estado FROM acuerdos WHERE id=?", (aid,)).fetchone()["estado"], "propuesto")
    check("tras 1 aprobacion", book.registrar_aprobacion(conn, aid, "central-library", "aprobado", "Ana Torres"), "propuesto")
    check("tras 2 aprobaciones", book.registrar_aprobacion(conn, aid, "north-food-bank", "aprobado", "Luis Mendoza"), "aprobado")

    print("\nCaso 2: un rechazo tumba el acuerdo aunque el otro apruebe")
    bid = book.registrar_propuesta(
        conn, "san-martin-school", "central-library",
        "talleres de alfabetizacion digital", "aula grande los sabados",
        "un sabado al mes por la manana", "N1 talleres para padres de familia",
    )
    book.registrar_aprobacion(conn, bid, "san-martin-school", "aprobado", "Rosa Diaz")
    check("tras rechazo de la contraparte", book.registrar_aprobacion(conn, bid, "central-library", "rechazado", "Ana Torres", "no hay equipo disponible"), "rechazado")

    print("\nCaso 3: resultado solo sobre acuerdos aprobados")
    try:
        book.registrar_resultado(conn, bid, "no deberia poder")
        check("bloquea resultado sobre rechazado", "no bloqueo", "ValueError")
    except ValueError:
        check("bloquea resultado sobre rechazado", "ValueError", "ValueError")
    book.registrar_resultado(conn, aid, "Se recogieron 340kg de donaciones. Sin incidentes.")
    check("estado final del aprobado", conn.execute("SELECT estado FROM acuerdos WHERE id=?", (aid,)).fetchone()["estado"], "cumplido")

    print("\nCaso 4: historial por organizacion")
    check("acuerdos de la biblioteca", len(book.historial(conn, "central-library")), 2)
    check("acuerdos del banco", len(book.historial(conn, "north-food-bank")), 1)

    conn.close()

print(f"\n{'TODO OK' if not fallos else 'FALLOS: ' + ', '.join(fallos)}")
sys.exit(1 if fallos else 0)
