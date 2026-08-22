"""Tools bound to one organization's profile.

Each function builds @tool closures over a specific OrgProfile, so a tool can
only ever see its own organization's data.
"""
from strands import tool

from agents.org_profile import OrgProfile


def build_resource_tools(profile: OrgProfile) -> list:
    @tool
    def list_idle_resources() -> str:
        """List my organization's idle resources, the ones we could share with neighbors."""
        if not profile.recursos:
            return "No idle resources on record this week."
        lineas = [
            f"- [{r.id}] {r.nombre} | available: {r.disponibilidad}" + (f" | {r.notas}" if r.notas else "")
            for r in profile.recursos
        ]
        return "\n".join(lineas)

    @tool
    def list_needs() -> str:
        """List what my organization is short of this week."""
        if not profile.necesidades:
            return "No needs on record this week."
        traduccion = {"alta": "high", "media": "medium", "baja": "low"}
        lineas = [
            f"- [{n.id}] {n.descripcion} | frequency: {n.frecuencia} | "
            f"urgency: {traduccion.get(n.urgencia, n.urgencia)}"
            for n in profile.necesidades
        ]
        return "\n".join(lineas)

    return [list_idle_resources, list_needs]
