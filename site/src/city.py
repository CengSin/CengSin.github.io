"""Build the data for the imagination city from local content and Idea Platform."""

import json
import os
import urllib.request
from datetime import datetime, timezone

from content_store import CONTENT, forbidden_hits

CITY_PATH = CONTENT / "city.json"
CACHE_PATH = CONTENT / "idea_platform.json"
STATUS_LABEL = {"published": "待承接", "dormant": "搁置", "realized": "已落地"}


def load_city():
    return json.loads(CITY_PATH.read_text(encoding="utf-8"))


def _clean(text):
    text = str(text or "").strip()
    return "" if forbidden_hits(text) else text


def _normalize(raw, owner):
    ideas = []
    for item in raw.get("ideas", []):
        author = item.get("author") or {}
        if author.get("userId") != owner or item.get("visibility", "public") != "public":
            continue
        title = _clean(item.get("title"))
        if not title:
            continue
        metrics = item.get("metrics") or {}
        ideas.append({
            "id": str(item.get("id", "")),
            "title": title,
            "summary": _clean(item.get("summary")),
            "status": str(item.get("status", "")),
            "created": str(item.get("createdAt", ""))[:10],
            "active": int(metrics.get("activeAttemptCount") or 0),
            "works": int(metrics.get("workCount") or 0),
        })
    return ideas


def fetch_ideas(base, owner):
    cached = json.loads(CACHE_PATH.read_text(encoding="utf-8")) if CACHE_PATH.exists() else {"fetched": "", "ideas": []}
    if os.environ.get("CITY_OFFLINE"):
        return cached
    request = urllib.request.Request(
        base.rstrip("/") + "/api/v1/ideas",
        headers={"User-Agent": "cengsin-site-build", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            raw = json.loads(response.read().decode("utf-8"))
    except (OSError, ValueError):
        return cached
    ideas = _normalize(raw, owner)
    if not ideas:
        return cached
    if ideas == cached.get("ideas"):
        return cached
    fresh = {"fetched": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "ideas": ideas}
    CACHE_PATH.write_text(json.dumps(fresh, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return fresh


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
    links = site["links"]
    base = links["idea_platform_url"]
    snapshot = fetch_ideas(base, city["owner"])
    ideas = {idea["id"]: idea for idea in snapshot["ideas"]}
    by_slug = {project["slug"]: project for project in projects}
    explore = base.rstrip("/") + "/explore/"
    used = set(city.get("skip_ideas", []))
    built = []
    for spec in city["buildings"]:
        project = by_slug.get(spec["slug"])
        if not project:
            continue
        idea = ideas.get(spec.get("idea", ""))
        if idea:
            used.add(idea["id"])
        origin = (idea or {}).get("summary") or _first_text(project, {"它解决什么问题"}) or project["problem"]
        made = project["summary"]
        if spec.get("note"):
            made = made.rstrip("。") + "。" + spec["note"]
        status = "迭代中" if idea and idea["active"] else "已落地"
        built.append({
            "id": project["slug"],
            "kind": "built",
            "type": spec["type"],
            "arch": spec["arch"],
            "name": project["name"],
            "label": spec.get("label") or (project["name"] if spec["arch"] == project["name"] else f"{spec['arch']} · {project['name']}"),
            "tone": spec["tone"],
            "quiet": bool(spec.get("quiet")),
            "status": status,
            "idea": origin,
            "made": made,
            "trade": _first_text(project, {"我做的取舍"}),
            "stack": project["stack"],
            "links": [[label, href] for label, href in project["links"]],
            "href": f"/projects/{project['slug']}",
            "go": spec.get("go", ""),
            "active": bool(idea and idea["active"]),
        })
    plots = list(city.get("generic_plots", []))
    tones = city.get("generic_tones", ["b-teal"])
    hang_spots = list(city.get("hang_spots", []))
    sky_spots = list(city.get("sky_spots", []))
    hanging = []
    sky = []
    rename = city.get("rename", {})
    for idea in snapshot["ideas"]:
        if idea["id"] in used:
            continue
        name = rename.get(idea["id"], idea["title"])
        common = {
            "id": idea["id"],
            "name": name,
            "date": idea["created"],
            "text": idea["summary"],
            "href": explore + idea["id"],
        }
        if idea["status"] == "realized" and plots:
            x, y = plots.pop(0)
            built.append({
                **common,
                "kind": "built",
                "type": "generic",
                "plot": [x, y],
                "arch": "小楼",
                "label": name,
                "tone": tones[len(plots) % len(tones)],
                "quiet": True,
                "status": "已落地",
                "idea": idea["summary"],
                "made": "已经在 Idea Platform 上落地。",
                "trade": "",
                "stack": "Idea Platform",
                "links": [["在 Idea Platform 查看", explore + idea["id"]]],
                "href": explore + idea["id"],
                "go": "",
                "active": False,
            })
        elif idea["status"] != "realized" and idea["active"] and hang_spots:
            hanging.append({**common, "kind": "doing", "status": "实现中", "at": hang_spots.pop(0)})
        elif idea["status"] == "published" and sky_spots:
            sky.append({**common, "kind": "idea", "status": "待承接", "at": sky_spots.pop(0)})
        elif idea["status"] not in {"realized", "published"} and hang_spots:
            hanging.append({**common, "kind": "doing", "status": STATUS_LABEL.get(idea["status"], "搁置"), "at": hang_spots.pop(0)})
    loops = []
    for slug, idea_id in city.get("loops", []):
        if any(b["id"] == slug for b in built) and any(s["id"] == idea_id for s in sky):
            loops.append([slug, idea_id])
            for s in sky:
                if s["id"] == idea_id:
                    parent = next(b for b in built if b["id"] == slug)
                    s["from"] = parent["name"]
    return {
        "hero": city["hero"],
        "registry": city["registry"],
        "sky_form": city["sky_form"],
        "built": built,
        "hanging": hanging,
        "sky": sky,
        "loops": loops,
        "crane": city["crane"],
        "fetched": snapshot.get("fetched", ""),
        "idea_platform_url": base,
    }
