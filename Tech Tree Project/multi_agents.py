from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from agents import Agent, ModelSettings


DEFAULT_MODEL = "gpt-4.1"


def _load_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except Exception:
        return ""


@dataclass(frozen=True)
class NavigatorAgents:
    navigator: Agent


def build_navigator_agents(model: str = DEFAULT_MODEL, mode: str = "agent") -> NavigatorAgents:
    """
    Build the Navigator agent.

    mode:
        - "chat": no tool calls
        - "agent": tool-capable (still none by default; keep bare)
    """
    normalized_mode = "chat" if str(mode).lower().startswith("chat") else "agent"
    root = Path(__file__).parent
    instructions = _load_text(root / "PERSONAS_NAVIGATOR.md").strip() or "You are the Tech Tree Navigator."

    navigator = Agent(
        name="Navigator",
        instructions=instructions,
        model=model,
        tools=[],
        model_settings=ModelSettings(
            parallel_tool_calls=False,
            tool_choice="none" if normalized_mode == "chat" else "none",
            temperature=0.7,
        ),
    )
    return NavigatorAgents(navigator=navigator)

