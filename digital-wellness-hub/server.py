from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel, Field
from fastapi.staticfiles import StaticFiles


ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "resources.json"
FEEDBACK_PATH = ROOT / "data" / "feedback.json"


def load_resources() -> list[dict[str, Any]]:
    return json.loads(DATA_PATH.read_text(encoding="utf-8"))


def safe_file(path: Path) -> FileResponse:
    resolved = path.resolve()
    if ROOT not in resolved.parents or not resolved.is_file():
        raise HTTPException(status_code=404, detail="Page not found")
    return FileResponse(resolved)


class Feedback(BaseModel):
    ease: str = Field(min_length=1, max_length=80)
    found: str = Field(min_length=1, max_length=80)
    guide: str = Field(min_length=1, max_length=80)
    improve: str = Field(default="", max_length=1000)


app = FastAPI(title="Good Signal", version="1.0.0")

# CSS and JavaScript remain ordinary static files; page navigation is handled by
# the FastAPI routes below instead of relying on file:// links.
app.mount("/css", StaticFiles(directory=ROOT / "css"), name="css")
app.mount("/js", StaticFiles(directory=ROOT / "js"), name="js")


PAGE_ROUTES = {
    "/": "index.html",
    "/explore": "pages/resources.html",
    "/find": "pages/recommendations.html",
    "/guides": "pages/guides.html",
    "/safety": "pages/digital-safety.html",
    "/about": "pages/about.html",
    "/feedback": "pages/feedback.html",
}


@app.get("/health", include_in_schema=False)
def health() -> dict[str, str]:
    return {"status": "ok", "service": "good-signal"}


@app.get("/api/resources")
def api_resources() -> list[dict[str, Any]]:
    return load_resources()


@app.get("/api/resources/{resource_id}")
def api_resource(resource_id: str) -> dict[str, Any]:
    resource = next((item for item in load_resources() if item["id"] == resource_id), None)
    if resource is None:
        raise HTTPException(status_code=404, detail="Resource not found")
    return resource


@app.post("/api/feedback", status_code=201)
def api_feedback(feedback: Feedback) -> dict[str, str]:
    # Store only the fields shown in the anonymous form. No name, email, IP,
    # browser history, or account data is collected.
    existing: list[dict[str, Any]] = []
    if FEEDBACK_PATH.exists():
        existing = json.loads(FEEDBACK_PATH.read_text(encoding="utf-8"))
    existing.append({"receivedAt": datetime.now(timezone.utc).isoformat(), **feedback.model_dump()})
    FEEDBACK_PATH.write_text(json.dumps(existing, indent=2), encoding="utf-8")
    return {"status": "saved", "message": "Thanks for helping improve Good Signal."}


