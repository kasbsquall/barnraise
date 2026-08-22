"""Human approval gate.

Committing an agreement to the ledger is the only irreversible act an org agent
can perform, so it is the one tool guarded by HumanInTheLoop. The agent pauses
with stop_reason == "interrupt" and the caller (CLI or web UI) resumes with the
director's decision. Nothing reaches 'aprobado' without both sides doing this.
"""
from strands import tool
from strands.vended_interventions.hitl import HumanInTheLoop

from agents.tools.negotiation import _keywords
from ledger import book

# An agreement is evidence a funder will read. Placeholder text would make the
# ledger record a collaboration that never had terms, so it is rejected at the
# tool boundary rather than trusted to the model.
_PLACEHOLDERS = {
    "", "n/a", "na", "none", "null", "-", "--", "tbd", "to be defined",
    "pending", "unknown", "unspecified", "nothing",
}


def _es_placeholder(valor: str) -> bool:
    return valor.strip().lower() in _PLACEHOLDERS or len(valor.strip()) < 4


DIAS = ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
        "sunday")


def _dias_en(texto: str) -> set[str]:
    t = texto.lower().replace("é", "e").replace("á", "a")
    return {d.replace("é", "e").replace("á", "a") for d in DIAS if d.replace("é", "e").replace("á", "a") in t}


def build_ledger_tools(
    org_id: str,
    contexto_esperado: str = "",
    recursos_propios: list[str] | None = None,
) -> list:
    """contexto_esperado: the need being covered plus what the neighbor offered.
    recursos_propios: our own idle resources.

    Both are used to reject registrations that misstate the exchange. An
    agreement that names the wrong resource, the wrong direction or a day nobody
    agreed to is worse than no record at all, because it becomes evidence."""
    esperado_kw = _keywords(contexto_esperado) if contexto_esperado else set()
    propios_kw = [_keywords(r) for r in (recursos_propios or [])]

    @tool
    def record_agreement(
        contraparte_org_id: str,
        recurso_recibido: str,
        recurso_entregado: str,
        condiciones: str,
        necesidad_cubierta: str,
    ) -> str:
        """File a negotiated agreement in the Neighborhood Ledger. Requires human approval.

        Args:
            contraparte_org_id: id of the organization we agreed with
            recurso_recibido: what my organization receives
            recurso_entregado: what my organization hands over in return
            condiciones: agreed day, time and details
            necesidad_cubierta: id and description of the need being covered
        """
        campos = {
            "recurso_recibido": recurso_recibido,
            "recurso_entregado": recurso_entregado,
            "condiciones": condiciones,
            "necesidad_cubierta": necesidad_cubierta,
        }
        vacios = [nombre for nombre, valor in campos.items() if _es_placeholder(valor)]
        if vacios:
            return (
                "Nothing was filed. These fields arrived empty or with filler text: "
                + ", ".join(vacios)
                + ". Call record_agreement again with the concrete terms you "
                "agreed with the neighbor: which resource, which days, which conditions."
            )

        if esperado_kw and not (_keywords(recurso_recibido) & esperado_kw):
            return (
                f"Nothing was filed. The resource you say we receive ('{recurso_recibido}') "
                f"does not match the need being covered nor what the neighbor offered. Real "
                f"context: {contexto_esperado[:300]}. Call record_agreement again with the "
                "neighbor's concrete resource that covers our need."
            )

        # You cannot give away what your organization does not have. This catches
        # the exchange being recorded backwards.
        if propios_kw:
            entregado_kw = _keywords(recurso_entregado)
            if not any(entregado_kw & propio for propio in propios_kw):
                return (
                    f"Nothing was filed. '{recurso_entregado}' is not one of our "
                    "organization's resources, so we cannot hand it over. Check the "
                    "direction: recurso_entregado must be OURS and recurso_recibido must be "
                    "the neighbor's. Call list_idle_resources if you need to."
                )

        # A day that nobody negotiated turns the entry into a logistics error.
        dias_ctx = _dias_en(contexto_esperado)
        dias_cond = _dias_en(condiciones)
        if dias_ctx and dias_cond and not (dias_cond & dias_ctx):
            return (
                f"Nothing was filed. The conditions say '{condiciones}', but the day agreed "
                f"in the negotiation was {', '.join(sorted(dias_ctx))}. Fix the day and call "
                "record_agreement again."
            )

        conn = book.connect()
        try:
            acuerdo_id = book.registrar_propuesta(
                conn,
                org_solicitante=org_id,
                org_proveedora=contraparte_org_id,
                recurso_entregado=recurso_recibido,
                recurso_recibido=recurso_entregado,
                condiciones=condiciones,
                necesidad_cubierta=necesidad_cubierta,
            )
        finally:
            conn.close()
        return (
            f"Agreement #{acuerdo_id} filed in the Neighborhood Ledger as 'proposed'. "
            f"It still needs {contraparte_org_id}'s human approval to become active."
        )

    @tool
    def collaboration_history(contraparte_org_id: str = "") -> str:
        """Look up my organization's collaboration history in the Neighborhood Ledger.

        Args:
            contraparte_org_id: optional, filters agreements with one organization
        """
        conn = book.connect()
        try:
            filas = book.historial(conn, org_id)
        finally:
            conn.close()
        if contraparte_org_id:
            filas = [
                f for f in filas
                if contraparte_org_id in (f["org_solicitante"], f["org_proveedora"])
            ]
        if not filas:
            return "No agreements on record yet."
        return "\n".join(
            f"- #{f['id']} {f['fecha'][:10]} | {f['org_solicitante']} <-> {f['org_proveedora']} "
            f"| {f['recurso_entregado']} por {f['recurso_recibido']} | estado: {f['estado']}"
            + (f" | resultado: {f['resultado']}" if f["resultado"] else "")
            for f in filas
        )

    return [record_agreement, collaboration_history]


def approval_gate(ask=None) -> HumanInTheLoop:
    """Gate that only stops on the irreversible tool: writing to the ledger.

    Read-only tools (listing resources, evaluating, contacting neighbors) run
    freely; record_agreement always asks a human.
    """
    return HumanInTheLoop(
        allowed_tools=["*", "!record_agreement"],
        ask=ask,
    )
