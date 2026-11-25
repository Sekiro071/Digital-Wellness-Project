"""Check every public-page external link and resource source/install URL.

Availability only: this does not validate product claims, pricing, or suitability.
Run with --write to refresh evidence/source_link_record.json.
"""
from __future__ import annotations

import concurrent.futures
import json
import re
import sys
import time
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit, urlunsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_HTML = [ROOT / "index.html", *sorted((ROOT / "pages").glob("*.html")), *sorted((ROOT / "guides").glob("*.html"))]
GUIDE_SOURCES = ROOT / "assets" / "guides" / "SOURCES.md"
RECORD = ROOT / "evidence" / "source_link_record.json"


class ExternalHrefParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.hrefs: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        values = dict(attrs)
        href = values.get("href")
        if href and urlsplit(href).scheme.lower() in {"http", "https"}:
            self.hrefs.append(href)


def collect() -> list[dict[str, str]]:
    found: dict[str, set[str]] = {}
    for page in PUBLIC_HTML:
        parser = ExternalHrefParser()
        parser.feed(page.read_text(encoding="utf-8"))
        for url in parser.hrefs:
            found.setdefault(url, set()).add(page.relative_to(ROOT).as_posix())

    resources = json.loads((ROOT / "data" / "resources.json").read_text(encoding="utf-8"))

    def walk(value, resource_id: str, parent_key: str = "") -> None:
        if isinstance(value, dict):
            for key, child in value.items():
                walk(child, resource_id, key)
        elif isinstance(value, list):
            for child in value:
                walk(child, resource_id, parent_key)
        elif isinstance(value, str) and urlsplit(value).scheme.lower() in {"http", "https"}:
            if re.search(r"url|source|install|store|official|download|privacy|pricing", parent_key, re.I):
                found.setdefault(value, set()).add(f"data/resources.json:{resource_id}:{parent_key}")

    for resource in resources:
        walk(resource, resource.get("id", "unknown"))
    if GUIDE_SOURCES.exists():
        for url in re.findall(r"https?://[^\s|)>]+", GUIDE_SOURCES.read_text(encoding="utf-8")):
            url = url.rstrip(".,;`")
            found.setdefault(url, set()).add("assets/guides/SOURCES.md")
    return [{"url": url, "referenced_by": sorted(refs)} for url, refs in sorted(found.items())]


def check(item: dict[str, str]) -> dict:
    url = item["url"]
    headers = {"User-Agent": "Mozilla/5.0 (compatible; GoodSignalLinkCheck/1.0)", "Accept": "text/html,application/xhtml+xml,*/*;q=0.8"}
    last_error = None
    for attempt in range(2):
        try:
            request = Request(url, headers=headers, method="GET")
            with urlopen(request, timeout=30) as response:
                return {**item, "status": response.status, "final_url": response.url, "result": "ok" if response.status < 400 else "http_error"}
        except HTTPError as error:
            return {**item, "status": error.code, "final_url": error.geturl(), "result": "http_error", "detail": str(error.reason)}
        except Exception as error:
            last_error = error
            if attempt == 0:
                time.sleep(1.5)
    return {**item, "status": None, "final_url": None, "result": "request_error", "detail": f"{type(last_error).__name__}: {last_error}"}


def main() -> int:
    sources = collect()
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(check, sources))
    record = {
        "checked_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "scope": "HTTP(S) hrefs in public HTML pages, URL-valued source/install/store/privacy/pricing fields in data/resources.json, and credited image source-page URLs in assets/guides/SOURCES.md",
        "limitation": "Availability only; a successful response does not verify claims, price, compatibility, or privacy practices.",
        "total": len(results),
        "ok": sum(row["result"] == "ok" for row in results),
        "issues": sum(row["result"] != "ok" for row in results),
        "links": results,
    }
    print(json.dumps(record, indent=2, ensure_ascii=False))
    if "--write" in sys.argv:
        RECORD.parent.mkdir(parents=True, exist_ok=True)
        RECORD.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        lines = [
            "# External source and install link check",
            "",
            f"Checked: {record['checked_at_utc']} (UTC)",
            f"Result: {record['ok']}/{record['total']} URLs returned a successful HTTP response; {record['issues']} need attention.",
            "",
            record["limitation"],
            "",
            "| URL | Referenced by | Result | Final URL / detail |",
            "|---|---|---:|---|",
        ]
        for row in results:
            final = row.get("final_url") or row.get("detail", "")
            final = final.replace("|", "%7C")
            lines.append(f"| <{row['url']}> | {', '.join(row['referenced_by'])} | {row.get('status') or row['result']} | {final} |")
        (RECORD.parent / "SOURCE_LINKS.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"Saved {RECORD}")
    return 1 if record["issues"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
