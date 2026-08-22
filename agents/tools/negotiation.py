"""Exchange evaluation tool, bound to one organization's profile.

Deterministic checks feed the agent structured facts; the agent reasons over
them to accept, reject, or counter-offer. The tool never fabricates data.
"""
from strands import tool

from agents.org_profile import OrgProfile

_STOPWORDS = {
    "the", "a", "an", "of", "for", "with", "and", "in", "on", "to", "our", "we",
    "de", "del", "la", "el", "los", "las", "para", "con", "una", "un", "y", "en", "que",
}


def _keywords(text: str) -> set[str]:
    return {w.strip(".,;:()").lower() for w in text.split()
            if len(w) > 2 and w.lower() not in _STOPWORDS}


def build_negotiation_tools(profile: OrgProfile) -> list:
    @tool
    def evaluate_exchange(recurso_ofrecido: str, recurso_solicitado: str) -> str:
        """Evaluate an exchange from MY organization's point of view, before accepting or proposing it.

        Args:
            recurso_ofrecido: what MY organization would RECEIVE in the exchange
            recurso_solicitado: what MY organization would HAND OVER in return
        """
        ofrecido_kw = _keywords(recurso_ofrecido)
        cubre = [
            n for n in profile.necesidades
            if _keywords(n.descripcion) & ofrecido_kw
        ]

        solicitado_kw = _keywords(recurso_solicitado)
        disponibles = [
            r for r in profile.recursos
            if _keywords(f"{r.nombre} {r.disponibilidad} {r.notas}") & solicitado_kw
        ]

        partes = []
        if cubre:
            partes.append(
                "What is offered covers these needs of ours: "
                + "; ".join(f"[{n.id}] {n.descripcion}" for n in cubre)
            )
        else:
            partes.append("What is offered does not cover any need we have on record.")

        if solicitado_kw:
            if disponibles:
                partes.append(
                    "What is being asked for matches idle resources of ours: "
                    + "; ".join(f"[{r.id}] {r.nombre} ({r.disponibilidad})" for r in disponibles)
                )
            else:
                partes.append("We have no idle resource matching what is being asked for.")

        veredicto = "WORTH IT" if cubre and (not solicitado_kw or disponibles) else "NOT WORTH IT AS IT STANDS"
        partes.append(f"Preliminary verdict: {veredicto}. The final decision needs human approval.")
        return "\n".join(partes)

    return [evaluate_exchange]
