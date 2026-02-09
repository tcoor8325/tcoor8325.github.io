from __future__ import annotations

import sys


def main(argv: list[str]) -> int:
    sys.stderr.write(
        "debate_loop.py is currently disabled.\n"
        "Use the Navigator workflow instead:\n"
        "  python3 control_multi_agents.py \"<start node>\" --limit 5\n"
    )
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