def resource_detail_html(resource: dict[str, Any]) -> str:
    platforms = ", ".join(resource.get("platforms", []))
    return f"""<!doctype html>
<html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">
<meta name=\"description\" content=\"{resource['name']} resource details on Good Signal.\"><title>{resource['name']} — Good Signal</title>
<link rel=\"stylesheet\" href=\"/css/style.css\"></head>
<body><a class=\"skip-link\" href=\"#main-content\">Skip to content</a><div class=\"site-shell\">
<div class=\"top-note\">Resource detail · checked {resource.get('dateChecked', '09 Nov 2026')} · <a href=\"/about\">Read the method</a></div>
<header class=\"site-header\"><div class=\"container nav-wrap\"><a class=\"brand\" href=\"/\"><span class=\"brand-mark\" aria-hidden=\"true\">◒</span><span class=\"brand-copy\">Good Signal<small>Digital wellness hub</small></span></a><nav class=\"main-nav\" aria-label=\"Primary navigation\"><a href=\"/explore\">Explore</a><a href=\"/find\">Find your tool</a><a href=\"/guides\">Setup guides</a><a href=\"/safety\">Digital safety</a><a href=\"/about\">About</a><a class=\"nav-cta\" href=\"/feedback\">Share feedback</a></nav></div></header>
<main id=\"main-content\"><section class=\"page-hero\"><div class=\"container\"><div class=\"breadcrumb\"><a href=\"/explore\">Explore</a><span>/</span><span>{resource['name']}</span></div><span class=\"eyebrow\">{resource.get('category', 'Digital wellness').replace('-', ' ')}</span><h1>{resource['name']}</h1><p class=\"lede\">{resource.get('purpose', 'A practical digital wellness resource.')}</p></div></section>
<section class=\"section\"><div class=\"container about-grid\"><article class=\"info-card\"><span class=\"section-label\">Best for</span><h3>{resource.get('bestFor', 'Students looking for a practical next step.')}</h3><p class=\"muted\">This is a fit guide, not a universal ranking.</p></article><article class=\"info-card\"><span class=\"section-label\">Quick facts</span><ul class=\"clean-list\"><li><strong>Platforms:</strong> {platforms}</li><li><strong>Pricing:</strong> {resource.get('pricing', 'Check official source')}</li><li><strong>Source checked:</strong> {resource.get('dateChecked', '09 Nov 2026')}</li></ul></article><article class=\"info-card\"><span class=\"section-label\">Privacy</span><h3>{resource.get('privacy', 'Review the current privacy policy and permissions before using it.')}</h3></article><article class=\"info-card\"><span class=\"section-label\">Limitations</span><h3>{resource.get('limitations', 'Platform support and features can change.')}</h3></article></div></section>
<section class=\"section accent-section\"><div class=\"container\"><div class=\"section-header\"><div><span class=\"eyebrow\">Your next step</span><h2 style=\"margin-top:.9rem\">Check the current official details.</h2></div><p>Product features, permissions, pricing, and availability change. Verify the source before you install or enable anything.</p></div><a class=\"btn btn-primary\" href=\"{resource['officialUrl']}\" target=\"_blank\" rel=\"noopener\">Open {resource.get('sourceLabel', 'official source')} ↗</a><a class=\"btn btn-secondary\" style=\"margin-left:.5rem\" href=\"/explore\">Back to all resources</a></div></section></main>
<footer class=\"site-footer\"><div class=\"container footer-bottom\"><span>Good Signal · {resource['name']}</span><a href=\"/explore\">Back to directory</a></div></footer></div></body></html>"""


for route, relative_path in PAGE_ROUTES.items():
    def make_page_handler(path: str):
        def page_handler() -> FileResponse:
            return safe_file(ROOT / path)
        return page_handler

    app.add_api_route(route, make_page_handler(relative_path), methods=["GET"], include_in_schema=False)


@app.get("/resource/{resource_id}", response_class=HTMLResponse, include_in_schema=False)
def resource_page(resource_id: str) -> HTMLResponse:
    resource = next((item for item in load_resources() if item["id"] == resource_id), None)
    if resource is None:
        raise HTTPException(status_code=404, detail="Resource not found")
    return HTMLResponse(resource_detail_html(resource))


GUIDE_ROUTES = {
    "android-wellbeing": "guides/android-wellbeing.html",
    "stayfocusd": "guides/stayfocusd.html",
    "focus-mode": "guides/focus-mode.html",
}


@app.get("/guide/{guide_id}", include_in_schema=False)
def guide_page(guide_id: str) -> FileResponse:
    relative_path = GUIDE_ROUTES.get(guide_id)
    if relative_path is None:
        raise HTTPException(status_code=404, detail="Guide not found")
    return safe_file(ROOT / relative_path)


@app.get("/{file_path:path}", include_in_schema=False)
def legacy_static_file(file_path: str) -> FileResponse:
    # Keep direct file URLs working during the transition, but route normal
    # navigation through the clean FastAPI paths above.
    if file_path == "data/feedback.json":
        raise HTTPException(status_code=404, detail="Not found")
    return safe_file(ROOT / file_path)
