"""Public works. No employment history.

The editable list lives in site/content/projects.json.
"""

import json
from pathlib import Path

PROJECTS = json.loads(
    (Path(__file__).resolve().parents[1] / "content" / "projects.json").read_text(encoding="utf-8")
)
