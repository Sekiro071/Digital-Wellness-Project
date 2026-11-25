from __future__ import annotations

import json
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from html import escape
from pathlib import Path
from typing import Any, Literal
from urllib.parse import urlsplit

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException


ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "resources.json"
FEEDBACK_PATH = ROOT / "data" / "feedback.sqlite3"


def load_resources() -> list[dict[str, Any]]:
    return json.loads(DATA_PATH.read_text(encoding="utf-8"))


def safe_file(path: Path) -> FileResponse:
    resolved = path.resolve()
    if ROOT not in resolved.parents or not resolved.is_file():
        raise HTTPException(status_code=404, detail="Page not found")
    return FileResponse(resolved)


Rating = Literal["5 — Very easy", "4 — Easy", "3 — Not sure", "2 — Difficult", "1 — Very difficult"]


class Feedback(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, strict=True)

    ease: Rating
    found: Literal["Yes", "Partly", "No", "Not sure"]
    guide: Rating
    improve: str = Field(default="", max_length=1000)


app = FastAPI(title="Good Signal", version="1.0.0")


@app.exception_handler(StarletteHTTPException)
async def http_error(request: Request, exc: StarletteHTTPException):
    path = request.url.path
    if exc.status_code == 404 and not path.startswith(("/api/", "/css/", "/js/", "/assets/")) and path not in ("/api", "/assets"):
        return HTMLResponse("""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Page not found — Good Signal</title>
<script src="/js/theme.js"></script><link rel="stylesheet" href="/css/style.css"></head><body><main class="section"><div class="container">
<h1>Page not found</h1><p>We couldn't find that page.</p><a href="/">Go to the home page</a>
 · <a href="/explore">Explore resources</a></div></main></body></html>""", status_code=404)
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code, headers=exc.headers)

# CSS and JavaScript remain ordinary static files; page navigation is handled by
# the FastAPI routes below instead of relying on file:// links.
app.mount("/css", StaticFiles(directory=ROOT / "css"), name="css")
app.mount("/js", StaticFiles(directory=ROOT / "js"), name="js")
app.mount("/assets", StaticFiles(directory=ROOT / "assets"), name="assets")


