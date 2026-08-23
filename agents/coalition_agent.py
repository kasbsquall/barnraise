"""The coalition agent: sees what no single organization can see.

It watches funding calls, scans them against the neighborhood's COMBINED
capabilities, and finds the cases where organizations that each fall short
would qualify together. The eligibility scan is deterministic; the agent's job
is to turn a qualifying combination into a proposal with roles and budget, and
to put it in front of every director for approval.
"""
import re

from strands import Agent, tool
from strands.vended_interventions.hitl import HumanInTheLoop

from agents.config import get_model
from agents.org_profile import OrgProfile
from agents.tools.grants import Convocatoria, escanear_coaliciones, evaluar
from ledger import book
from ledger.evidence import evidencia_de_colaboracion

SYSTEM_PROMPT = """You are the neighborhood's coalition agent. You do not represent a \
single organization: your job is to spot when several neighboring organizations that do \
not qualify for a funding call on their own do qualify together.

Rules:
- Eligibility data comes from your tools. Never invent requirements, figures or amounts.
- The collaboration evidence comes from the Neighborhood Ledger: agreements these \
organizations already fulfilled. That is what makes the coalition credible to a funder.
- Assign roles according to what each organization actually contributes.
- Split the budget in proportion to each role; it must add up to the full amount.
- No application is submitted without the approval of EVERY director involved.
- Write in English."""

PROPOSAL_PROMPT = """Funding call detected: {nombre} ({conv_id})
Funder: {financiador} | Amount: {monto} {moneda} | Closes: {cierre}

{descripcion}

--- Eligibility scan ---
{escaneo}

--- Collaboration evidence from the Neighborhood Ledger ---
{evidencia}

Your task:
1. In two sentences, explain why no organization qualifies alone and why the coalition does.
2. Give each organization a concrete role, tied to the requirement it covers.
3. Split the {monto} {moneda} between them by role. It must add up to exactly {monto}.
4. Call propose_coalition exactly once with the final proposal."""


def _requisitos_mencionados(texto: str) -> list[str]:
    """Requirement ids (REQ1, REQ2...) named in a role line."""
    return re.findall(r"REQ\d+", texto.upper())


def _montos(presupuesto: str, ids: list[str]) -> dict[str, int] | None:
    """Parse "org_id: 15000" lines into amounts, one per member."""
    montos: dict[str, int] = {}
    for renglon in presupuesto.splitlines():
        if ":" not in renglon:
            continue
        org, resto = renglon.split(":", 1)
        org = org.strip()
        if org not in ids:
            continue
        numeros = re.findall(r"\d[\d.,]*", resto)
        if not numeros:
            continue
        montos[org] = int(numeros[0].replace(".", "").replace(",", ""))
    return montos if set(montos) == set(ids) else None


