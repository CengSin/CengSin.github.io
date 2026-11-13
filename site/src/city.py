"""Build the data for the imagination city from local content."""

import json

from content_store import CONTENT

CITY_PATH = CONTENT / "city.json"


def load_city():
    return json.loads(CITY_PATH.read_text(encoding="utf-8"))


def _first_text(project, titles):
    for title, blocks in project.get("sections", []):
        if title not in titles:
            continue
        for block in blocks:
            if block[0] == "p":
                return block[1]
            if block[0] == "ul" and block[1]:
                return block[1][0]
    return ""


def build_city(site, projects):
    city = load_city()
    by_slug = {project["slug"]: project for project in projects}
    built = []
    for spec in city["buildings"]:
        project = by_slug.get(spec["slug"])
        if not project:
            continue
        origin = spec.get("origin") or _first_text(project, {"它解决什么问题"}) or project["problem"]
        made = project["summary"]
        if spec.get("note"):
            made = made.rstrip("。") + "。" + spec["note"]
        built.append({
            "id": project["slug"],
            "kind": "built",
            "type": spec["type"],
            "arch": spec["arch"],
            "name": project["name"],
            "label": spec.get("label") or (project["name"] if spec["arch"] == project["name"] else f"{spec['arch']} · {project['name']}"),
            "tone": spec["tone"],
            "quiet": bool(spec.get("quiet")),
            "status": spec.get("status", "已落地"),
            "idea": origin,
            "made": made,
            "trade": _first_text(project, {"我做的取舍"}),
            "stack": project["stack"],
            "links": [[label, href] for label, href in project["links"]],
            "href": f"/projects/{project['slug']}",
            "go": spec.get("go", ""),
            "active": False,
        })
    return {
        "hero": city["hero"],
        "registry": city["registry"],
        "sky_form": city["sky_form"],
        "built": built,
        "hanging": [],
        "sky": [],
        "loops": [],
        "crane": city["crane"],
        "idea_platform_url": site["links"]["idea_platform_url"],
    }
