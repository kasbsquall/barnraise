"""Puts the ledger back to the state the film is shot against.

Every recorded signature writes a real agreement, so each take of S5 leaves the
book one row longer than the take before it. The narration says a number out
loud, S7 shows that number on screen, and both were written against a book that
held seven before the camera rolled and eight after. Re-record without resetting
and the film contradicts itself, which is the defect a judge comparing two frames
would find first.

The baseline is the four seeded rows plus the three the agents negotiated while
the neighborhood was being built. Anything above that came from a take.

    python seed/reset_takes.py            report only
    python seed/reset_takes.py --apply    remove the rows takes left behind
"""
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "ledger" / "barrio.db"

# The book the film is shot against: four seeded rows and three the agents
# negotiated during the build. Recording S5 adds exactly one on top of these.
BASE = (1, 2, 3, 4, 7, 8, 9)


def main(aplicar: bool) -> int:
    if not DB.exists():
        print(f"no ledger at {DB}")
        return 1
    conn = sqlite3.connect(DB)
    try:
        filas = conn.execute(
            "select id, estado, org_proveedora, org_solicitante, recurso_entregado "
            "from acuerdos order by id").fetchall()
        sobra = [f for f in filas if f[0] not in BASE]
        print(f"{len(filas)} agreements; baseline is {len(BASE)}")
        if not sobra:
            print("already at the baseline, nothing to remove")
            return 0
        for f in sobra:
            print(f"  #{f[0]:3} {f[1]:9} {f[2]:20} -> {f[3]:22} {str(f[4])[:40]}")
        if not aplicar:
            print("\nrun again with --apply to remove these")
            return 0
        copia = DB.with_name(f"barrio.before-reset.db")
        copia.write_bytes(DB.read_bytes())
        ids = [f[0] for f in sobra]
        marcas = ",".join("?" * len(ids))
        conn.execute(f"delete from aprobaciones where acuerdo_id in ({marcas})", ids)
        conn.execute(f"delete from acuerdos where id in ({marcas})", ids)
        conn.commit()
        n = conn.execute("select count(*) from acuerdos").fetchone()[0]
        print(f"\nremoved {len(ids)}; ledger now holds {n}. Backup at {copia.name}")
        print("Restart web/server.py so it reads the ledger again.")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main("--apply" in sys.argv))
