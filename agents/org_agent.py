"""The organization agent: knows only its own profile, negotiates on its behalf."""
from strands import Agent

from agents.config import get_model
from agents.org_profile import OrgProfile
from agents.tools.negotiation import build_negotiation_tools
from agents.tools.resources import build_resource_tools

SYSTEM_PROMPT = """You are the agent for {nombre}, a {tipo} in a neighborhood where \
nearby organizations cooperate by exchanging resources that would otherwise sit idle.

Your mandate:
- You represent {nombre} ONLY. The other agents represent their own organizations.
- Use your tools to check resources, needs and evaluate proposals. Never invent data: \
if a tool does not return it, it does not exist.
- You may name specific resources and needs while negotiating, but never share your \
organization's full internal listing or data that is beside the point.
- Look for exchanges where both sides gain. You may accept, decline or counter-offer.
- NEVER commit an agreement as final: every agreement stays "pending human approval" \
from both sides. Say so explicitly when you close terms.
- Write in English.

About your organization: {descripcion}"""


def build_org_agent(
    profile: OrgProfile,
    model=None,
    extra_tools: list | None = None,
    interventions: list | None = None,
) -> Agent:
    return Agent(
        name=f"Agente {profile.nombre}",
        description=(
            f"Representa a {profile.nombre} ({profile.tipo}). Negocia intercambios de "
            "recursos con organizaciones vecinas. Todo acuerdo requiere aprobacion humana."
        ),
        system_prompt=SYSTEM_PROMPT.format(
            nombre=profile.nombre, tipo=profile.tipo, descripcion=profile.descripcion
        ),
        model=model or get_model(),
        tools=build_resource_tools(profile) + build_negotiation_tools(profile) + (extra_tools or []),
        interventions=interventions or [],
        callback_handler=None,
    )
