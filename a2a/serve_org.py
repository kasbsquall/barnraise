"""Expose one organization's agent as an A2A server.

Usage: python a2a/serve_org.py seed/orgs/library.json 9001
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from strands.multiagent.a2a import A2AServer

from agents.org_agent import build_org_agent
from agents.org_profile import OrgProfile


def main() -> None:
    perfil_path, port = sys.argv[1], int(sys.argv[2])
    profile = OrgProfile.from_json(ROOT / perfil_path)

    def factory(context_id: str):
        return build_org_agent(profile)

    print(f"[{profile.nombre}] A2A server en puerto {port}")
    A2AServer(agent_factory=factory, port=port).serve()


if __name__ == "__main__":
    main()