PAGE_ROUTES = {
    "/": "index.html",
    "/explore": "pages/resources.html",
    "/find": "pages/recommendations.html",
    "/focus": "pages/focus.html",
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
    # A transaction per submission prevents lost updates across threads and processes.
    with closing(sqlite3.connect(FEEDBACK_PATH, timeout=30)) as db, db:
        db.execute("""CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY, received_at TEXT NOT NULL, ease TEXT NOT NULL,
            found TEXT NOT NULL, guide TEXT NOT NULL, improve TEXT NOT NULL
        )""")
        db.execute(
            "INSERT INTO feedback (received_at, ease, found, guide, improve) VALUES (?, ?, ?, ?, ?)",
            (datetime.now(timezone.utc).isoformat(), feedback.ease, feedback.found, feedback.guide, feedback.improve),
        )
    return {"status": "saved", "message": "Thanks for helping improve Good Signal."}


def resource_detail_html(resource: dict[str, Any]) -> str:
    # Escape every interpolated value, including values in attributes. Only web
    # URLs are allowed for the external link, not executable URL schemes.
    resource = dict(resource)
    links = []
    for link in resource.get("links", []):
        if not isinstance(link, dict):
            continue
        address = str(link.get("url", ""))
        try:
            parsed_link = urlsplit(address)
            valid_link = parsed_link.scheme.lower() in {"http", "https"} and bool(parsed_link.netloc)
        except ValueError:
            valid_link = False
        if valid_link and not any(c.isspace() or ord(c) < 32 for c in address):
            links.append(f'<li><a href="{escape(address, quote=True)}" target="_blank" rel="noopener">{escape(str(link.get("label", "Official link"))) } ↗</a></li>')
    extra_links = '<ul class="clean-list">' + ''.join(links) + '</ul>' if links else ''
    url = str(resource.get("officialUrl", ""))
    try:
        parsed = urlsplit(url)
        valid_url = parsed.scheme.lower() in {"http", "https"} and bool(parsed.netloc)
    except ValueError:
        valid_url = False
    if not valid_url or any(c.isspace() or ord(c) < 32 for c in url):
        url = "#"
    resource["officialUrl"] = url
    resource = {key: ([escape(str(item), quote=True) for item in value] if isinstance(value, list)
                      else escape(str(value), quote=True)) for key, value in resource.items()}
    platforms = ", ".join(resource.get("platforms", []))
    accessibility = (f'<article class="info-card"><span class="section-label">Accessibility</span>'
                     f'<p>{resource["accessibility"]}</p></article>' if resource.get("accessibility") else "")
    return f"""<!doctype html>
<html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">
<meta name=\"description\" content=\"{resource['name']} resource details on Good Signal.\"><title>{resource['name']} — Good Signal</title>
<script src=\"/js/theme.js\"></script><link rel=\"stylesheet\" href=\"/css/style.css\"></head>
<body><a class=\"skip-link\" href=\"#main-content\">Skip to content</a><div class=\"site-shell\">
<div class=\"top-note\">Resource detail · checked {resource.get('dateChecked', '09 Nov 2026')} · <a href=\"/about\">Read the method</a></div>
<header class=\"site-header\"><div class=\"container nav-wrap\"><a class=\"brand\" href=\"/\"><span class=\"brand-mark\" aria-hidden=\"true\">◒</span><span class=\"brand-copy\">Good Signal<small>Digital wellness hub</small></span></a><button class=\"menu-toggle\" type=\"button\" aria-expanded=\"false\" aria-controls=\"main-navigation\">Menu</button><nav class=\"main-nav\" id=\"main-navigation\" aria-label=\"Primary navigation\"><a href=\"/explore\">Explore</a><a href=\"/find\">Find your tool</a><a href=\"/focus\">Focus session</a><a href=\"/guides\">Setup guides</a><a href=\"/safety\">Digital safety</a><a href=\"/about\">About</a><a class=\"nav-cta\" href=\"/feedback\">Share feedback</a></nav></div></header>
<main id=\"main-content\"><section class=\"page-hero\"><div class=\"container\"><div class=\"breadcrumb\"><a href=\"/explore\">Explore</a><span>/</span><span>{resource['name']}</span></div><span class=\"eyebrow\">{resource.get('category', 'Digital wellness').replace('-', ' ')}</span><h1>{resource['name']}</h1><p class=\"lede\">{resource.get('purpose', 'A practical digital wellness resource.')}</p></div></section>
<section class=\"section\"><div class=\"container about-grid\"><article class=\"info-card\"><span class=\"section-label\">Best for</span><h3>{resource.get('bestFor', 'Students looking for a practical next step.')}</h3><p class=\"muted\">This is a fit guide, not a universal ranking.</p></article><article class=\"info-card\"><span class=\"section-label\">Quick facts</span><ul class=\"clean-list\"><li><strong>Platforms:</strong> {platforms}</li><li><strong>Pricing:</strong> {resource.get('pricing', 'Check official source')}</li><li><strong>Source checked:</strong> {resource.get('dateChecked', '09 Nov 2026')}</li></ul></article><article class=\"info-card\"><span class=\"section-label\">Privacy</span><h3>{resource.get('privacy', 'Review the current privacy policy and permissions before using it.')}</h3></article><article class=\"info-card\"><span class=\"section-label\">Limitations</span><h3>{resource.get('limitations', 'Platform support and features can change.')}</h3></article>{accessibility}</div></section>
<section class=\"section accent-section\"><div class=\"container\"><div class=\"section-header\"><div><span class=\"eyebrow\">Your next step</span><h2 style=\"margin-top:.9rem\">Check the current official details.</h2></div><p>Product features, permissions, pricing, and availability change. Verify the source before you install or enable anything.</p></div><a class=\"btn btn-primary\" href=\"{resource['officialUrl']}\" target=\"_blank\" rel=\"noopener\">{resource.get('sourceType', 'Official source')}: {resource.get('sourceLabel', 'official source')} ↗</a>{extra_links}<a class=\"btn btn-secondary\" href=\"/explore\">Back to all resources</a></div></section></main>
<footer class=\"site-footer\"><div class=\"container footer-bottom\"><span>Good Signal · {resource['name']}</span><a href=\"/explore\">Back to directory</a></div></footer></div><script src=\"/js/app.js\"></script></body></html>"""


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
    # Only the original public page URLs are supported; never serve arbitrary files.
    if file_path not in set(PAGE_ROUTES.values()) | set(GUIDE_ROUTES.values()):
        raise HTTPException(status_code=404, detail="Not found")
    return safe_file(ROOT / file_path)
