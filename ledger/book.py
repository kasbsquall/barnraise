"""El Libro del Barrio: persistence for agreements and their human approvals.

An agreement only reaches 'aprobado' when both organizations have approved it.
A single approval is never enough.
"""
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "ledger" / "barrio.db"
SCHEMA_PATH = ROOT / "ledger" / "schema.sql"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect(db_path: Path | str | None = None) -> sqlite3.Connection:
    # Resolved at call time, so tests can point DB_PATH at a scratch file.
    conn = sqlite3.connect(db_path or DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    return conn


def registrar_propuesta(
    conn: sqlite3.Connection,
    org_solicitante: str,
    org_proveedora: str,
    recurso_entregado: str,
    recurso_recibido: str,
    condiciones: str,
    necesidad_cubierta: str,
) -> int:
    """Record a negotiated agreement as 'propuesto'. Approvals come next."""
    cur = conn.execute(
        """INSERT INTO acuerdos
           (fecha, org_solicitante, org_proveedora, recurso_entregado,
            recurso_recibido, condiciones, necesidad_cubierta, estado)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'propuesto')""",
        (_now(), org_solicitante, org_proveedora, recurso_entregado,
         recurso_recibido, condiciones, necesidad_cubierta),
    )
    conn.commit()
    return cur.lastrowid


def registrar_aprobacion(
    conn: sqlite3.Connection,
    acuerdo_id: int,
    org_id: str,
    decision: str,
    aprobador: str,
    comentario: str = "",
) -> str:
    """Record one organization's human decision and recompute the agreement state.

    Returns the agreement's resulting state.
    """
    if decision not in ("aprobado", "rechazado"):
        raise ValueError(f"decision invalida: {decision}")

    conn.execute(
        """INSERT INTO aprobaciones (acuerdo_id, org_id, decision, aprobador, fecha, comentario)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT (acuerdo_id, org_id) DO UPDATE SET
               decision = excluded.decision,
               aprobador = excluded.aprobador,
               fecha = excluded.fecha,
               comentario = excluded.comentario""",
        (acuerdo_id, org_id, decision, aprobador, _now(), comentario),
    )

    acuerdo = conn.execute("SELECT * FROM acuerdos WHERE id = ?", (acuerdo_id,)).fetchone()
    if acuerdo is None:
        raise ValueError(f"acuerdo inexistente: {acuerdo_id}")
    partes = {acuerdo["org_solicitante"], acuerdo["org_proveedora"]}

    decisiones = {
        row["org_id"]: row["decision"]
        for row in conn.execute(
            "SELECT org_id, decision FROM aprobaciones WHERE acuerdo_id = ?", (acuerdo_id,)
        )
    }

    if "rechazado" in decisiones.values():
        estado = "rechazado"
    elif partes <= decisiones.keys():
        estado = "aprobado"
    else:
        estado = "propuesto"  # still waiting for the other side

    conn.execute("UPDATE acuerdos SET estado = ? WHERE id = ?", (estado, acuerdo_id))
    conn.commit()
    return estado


def registrar_resultado(conn: sqlite3.Connection, acuerdo_id: int, resultado: str) -> None:
    """Mark an approved agreement as fulfilled, with what actually happened."""
    fila = conn.execute("SELECT estado FROM acuerdos WHERE id = ?", (acuerdo_id,)).fetchone()
    if fila is None or fila["estado"] != "aprobado":
        raise ValueError("solo se puede registrar resultado de un acuerdo aprobado")
    conn.execute(
        "UPDATE acuerdos SET estado = 'cumplido', resultado = ? WHERE id = ?",
        (resultado, acuerdo_id),
    )
    conn.commit()


def historial(conn: sqlite3.Connection, org_id: str | None = None) -> list[sqlite3.Row]:
    """Collaboration history, optionally filtered to one organization."""
    if org_id:
        return conn.execute(
            """SELECT * FROM acuerdos
               WHERE (org_solicitante = ? OR org_proveedora = ?)
               ORDER BY fecha DESC""",
            (org_id, org_id),
        ).fetchall()
    return conn.execute("SELECT * FROM acuerdos ORDER BY fecha DESC").fetchall()


def registrar_coalicion(
    conn: sqlite3.Connection,
    convocatoria_id: str,
    convocatoria: str,
    monto: int,
    org_ids: list[str],
    roles: str,
    presupuesto: str,
    evidencia: str,
) -> int:
    """Record a joint application as 'propuesta'. Every member must approve next."""
    cur = conn.execute(
        """INSERT INTO coaliciones
           (fecha, convocatoria_id, convocatoria, monto, org_ids, roles,
            presupuesto, evidencia, estado)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'propuesta')""",
        (_now(), convocatoria_id, convocatoria, monto, ",".join(org_ids),
         roles, presupuesto, evidencia),
    )
    conn.commit()
    return cur.lastrowid


def aprobar_coalicion(
    conn: sqlite3.Connection,
    coalicion_id: int,
    org_id: str,
    decision: str,
    aprobador: str,
    comentario: str = "",
) -> str:
    """Record one director's decision. The coalition needs ALL of them."""
    if decision not in ("aprobado", "rechazado"):
        raise ValueError(f"decision invalida: {decision}")

    conn.execute(
        """INSERT INTO aprobaciones_coalicion
           (coalicion_id, org_id, decision, aprobador, fecha, comentario)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT (coalicion_id, org_id) DO UPDATE SET
               decision = excluded.decision,
               aprobador = excluded.aprobador,
               fecha = excluded.fecha,
               comentario = excluded.comentario""",
        (coalicion_id, org_id, decision, aprobador, _now(), comentario),
    )

    coalicion = conn.execute("SELECT * FROM coaliciones WHERE id = ?", (coalicion_id,)).fetchone()
    if coalicion is None:
        raise ValueError(f"coalicion inexistente: {coalicion_id}")
    miembros = set(coalicion["org_ids"].split(","))

    decisiones = {
        row["org_id"]: row["decision"]
        for row in conn.execute(
            "SELECT org_id, decision FROM aprobaciones_coalicion WHERE coalicion_id = ?",
            (coalicion_id,),
        )
    }

    if "rechazado" in decisiones.values():
        estado = "rechazada"
    elif miembros <= decisiones.keys():
        estado = "aprobada"
    else:
        estado = "propuesta"

    conn.execute("UPDATE coaliciones SET estado = ? WHERE id = ?", (estado, coalicion_id))
    conn.commit()
    return estado


def coaliciones(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return conn.execute("SELECT * FROM coaliciones ORDER BY fecha DESC").fetchall()