def build_coalition_tools(convocatoria: Convocatoria, profiles: list[OrgProfile]) -> list:
    por_id = {p.org_id: p for p in profiles}

    @tool
    def propose_coalition(org_ids: str, roles: str, presupuesto: str) -> str:
        """File the coalition proposal. Requires approval from every director.

        Args:
            org_ids: ids of the participating organizations, comma separated
            roles: one line per organization, formatted "org_id: REQ2, REQ4 | role description"
            presupuesto: one line per organization, formatted "org_id: 15000"
        """
        ids = [x.strip() for x in org_ids.split(",") if x.strip()]
        desconocidos = [i for i in ids if i not in por_id]
        if desconocidos:
            return (
                f"Nothing was filed. Unknown organizations: {desconocidos}. "
                f"Available: {list(por_id)}"
            )

        evaluacion = evaluar(convocatoria, [por_id[i] for i in ids])
        if not evaluacion.califica:
            faltan = [r["id"] for r in evaluacion.faltantes]
            return (
                f"Nothing was filed. That combination does not qualify: missing {faltan}. "
                "Check the scan and propose a combination that meets every requirement."
            )

        # A role that credits the wrong organization with a capability it does not
        # have would misrepresent the coalition to the funder, so roles are checked
        # against the deterministic scan instead of trusted as written.
        errores = []
        for renglon in roles.splitlines():
            if ":" not in renglon:
                continue
            org, resto = renglon.split(":", 1)
            org = org.strip()
            if org not in ids:
                continue
            for req_id in _requisitos_mencionados(resto):
                aporta = evaluacion.aportes.get(req_id, "")
                if req_id not in {r["id"] for r in convocatoria.requisitos}:
                    errores.append(f"{req_id} does not exist in this call")
                elif "together" in aporta or "agreements in the ledger" in aporta:
                    # A requirement met by the group, not attributable to one org.
                    # This matched the Spanish "suma de" until the coverage strings
                    # were translated, and nothing failed loudly: the check simply
                    # stopped recognising combined requirements and would have
                    # started reporting that an organization does not contribute
                    # something no single organization ever could.
                    continue
                elif org not in aporta:
                    errores.append(
                        f"{org} does not contribute {req_id}: that requirement is covered by '{aporta}'"
                    )
        if errores:
            return (
                "Nothing was filed. The roles do not match the eligibility scan: "
                + "; ".join(errores)
                + ". Call propose_coalition again, assigning each requirement to the "
                "organization that actually contributes it."
            )

        montos = _montos(presupuesto, ids)
        if montos is None:
            return (
                "Nothing was filed. I could not read the budget. Use one line per "
                'organization formatted "org_id: 15000", one for each participant.'
            )
        if sum(montos.values()) != convocatoria.monto:
            return (
                f"Nothing was filed. The budget adds up to {sum(montos.values())} but the "
                f"call is for {convocatoria.monto} {convocatoria.moneda}. "
                "Split it again so it adds up to exactly the full amount."
            )

        conn = book.connect()
        try:
            evidencia = evidencia_de_colaboracion(conn, ids)
            coalicion_id = book.registrar_coalicion(
                conn,
                convocatoria_id=convocatoria.id,
                convocatoria=convocatoria.nombre,
                monto=convocatoria.monto,
                org_ids=ids,
                roles=roles,
                presupuesto=presupuesto,
                evidencia=evidencia.resumen(),
            )
        finally:
            conn.close()

        return (
            f"Coalition #{coalicion_id} filed as 'proposed' for {convocatoria.nombre}. "
            f"It needs all {len(ids)} directors to approve before submission."
        )

    return [propose_coalition]


def build_coalition_agent(convocatoria: Convocatoria, profiles: list[OrgProfile]) -> Agent:
    return Agent(
        name="Coalition Agent",
        description="Spots funding calls the neighborhood can win together.",
        system_prompt=SYSTEM_PROMPT,
        model=get_model(),
        tools=build_coalition_tools(convocatoria, profiles),
        interventions=[HumanInTheLoop(allowed_tools=["*", "!propose_coalition"])],
        callback_handler=None,
    )


def formatear_escaneo(convocatoria: Convocatoria, profiles: list[OrgProfile]) -> tuple[str, list]:
    """Human-readable eligibility scan, plus the qualifying coalitions found."""
    individuales, coaliciones = escanear_coaliciones(convocatoria, profiles)
    por_id = {p.org_id: p for p in profiles}
    total_req = len(convocatoria.requisitos)

    lineas = ["Each organization on its own:"]
    for ev in individuales:
        oid = ev.org_ids[0]
        faltan = ", ".join(r["id"] for r in ev.faltantes)
        lineas.append(
            f"- {por_id[oid].nombre} ({oid}): meets {len(ev.cumplidos)}/{total_req}, "
            f"serves {ev.poblacion_total} people. DOES NOT QUALIFY, missing: {faltan}"
        )

    if not coaliciones:
        lineas.append("\nNo combination of organizations qualifies.")
        return "\n".join(lineas), []

    lineas.append("\nCombinations that DO qualify:")
    for ev in coaliciones:
        nombres = ", ".join(por_id[i].nombre for i in ev.org_ids)
        lineas.append(
            f"- {nombres} (ids: {', '.join(ev.org_ids)}): meets {total_req}/{total_req}, "
            f"serves {ev.poblacion_total} people together."
        )
        for req in convocatoria.requisitos:
            lineas.append(f"    {req['id']} {req['descripcion']} -> contributed by: {ev.aportes.get(req['id'], '?')}")
    return "\n".join(lineas), coaliciones
