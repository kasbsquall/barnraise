"""Paso 2 smoke test: the org agent uses its tools and stays inside its own data."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from agents.org_agent import build_org_agent
from agents.org_profile import OrgProfile

profile = OrgProfile.from_json(ROOT / "seed" / "orgs" / "library.json")
agent = build_org_agent(profile)

print("=== 1. Listar recursos ===")
print(agent("Que recursos ociosos tenemos disponibles esta semana?"))

print("\n=== 2. Evaluar propuesta que conviene ===")
print(agent(
    "El Banco de Alimentos ofrece refrigerios para nuestros eventos comunitarios "
    "a cambio de usar la camioneta de reparto los martes. Evalua la propuesta."
))

print("\n=== 3. Evaluar propuesta que no conviene ===")
print(agent(
    "Una empresa ofrece publicidad en redes sociales a cambio de usar nuestro "
    "auditorio para 200 personas todos los dias. Evalua la propuesta."
))
