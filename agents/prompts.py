"""Prompts shared by the CLI round and the web runner.

They live here, not in the a2a/ folder, because that name collides with the
installed a2a protocol package and cannot be imported as a module.
"""

NEGOTIATION_PROMPT = """We spotted a concrete opportunity. Close this exchange:

- Our need: [{need_id}] {need_desc} (urgency {need_urg})
- Neighbor: {vecino}
- What the neighbor said they have available: "{oferta_vecino}"

Steps:
1. Check list_idle_resources to see which resource of ours we can offer in return.
2. Use contact_neighbor to propose the exchange with concrete days and conditions.
   If they counter-offer, adjust and contact them again.
3. Finish by writing the final agreed terms: which of their resources we receive,
   which of ours we hand over, and on what days and conditions.

Write in English throughout."""

REGISTRATION_PROMPT = """This is the negotiation we just closed with {vecino}:

---
{transcripcion}
---

Your only task now is to file it in the Neighborhood Ledger by calling
record_agreement exactly once, with these values:

- contraparte_org_id: "{vecino_id}"
- recurso_recibido: the resource from {vecino} that WE receive (the one covering our need)
- recurso_entregado: OUR resource that we hand over to {vecino} in return
- condiciones: the agreed days, times and details
- necesidad_cubierta: "[{need_id}] {need_desc}"

Do not invent anything: use what appears in the negotiation above. If a field is
unclear, use the most concrete detail there. Never write "N/A" or "none".
Write the values in English."""
